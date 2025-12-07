"use client";

import { useState, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, AlertCircle, Loader2, Package, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useRegistryServers } from "@/hooks/useRegistryServers";
import { RegistryServerCard } from "./RegistryServerCard";
import { RegistryServerDetailsModal } from "./RegistryServerDetailsModal";
import type { ParsedRegistryServer } from "@/types/mcp";

export function RegistryBrowser() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedServer, setSelectedServer] =
    useState<ParsedRegistryServer | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [loadingAction, setLoadingAction] = useState<'search' | 'next' | 'prev' | null>(null);

  const { servers, loading, error, hasNextPage, hasPreviousPage, goToNextPage, goToPreviousPage, refetch } =
    useRegistryServers(debouncedSearch);

  const handleSearch = useCallback(() => {
    setLoadingAction('search');
    setDebouncedSearch(searchQuery);
  }, [searchQuery]);

  const handleNextPage = useCallback(() => {
    setLoadingAction('next');
    goToNextPage();
  }, [goToNextPage]);

  const handlePreviousPage = useCallback(() => {
    setLoadingAction('prev');
    goToPreviousPage();
  }, [goToPreviousPage]);

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setDebouncedSearch("");
  };

  // Clear loading action when loading completes
  useEffect(() => {
    if (!loading) {
      setLoadingAction(null);
    }
  }, [loading]);

  const handleViewDetails = (server: ParsedRegistryServer) => {
    setSelectedServer(server);
    setIsDetailsModalOpen(true);
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="border-b border-border/50 bg-gradient-to-br from-background via-primary/5 to-background">
        <div className="container mx-auto px-4 py-12 max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center text-center space-y-4"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            >
              <Package className="h-10 w-10 text-primary" />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-blue-500 to-primary/60 bg-clip-text text-transparent"
            >
              MCP Registry
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-lg text-muted-foreground max-w-2xl"
            >
              Discover and explore Model Context Protocol servers from the official registry
            </motion.p>

            {/* Search Bar */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="w-full max-w-2xl mt-8"
            >
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground z-10" />
                <Input
                  placeholder="Search servers by name, description, or vendor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                  className="pl-12 pr-24 h-14 text-base bg-background/80 backdrop-blur-md border-border/50 focus:border-primary/50 shadow-lg focus:ring-2 focus:ring-primary/20 transition-all"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearSearch}
                    className="absolute right-20 top-1/2 transform -translate-y-1/2 h-8 z-10"
                  >
                    Clear
                  </Button>
                )}
                <Button
                  onClick={handleSearch}
                  disabled={loading}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-10 z-10 cursor-pointer"
                >
                  {loading && loadingAction === 'search' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Search"
                  )}
                </Button>
              </div>
            </motion.div>

            {/* Stats */}
            {!loading && !error && debouncedSearch && (
              <div className="flex items-center gap-6 text-sm text-muted-foreground pt-4">
                <div className="flex items-center gap-2">
                  <Search className="h-3 w-3" />
                  <span>Search: "{debouncedSearch}"</span>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Content Section */}
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header Actions */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">
            {debouncedSearch ? "Search Results" : "All Servers"}
          </h2>

          {/* Pagination Controls */}
          {(hasNextPage || hasPreviousPage) && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousPage}
                disabled={!hasPreviousPage || loading}
                className="gap-2 cursor-pointer"
              >
                {loading && loadingAction === 'prev' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={!hasNextPage || loading}
                className="gap-2 cursor-pointer"
              >
                Next
                {loading && loadingAction === 'next' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {loading && servers.length === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, idx) => (
              <Skeleton key={idx} className="h-64 w-full rounded-lg" />
            ))}
          </div>
        )}

        {/* Server Grid */}
        {servers.length > 0 && (
          <>
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              initial="hidden"
              animate="visible"
              variants={{
                visible: {
                  transition: {
                    staggerChildren: 0.05,
                  },
                },
              }}
            >
              {servers.map((server, index) => (
                <motion.div
                  key={server.id}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <RegistryServerCard
                    server={server}
                    onViewDetails={handleViewDetails}
                  />
                </motion.div>
              ))}
            </motion.div>
          </>
        )}

        {/* Empty State */}
        {!loading && servers.length === 0 && !error && (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted/50 mb-6">
              <Search className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-semibold mb-2">No servers found</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              {debouncedSearch
                ? `No servers match your search "${debouncedSearch}". Try adjusting your search query.`
                : "No servers available in the registry at the moment."}
            </p>
            {debouncedSearch && (
              <Button onClick={handleClearSearch} variant="outline">
                Clear Search
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Server Details Modal */}
      <RegistryServerDetailsModal
        server={selectedServer}
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedServer(null);
        }}
      />
    </div>
  );
}
