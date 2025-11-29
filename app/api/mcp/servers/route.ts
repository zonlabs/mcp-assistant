import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SAVE_MCP_SERVER_MUTATION, REMOVE_MCP_SERVER_MUTATION } from "@/lib/graphql";

const GRAPHQL_ENDPOINT = process.env.BACKEND_URL+"/api/graphql" || "http://localhost:8000/api/graphql";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.googleIdToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, transport, url, command, args, headers, queryParams, requiresOauth, isPublic, description, categoryIds } = body;

    // Prepare headers and queryParams as JSON objects (not strings)
    const headersObj = headers && Object.keys(headers).length > 0 ? headers : null;
    const queryParamsObj = queryParams && Object.keys(queryParams).length > 0 ? queryParams : null;
    const argsObj = args ? (typeof args === 'string' ? JSON.parse(args) : args) : null;

    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.googleIdToken}`,
      },
      body: JSON.stringify({
        query: SAVE_MCP_SERVER_MUTATION,
        variables: {
          name,
          transport,
          url,
          command,
          args: argsObj,
          headers: headersObj,
          queryParams: queryParamsObj,
          requiresOauth2: requiresOauth,
          isPublic: isPublic,
          description: description,
          categoryIds: categoryIds || null
        },
      }),
    });

    // Check if response is JSON
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      await response.text();
      return NextResponse.json(
        { error: "Backend server returned invalid response" },
        { status: 500 }
      );
    }

    const result = await response.json();

    if (!response.ok || result.errors) {
      return NextResponse.json(
        { error: result.errors?.[0]?.message || "Failed to save server" },
        { status: response.status }
      );
    }

    return NextResponse.json({ data: result.data.saveMcpServer });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.googleIdToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const serverName = searchParams.get("name");

    if (!serverName) {
      return NextResponse.json({ error: "Server name is required" }, { status: 400 });
    }

    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.googleIdToken}`,
      },
      body: JSON.stringify({
        query: REMOVE_MCP_SERVER_MUTATION,
        variables: { serverName },
      }),
    });

    // Check if response is JSON
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      await response.text();
      return NextResponse.json(
        { error: "Backend server returned invalid response" },
        { status: 500 }
      );
    }

    const result = await response.json();

    if (!response.ok || result.errors) {
      return NextResponse.json(
        { error: result.errors?.[0]?.message || "Failed to remove server" },
        { status: response.status }
      );
    }

    return NextResponse.json({ data: result.data.removeMcpServer });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
