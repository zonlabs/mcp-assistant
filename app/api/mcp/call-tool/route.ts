import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { CALL_MCP_SERVER_TOOL_MUTATION } from "@/lib/graphql";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const token = session?.googleIdToken;

  const origin = (process.env.DJANGO_API_URL || process.env.BACKEND_URL)?.replace(/\/$/, "");
  if (!origin) {
    return NextResponse.json({ errors: [{ message: "Server misconfigured" }] }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { serverName, toolName, toolInput } = body;

    if (!serverName || !toolName || !toolInput) {
      return NextResponse.json(
        { errors: [{ message: "Missing required fields: serverName, toolName, toolInput" }] },
        { status: 400 }
      );
    }

    const headers: Record<string, string> = {
      "content-type": "application/json",
    };

    // Only add authorization header if token is available
    if (token) {
      headers.authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${origin}/api/graphql`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        query: CALL_MCP_SERVER_TOOL_MUTATION,
        variables: {
          serverName,
          toolName,
          toolInput
        }
      }),
    });

    // Check if response is JSON
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      await response.text();
      throw new Error("Backend server returned invalid response");
    }

    const result = await response.json();

    if (!response.ok || result.errors) {
      throw new Error(result.errors?.[0]?.message || 'Tool call failed');
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { errors: [{ message: error instanceof Error ? error.message : "Internal server error" }] },
      { status: 500 }
    );
  }
}
