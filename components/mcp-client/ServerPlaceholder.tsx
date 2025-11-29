"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Server } from "lucide-react";
import { CardContent } from "@/components/ui/card";

interface ServerPlaceholderProps {
  type: "no-selection" | "no-servers";
  tab?: "public" | "user";
}

export function ServerPlaceholder({ type, tab }: ServerPlaceholderProps) {
  if (type === "no-selection") {
    return (
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
    );
  }

  if (type === "no-servers" && tab === "user") {
    return (
      <CardContent className="p-6 text-center">
        <Server className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          No personal servers found
        </p>
      </CardContent>
    );
  }

  return (
    <div className="p-6 text-center">
      <Server className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
      <p className="text-sm text-muted-foreground">
        No public servers found
      </p>
    </div>
  );
}
