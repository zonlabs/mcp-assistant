export const TOOL_INFO_FRAGMENT = `
  fragment ToolInfoFields on ToolInfo {
    name
    description
    schema
  }
`;

/**
 * Full MCP Server fragment with all fields including connection status and tools.
 *
 * Note: connectionStatus and tools are resolved at the field level from Redis,
 * so only request them when needed. If you only need basic server info,
 * create a lighter fragment without these fields for better performance.
 */
export const MCP_SERVER_FRAGMENT = `
  fragment McpServerFields on MCPServerType {
    id
    name
    transport
    url
    command
    categories {
      id
      name
      slug
    }
    args
    description
    requiresOauth2
    updatedAt
    createdAt
    owner
    isPublic
  }
`;

/**
 * Lightweight MCP Server fragment WITHOUT connection status and tools
 *
 * Connection status and tools are now managed by Next.js session store,
 * not Django backend. Use this fragment for all server queries.
 */
export const MCP_SERVER_CONFIG_FRAGMENT = `
  fragment McpServerConfigFields on MCPServerType {
    id
    name
    transport
    url
    command
    categories {
      id
      name
      slug
    }
    args
    description
    requiresOauth2
    updatedAt
    createdAt
    owner
    isPublic
  }
`;

export const MCP_SERVERS_QUERY = `
query McpServers($first: Int = 10, $after: String, $order: MCPServerOrder, $filters: MCPServerFilter) {
  mcpServers(first: $first, after: $after, order: $order, filters: $filters) {
    totalCount
    edges {
      node {
        ...McpServerConfigFields
      }
      cursor
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
  }
}
${MCP_SERVER_CONFIG_FRAGMENT}
`;

/**
 * Lightweight query for fetching recent MCP servers without connection state.
 *
 * This query deliberately omits connectionStatus and tools fields for better performance,
 * since those fields trigger Redis lookups. Only request those fields when you need them.
 * Uses cursor-based pagination (edges structure) like MCP_SERVERS_QUERY.
 */
export const RECENT_MCP_SERVERS_QUERY = `
  query RecentMcpServers($first: Int, $after: String, $order: MCPServerOrder, $filters: MCPServerFilter) {
    mcpServers(first: $first, after: $after, order: $order, filters: $filters) {
      edges {
        node {
          id
          name
          url
          description
          transport
          createdAt
          updatedAt
          isPublic
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;

export const CONNECT_MCP_SERVER_MUTATION = `
  mutation ConnectServer($serverName: String!) {
    connectMcpServer(name: $serverName) {
      success
      message
      requiresAuth
      authorizationUrl
      state
      server { ...McpServerFields }
    }
  }
  ${MCP_SERVER_FRAGMENT}
`;

export const DISCONNECT_MCP_SERVER_MUTATION = `
  mutation DisconnectServer($serverName: String!) {
    disconnectMcpServer(name: $serverName) {
      success
      message
      server { ...McpServerFields }
    }
  }
  ${MCP_SERVER_FRAGMENT}
`;

export const SAVE_MCP_SERVER_MUTATION = `
  mutation SaveMcpServer(
    $id: String
    $name: String!
    $transport: String!
    $url: String
    $command: String
    $args: JSON
    $headers: JSON
    $queryParams: JSON
    $requiresOauth2: Boolean
    $isPublic: Boolean
    $description: String
    $categoryIds: [String!]
  ) {
    saveMcpServer(
      id: $id
      name: $name
      transport: $transport
      url: $url
      command: $command
      args: $args
      headers: $headers
      queryParams: $queryParams
      requiresOauth2: $requiresOauth2
      isPublic: $isPublic
      description: $description
      categoryIds: $categoryIds
    ) {
    id
    name
    description
    transport
    url
    command
    args
    requiresOauth2
    updatedAt
    createdAt
    owner
    isPublic
    categories {
      id
      name
      slug
    }
    }
  }
`;

export const REMOVE_MCP_SERVER_MUTATION = `
  mutation RemoveMcpServer($serverName: String!) {
    removeMcpServer(name: $serverName)
  }
`;

export const USER_MCP_SERVERS_QUERY = `
  query GetUserMcpServers {
    getUserMcpServers {
      ...McpServerConfigFields
    }
  }
  ${MCP_SERVER_CONFIG_FRAGMENT}
`;

export const CATEGORIES_QUERY = `
  query Categories($first: Int, $after: String) {
    categories(first: $first, after: $after) {
      edges {
        node {
          id
          name
          icon
          color
          description
          slug
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;

export const MY_ASSISTANTS_QUERY = `
  query MyAssistants {
    myAssistants {
      id
      assistantType
      name
      description
      instructions
      isActive
      config
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_ASSISTANT_MUTATION = `
  mutation CreateAssistant(
    $name: String!
    $instructions: String!
    $assistantType: String
    $description: String
    $isActive: Boolean
    $config: JSON
  ) {
    createAssistant(
      name: $name
      instructions: $instructions
      assistantType: $assistantType
      description: $description
      isActive: $isActive
      config: $config
    ) {
      id
      assistantType
      name
      description
      instructions
      isActive
      config
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_ASSISTANT_MUTATION = `
  mutation UpdateAssistant(
    $id: ID!
    $name: String
    $assistantType: String
    $description: String
    $instructions: String
    $isActive: Boolean
    $config: JSON
  ) {
    updateAssistant(
      id: $id
      name: $name
      assistantType: $assistantType
      description: $description
      instructions: $instructions
      isActive: $isActive
      config: $config
    ) {
      id
      assistantType
      name
      description
      instructions
      isActive
      config
      createdAt
      updatedAt
    }
  }
`;

export const DELETE_ASSISTANT_MUTATION = `
  mutation DeleteAssistant($id: ID!) {
    deleteAssistant(id: $id)
  }
`;

/**
 * Reusable query for searching MCP servers with filters.
 * Supports filtering by name (case-insensitive), categories, and other criteria.
 * Uses cursor-based pagination for efficient large result sets.
 */
export const SEARCH_MCP_SERVERS_QUERY = `
query SearchMcpServers($first: Int = 10, $after: String, $filters: MCPServerFilter) {
  mcpServers(first: $first, after: $after, filters: $filters) {
    edges {
      node {
        ...McpServerFields
      }
      cursor
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
  }
}
${MCP_SERVER_FRAGMENT}
`;

export const CALL_MCP_SERVER_TOOL_MUTATION = `
  mutation CallMcpServerTool($serverName: String!, $toolName: String!, $toolInput: JSON!) {
    callMcpServerTool(serverName: $serverName, toolName: $toolName, toolInput: $toolInput) {
      success
      message
      toolName
      serverName
      result
      error
    }
  }
`;

