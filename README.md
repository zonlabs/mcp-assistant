<div align="center">
  <img src="public/images/logo-dark.png" alt="MCP Assistant Logo" width="80" height="80">
  <h1>MCP Assistant</h1>
  <p><strong>A Web Based MCP Client to access remote MCP's</strong></p>

  [![Website](https://img.shields.io/badge/Website-mcp--assistant.in-blue?style=for-the-badge)](https://www.mcp-assistant.in/)
  [![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
  [![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
</div>

---

## 🎯 Purpose

MCP Assistant addresses common pain points developers face when working with the Model Context Protocol:

- **Remote MCP Access**: Enables seamless connection to remote MCP servers via SSE and Streamable HTTP transports
- **OAuth Complexity**: Handles complex OAuth 2.0 authorization flows automatically, eliminating the need for manual token management
- **Multi-Server Management**: Manage and interact with multiple MCP servers simultaneously without juggling between different CLI tools or configurations
- **No Local Setup Required**: Access MCP servers from anywhere through a web interface - no need to install or configure MCP servers locally
- **Universal Compatibility**: Works with any MCP server that supports SSE or HTTP streaming, providing a unified interface regardless of the underlying implementation
- **Developer-Friendly**: Built-in tools explorer, real-time connection monitoring, and intuitive UI make MCP development easier

Whether you're building MCP integrations, testing MCP servers, or simply exploring the MCP ecosystem, MCP Assistant streamlines the entire workflow.

---

## 🌟 Features

<table>
<tr>
<td width="50%">

### MCP Protocol
- Supported transport via SSE and Streamable HTTP
- Configure and manage multiple servers simultaneously
- OAuth 2.0 Authorization Server Metadata (RFC8414) and OpenID Connect Discovery 1.0 support
- Real-time connection status monitoring
- Tool execution

</td>
<td width="50%">

### Agent–User Interaction (AG-UI Protocol)
- **Stream text message events** - Real-time message streaming for responsive interactions
- **Backend tool rendering** - Visualize tool outputs in chats
- **Tool output streaming** - Stream tool results and logs as real-time events
- **Interrupts (human in the loop)** - Pause and approve workflows without losing state
- **Shared state** - Context-aware responses using MCP tools


</td>
</tr>
</table>

---

## 📦 Quick Start

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18 or higher
- **npm** or **yarn** package manager
- **Backend API** running (default: `http://localhost:8000`)
- **Google OAuth credentials** for authentication

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mcp-client
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env.local` file in the root directory:
   
   ```env
   # NextAuth Configuration
   NEXTAUTH_SECRET=your_nextauth_secret_here
   NEXTAUTH_URL=http://localhost:3000
   
   # Google OAuth
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   
   # Backend API
   DJANGO_API_URL=http://localhost:8000
   BACKEND_URL=http://localhost:8000
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

---

## 🚀 Getting Started with MCP Assistant

### Adding an MCP Server

1. Navigate to the MCP servers page
2. Click "Add Server" button
3. Fill in server details:
   - Server name
   - Transport type (SSE/Streamable HTTP)
   - Server URL
   - Optional: OAuth2 configuration
4. Click "Save" to connect

### Using the Chat Interface

1. Select connected MCP servers from the sidebar
2. Choose your preferred LLM provider
3. Enter your API key
4. Start chatting - the assistant can use tools from connected MCP servers

---

## 🤝 Contributing

