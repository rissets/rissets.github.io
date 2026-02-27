---
title: 'Building Enterprise Computer Vision Systems: From Research to Production'
description: 'Key architectural decisions and lessons learned from deploying face recognition and fish classification systems at scale in production environments.'
date: '2025-12-10'
draft: false
slug: '/pensieve/computer-vision-production'
tags:
  - Computer Vision
  - Python
  - Django
  - Machine Learning
  - PyTorch
---

## Introduction

Deploying computer vision systems into production is a fundamentally different challenge from training a model that performs well on a benchmark. At Pt Bagus Harapan Tritunggal, I had the opportunity to build two distinct production CV systems: an **Enterprise Face Recognition API** for biometric verification and a **Fish Recognition System** for KNMP (National Fisheries Management Council). This post captures the key lessons and architectural decisions from both projects.

## The Gap Between Research and Production

A model with 99% accuracy on your test set can fail spectacularly in production due to:

- **Distribution shift** — real-world images differ from training data (lighting, angle, occlusion)
- **Adversarial inputs** — deliberate attempts to fool the system (especially critical for biometrics)
- **Latency constraints** — users expect responses in milliseconds, not seconds
- **Throughput requirements** — handling concurrent requests at scale

### Face Recognition: Security-Critical Deployment

The face recognition system required not just high accuracy, but **anti-spoofing** capabilities — the ability to distinguish a live face from a photograph or video replay attack. This added an entire layer of complexity to the pipeline.

```python
class FaceVerificationPipeline:
    def __init__(self):
        # Detection: Ultralytics YOLO for face detection
        self.detector = YOLO('face_detection.pt')

        # Recognition: InsightFace for face embeddings
        self.recognizer = FaceAnalysis(providers=['CUDAExecutionProvider'])
        self.recognizer.prepare(ctx_id=0, det_size=(640, 640))

        # Liveness: MediaPipe for landmark detection + custom anti-spoof model
        self.liveness_checker = LivenessDetector()

    def verify(self, image: np.ndarray, enrolled_embedding: np.ndarray) -> dict:
        # Step 1: Detect faces
        faces = self.detector(image)
        if len(faces) == 0:
            return {"status": "no_face_detected"}

        # Step 2: Liveness check — reject spoofing attempts
        liveness_score = self.liveness_checker.predict(image, faces[0])
        if liveness_score < LIVENESS_THRESHOLD:
            return {"status": "spoof_detected", "confidence": liveness_score}

        # Step 3: Extract embedding and compare
        face_embedding = self.recognizer.get(image)[0].embedding
        similarity = cosine_similarity(face_embedding, enrolled_embedding)

        return {
            "status": "verified" if similarity > SIMILARITY_THRESHOLD else "not_matched",
            "similarity": float(similarity),
            "liveness_score": float(liveness_score)
        }
```

### Fish Recognition: Domain-Specific Data Challenges

The fish classification system presented different challenges. The primary hurdle was **data scarcity** — getting labeled images of specific fish species in Indonesian waters at sufficient volume and quality.

Our approach:

1. **Data collection** — partnered with KNMP to gather images from field surveys
2. **Data augmentation** — extensive augmentation pipeline (rotation, flipping, color jitter, Cutout) to artificially expand the dataset
3. **Transfer learning** — fine-tuned a pre-trained EfficientNet-B4 on our domain-specific dataset
4. **Active learning** — deployed a confidence-threshold-based system to flag uncertain predictions for human review

```python
# Training with class imbalance handling
class FishClassificationTrainer:
    def __init__(self, num_classes: int):
        self.model = timm.create_model(
            'efficientnet_b4',
            pretrained=True,
            num_classes=num_classes
        )

    def compute_class_weights(self, dataset) -> torch.Tensor:
        """Handle class imbalance with weighted sampling."""
        class_counts = Counter(dataset.labels)
        total = sum(class_counts.values())
        weights = [total / (len(class_counts) * class_counts[i])
                   for i in range(len(class_counts))]
        return torch.FloatTensor(weights)

    def train(self, train_loader, val_loader, epochs=50):
        class_weights = self.compute_class_weights(train_loader.dataset)
        criterion = nn.CrossEntropyLoss(weight=class_weights.to(device))
        optimizer = torch.optim.AdamW(
            self.model.parameters(), lr=1e-4, weight_decay=0.01
        )
        scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
            optimizer, T_max=epochs
        )
        # ... training loop
```

## Serving Architecture

Both systems needed to be served as REST APIs with low latency. The architecture we landed on:

```
                          ┌─────────────────────────┐
                          │     Load Balancer         │
                          └──────────┬──────────────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              ▼                      ▼                       ▼
    ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
    │   Django API     │  │   Django API     │  │   Django API     │
    │  (Worker 1)      │  │  (Worker 2)      │  │  (Worker 3)      │
    └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘
             │                     │                      │
             └─────────────────────┼──────────────────────┘
                                   │
             ┌─────────────────────┼──────────────────────┐
             ▼                     ▼                       ▼
    ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
    │  Model Server    │  │   PostgreSQL     │  │     Redis        │
    │  (TorchServe)    │  │   (Embeddings)   │  │    (Cache)       │
    └──────────────────┘  └──────────────────┘  └──────────────────┘
```

**Key decisions:**

- **TorchServe** for dedicated model inference — separates the ML runtime from the Django app, enabling independent scaling
- **Redis** for caching face embeddings — embedding lookup on every request would be prohibitively slow
- **PostgreSQL with pgvector** for scalable similarity search across enrolled face embeddings

## Performance Optimizations

### Model Quantization

For the face recognition model, INT8 quantization reduced model size by ~4x and inference time by ~2x with minimal accuracy degradation:

```python
import torch.quantization

# Post-training static quantization
model.eval()
model.qconfig = torch.quantization.get_default_qconfig('fbgemm')
torch.quantization.prepare(model, inplace=True)

# Calibration
with torch.no_grad():
    for images, _ in calibration_loader:
        model(images)

torch.quantization.convert(model, inplace=True)
```

### Batch Processing

For the fish recognition API, requests are batched using an async queue to amortize GPU overhead:

```python
class BatchInferenceQueue:
    def __init__(self, max_batch_size=32, max_wait_ms=50):
        self.queue = asyncio.Queue()
        self.max_batch_size = max_batch_size
        self.max_wait_ms = max_wait_ms

    async def predict(self, image: np.ndarray) -> dict:
        future = asyncio.Future()
        await self.queue.put((image, future))
        return await future

    async def process_batches(self):
        while True:
            batch = []
            deadline = time.monotonic() + self.max_wait_ms / 1000

            while len(batch) < self.max_batch_size:
                try:
                    timeout = max(0, deadline - time.monotonic())
                    item = await asyncio.wait_for(
                        self.queue.get(), timeout=timeout
                    )
                    batch.append(item)
                except asyncio.TimeoutError:
                    break

            if batch:
                images, futures = zip(*batch)
                results = model.predict_batch(np.stack(images))
                for future, result in zip(futures, results):
                    future.set_result(result)
```

## Monitoring in Production

Both systems are monitored via:

- **Prometheus + Grafana** for latency percentiles (p50, p95, p99) and throughput
- **Confidence score distribution tracking** — a drop in average confidence often signals data drift
- **Rejection rate monitoring** — for the face recognition system, a spike in anti-spoof rejections can indicate an attack attempt

## Lessons Learned

1. **Liveness detection is non-negotiable for biometrics** — without it, a printed photo can fool even a highly accurate recognition system
2. **Data quality beats model complexity** — 1000 high-quality, diverse training images outperform 10,000 noisy ones
3. **Separate your ML runtime from your API** — Django is excellent for the business logic; TorchServe handles the model serving
4. **Cache aggressively** — face embeddings, model outputs for known images, and preprocessing results can all be cached
5. **Build with confidence thresholds, not binary outputs** — returning a confidence score enables the application layer to handle edge cases gracefully

---

_This post is based on my work at Pt Bagus Harapan Tritunggal building production computer vision systems._
