import { embed, embedMany } from 'ai';
import { createClient } from '@/lib/supabase/server';
import { openai } from '@ai-sdk/openai';

// Use OpenAI's text-embedding-3-small model (1536 dimensions)
const embeddingModel = openai.embeddingModel('text-embedding-3-small'); 
/**
 * Generate chunks from input text by splitting on sentences
 * Can be customized based on your use case
 */
const generateChunks = (input: string): string[] => {
  return input
    .trim()
    .split('.')
    .filter(i => i !== '');
};

/**
 * Generate embeddings for multiple chunks of text
 * Returns array of embeddings with their corresponding content
 */
export const generateEmbeddings = async (
  value: string,
): Promise<Array<{ embedding: number[]; content: string }>> => {
  const chunks = generateChunks(value);
  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: chunks,
  });
  return embeddings.map((e, i) => ({ content: chunks[i], embedding: e }));
};

/**
 * Generate a single embedding from input text
 */
export const generateEmbedding = async (value: string): Promise<number[]> => {
  const input = value.replaceAll('\\n', ' ');
  const { embedding } = await embed({
    model: embeddingModel,
    value: input,
  });
  return embedding;
};

/**
 * Find relevant content by semantic similarity using embeddings
 * Returns server metadata directly from embeddings table
 */
export const findRelevantContent = async (
  userQuery: string,
  tableName: string = 'mcp_server_embeddings',
  similarityThreshold: number = 0.5,
  limit: number = 4
) => {
  const supabase = await createClient();
  const userQueryEmbedded = await generateEmbedding(userQuery);

  // Direct SQL query for similarity search using pgvector
  const { data, error } = await supabase.rpc('match_server_embeddings', {
    query_embedding: userQueryEmbedded,
    match_threshold: similarityThreshold,
    match_count: limit
  });

  if (error) {
    console.error('Error finding relevant content:', error);

    // Fallback: try direct query if RPC doesn't exist
    try {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from(tableName)
        .select('server_id, content, embedding, server_name, server_url, remote_url, transport, description')
        .limit(limit);

      if (fallbackError) throw fallbackError;

      // Calculate similarity client-side as fallback
      const results = fallbackData?.map((item: any) => {
        const similarity = cosineSimilarity(userQueryEmbedded, item.embedding);
        return {
          server_id: item.server_id,
          content: item.content,
          similarity,
          server_name: item.server_name,
          server_url: item.server_url,
          remote_url: item.remote_url,
          transport: item.transport,
          description: item.description,
        };
      })
      .filter((item: any) => item.similarity >= similarityThreshold)
      .sort((a: any, b: any) => b.similarity - a.similarity)
      .slice(0, limit) || [];

      return results;
    } catch (fallbackErr) {
      console.error('Fallback query also failed:', fallbackErr);
      return [];
    }
  }

  return data || [];
};

// Helper function for cosine similarity calculation
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Store embeddings for MCP server data in Supabase
 * Includes server metadata for efficient retrieval
 */
export const storeServerEmbeddings = async (
  serverId: string,
  content: string,
  serverMetadata?: {
    name?: string;
    url?: string;
    remoteUrl?: string;
    transport?: string;
    description?: string;
  }
) => {
  const supabase = await createClient();

  // Delete existing embeddings for this server to avoid duplicates
  await supabase
    .from('mcp_server_embeddings')
    .delete()
    .eq('server_id', serverId);

  // Generate new embeddings
  const embeddings = await generateEmbeddings(content);

  // Store each embedding chunk with server metadata
  const embeddingRecords = embeddings.map(({ content: chunk, embedding }) => ({
    server_id: serverId,
    content: chunk,
    embedding: embedding,
    server_name: serverMetadata?.name || null,
    server_url: serverMetadata?.url || null,
    remote_url: serverMetadata?.remoteUrl || null,
    transport: serverMetadata?.transport || null,
    description: serverMetadata?.description || null,
  }));

  const { data, error } = await supabase
    .from('mcp_server_embeddings')
    .insert(embeddingRecords)
    .select();

  if (error) {
    console.error('Error storing embeddings:', error);
    throw new Error('Failed to store embeddings');
  }

  return data;
};
