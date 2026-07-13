# Khabar100 2.0 (Public Portfolio Edition)

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?style=flat-square&logo=supabase)](https://supabase.com/)
[![OpenRouter](https://img.shields.io/badge/AI-OpenRouter_&_Gemini-orange?style=flat-square&logo=google-gemini)](https://openrouter.ai/)
[![License](https://img.shields.io/badge/License-MIT-purple?style=flat-square)](LICENSE)

**Khabar100 2.0** is an enterprise-grade, serverless AI-augmented EdTech SaaS platform designed to help civil service aspirants crack the rigorous UPSC Civil Services Examination (CSE) GS1 Prelims. 

By scraping and synthesizing daily national current affairs with 16 years of historical Past Year Questions (PYQs), Khabar100 2.0 automatically formulates highly challenging, multi-statement UPSC-standard mock questions and detailed conceptual explanations every single day.

---

## 🚀 Key Platform Capabilities

- **Daily News Ingestion Scraper**: Multi-tiered scraper that pulls and consolidates daily news from official press bulletins (Press Information Bureau) and top civil service preparation portals (Drishti IAS, VisionIAS, etc.).
- **AI Syllabus Fact Decomposition**: Analyzes raw daily articles and extracts high-yield facts matching the 16-year UPSC Prelims weightage, filtering out local gossip and non-exam-relevant items.
- **pgvector Cosine Similarity Matcher**: Vectorizes incoming news and matches facts against the historical 16-Year UPSC question database using cosine similarity to anchor question formulation.
- **RAG Live Context Augmentation**: Triggers real-time web search hooks to pull statutory acts, ministries, and conceptual background files as reference facts to eliminate LLM hallucinations.
- **Modern 3-Statement MCQ Synthesis**: Synthesizes challenging UPSC-style questions with options (*'Only one', 'Only two', 'All three', 'None'*) and deep, citation-gated logical explanations.
- **Logical Quality Gate & Deduplication Gating**: Runs an automated audit loop to reject poor or predictable questions, combined with vector-based checks to block semantic duplicate questions.
- **Cookie-Synchronized Auth & SSR Gating**: Uses `@supabase/ssr` to synchronize client-side Google OAuth states with secure HTTP-only server cookies for fast, FOUC-free page loads.
- **Subscription-Ready Gateway (Razorpay)**: Integrates payment routes to automate monthly subscriptions (₹49/month) with secure, signature-verified server webhooks.

---

## 🛠️ Architecture & System Topology

The platform utilizes a modern serverless-first architecture optimized for performance, security, and low operational cost.

```mermaid
graph TD
    User["Student Web Browser"] <-->|React UI / Tailwind| NextJS["Next.js Serverless Backend (Vercel)"]
    NextJS <-->|@supabase/ssr Session Sync| SupabaseAuth["Supabase Auth Service"]
    NextJS <-->|PgBouncer Connection Pooling| SupabaseDB["Supabase PostgreSQL (pgvector)"]
    Cron["Vercel Cron Service"] -->|Daily Ingestion Trigger| NextJS
    NextJS -->|AI Synthesis Gateway| OpenRouter["OpenRouter & Gemini Models"]
```

---

## 📂 Exhaustive Technical Documentation

For in-depth explanations of system topology, database schemas, prompting frameworks, and algorithms, explore our comprehensive technical guides:

*   [**System Architecture & Topology**](docs/Architecture.md): Complete cloud hosting layout and data flow pathways.
*   [**Local Installation & Sandbox Setup**](docs/Installation.md): Local development prerequisites and mock configurations.
*   [**Production Deployment Guide**](docs/Deployment.md): Deploying Next.js to Vercel and linking with Supabase connection pools.
*   [**UPSC News Processing Pipeline**](docs/Pipeline.md): Detailed 10-stage daily ingestion scraper and vector matching mechanics.
*   [**Database Schemas & RLS Gating**](docs/Database.md): PostgreSQL schemas, indexing strategies (HNSW), and Row-Level Security.
*   [**Authentication & Session Cookie Sync**](docs/Authentication.md): Handling SSR authorization with secure HTTP-only cookies.
*   [**AI Generation & Validation Loops**](docs/AI-Workflow.md): Deep-dive into LLM synthesis workflows and quality control gates.
*   [**Prompt Engineering & UPSC Archetypes**](docs/PromptEngineering.md): Structured JSON formatting and statement formulation blueprints.
*   [**System Design & Performance Scaling**](docs/SystemDesign.md): Optimizing search caches, PgBouncer pooling, and vector search speeds.

---

## 💻 Local Installation Quickstart

Khabar100 2.0 features a plug-and-play local development experience. The system automatically detects missing API keys and initiates **Portfolio Sandbox Mode**, simulating external APIs (OpenRouter, Gemini Embeddings, Razorpay Payments) with high-fidelity mock data.

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/khabar100.git
   cd khabar100
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Configure Environment variables**:
   ```bash
   cp .env.example .env.local
   ```
   *(You can leave `.env.local` blank! The app will gracefully run in sandbox mode with mock data).*
4. **Launch development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` to interact with the platform.

---

## 📜 License & Open Source Guidelines

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md) before submitting pull requests.
