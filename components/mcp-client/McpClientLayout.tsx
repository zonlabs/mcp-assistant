"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PanelLeftOpen } from "lucide-react";
import { Toaster } from "react-hot-toast";
import { Session } from "next-auth";
import { useRouter, useSearchParams } from "next/navigation";
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
import { McpServer } from "@/types/mcp";
import ServerFormModal from "./ServerFormModal";
import { ServerSidebar } from "./ServerSidebar";
import { ServerDetails } from "./ServerDetails";
import { ServerPlaceholder } from "./ServerPlaceholder";
import ToolsExplorer from "./ToolsExplorer";
import ToolExecutionPanel from "./ToolExecutionPanel";
import { connectionStore } from "@/lib/mcp/connection-store";

interface McpClientLayoutProps {
  publicServers: McpServer[] | null;
  userServers: McpServer[] | null;
  publicServersCount?: number;
  userServersCount?: number;
  publicLoading: boolean;
  userLoading: boolean;
  publicError: string | null;
  userError: string | null;
  session: Session | null;
  onRefreshPublic: () => void;
  onRefreshUser: () => void;
  onServerAction: (server: McpServer, action: 'activate' | 'deactivate') => Promise<unknown>;
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
  publicServersCount = 0,
  userServersCount = 0,
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
  hasNextPage,
  isLoadingMore,
  onLoadMore
}: McpClientLayoutProps) {
  const [selectedServer, setSelectedServer] = useState<McpServer | null>(null);
  const [toolTesterOpen, setToolTesterOpen] = useState(false);
  const [selectedToolName, setSelectedToolName] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingServer, setEditingServer] = useState<McpServer | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serverToDelete, setServerToDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'public' | 'user'>('public');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeServersCount, setActiveServersCount] = useState(0);

  const searchParams = useSearchParams();
  const categorySlug = searchParams.get("category");
  const router = useRouter();

  // Get current servers and error based on active tab
  const currentServers = activeTab === 'public' ? publicServers : userServers;
  const currentError = activeTab === 'public' ? publicError : userError;

  // Update selected server when servers list changes
  useEffect(() => {
    if (selectedServer && currentServers) {
      const updatedServer = currentServers.find(server => server.name === selectedServer.name);
      if (updatedServer) {
        setSelectedServer(updatedServer);
      }
    }
  }, [currentServers, selectedServer]);

  // Close tool tester when server selection changes
  useEffect(() => {
    setToolTesterOpen(false);
    setSelectedToolName(null);
  }, [selectedServer?.id]);

  // Set category from URL on mount
  useEffect(() => {
    if (categorySlug) {
      setSelectedCategory(categorySlug);
    }
  }, [categorySlug]);

  // Update active servers count
  const updateActiveCount = () => {
    const connections = connectionStore.getAll();
    const connectedCount = Object.values(connections).filter(
      conn => conn.connectionStatus === 'CONNECTED'
    ).length;
    setActiveServersCount(connectedCount);
  };

  // Validate connections on mount
  useEffect(() => {
    const validateAndCount = async () => {
      await connectionStore.getValidConnections();
      updateActiveCount();
    };
    validateAndCount();
  }, []);

  // Update count when servers change
  useEffect(() => {
    updateActiveCount();
  }, [publicServers, userServers]);

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

  const handleCategorySelect = (categorySlug: string) => {
    setSelectedCategory(categorySlug);

    const currentParams = new URLSearchParams(window.location.search);

    if (categorySlug && categorySlug !== "") {
      currentParams.set("category", categorySlug);
    } else {
      currentParams.delete("category");
    }

    const newUrl = `${window.location.pathname}?${currentParams.toString()}`;
    router.replace(newUrl, { scroll: false });
  };

  const mainVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 }
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
            <ServerSidebar
              publicServers={publicServers}
              userServers={userServers}
              publicServersCount={publicServersCount}
              userServersCount={userServersCount}
              publicLoading={publicLoading}
              userLoading={userLoading}
              activeServersCount={activeServersCount}
              selectedServer={selectedServer}
              onServerSelect={setSelectedServer}
              onAddServer={handleAddServer}
              onEditServer={handleEditServer}
              onDeleteServer={handleDeleteServer}
              onRefreshPublic={onRefreshPublic}
              onRefreshUser={onRefreshUser}
              onClose={() => setSidebarOpen(false)}
              hasNextPage={hasNextPage}
              isLoadingMore={isLoadingMore}
              onLoadMore={onLoadMore}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              selectedCategory={selectedCategory}
              onCategoryChange={handleCategorySelect}
              session={session}
            />
          )}
        </AnimatePresence>

        {/* Main Content Area with Right Panel */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={mainVariants}
          transition={{ duration: 0.3, ease: "easeOut", delay: 0.1 }}
          className={`flex-1 flex transition-all duration-300 ${sidebarOpen ? 'ml-80' : 'ml-0'}`}
        >
          {/* Left Side - Main Content - Hidden when tool tester is open */}
          {!toolTesterOpen && (
            <div className="flex-1 flex flex-col min-w-0">
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
                    {/* Server Header & Details */}
                    <ServerDetails
                      server={selectedServer}
                      session={session}
                      onAction={onServerAction}
                      onEdit={handleEditServer}
                      onDelete={handleDeleteServer}
                    />

                    {/* Tools Explorer */}
                    <div className="flex-1 overflow-y-auto">
                      <ToolsExplorer
                        server={selectedServer}
                        onOpenToolTester={(toolName) => {
                          setToolTesterOpen(true);
                          if (toolName) {
                            setSelectedToolName(toolName);
                          }
                        }}
                      />
                    </div>
                  </motion.div>
                ) : (
                  <ServerPlaceholder type="no-selection" />
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Right Panel - Tool Execution - Full width when visible */}
          <AnimatePresence>
            {toolTesterOpen && selectedServer && (
              <motion.div
                initial={{ opacity: 0, x: 320 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 320 }}
                transition={{ duration: 0.3 }}
                className="flex-1"
              >
                <ToolExecutionPanel
                  server={selectedServer}
                  tools={Array.isArray(selectedServer.tools) ? selectedServer.tools : []}
                  onClose={() => {
                    setToolTesterOpen(false);
                    setSelectedToolName(null);
                  }}
                  initialToolName={selectedToolName}
                />
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
