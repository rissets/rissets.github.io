---
title: 'Building a RAG System with Django and Langchain'
description: 'How to build a production-ready Retrieval-Augmented Generation system using Django as the backend and Langchain for orchestration.'
date: '2025-03-20'
draft: false
slug: '/pensieve/rag-with-django-langchain'
tags:
  - AI
  - Django
  - Langchain
  - LLM
---

## Introduction

Retrieval-Augmented Generation (RAG) has become the standard pattern for building LLM applications that need access to private or domain-specific knowledge. Instead of fine-tuning a model on your data (expensive, slow, inflexible), RAG retrieves relevant context at query time and feeds it to the LLM alongside the user's question.

In this post, I'll walk through how to build a production-ready RAG system using **Django** as the backend framework and **Langchain** for LLM orchestration — a stack I've used extensively in building AI-powered applications.

## Architecture Overview

```
User Query → Django API → Langchain Pipeline → Response
                              │
                    ┌─────────┼──────────┐
                    ▼         ▼          ▼
              Embedding    Vector DB   LLM API
              Model        (pgvector)  (Ollama/OpenAI)
```

The system consists of:

1. **Django REST API** — handles authentication, rate limiting, and request routing
2. **Document ingestion pipeline** — processes PDFs/text, chunks them, and stores embeddings
3. **Retrieval engine** — performs semantic search using pgvector
4. **Generation layer** — Langchain chains that combine retrieved context with LLM prompting

## Setting Up the Stack

### Django Models

```python
# models.py
from django.db import models
from pgvector.django import VectorField

class Document(models.Model):
    title = models.CharField(max_length=500)
    source = models.FileField(upload_to='documents/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

class DocumentChunk(models.Model):
    document = models.ForeignKey(Document, on_delete=models.CASCADE)
    content = models.TextField()
    embedding = VectorField(dimensions=1536)  # OpenAI ada-002
    metadata = models.JSONField(default=dict)
    chunk_index = models.IntegerField()

    class Meta:
        indexes = [
            models.Index(fields=['document']),
        ]
```

### Document Ingestion

```python
# services/ingestion.py
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.embeddings import OpenAIEmbeddings

def ingest_document(document_id: int):
    document = Document.objects.get(id=document_id)

    # Load and split
    text = extract_text(document.source.path)
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        separators=["\n\n", "\n", ". ", " "]
    )
    chunks = splitter.split_text(text)

    # Embed
    embeddings = OpenAIEmbeddings()
    vectors = embeddings.embed_documents(chunks)

    # Store
    DocumentChunk.objects.bulk_create([
        DocumentChunk(
            document=document,
            content=chunk,
            embedding=vector,
            chunk_index=i
        )
        for i, (chunk, vector) in enumerate(zip(chunks, vectors))
    ])
```

### Retrieval with pgvector

```python
# services/retrieval.py
from pgvector.django import L2Distance
from langchain.embeddings import OpenAIEmbeddings

def retrieve_context(query: str, top_k: int = 5):
    embeddings = OpenAIEmbeddings()
    query_vector = embeddings.embed_query(query)

    chunks = (
        DocumentChunk.objects
        .annotate(distance=L2Distance('embedding', query_vector))
        .order_by('distance')[:top_k]
    )

    return [
        {"content": chunk.content, "score": chunk.distance}
        for chunk in chunks
    ]
```

### The RAG Chain

```python
# services/rag.py
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
from langchain.llms import Ollama

PROMPT_TEMPLATE = """Use the following context to answer the question.
If you don't know the answer, say so — don't make things up.

Context:
{context}

Question: {question}

Answer:"""

def generate_answer(query: str):
    context_docs = retrieve_context(query)
    context = "\n\n".join([doc["content"] for doc in context_docs])

    llm = Ollama(model="llama3")
    prompt = PromptTemplate(
        template=PROMPT_TEMPLATE,
        input_variables=["context", "question"]
    )

    chain = prompt | llm
    response = chain.invoke({
        "context": context,
        "question": query
    })

    return {
        "answer": response,
        "sources": context_docs
    }
```

## Django API Endpoint

```python
# views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

class RAGQueryView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        query = request.data.get("query")
        if not query:
            return Response({"error": "Query is required"}, status=400)

        result = generate_answer(query)
        return Response(result)
```

## Production Considerations

### 1. Chunking Strategy Matters

The quality of your RAG system depends heavily on how you split documents. We found that:

- **1000 tokens per chunk** with **200 token overlap** works well for most documents
- Using semantic boundaries (paragraphs, sections) preserves context better than fixed-size splits
- Metadata-enriched chunks (source, page number, section title) improve retrieval quality

### 2. Hybrid Search

Pure vector similarity search can miss keyword-specific matches. We combine:

- **Semantic search** (pgvector) for conceptual similarity
- **Full-text search** (PostgreSQL `tsvector`) for keyword matching
- **Reciprocal Rank Fusion** to combine results

### 3. Caching

For repeated queries, we cache embeddings and responses using Redis with a TTL:

```python
import hashlib
from django.core.cache import cache

def cached_generate(query: str):
    cache_key = f"rag:{hashlib.md5(query.encode()).hexdigest()}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    result = generate_answer(query)
    cache.set(cache_key, result, timeout=3600)
    return result
```

### 4. Evaluation

We use RAGAS metrics to evaluate retrieval quality: faithfulness, answer relevancy, and context precision. This helps us tune chunk size, overlap, and retrieval parameters.

## Conclusion

Django + Langchain is a powerful combination for building production RAG systems. Django handles the "boring but essential" parts (auth, admin, ORM, migrations) while Langchain provides the LLM orchestration layer. With pgvector, you get a vector database without adding another service to your stack.

---

_This post is based on my experience building AI systems at Orbit Tech Solution and Bagus Harapan Tritunggal._
