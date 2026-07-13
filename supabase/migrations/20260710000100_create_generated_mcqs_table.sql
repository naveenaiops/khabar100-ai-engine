-- Create Generated MCQs Table to store AI output candidates for review
CREATE TABLE IF NOT EXISTS generated_mcqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_category_id UUID REFERENCES exam_categories(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options JSONB NOT NULL, -- Format: {"A": "...", "B": "...", "C": "...", "D": "..."}
    correct_option TEXT NOT NULL, -- "A" | "B" | "C" | "D"
    explanation TEXT NOT NULL,
    reasoning_type TEXT NOT NULL CHECK (reasoning_type IN ('repeated', 'similar', 'syllabus')),
    matched_pyq_id TEXT REFERENCES pyqs(id) ON DELETE SET NULL,
    matched_pyq_year INT,
    subject_tag TEXT NOT NULL, -- "Polity", "Economy", "Environment", etc.
    source_article_url TEXT,
    review_status TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE generated_mcqs ENABLE ROW LEVEL SECURITY;

-- Allow the Supabase service_role (server-side Next.js endpoints) to fully access and manage generated_mcqs.
-- Standalone client-side Standard users will have zero direct read/write privileges by default unless authenticated as admin.
