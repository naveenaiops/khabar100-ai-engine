# System Architecture & Topology Guide

This document outlines the high-level system architecture, core topology, and data flow of **Khabar100 2.0**. It showcases how modern web-gating, automated LLM generation pipelines, vector databases, and billing platforms are cohesive parts of a secure, production-grade SaaS product.

---

## 1. High-Level Architectural Philosophy

Khabar100 2.0 is built as a serverless-first, AI-augmented educational platform. The design is structured around three primary layers:
1. **Client / Interface Layer (Next.js)**: A responsive, premium frontend written in React with Tailwind CSS, utilizing cookie-synchronized Server-Side Rendering (SSR) for fast content load times and secure route gating.
2. **Persistence & Vector Search Layer (Supabase / PostgreSQL)**: A relational database with a vector-embedding extension (`pgvector`) used to store syllabus maps, user data, subscriptions, daily questions, and Past Year Questions (PYQs).
3. **AI Generation & Synthesis Layer (OpenRouter / Gemini / Serper)**: A serverless data-ingestion pipeline triggered via scheduled cron jobs to scrape daily national news, process and filter relevance, map topic areas to the syllabus, and synthetically formulate highly rigorous UPSC-grade questions.

---

## 2. System Topology Diagram

The following topology diagram illustrates the relationships between the client interface, API gateways, external microservices, and database persistence layers:

```mermaid
graph TD
    %% Styling
    classDef client fill:#3b82f6,stroke:#1d4ed8,stroke-width:2px,color:#fff;
    classDef server fill:#10b981,stroke:#047857,stroke-width:2px,color:#fff;
    classDef db fill:#8b5cf6,stroke:#6d28d9,stroke-width:2px,color:#fff;
    classDef ext fill:#f59e0b,stroke:#b45309,stroke-width:2px,color:#fff;

    %% Client Layer
    subgraph ClientLayer ["Client Interface Layer (Next.js UI)"]
        Browser["User Web Browser"]:::client
        CheckoutModal["Razorpay SDK Checkout"]:::client
    end

    %% Next.js Serverless Gateway
    subgraph NextServer ["Next.js Serverless Backend (Vercel)"]
        APIGateway["Next.js Server-Side API Gateway"]:::server
        AuthSync["@supabase/ssr Cookie Sync"]:::server
        RAGPipeline["UPSC News MCQ Ingestion Pipeline"]:::server
        PaymentAPI["Razorpay Order Controller"]:::server
    end

    %% External SaaS Services
    subgraph ExternalSaaS ["External Gateways & AI Models"]
        VercelCron["Vercel Cron Scheduler"]:::ext
        OpenRouter["OpenRouter API (Gemini/GPT)"]:::ext
        GeminiAPI["Google Gemini Embedding API"]:::ext
        SerperAPI["Serper / Tavily Search API"]:::ext
        RazorpayGateway["Razorpay SaaS Backend"]:::ext
        NewsSources["Whitelisted News (PIB, Drishti, etc.)"]:::ext
    end

    %% Supabase Backend
    subgraph SupabaseDB ["Supabase Persistence Layer"]
        Postgres["PostgreSQL Database Engine"]:::db
        PGVector["pgvector (Similarity Matcher)"]:::db
        SupabaseAuth["Supabase Auth Service"]:::db
        RLS["Row Level Security Policies"]:::db
    end

    %% Relationships
    Browser -->|HTTPS / JSON| APIGateway
    Browser -->|Session Sync| AuthSync
    AuthSync -->|Verify JWT Cookies| SupabaseAuth
    
    APIGateway -->|Standard Queries| RLS
    RLS --> Postgres
    
    VercelCron -->|HTTPS POST + Secret Token| RAGPipeline
    RAGPipeline -->|1. Scrape Daily Current Events| NewsSources
    RAGPipeline -->|2. Query External Facts| SerperAPI
    RAGPipeline -->|3. Calculate Text Embeddings| GeminiAPI
    RAGPipeline -->|4. Structural MCQs Synthesis| OpenRouter
    RAGPipeline -->|5. Insert & Check Duplicates| PGVector
    
    Browser -->|Initiate Checkout| PaymentAPI
    PaymentAPI -->|Create Order Signature| RazorpayGateway
    RazorpayGateway -->|HTTPS Webhook (Payment Captured)| PaymentAPI
    PaymentAPI -->|Update User subscription_status| Postgres
    
    CheckoutModal -->|Checkout Complete| RazorpayGateway
```

---

## 3. Data Flow Pathways

### A. The Ingestion & Question Generation Loop (Daily Cron)
1. **Trigger**: Vercel Cron initiates a secured POST request to `/api/cron/generate`.
2. **Ingestion**: The pipeline fetches raw HTML news data from whitelisted primary national publications.
3. **Decomposition**: Text content is split into chunks and processed via LLM models using a validation/filtering prompt to construct a "Syllabus Dimension Fact Matrix".
4. **Vector Matching**: A 768-dimension vector embedding is generated for each extracted fact and matched against past year UPSC questions (`pyqs` table) using cosine similarity.
5. **Synthesis**: Challenge MCQ templates are compiled by combining the live facts, matched PYQ structure guides, and contextual web search insights.
6. **Verification**: Newly synthesized MCQs are passed through a Logical Quality Gate prompt.
7. **Insertion**: Validated, deduplicated MCQs are stored in the `generated_mcqs` table with a computed SHA-256 content hash.

### B. User Authentication & Authorization Gating
1. **Login**: Users authenticate on the browser using Google OAuth or email sign-in via Supabase Client.
2. **Session Cookie Sync**: The `@supabase/ssr` client captures the JWT session tokens and securely sets them as server HTTP-only cookies.
3. **SSR Page Gating**: When a user requests `/dashboard` or `/practice`, the Next.js server-side component parses the HTTP cookies, verifies the JWT signature against Supabase, and checks if the user's `subscription_status` is active.
4. **API Security**: Row Level Security (RLS) is active on operational tables, ensuring standard users cannot bypass server gating to extract daily question banks directly.

### C. subscription & Payment Operations (Razorpay)
1. **Order Initiation**: Users click "Subscribe to Practice" (₹49/month).
2. **API Communication**: The frontend calls `/api/payments/create-order`. The endpoint communicates with Razorpay APIs to generate a secure order ID.
3. **Checkout Portal**: The Razorpay Checkout SDK displays the transaction modal in the browser.
4. **Instant Activation**: Once payment succeeds, Razorpay’s server fires a secure, HMAC-SHA256 signed POST webhook to `/api/payments/webhook`.
5. **Database Update**: The server-side webhook checks the signature, reads the customer metadata from payment notes, and marks the user's `subscription_status` as `active` for 30 days.
