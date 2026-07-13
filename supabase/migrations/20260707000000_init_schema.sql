-- Enable pgvector extension for similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Create Exam Categories Table
CREATE TABLE IF NOT EXISTS exam_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed Exam Categories
INSERT INTO exam_categories (name, slug) VALUES 
('UPSC Prelims', 'upsc-prelims'),
('RPSC', 'rpsc')
ON CONFLICT (name) DO NOTHING;

-- Create Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY, -- Maps to auth.users.id
    google_id TEXT,
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    subscription_status TEXT NOT NULL DEFAULT 'free', -- 'free' | 'active'
    subscription_expiry TIMESTAMP WITH TIME ZONE,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    preferred_category UUID REFERENCES exam_categories(id)
);

-- Create Syllabus Nodes Table
CREATE TABLE IF NOT EXISTS syllabus_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_category_id UUID NOT NULL REFERENCES exam_categories(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    topic TEXT NOT NULL,
    parent_id UUID REFERENCES syllabus_nodes(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create PYQs Table (Past Year Questions)
CREATE TABLE IF NOT EXISTS pyqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_category_id UUID NOT NULL REFERENCES exam_categories(id) ON DELETE CASCADE,
    year INT NOT NULL,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- Format: {"A": "...", "B": "...", "C": "...", "D": "..."}
    correct_option TEXT NOT NULL, -- "A" | "B" | "C" | "D"
    syllabus_node_id UUID REFERENCES syllabus_nodes(id) ON DELETE SET NULL,
    embedding VECTOR(1536), -- OpenAI or Gemini embeddings (1536 dimensions)
    source TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Daily Questions Table
CREATE TABLE IF NOT EXISTS daily_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_category_id UUID NOT NULL REFERENCES exam_categories(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    question_number INT NOT NULL CHECK (question_number BETWEEN 1 AND 100),
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- Format: {"A": "...", "B": "...", "C": "...", "D": "..."}
    correct_option TEXT NOT NULL, -- "A" | "B" | "C" | "D"
    explanation TEXT NOT NULL,
    reasoning_type TEXT NOT NULL CHECK (reasoning_type IN ('repeated', 'similar', 'syllabus')),
    reasoning_detail TEXT, -- Details like "Asked in UPSC Prelims 2013." or "Syllabus Paper 3"
    matched_pyq_id UUID REFERENCES pyqs(id) ON DELETE SET NULL,
    matched_pyq_year INT,
    syllabus_node_id UUID REFERENCES syllabus_nodes(id) ON DELETE SET NULL,
    subject_tag TEXT NOT NULL, -- "Polity", "Economy", "Environment", etc.
    source_article_url TEXT NOT NULL,
    review_status TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    quality_gate_flags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Enforce uniqueness of active question numbers per day + category
    CONSTRAINT uniq_daily_question_num UNIQUE (exam_category_id, date, question_number)
);

-- Create Reading Sessions Table for Gating
CREATE TABLE IF NOT EXISTS reading_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exam_category_id UUID NOT NULL REFERENCES exam_categories(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    session_started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    questions_unlocked_count INT NOT NULL DEFAULT 20,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uniq_user_category_date_session UNIQUE (user_id, exam_category_id, date)
);

-- Create Subscriptions Table (Razorpay Order Logging)
CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY, -- Razorpay Order/Subscription ID
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan TEXT NOT NULL DEFAULT 'monthly',
    amount NUMERIC(10, 2) NOT NULL,
    payment_id TEXT UNIQUE,
    status TEXT NOT NULL, -- 'created' | 'paid' | 'failed' | 'cancelled'
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE exam_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE syllabus_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pyqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------
-- RLS POLICIES
-- ----------------------------------------------------

-- 1. Exam Categories: Public SELECT access
CREATE POLICY select_exam_categories_policy ON exam_categories
    FOR SELECT TO public USING (true);

-- 2. Users: Can view and update their own user profile
CREATE POLICY select_users_self_policy ON users
    FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY update_users_self_policy ON users
    FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 3. Syllabus Nodes, PYQs, Daily Questions, Reading Sessions, Subscriptions
-- DO NOT define public SELECT/INSERT/UPDATE policies for these.
-- This ensures they can ONLY be queried/modified by the Supabase service_role key
-- (used server-side in our Next.js API endpoints).
-- Authenticated or anonymous users trying to access these tables via standard
-- client-side JS SDK queries will be blocked by default (returns zero rows/error).

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_daily_questions_date_cat ON daily_questions(date, exam_category_id);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_user_date ON reading_sessions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_pyqs_category_embedding ON pyqs USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
