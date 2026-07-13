# Local Installation & Setup Guide

This guide walks you through setting up **Khabar100 2.0** for local development. By design, this portfolio edition features a plug-and-play local experience using robust sandbox/mock modes, allowing you to run and preview the application without needing active third-party API credentials.

---

## 1. Prerequisites

Before starting, ensure you have the following installed on your machine:
- **Node.js**: v18.x or later (v20.x recommended)
- **npm** or **yarn**
- **Git**

---

## 2. Step-by-Step Installation

### Step A: Clone the Repository
```bash
git clone https://github.com/your-username/khabar100.git
cd khabar100
```

### Step B: Install Dependencies
```bash
npm install
```

### Step C: Configure Environment Variables
1. Copy the provided `.env.example` template to a new file named `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Open `.env.local` in your editor.
3. *Note*: You can leave the API credentials blank! The application will automatically detect missing keys and switch to **Portfolio Sandbox Mode**, where all external APIs (OpenRouter, Gemini Embeddings, Razorpay Payments) are elegantly simulated with high-fidelity mock data.

---

## 3. Running the Application Locally

Start the local development server:
```bash
npm run dev
```

Open your browser and navigate to `http://localhost:3000`. You will see the Khabar100 2.0 landing page.

---

## 4. Understanding Sandbox Fallback Modes

To allow recruiters and developers to test the product with zero friction, the application implements active mock gateways on key features:

| Feature | Production Behavior | Local Sandbox Mode (Default) |
| --- | --- | --- |
| **UPSC MCQ Gen** | Calls OpenRouter (`gemini-2.5-flash`) | Generates realistic mock 3-statement Polity/Governance questions with dynamic network delays. |
| **Vector Embeddings** | Calls Gemini API (`text-embedding-004`) | Generates a mathematically normalized 768-dimensional mock unit vector. |
| **Razorpay Payments** | Creates active financial orders | Creates mock sandbox order IDs starting with `order_mock_` and initializes simulated widgets. |
| **Payment Webhook** | Verifies HMAC-SHA256 signature from Razorpay servers | Bypasses signature checks if request contains `x-mock-payment-signature: true` header. |
| **Database Writing** | Saves records securely into Supabase PostgreSQL | Logs generated question streams, payment payloads, and database records directly to the terminal console. |

---

## 5. Setting up a Live Database (Optional)

If you wish to test with a live Supabase backend:

1. **Create a Supabase Project**: Sign up at [supabase.com](https://supabase.com) and spin up a new PostgreSQL database.
2. **Apply Database Migrations**:
   - Install the Supabase CLI: `npm install -g supabase`
   - Link your project: `supabase link --project-ref your-project-ref`
   - Apply migrations: `supabase db push`
3. **Configure Environment Variables**:
   In `.env.local`, fill in the following keys with credentials from your Supabase Dashboard:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_public_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_private_service_role_key
   DATABASE_URL=your_direct_postgres_connection_string
   ```
4. **Restart Dev Server**: `npm run dev` to sync live database writes!
