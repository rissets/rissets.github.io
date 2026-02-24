---
title: 'Physics-Informed Neural Networks: Bridging Physics and Deep Learning'
description: 'A deep dive into PINNs — how we combined physics engines with neural networks to predict ball trajectory in a hyper-realistic golf simulator.'
date: '2024-11-15'
draft: false
slug: '/pensieve/physics-informed-neural-networks'
tags:
  - Machine Learning
  - Physics
  - PyTorch
  - PINNs
---

## Introduction

Physics-Informed Neural Networks (PINNs) represent a paradigm shift in how we approach problems that lie at the intersection of physics and machine learning. Rather than treating neural networks as black boxes that learn purely from data, PINNs encode the fundamental laws of physics directly into the loss function — ensuring that predictions remain physically consistent.

In this post, I'll share my experience building the core engine for **Fairway Golf Simulator**, where we used PINNs combined with traditional ANNs to predict golf ball trajectory with remarkable accuracy.

## The Problem

Golf ball physics is deceptively complex. A ball in flight is affected by:

- **Gravity** — the constant downward acceleration
- **Aerodynamic drag** — resistance proportional to velocity squared
- **Magnus effect** — spin-induced lift that causes hooks and slices
- **Wind** — external force vectors varying by altitude
- **Ground interaction** — bounce, roll, and friction on landing

Traditional physics engines can model these forces, but they require precise initial conditions and material properties that are difficult to measure in practice. Pure data-driven approaches, on the other hand, require enormous datasets and often produce physically implausible predictions.

## Why PINNs?

PINNs offer the best of both worlds. The key insight is embedding the governing differential equations directly into the neural network's training process.

For a golf ball in flight, the equations of motion are:

```
m * d²x/dt² = F_drag_x + F_magnus_x + F_wind_x
m * d²y/dt² = F_drag_y + F_magnus_y + F_wind_y - m*g
m * d²z/dt² = F_drag_z + F_magnus_z + F_wind_z
```

In a PINN framework, we define a composite loss function:

```python
loss = loss_data + lambda_physics * loss_physics

# loss_data: MSE between predictions and observed trajectories
# loss_physics: Residual of the governing PDEs evaluated at collocation points
```

The physics loss acts as a regularizer, ensuring the network's predictions satisfy physical laws even in regions with sparse training data.

## Architecture

Our implementation used PyTorch with the following architecture:

```python
class GolfPINN(nn.Module):
    def __init__(self):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(1, 128),      # Input: time t
            nn.Tanh(),
            nn.Linear(128, 128),
            nn.Tanh(),
            nn.Linear(128, 128),
            nn.Tanh(),
            nn.Linear(128, 6),      # Output: x, y, z, vx, vy, vz
        )

    def forward(self, t):
        return self.net(t)
```

The physics residual is computed using automatic differentiation:

```python
def physics_loss(model, t):
    t.requires_grad_(True)
    output = model(t)
    x, y, z = output[:, 0:1], output[:, 1:2], output[:, 2:3]
    vx, vy, vz = output[:, 3:4], output[:, 4:5], output[:, 5:6]

    # Compute accelerations via autograd
    ax = torch.autograd.grad(vx, t, torch.ones_like(vx), create_graph=True)[0]
    ay = torch.autograd.grad(vy, t, torch.ones_like(vy), create_graph=True)[0]
    az = torch.autograd.grad(vz, t, torch.ones_like(vz), create_graph=True)[0]

    # Physics: F = ma
    drag = compute_drag(vx, vy, vz)
    magnus = compute_magnus(vx, vy, vz, spin)

    residual_x = ax - (drag[0] + magnus[0]) / mass
    residual_y = ay - (drag[1] + magnus[1] - g) / mass
    residual_z = az - (drag[2] + magnus[2]) / mass

    return torch.mean(residual_x**2 + residual_y**2 + residual_z**2)
```

## Results

The PINN model achieved significantly better generalization compared to a pure data-driven ANN, especially for:

- **Extreme spin conditions** — where training data was sparse
- **Variable wind scenarios** — the physics constraint ensured realistic deflection
- **Long-range predictions** — error accumulation was much lower than pure ANNs

The combined system now powers the Fairway Simulator, processing player input in real-time to predict trajectory with high fidelity.

## Key Takeaways

1. **PINNs shine when data is limited** — physics constraints act as powerful regularizers
2. **Automatic differentiation is the secret weapon** — PyTorch's autograd makes computing PDE residuals trivial
3. **The physics loss weight (λ) matters** — too low and you lose physical consistency, too high and you underfit the data
4. **Hybrid approaches work best** — we used PINNs for trajectory prediction and traditional ANNs for player skill assessment

## What's Next

We're exploring adaptive collocation point sampling and multi-fidelity PINNs to further improve accuracy while reducing training time. The framework generalizes well beyond golf — any domain where physics models exist but data is scarce can benefit from this approach.

---

_This post is based on my work at Orbit Tech Solution building the Fairway Golf Engine._
