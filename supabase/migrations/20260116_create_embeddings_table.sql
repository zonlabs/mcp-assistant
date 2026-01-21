-- =============================================================================
-- MCP Server Embeddings Table - Complete Schema
-- Based on lib/ai/embedding.ts implementation
-- =============================================================================

-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop existing objects if they exist (for clean recreation)
DROP TRIGGER IF EXISTS update_mcp_server_embeddings_updated_at ON mcp_server_embeddings;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS match_server_embeddings(vector, float, int) CASCADE;
DROP TABLE IF EXISTS mcp_server_embeddings CASCADE;

-- =============================================================================
-- CREATE TABLE
-- =============================================================================
CREATE TABLE mcp_server_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id VARCHAR(191) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding VECTOR(1536) NOT NULL,
  server_name VARCHAR(191),
  server_url TEXT,
  remote_url TEXT,
  transport VARCHAR(50),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- CREATE INDEXES
-- =============================================================================

-- Index for faster similarity searches using HNSW (Hierarchical Navigable Small World)
CREATE INDEX mcp_server_embeddings_embedding_idx
ON mcp_server_embeddings
USING hnsw (embedding vector_cosine_ops);

-- Index on server_id for faster lookups
CREATE INDEX mcp_server_embeddings_server_id_idx
ON mcp_server_embeddings (server_id);

-- Index on user_id for faster user-specific queries
CREATE INDEX mcp_server_embeddings_user_id_idx
ON mcp_server_embeddings (user_id);

-- Index on server_name for faster searches
CREATE INDEX mcp_server_embeddings_server_name_idx
ON mcp_server_embeddings (server_name);

-- =============================================================================
-- CREATE FUNCTIONS
-- =============================================================================

-- Function to match server embeddings by similarity
-- Returns server metadata along with matching content
CREATE FUNCTION match_server_embeddings(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 4
)
RETURNS TABLE (
  id UUID,
  server_id VARCHAR(191),
  content TEXT,
  similarity FLOAT,
  server_name VARCHAR(191),
  server_url TEXT,
  remote_url TEXT,
  transport VARCHAR(50),
  description TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    mcp_server_embeddings.id,
    mcp_server_embeddings.server_id,
    mcp_server_embeddings.content,
    1 - (mcp_server_embeddings.embedding <=> query_embedding) AS similarity,
    mcp_server_embeddings.server_name,
    mcp_server_embeddings.server_url,
    mcp_server_embeddings.remote_url,
    mcp_server_embeddings.transport,
    mcp_server_embeddings.description
  FROM mcp_server_embeddings
  WHERE 1 - (mcp_server_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY mcp_server_embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to update the updated_at timestamp
CREATE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- CREATE TRIGGERS
-- =============================================================================

-- Trigger to automatically update updated_at timestamp
CREATE TRIGGER update_mcp_server_embeddings_updated_at
BEFORE UPDATE ON mcp_server_embeddings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- =============================================================================

ALTER TABLE mcp_server_embeddings ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- CREATE RLS POLICIES
-- =============================================================================

-- Users can view all embeddings (for semantic search)
CREATE POLICY "Users can view all embeddings"
ON mcp_server_embeddings
FOR SELECT
TO authenticated
USING (true);

-- Users can insert embeddings (user_id can be null for public servers)
CREATE POLICY "Users can insert embeddings"
ON mcp_server_embeddings
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Users can update their own embeddings
CREATE POLICY "Users can update their own embeddings"
ON mcp_server_embeddings
FOR UPDATE
TO authenticated
USING (user_id IS NULL OR auth.uid() = user_id);

-- Users can delete their own embeddings
CREATE POLICY "Users can delete their own embeddings"
ON mcp_server_embeddings
FOR DELETE
TO authenticated
USING (user_id IS NULL OR auth.uid() = user_id);

-- Staff can update any embeddings
CREATE POLICY "Staff can update any embeddings"
ON mcp_server_embeddings
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'staff'
  )
);

-- Staff can delete any embeddings
CREATE POLICY "Staff can delete any embeddings"
ON mcp_server_embeddings
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'staff'
  )
);

-- =============================================================================
-- USAGE NOTES
-- =============================================================================
--
-- To insert an embedding with server metadata:
-- INSERT INTO mcp_server_embeddings
--   (server_id, content, embedding, server_name, server_url, remote_url, transport, description)
-- VALUES
--   ('server-123', 'Server description chunk', '[0.1, 0.2, ...]'::vector,
--    'My Server', 'http://localhost:3000', 'https://api.example.com', 'sse', 'Full description');
--
-- To search for similar embeddings (call this from your app):
-- SELECT * FROM match_server_embeddings(
--   '[0.1, 0.2, ...]'::vector(1536),  -- query embedding
--   0.5,                               -- similarity threshold (0-1)
--   4                                  -- max results
-- );
--
-- To delete all embeddings for a specific server:
-- DELETE FROM mcp_server_embeddings WHERE server_id = 'server-123';
--
