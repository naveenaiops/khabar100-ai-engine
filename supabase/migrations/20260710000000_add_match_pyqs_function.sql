-- 1. Drop existing index and adjust pyqs column to 768 dimensions
DROP INDEX IF EXISTS idx_pyqs_category_embedding;
ALTER TABLE pyqs DROP COLUMN IF EXISTS embedding;
ALTER TABLE pyqs ADD COLUMN embedding VECTOR(768);

-- 2. Create the fast vector search index for 768 dimensions
CREATE INDEX IF NOT EXISTS idx_pyqs_category_embedding ON pyqs USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 3. Stored function to compute similarity and match PYQs
CREATE OR REPLACE FUNCTION match_pyqs(
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  category_id uuid
)
RETURNS TABLE (
  id uuid,
  exam_category_id uuid,
  year int,
  question_text text,
  options jsonb,
  correct_option text,
  syllabus_node_id uuid,
  source text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pyqs.id,
    pyqs.exam_category_id,
    pyqs.year,
    pyqs.question_text,
    pyqs.options,
    pyqs.correct_option,
    pyqs.syllabus_node_id,
    pyqs.source,
    1 - (pyqs.embedding <=> query_embedding) AS similarity
  FROM pyqs
  WHERE pyqs.exam_category_id = category_id
    AND 1 - (pyqs.embedding <=> query_embedding) > match_threshold
  ORDER BY pyqs.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
