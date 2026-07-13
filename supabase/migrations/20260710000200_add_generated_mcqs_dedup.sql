-- Add Content Hashing and Semantic Embedding columns for robust Deduplication
ALTER TABLE generated_mcqs ADD COLUMN IF NOT EXISTS content_hash TEXT UNIQUE;
ALTER TABLE generated_mcqs ADD COLUMN IF NOT EXISTS embedding VECTOR(768);

-- Create fast vector index for generated_mcqs semantic deduplication checks
CREATE INDEX IF NOT EXISTS idx_generated_mcqs_embedding ON generated_mcqs USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Stored function to perform semantic similarity matching on existing generated_mcqs
CREATE OR REPLACE FUNCTION public.match_generated_mcqs(
  query_embedding vector(768),
  match_threshold double precision,
  match_count integer,
  category_id uuid
)
RETURNS TABLE (
  id uuid,
  similarity double precision
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    generated_mcqs.id,
    (1 - (generated_mcqs.embedding <=> query_embedding))::double precision AS similarity
  FROM generated_mcqs
  WHERE generated_mcqs.exam_category_id = category_id
    AND generated_mcqs.created_at >= NOW() - INTERVAL '30 days'
    AND generated_mcqs.embedding IS NOT NULL
    AND (1 - (generated_mcqs.embedding <=> query_embedding)) > match_threshold
  ORDER BY generated_mcqs.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
