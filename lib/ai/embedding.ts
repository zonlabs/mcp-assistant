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
 * Uses cosine similarity to find the most relevant chunks
 */
export const findRelevantContent = async (
  userQuery: string,
  tableName: string = 'mcp_server_embeddings',
  similarityThreshold: number = 0.5,
  limit: number = 4
) => {
  const supabase = await createClient();
  const userQueryEmbedded = await generateEmbedding(userQuery);

  // Use Supabase's pgvector extension for similarity search
  const { data, error } = await supabase.rpc('match_embeddings', {
    query_embedding: userQueryEmbedded,
    match_threshold: similarityThreshold,
    match_count: limit,
    table_name: tableName
  });

  if (error) {
    console.error('Error finding relevant content:', error);
    return [];
  }

  return data;
};

/**
 * Store embeddings for MCP server data in Supabase
 * Deletes existing embeddings for the server before inserting new ones
 */
export const storeServerEmbeddings = async (
  serverId: string,
  content: string,
  userId: string
) => {
  const supabase = await createClient();

  // Delete existing embeddings for this server to avoid duplicates
  await supabase
    .from('mcp_server_embeddings')
    .delete()
    .eq('server_id', serverId)
    .eq('user_id', userId);

  // Generate new embeddings
  const embeddings = await generateEmbeddings(content);

  // Store each embedding chunk
  const embeddingRecords = embeddings.map(({ content: chunk, embedding }) => ({
    server_id: serverId,
    content: chunk,
    embedding: embedding,
    user_id: userId,
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
