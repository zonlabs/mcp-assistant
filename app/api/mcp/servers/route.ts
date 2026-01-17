import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SAVE_MCP_SERVER_MUTATION, REMOVE_MCP_SERVER_MUTATION } from "@/lib/graphql";
import { storeServerEmbeddings } from "@/lib/ai/embedding";

const GRAPHQL_ENDPOINT = (process.env.BACKEND_URL || "http://127.0.0.1:8000") + "/api/graphql";

// --- Helpers ---

async function getAuthenticatedSession() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

async function callGraphQL(token: string, query: string, variables: Record<string, any>) {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  const contentType = response.headers.get("content-type");
  if (!contentType?.includes("application/json")) {
    throw new Error("Backend server returned invalid response format");
  }

  const result = await response.json();
  if (!response.ok || result.errors) {
    throw new Error(result.errors?.[0]?.message || "GraphQL Operation Failed");
  }

  return result.data;
}

async function handleEmbeddings(savedServer: any, userId: string) {
  try {
    const embeddingContent = [
      savedServer.name,
      savedServer.description,
      savedServer.url,
      savedServer.transport,
    ].filter(Boolean).join('. ');

    await storeServerEmbeddings(savedServer.id, embeddingContent, {
      name: savedServer.name,
      url: savedServer.url,
      remoteUrl: savedServer.url, // or different if you have a remoteUrl field
      transport: savedServer.transport,
      description: savedServer.description,
    });
  } catch (err) {
    console.error('Background Embedding Error:', err);
  }
}

// --- Route Handlers ---

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthenticatedSession();
    if (!session?.access_token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();

    // Normalize data
    const variables = {
      ...body,
      headers: Object.keys(body.headers || {}).length > 0 ? body.headers : null,
      queryParams: Object.keys(body.queryParams || {}).length > 0 ? body.queryParams : null,
      requiresOauth2: body.requiresOauth, // Map key name if backend differs
      categoryIds: body.categoryIds || null
    };

    const data = await callGraphQL(session.access_token, SAVE_MCP_SERVER_MUTATION, variables);
    const savedServer = data.saveMcpServer;

    // Trigger embeddings (Optional: await if it's critical, otherwise let it run)
    if (savedServer?.id) {
      await handleEmbeddings(savedServer, session.user.id); // TODO
    }

    return NextResponse.json({ data: savedServer });
  } catch (error: any) {
    console.error('Error saving MCP server:', error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getAuthenticatedSession();
    if (!session?.access_token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const serverName = request.nextUrl.searchParams.get("name");
    if (!serverName) return NextResponse.json({ error: "Server name is required" }, { status: 400 });

    const data = await callGraphQL(session.access_token, REMOVE_MCP_SERVER_MUTATION, { serverName });
    
    return NextResponse.json({ data: data.removeMcpServer });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}