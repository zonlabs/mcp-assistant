"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Server, Zap, Activity, Grid, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ServerPlaceholderProps {
  type: "no-selection" | "no-servers";
  tab?: "public" | "user";
}

export function ServerPlaceholder({ type, tab }: ServerPlaceholderProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  if (type === "no-selection") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-[calc(100vh-120px)] bg-gray-50/30 dark:bg-zinc-900/10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-3xl w-full"
        >
          {/* Hero Section */}
          <motion.div variants={itemVariants} className="text-center mb-8">
            <div className="relative h-16 w-16 mx-auto mb-4">
              <div className="absolute inset-0 bg-blue-500/20 dark:bg-blue-400/10 rounded-full blur-2xl animate-pulse" />
              <Image
                src="/technologies/mcp-light.webp"
                alt="MCP"
                width={64}
                height={64}
                className="dark:hidden relative z-10 drop-shadow-sm"
              />
              <Image
                src="/technologies/mcp.webp"
                alt="MCP"
                width={64}
                height={64}
                className="hidden dark:block relative z-10 drop-shadow-sm"
              />
            </div>
            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 mb-3 tracking-tight">
              Welcome to MCP Assistant
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
              Select a server from the sidebar to explore its capabilities, inspect tools, and monitor connections.
            </p>
          </motion.div>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <FeatureCard
              variants={itemVariants}
              icon={<Grid className="w-5 h-5 text-blue-500" />}
              title="Explore Tools"
              description="Browse and test available tools from connected servers interactively."
            />
            <FeatureCard
              variants={itemVariants}
              icon={<Activity className="w-5 h-5 text-green-500" />}
              title="Monitor Health"
              description="Real-time connection status validation and health checking."
            />
            <FeatureCard
              variants={itemVariants}
              icon={<Zap className="w-5 h-5 text-amber-500" />}
              title="Execute Actions"
              description="Run tools directly from the interface and see results instantly."
            />
          </div>
        </motion.div>
      </div>
    );
  }

  // No Servers - User Tab
  if (type === "no-servers" && tab === "user") {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
        <div className="bg-muted/50 p-4 rounded-full mb-4">
          <Server className="h-8 w-8 text-muted-foreground/70" />
        </div>
        <h3 className="text-base font-semibold mb-2">No Personal Servers</h3>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-6 leading-relaxed">
          You haven't connected any custom servers yet. Add a local or remote server to get started.
        </p>
      </div>
    );
  }

  // No Servers - Public Tab (or generic)
  return (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
      <div className="bg-muted/50 p-4 rounded-full mb-4">
        <Search className="h-8 w-8 text-muted-foreground/70" />
      </div>
      <h3 className="text-base font-semibold mb-2">No Public Servers Found</h3>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
        We couldn't find any public servers matching your criteria. Try adjusting your filters.
      </p>
    </div>
  );
}

// Helper component for feature cards
function FeatureCard({ icon, title, description, variants }: { icon: React.ReactNode, title: string, description: string, variants: any }) {
  return (
    <motion.div variants={variants}>
      <Card className="h-full border-border/40 shadow-sm hover:shadow-md transition-all hover:border-blue-500/20 dark:hover:border-blue-400/20 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm group cursor-default">
        <CardContent className="p-6 flex flex-col items-center text-center h-full">
          <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-900/10 mb-4 group-hover:scale-110 transition-transform duration-300">
            {icon}
          </div>
          <h3 className="font-semibold text-sm mb-2 text-foreground/90">{title}</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        </CardContent>
      </Card>
    </motion.div>
  )
}
