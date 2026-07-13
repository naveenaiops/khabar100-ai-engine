-- Create Attempts Table for Practice Mode analytics
CREATE TABLE IF NOT EXISTS attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID, -- Can be NULL for guest/anonymous practice sessions
    question_id TEXT NOT NULL, -- Supports both mock IDs (e.g. upsc-1) and real DB UUIDs
    selected_option TEXT NOT NULL CHECK (selected_option IN ('A', 'B', 'C', 'D')),
    is_correct BOOLEAN NOT NULL,
    time_taken_seconds INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on attempts table
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;

-- Allow insert access for service_role or authenticated users
CREATE POLICY service_role_all_policy ON attempts
    FOR ALL TO service_role USING (true);
