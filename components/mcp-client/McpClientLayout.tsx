"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Server, Wrench, Activity, PanelLeftClose, PanelLeftOpen, Plus, Edit, Trash2, Loader2, Globe, RefreshCw, Calendar, User as UserIcon, Shield, Copy, Check, Search } from "lucide-react";
import { Toaster, toast } from "react-hot-toast";
import { Session } from "next-auth";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Image from "next/image";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import ServerFormModal from "./ServerFormModal";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { McpServer } from "@/types/mcp";
import ServerManagement from "./ServerManagement";
import ToolsExplorer from "./ToolsExplorer";
import { useSearchParams } from "next/navigation";
import { Filter } from "lucide-react";
import { useQuery } from "@apollo/client/react";
import { CATEGORIES_QUERY, SEARCH_MCP_SERVERS_QUERY } from "@/lib/graphql";
import { Category } from "@/types/mcp";
import { gql } from "@apollo/client";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "../ui/input";
import { useDebounce } from "@/hooks/useDebounce";




interface McpClientLayoutProps {
  publicServers: McpServer[] | null;
  userServers: McpServer[] | null;
  publicLoading: boolean;
  userLoading: boolean;
  publicError: string | null;
  userError: string | null;
  session: Session | null;
  onRefreshPublic: () => void;
  onRefreshUser: () => void;
  onServerAction: (serverName: string, action: 'restart' | 'activate' | 'deactivate') => Promise<unknown>;
  onServerAdd: (data: Record<string, unknown>) => Promise<void>;
  onServerUpdate: (data: Record<string, unknown>) => Promise<void>;
  onServerDelete: (serverName: string) => Promise<void>;
  onUpdatePublicServer: (serverId: string, updates: Partial<McpServer>) => void;
  onUpdateUserServer: (serverId: string, updates: Partial<McpServer>) => void;
  hasNextPage: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
}

export default function McpClientLayout({
  publicServers,
  userServers,
  publicLoading,
  userLoading,
  publicError,
  userError,
  session,
  onRefreshPublic,
  onRefreshUser,
  onServerAction,
  onServerAdd,
  onServerUpdate,
  onServerDelete,
  onUpdatePublicServer,
  onUpdateUserServer,
  hasNextPage,
  isLoadingMore,
  onLoadMore
}: McpClientLayoutProps) {
  const [selectedServer, setSelectedServer] = useState<McpServer | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingServer, setEditingServer] = useState<McpServer | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serverToDelete, setServerToDelete] = useState<string | null>(null);
  const [toggleLoading, setToggleLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'public' | 'user'>('public');
  const [urlCopied, setUrlCopied] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const categorySlug = searchParams.get("category");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300); // 300ms delay

  const router = useRouter();



  // Get current servers based on active tab
  const currentServers = activeTab === 'public' ? publicServers : userServers;
  const currentError = activeTab === 'public' ? publicError : userError;

  const GET_CATEGORIES = gql`${CATEGORIES_QUERY}`;


  // Update selected server when servers list changes
  useEffect(() => {
    if (selectedServer && currentServers) {
      const updatedServer = currentServers.find(server => server.name === selectedServer.name);
      if (updatedServer) {
        setSelectedServer(updatedServer);
      }
    }
  }, [currentServers, selectedServer]);

  useEffect(() => {
    if (categorySlug) {
      setSelectedCategory(categorySlug);
    }
  }, [categorySlug]);


  // Infinite scroll observer for public servers
  useEffect(() => {
    if (activeTab !== 'public') return; // Only on public tab

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isLoadingMore) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [activeTab, hasNextPage, isLoadingMore, onLoadMore]);

  const handleAddServer = () => {
    setModalMode('add');
    setEditingServer(null);
    setModalOpen(true);
  };

  const handleEditServer = (server: McpServer) => {
    setModalMode('edit');
    setEditingServer(server);
    setModalOpen(true);
  };

  const handleDeleteServer = (serverName: string) => {
    setServerToDelete(serverName);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteServer = async () => {
    if (!serverToDelete) return;

    try {
      await onServerDelete(serverToDelete);
      if (selectedServer?.name === serverToDelete) {
        setSelectedServer(null);
      }
      setDeleteDialogOpen(false);
      setServerToDelete(null);
    } catch (error) {
      // Error handled by toast notification
    }
  };

  const handleModalSubmit = async (data: Record<string, unknown>) => {
    if (modalMode === 'add') {
      await onServerAdd(data);
    } else {
      await onServerUpdate(data);
    }
  };

  const handleToggleEnabled = async (serverName: string, currentEnabled: boolean) => {
    if (!session) {
      toast.error("Please sign in to control context inclusion");
      return;
    }

    // Set loading state
    setToggleLoading(serverName);

    // Find the server to get its ID
    const server = currentServers?.find(s => s.name === serverName);
    if (!server) {
      setToggleLoading(null);
      toast.error("Server not found");
      return;
    }

    // Optimistically update both selected server and servers list
    if (selectedServer && selectedServer.name === serverName) {
      setSelectedServer(prev => prev ? { ...prev, enabled: !currentEnabled } : null);
    }

    // Update servers list locally based on active tab
    if (activeTab === 'public') {
      onUpdatePublicServer(server.id, { enabled: !currentEnabled });
    } else {
      onUpdateUserServer(server.id, { enabled: !currentEnabled });
    }

    try {
      // Call the server action to toggle enabled status
      const response = await fetch("/api/mcp/actions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "setEnabled",
          serverName: serverName,
          enabled: !currentEnabled,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to toggle server status");
      }

      const result = await response.json();
      toast.success(result.message || `Server ${!currentEnabled ? "enabled" : "disabled"} successfully`);
    } catch {
      // Revert optimistic updates on error
      if (selectedServer && selectedServer.name === serverName) {
        setSelectedServer(prev => prev ? { ...prev, enabled: currentEnabled } : null);
      }
      if (activeTab === 'public') {
        onUpdatePublicServer(server.id, { enabled: currentEnabled });
      } else {
        onUpdateUserServer(server.id, { enabled: currentEnabled });
      }
      toast.error("Failed to toggle server status");
    } finally {
      // Clear loading state
      setToggleLoading(null);
    }
  };

  // const filteredServers = categorySlug
  //   ? currentServers?.filter(server => server.category?.slug === categorySlug)
  //   : currentServers;

  const sidebarVariants = {
    hidden: { x: -320, opacity: 0 },
    visible: { x: 0, opacity: 1 },
    exit: { x: -320, opacity: 0 }
  };

  const mainVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 }
  };

  const { loading, error, data } = useQuery<{
    categories: {
      edges: Array<{ node: Category }>;
    };
  }>(GET_CATEGORIES, {
    fetchPolicy: "cache-and-network",
  });

  // Optional: Track selected category
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleCategorySelect = (categorySlug: string) => {
    setSelectedCategory(categorySlug);

    const currentParams = new URLSearchParams(window.location.search);

    if (categorySlug && categorySlug !== "") {
      currentParams.set("category", categorySlug);
    } else {
      currentParams.delete("category");
    }

    const newUrl = `${window.location.pathname}?${currentParams.toString()}`;
    router.replace(newUrl, { scroll: false }); // Update URL without reload
  };

  // Use GraphQL search when search query is present
  const GET_SEARCH_MCP_SERVERS = gql`${SEARCH_MCP_SERVERS_QUERY}`;

  // Get categories for lookup
  const categories: Category[] = data?.categories?.edges?.map((edge: { node: Category }) => edge.node) || [];

  // Build API filter variables
  const activeCategory = selectedCategory || categorySlug;
  const buildFilterVariables = () => {
    const filters: Record<string, unknown> = {};

    // Add name search filter
    if (debouncedSearch.trim()) {
      filters.name = {
        iContains: debouncedSearch.trim()
      };
    }

    // Add category filter by ID
    if (activeCategory) {
      // Find category ID by slug
      const category = categories.find(cat => cat.slug === activeCategory);
      if (category?.id) {
        filters.category = {
          id: {
            exact: category.id
          }
        };
      }
    }

    return Object.keys(filters).length > 0 ? filters : undefined;
  };

  const { data: searchData, loading: searchLoading } = useQuery<{
    mcpServers: {
      edges: Array<{ node: McpServer }>;
      pageInfo: Record<string, unknown>;
    };
  }>(GET_SEARCH_MCP_SERVERS, {
    variables: {
      first: 100,
      filters: buildFilterVariables()
    },
    skip: !debouncedSearch.trim() && !activeCategory, // Skip if no search query and no category filter
    fetchPolicy: "cache-and-network",
  });

  // Get search/filter results from API if search or filter is active
  const searchResults = searchData?.mcpServers?.edges?.map((edge: { node: McpServer }) => edge.node) || [];

  const filteredServers = useMemo(() => {
    // If search query or category filter is active, use API results
    if (debouncedSearch.trim() || activeCategory) {
      return searchResults;
    }

    // Otherwise use current servers as-is
    return currentServers || [];
  }, [currentServers, activeCategory, debouncedSearch, searchResults]);

  const truncateText = (text: string, maxLength = 17) => {
    return text.length > maxLength ? text.slice(0, maxLength) + "…" : text;
  };


  if (currentError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{currentError}</p>
            <Button
              onClick={activeTab === 'public' ? onRefreshPublic : onRefreshUser}
              variant="outline"
              className="w-full"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'rgba(255, 255, 255, 0.95)',
            color: '#000000',
            border: '1px solid #e5e7eb',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            backdropFilter: 'blur(8px)',
          },
        }}
      />

      <div className="flex h-full">

        {/* Left Sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={sidebarVariants}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="w-80 border-r border-border flex flex-col fixed h-screen z-50 bg-background"
            >
              {/* Header */}
              <div className="p-4 border-b border-border flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="relative h-5 w-5">
                      <Image
                        src="/technologies/mcp-light.webp"
                        alt="MCP"
                        width={20}
                        height={20}
                        className="dark:hidden"
                      />
                      <Image
                        src="/technologies/mcp.webp"
                        alt="MCP"
                        width={20}
                        height={20}
                        className="hidden dark:block"
                      />
                    </div>
                    <span className="font-medium text-sm">Servers</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSidebarOpen(false)}
                    className="flex items-center gap-1"
                  >
                    <PanelLeftClose className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleAddServer}
                    className="flex items-center gap-1 flex-1"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="text-xs">Add</span>
                  </Button>
                  <Button
                    onClick={() => {
                      if (activeTab === "public") {
                        onRefreshPublic();
                        // toast.success("Refreshing public servers...");
                      } else {
                        onRefreshUser();
                        // toast.success("Refreshing your servers...");
                      }
                    }}
                    variant="ghost"
                    size="sm"
                    disabled={activeTab === "public" ? publicLoading : userLoading}
                    className="flex items-center gap-1 flex-1"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${(activeTab === "public" ? publicLoading : userLoading)
                        ? "animate-spin"
                        : ""
                        }`}
                    />
                    <span className="text-xs">Refresh</span>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-1 flex-1"
                        disabled={loading}
                      >
                        <Filter className="h-4 w-4" />
                        <span className="text-xs max-w-[120px] truncate">
                          {selectedCategory
                            ? truncateText(
                              data?.categories?.edges.find((c) => c.node.slug === selectedCategory)?.node.name || "Filter",
                              17
                            )
                            : "Filter"}
                        </span>

                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
                      <DropdownMenuSeparator />

                      {loading ? (
                        <DropdownMenuItem disabled>Loading...</DropdownMenuItem>
                      ) : error ? (
                        <DropdownMenuItem disabled>Error loading categories</DropdownMenuItem>
                      ) : (
                        <>
                          <DropdownMenuItem onClick={() => handleCategorySelect("")}>
                            All Categories
                          </DropdownMenuItem>
                          {data?.categories?.edges.map(({ node }) => (
                            <DropdownMenuItem
                              key={node.id}
                              onClick={() => handleCategorySelect(node?.slug || "")}
                            >
                              {node.name}
                            </DropdownMenuItem>
                          ))}
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>

                </div>
                {/* Search bar */}
                <div className="mt-2 relative">
                  <Input
                    type="text"
                    placeholder="Search servers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 pl-8 text-sm"
                  />
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              {/* Main Content */}
              <div className="flex-1 flex flex-col min-h-0">
                <Tabs
                  value={activeTab}
                  onValueChange={(value) =>
                    setActiveTab(value as "public" | "user")
                  }
                  className="flex-1 flex flex-col min-h-0"
                >
                  {/* Tabs Header */}
                  <div className="px-4 flex-shrink-0">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger
                        value="public"
                        className="flex items-center gap-2 text-xs"
                      >
                        <Globe className="h-3 w-3" />
                        Public
                        <Badge variant="secondary" className="ml-1 text-xs">
                          {filteredServers?.length || 0}
                        </Badge>
                      </TabsTrigger>
                      <TabsTrigger
                        value="user"
                        className="flex items-center gap-2 text-xs"
                      >
                        <UserIcon className="h-3 w-3" />
                        My Servers
                        <Badge variant="secondary" className="ml-1 text-xs">
                          {userServers?.length || 0}
                        </Badge>
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  {/* Scrollable Content - Fixed with proper padding */}
                  <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide py-4">
                    {/* Public Servers */}
                    <TabsContent
                      value="public"
                      className="px-4 pb-6 m-0 flex flex-col gap-1"
                    >
                      {(publicLoading || ((debouncedSearch.trim() || activeCategory) && searchLoading)) ? (
                        [...Array(3)].map((_, i) => (
                          <Card key={i}>
                            <CardContent className="p-4">
                              <div className="space-y-2">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-3 w-1/2" />
                                <Skeleton className="h-3 w-2/3" />
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      ) : filteredServers && filteredServers.length > 0 ? (
                        <>
                          {filteredServers?.map((server) => (
                            <motion.div
                              key={server.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <Card
                                className={`cursor-pointer transition-all duration-200 hover:shadow-md ${selectedServer?.name === server.name
                                  ? "ring-2 ring-primary"
                                  : ""
                                  }`}
                                onClick={() => setSelectedServer(server)}
                              >
                                <CardContent className="px-3 py-2">
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                      <div
                                        className={`w-3 h-3 rounded-full border-2 shadow-sm transition-all ${server.connectionStatus?.toUpperCase() ===
                                          "CONNECTED"
                                          ? "bg-green-500 border-green-600 animate-pulse"
                                          : server.connectionStatus?.toUpperCase() ===
                                            "DISCONNECTED"
                                            ? "bg-yellow-500 border-yellow-600"
                                            : server.connectionStatus?.toUpperCase() ===
                                              "FAILED"
                                              ? "bg-red-500 border-red-600 animate-pulse"
                                              : "bg-gray-400 border-gray-500"
                                          }`}
                                        title={`Status: ${server.connectionStatus || "Unknown"
                                          }`}
                                      />
                                      <Server className="h-3 w-3 text-muted-foreground" />
                                      <span className="font-medium text-sm">
                                        {server.name}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>{server.transport} • {server.tools.length} tools</span>
                                    {server.requiresOauth2 && (
                                      <Shield className="h-3 w-3 text-amber-500" />
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            </motion.div>
                          ))}

                          {/* Infinite scroll sentinel */}
                          {hasNextPage && (
                            <div ref={observerTarget} className="flex justify-center py-4">
                              {isLoadingMore && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  <span className="text-sm">Loading more servers...</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Add extra spacing at the bottom to ensure last item is fully visible */}
                          <div className="h-16" />
                        </>
                      ) : (
                        <div className="p-6 text-center">
                          <Server className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">
                            No public servers found
                          </p>
                        </div>
                      )}
                    </TabsContent>

                    {/* User Servers */}
                    <TabsContent value="user" className="p-4 m-0 h-full">
                      <div className="space-y-3">
                        {userLoading ? (
                          <div className="space-y-3">
                            {[...Array(3)].map((_, i) => (
                              <Card key={i}>
                                <CardContent className="p-4">
                                  <div className="space-y-2">
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-3 w-1/2" />
                                    <Skeleton className="h-3 w-2/3" />
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        ) : userServers && userServers.length > 0 ? (
                          <div className="space-y-2">
                            {userServers.map((server) => (
                              <motion.div
                                key={server.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2 }}
                                className="group relative"
                              >
                                {/* Action Buttons */}
                                {!(server.isPublic && server.owner !== session?.user?.email?.split('@')[0]) && (
                                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col gap-1 z-10">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditServer(server);
                                      }}
                                      className="h-6 w-6 p-0 bg-background/90 hover:bg-accent shadow-sm cursor-pointer border"
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteServer(server.name);
                                      }}
                                      className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 bg-background/90 shadow-sm cursor-pointer border"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}

                                <Card
                                  className={`cursor-pointer transition-all duration-200 hover:shadow-md ${selectedServer?.name === server.name
                                    ? "ring-2 ring-primary"
                                    : ""
                                    }`}
                                  onClick={() => setSelectedServer(server)}
                                >
                                  <CardContent className="px-3 pr-12">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <div
                                          className={`w-3 h-3 rounded-full cursor-pointer transition-all duration-300 hover:scale-125 shadow-sm border-2 ${server.connectionStatus?.toUpperCase() ===
                                            "CONNECTED"
                                            ? "bg-green-500 hover:bg-green-600 animate-pulse"
                                            : server.connectionStatus?.toUpperCase() ===
                                              "DISCONNECTED"
                                              ? "bg-yellow-500 hover:bg-yellow-600"
                                              : server.connectionStatus?.toUpperCase() ===
                                                "FAILED"
                                                ? "bg-red-500 hover:bg-red-600 animate-pulse"
                                                : "bg-gray-400 hover:bg-gray-500"
                                            }`}
                                          title={`Status: ${server.connectionStatus || "Unknown"
                                            }`}
                                        />
                                        <Server className="h-3 w-3 text-muted-foreground" />
                                        <h3 className="font-medium text-sm truncate">
                                          {server.name}
                                        </h3>
                                      </div>
                                    </div>
                                    <div className="space-y-1">
                                      {server.description && (
                                        <div className="text-xs line-clamp-2 mb-1 prose prose-sm max-w-none [&>*]:text-foreground/80 [&>p]:text-foreground/75 [&>strong]:font-semibold [&>strong]:text-foreground [&>em]:italic [&>em]:text-foreground/80 [&>code]:bg-muted [&>code]:px-1 [&>code]:rounded [&>code]:text-xs [&>code]:text-foreground/90 [&>a]:text-primary [&>a]:underline [&>a]:underline-offset-2 hover:[&>a]:text-primary/80">
                                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {server.description}
                                          </ReactMarkdown>
                                        </div>
                                      )}
                                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <span>{server.transport} • {server.tools?.length || 0} tools</span>
                                        {server.requiresOauth2 && (
                                          <span title="OAuth2 Required">
                                            <Shield className="h-3 w-3 text-amber-500 flex-shrink-0" />
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              </motion.div>
                            ))}
                          </div>
                        ) : (
                          <CardContent className="p-6 text-center">
                            <Server className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">
                              No personal servers found
                            </p>
                          </CardContent>
                        )}
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={mainVariants}
          transition={{ duration: 0.3, ease: "easeOut", delay: 0.1 }}
          className={`flex-1 flex flex-col transition-all duration-300 ${sidebarOpen ? 'ml-80' : 'ml-0'}`}
        >
          {/* Show Sidebar Button - Only when sidebar is closed */}
          {!sidebarOpen && (
            <div className="p-4 border-b border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                className="flex items-center gap-2"
              >
                <PanelLeftOpen className="h-4 w-4" />
                Show Servers
              </Button>
            </div>
          )}
          <AnimatePresence mode="wait">
            {selectedServer ? (
              <motion.div
                key={selectedServer.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="flex-1 flex flex-col"
              >
                <div className="p-4 sm:p-6 border-b border-border">
                  <div className="flex flex-col gap-4">
                    {/* Header with title and actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <h2 className="text-xl sm:text-2xl font-semibold">{selectedServer.name}</h2>
                        <div className="flex items-center gap-2">
                          <div
                            className="flex items-center gap-2"
                            title={!session ? "Sign in to control context inclusion" : ""}
                          >
                            <Switch
                              checked={selectedServer.enabled}
                              onCheckedChange={() => handleToggleEnabled(selectedServer.name, selectedServer.enabled)}
                              disabled={!session || toggleLoading === selectedServer.name}
                              id="server-enabled"
                              className="cursor-pointer"
                            />
                            {toggleLoading === selectedServer.name && (
                              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                            )}
                            <label htmlFor="server-enabled" className="text-xs text-muted-foreground cursor-pointer">
                              {toggleLoading === selectedServer.name ? "Updating..." : (selectedServer.enabled ? "Included in context" : "Excluded from context")}
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <ServerManagement
                          server={selectedServer}
                          onAction={onServerAction}
                          onEdit={!(selectedServer.isPublic && selectedServer.owner !== session?.user?.email) ? handleEditServer : undefined}
                          onDelete={!(selectedServer.isPublic && selectedServer.owner !== session?.user?.email) ? handleDeleteServer : undefined}
                        />
                      </div>
                    </div>

                    {/* Description - Full Width */}
                    {selectedServer.description && (
                      <div className="space-y-2">
                        <div className="text-sm prose prose-sm max-w-none [&>*]:text-foreground/80 [&>p]:text-foreground/75 [&>strong]:font-semibold [&>strong]:text-foreground [&>em]:italic [&>em]:text-foreground/80 [&>code]:bg-muted [&>code]:px-1.5 [&>code]:py-0.5 [&>code]:rounded [&>code]:text-sm [&>code]:text-foreground/90 [&>a]:text-primary [&>a]:underline [&>a]:underline-offset-2 hover:[&>a]:text-primary/80 [&>ul]:text-foreground/75 [&>ol]:text-foreground/75 [&>li]:text-foreground/75">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {selectedServer.description}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}

                    {/* Server Information Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border">
                      {/* Basic Info */}
                      <div className="space-y-3">
                        <h3 className="text-sm font-medium text-muted-foreground">Basic Information</h3>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Server className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">Transport:</span>
                            <span className="text-muted-foreground">{selectedServer.transport}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Activity className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">Status:</span>
                            <Badge variant={selectedServer.connectionStatus === "CONNECTED" ? "default" : "secondary"}>
                              {selectedServer.connectionStatus || "Unknown"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Wrench className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">Tools:</span>
                            <span className="text-muted-foreground">{selectedServer.tools?.length || 0} available</span>
                          </div>
                          {selectedServer.requiresOauth2 && (
                            <div className="flex items-center gap-2 text-sm">
                              <Shield className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">Authentication:</span>
                              <Badge className="border-amber-500" variant="outline">OAuth2</Badge>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Connection Details */}
                      <div className="space-y-3">
                        <h3 className="text-sm font-medium text-muted-foreground">Connection Details</h3>
                        <div className="space-y-2">
                          {selectedServer.id && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium whitespace-nowrap">ID:</span>
                              <code className="bg-muted px-2 py-1 rounded text-xs font-mono truncate flex-1 min-w-0" title={selectedServer.id}>{selectedServer.id}</code>
                            </div>
                          )}
                          {selectedServer.url && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium whitespace-nowrap">URL:</span>
                              <code className="bg-muted px-2 py-1 rounded text-xs font-mono truncate flex-1 min-w-0" title={selectedServer.url}>{selectedServer.url}</code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  navigator.clipboard.writeText(selectedServer.url!);
                                  setUrlCopied(true);
                                  setTimeout(() => setUrlCopied(false), 2000);
                                }}
                                className="h-6 w-6 p-0 hover:bg-accent cursor-pointer flex-shrink-0"
                              >
                                {urlCopied ? (
                                  <Check className="h-3 w-3 text-green-500" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          )}
                          {selectedServer.command && (
                            <div className="flex items-start gap-2 text-sm">
                              <span className="font-medium whitespace-nowrap">Command:</span>
                              <code className="bg-muted px-2 py-1 rounded text-xs font-mono break-all">{selectedServer.command}</code>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Metadata */}
                      <div className="space-y-3">
                        <h3 className="text-sm font-medium text-muted-foreground">Metadata</h3>
                        <div className="space-y-2">
                          {(selectedServer.createdAt) && (
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">Created:</span>
                              <span className="text-muted-foreground">{new Date(selectedServer.createdAt).toLocaleDateString()}</span>
                            </div>
                          )}
                          {selectedServer.owner && (
                            <div className="flex items-center gap-2 text-sm">
                              <UserIcon className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">Added by:</span>
                              <span className="text-muted-foreground">{selectedServer.owner}</span>
                            </div>
                          )}
                          {selectedServer.isPublic !== undefined && (
                            <div className="flex items-center gap-2 text-sm">
                              <Globe className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">{selectedServer.isPublic ? "Public Server" : "Private Server"}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <ToolsExplorer server={selectedServer} />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="no-selection"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex items-center justify-center min-h-[calc(100vh-120px)]"
              >
                <div className="text-center">
                  <div className="relative h-16 w-16 mx-auto mb-4">
                    <Image
                      src="/technologies/mcp-light.webp"
                      alt="MCP"
                      width={64}
                      height={64}
                      className="dark:hidden opacity-50"
                    />
                    <Image
                      src="/technologies/mcp.webp"
                      alt="MCP"
                      width={64}
                      height={64}
                      className="hidden dark:block opacity-50"
                    />
                  </div>
                  <h3 className="text-lg font-medium mb-2">Select a Server</h3>
                  <p className="text-muted-foreground">
                    Choose a server from the sidebar to view its tools and manage it
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Server Form Modal */}
      <ServerFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleModalSubmit}
        server={editingServer}
        mode={modalMode}
        session={session}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Server</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{serverToDelete}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteServer}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
