<div align="center">
  <img src="public/images/favicon.svg" alt="MCP Assistant Logo" width="120" height="120">
  <h1>MCP Assistant</h1>
  <p><strong>A Web Based MCP Client to access remote MCP's</strong></p>
  
  [![Website](https://img.shields.io/badge/Website-mcp--assistant.in-blue?style=for-the-badge)](https://www.mcp-assistant.in/)
  [![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
  [![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
</div>

---

## 🌟 Features

<table>
<tr>
<td width="50%">

### 🔌 Server Management
- Connect to remote MCP servers via SSE, WebSocket, or HTTP
- Configure and manage multiple servers simultaneously
- Real-time connection status monitoring
- Support for OAuth2 authentication

</td>
<td width="50%">

### 💬 AI Chat Interface
- Interactive chat powered by CopilotKit
- Context-aware responses using MCP tools
- Support for multiple LLM providers (OpenAI, DeepSeek, etc.)
- Markdown rendering with syntax highlighting

</td>
</tr>
<tr>
<td width="50%">

### 📂 Organization
- Categorize servers with custom icons and colors
- Browse and filter available MCP servers
- Tool discovery and exploration
- User-friendly server management UI

</td>
<td width="50%">

### 🔐 Authentication
- Secure Google OAuth integration
- Session management with NextAuth.js
- Protected API routes
- User-specific server configurations

</td>
</tr>
</table>

---

## 🚀 Tech Stack

| Category | Technologies |
|----------|-------------|
| **Framework** | Next.js 15 (App Router), React 19 |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS 4, Framer Motion |
| **UI Components** | shadcn/ui (Radix UI primitives) |
| **Authentication** | NextAuth.js with Google OAuth |
| **AI Integration** | CopilotKit, MCP SDK |
| **API** | GraphQL (Apollo Client) |
| **State Management** | React Hooks, Redis (IORedis) |

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

## 📁 Project Structure

```
mcp-client/
├── app/                      # Next.js App Router
│   ├── api/                 # API routes
│   │   ├── auth/           # NextAuth endpoints
│   │   ├── copilotkit/     # CopilotKit integration
│   │   └── graphql/        # GraphQL proxy
│   ├── mcp/                # MCP server pages
│   ├── playground/         # Chat interface
│   ├── page.tsx            # Home page
│   └── layout.tsx          # Root layout
├── components/              # React components
│   ├── ui/                 # shadcn/ui components
│   ├── mcp-client/         # MCP-specific components
│   │   ├── ServerSidebar.tsx
│   │   ├── ServerListItem.tsx
│   │   └── ServerIcon.tsx
│   └── playground/         # Chat components
│       ├── ChatInput.tsx
│       └── ChatMessage.tsx
├── hooks/                   # Custom React hooks
│   ├── useMcpServers.ts    # Server management
│   ├── useMcpTools.ts      # Tool discovery
│   └── useMcpServersPagination.ts
├── types/                   # TypeScript definitions
│   └── mcp.ts              # MCP types
├── lib/                     # Utility functions
│   └── utils.ts
└── public/                  # Static assets
    └── images/
```

---

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXTAUTH_SECRET` | Secret key for NextAuth.js session encryption | ✅ |
| `NEXTAUTH_URL` | Base URL of your application | ✅ |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | ✅ |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | ✅ |
| `DJANGO_API_URL` | Backend GraphQL API endpoint | ✅ |
| `BACKEND_URL` | Backend base URL for SSE/WebSocket | ✅ |

### Supported MCP Transports

- **SSE (Server-Sent Events)** - Real-time streaming
- **Streamable HTTP** - Standard request/response

---

## 🎯 Usage

### Adding an MCP Server

1. Navigate to the MCP servers page
2. Click "Add Server" button
3. Fill in server details:
   - Server name
   - Transport type (SSE/WebSocket/HTTP)
   - Server URL
   - Optional: OAuth2 configuration
4. Click "Save" to connect

### Using the Chat Interface

1. Select connected MCP servers from the sidebar
2. Choose your preferred LLM provider
3. Enter your API key (stored in session)
4. Start chatting - the assistant can use tools from connected MCP servers

---

## 🤝 Contributing

