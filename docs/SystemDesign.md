# System Design & Scalability Guidelines

This document details the **System Design, Performance Optimization, and Scalability Architecture** of **Khabar100 2.0**. It outlines our design choices regarding API rate limiting, search caching, vector index tuning, and horizontal scaling strategies to operate a high-performance educational platform.

---

## 1. Local Search Caching Gating

During daily news processing, the pipeline queries search engines (Serper.dev or Tavily.com) to augment facts with live background details. 
- **The Bottleneck**: High-yield search APIs charge per-query credits. Running broad-scale daily searches across hundreds of news fragments can quickly deplete API balances and introduce significant latency.
- **The Design Solution**: Khabar100 2.0 implements a memory-based **Search Cache Matrix** (`searchCache`). Before executing an HTTP request to any external search api, the query string is trimmed, lowercased, and checked against the cache. If a cache hit occurs, the pipeline reuses the existing context, achieving sub-millisecond retrievals and conserving valuable API credits.

---

## 2. Serverless Edge Scaling & Connection Multiplexing

Deploying Next.js API routes onto serverless environments like Vercel introduces severe relational database challenges. Because serverless routes spin up on-demand as isolated, short-lived micro-containers, traditional persistent database connection pools will fail.
- **Direct Connection Bottleneck**: Each on-demand serverless function attempts to establish a direct connection to PostgreSQL. Under high concurrent user traffic (e.g., during daily morning mock tests), this triggers port exhaustion, causing the database to reject incoming connections and return 500 errors.
- **PgBouncer Connection Pooling**: To scale seamlessly, Khabar100 2.0 routes all runtime queries through **PgBouncer** (integrated on Supabase, Port 6543, appending `?pgbouncer=true` to the connection string). PgBouncer operates in **Transaction Pooling Mode**, multiplexing a small pool of persistent database connections across thousands of serverless requests, enabling the system to scale to infinite traffic with low memory footprints.

---

## 3. pgvector Performance Tuning (HNSW Indexing)

As our daily MCQ question banks and 16-Year past year questions scale into tens of thousands of records, standard linear vector similarity searches (`ORDER BY embedding <=> query_embedding`) become slow.
- **The Indexing Solution**: We apply **Hierarchical Navigable Small World (HNSW)** indexes on our vector columns:
  ```sql
  CREATE INDEX idx_mcq_embedding_hnsw ON generated_mcqs USING hnsw (embedding vector_cosine_ops);
  ```
- **Why HNSW over IVFFlat**: 
  - **IVFFlat** requires building a training list of clusters first, making it perform poorly when new questions are added daily (the index must be constantly rebuilt).
  - **HNSW** builds a multi-layer graph of vectors directly during insertions. It achieves high similarity search accuracy (99% recall), queries in logarithmic time $O(\log N)$, and does not require constant training cycles, making it the perfect choice for a dynamic, daily-growing question database.

---

## 4. API Rate Limiting & Gating

To prevent abuse of our computationally intensive AI completion routes and scheduled endpoints, the platform implements several gating layers:
1. **Cron Token Authentication**: GET/POST requests to `/api/cron/generate` are secured behind Vercel's `CRON_SECRET` header. Requests failing signature verification are instantly terminated.
2. **Next.js Middleware Rate Limiter**: Implements IP-based token-bucket rate limiting on server routes (e.g., `/api/payments/create-order` or `/api/questions/`), preventing automated bots from flooding the payment processor or scraping question databases.
3. **Database Row-Level Security (RLS)**: Public client access is strictly revoked on operational tables. All operations flow through server-gated Next.js routes, preventing direct data harvesting.
