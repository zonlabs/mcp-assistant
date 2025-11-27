"use client";

import { ChevronDown, Boxes, CheckCircle, Circle, Server, Settings2 } from "lucide-react";
import React, { useState, useEffect } from "react";
import { useMcpTools, McpServerWithTools } from "@/hooks/useMcpTools";
import { ToolInfo, McpConfig } from "@/types/mcp";
import Image from "next/image";

export interface MCPToolSelection {
  selectedServers: string[]; // Array of selected server names
  selectedTools: string[]; // Array of selected tool names
  mcpConfig: McpConfig; // Config dict for MultiServerMCPClient
}

export interface MCPToolsDropdownProps {
  selection: MCPToolSelection;
  onSelectionChange: (selection: MCPToolSelection) => void;
  showDropdown: boolean;
  setShowDropdown: (open: boolean) => void;
}

const MCPToolsDropdown: React.FC<MCPToolsDropdownProps> = ({
  selection,
  onSelectionChange,
  showDropdown,
  setShowDropdown
}) => {
  const { mcpServers, loading, loadMcpServers } = useMcpTools();

  // Local state for checkboxes (synced with parent)
  const [localSelection, setLocalSelection] = useState<MCPToolSelection>(selection);

  // Sync local state with parent when selection changes externally
  useEffect(() => {
    setLocalSelection(selection);
  }, [selection]);

  // Build MCP config dict from servers that have selected tools
  const buildMcpConfig = (selectedToolNames: string[]): McpConfig => {
    const config: McpConfig = {};
    const serversWithSelectedTools = new Set<string>();

    // Find which servers have selected tools
    mcpServers.forEach(server => {
      const hasSelectedTool = server.tools.some(tool => selectedToolNames.includes(tool.name));
      if (hasSelectedTool) {
        serversWithSelectedTools.add(server.serverName);
      }
    });

    // Build config for those servers
    mcpServers
      .filter(server => serversWithSelectedTools.has(server.serverName))
      .forEach(server => {
        config[server.serverName] = {
          transport: server.transport || 'sse',
          url: server.url || '',
          ...(server.headers && { headers: server.headers }),
        };
      });

    return config;
  };

  // Get servers that have at least one selected tool
  const getSelectedServers = (selectedToolNames: string[]): string[] => {
    const servers = new Set<string>();
    mcpServers.forEach(server => {
      const hasSelectedTool = server.tools.some(tool => selectedToolNames.includes(tool.name));
      if (hasSelectedTool) {
        servers.add(server.serverName);
      }
    });
    return Array.from(servers);
  };

  // Count stats
  const selectedToolsCount = localSelection.selectedTools.length;
  const totalToolsCount = mcpServers.reduce((sum, server) => sum + server.tools.length, 0);
  const selectedServersCount = getSelectedServers(localSelection.selectedTools).length;
  const totalServerCount = mcpServers.length;

  // Handle individual tool selection toggle
  const toggleTool = (toolName: string) => {
    const isSelected = localSelection.selectedTools.includes(toolName);

    const newSelectedTools = isSelected
      ? localSelection.selectedTools.filter(t => t !== toolName)
      : [...localSelection.selectedTools, toolName];

    const newSelection = {
      selectedServers: getSelectedServers(newSelectedTools),
      selectedTools: newSelectedTools,
      mcpConfig: buildMcpConfig(newSelectedTools),
    };

    setLocalSelection(newSelection);
    onSelectionChange(newSelection);
  };

  // Handle server selection toggle (selects/deselects all tools in server)
  const toggleServer = (serverName: string) => {
    const server = mcpServers.find(s => s.serverName === serverName);
    if (!server) return;

    const serverToolNames = server.tools.map(t => t.name);
    const allSelected = serverToolNames.every(toolName =>
      localSelection.selectedTools.includes(toolName)
    );

    const newSelectedTools = allSelected
      ? localSelection.selectedTools.filter(t => !serverToolNames.includes(t))
      : [...new Set([...localSelection.selectedTools, ...serverToolNames])];

    const newSelection = {
      selectedServers: getSelectedServers(newSelectedTools),
      selectedTools: newSelectedTools,
      mcpConfig: buildMcpConfig(newSelectedTools),
    };

    setLocalSelection(newSelection);
    onSelectionChange(newSelection);
  };

  // Select all tools
  const selectAll = () => {
    const allTools = mcpServers.flatMap(server => server.tools.map(t => t.name));

    const newSelection = {
      selectedServers: mcpServers.map(s => s.serverName),
      selectedTools: allTools,
      mcpConfig: buildMcpConfig(allTools),
    };

    setLocalSelection(newSelection);
    onSelectionChange(newSelection);
  };

  // Deselect all tools
  const deselectAll = () => {
    const newSelection = {
      selectedServers: [],
      selectedTools: [],
      mcpConfig: {},
    };

    setLocalSelection(newSelection);
    onSelectionChange(newSelection);
  };

  const hasSelectedTools = selectedToolsCount > 0;

  // Handle MCP button click - toggle dropdown and loadMcpServers tools
  const handleMcpButtonClick = () => {
    const newShowState = !showDropdown;
    setShowDropdown(newShowState);

    // Only loadMcpServers when opening the dropdown
    if (newShowState) {
      loadMcpServers();
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleMcpButtonClick}
        className={`flex items-center justify-center gap-1.5 px-2 py-1.5 border-2 rounded-lg transition-all duration-200 ${
          hasSelectedTools
            ? "border-gray-400 dark:border-zinc-500 bg-gray-100 dark:bg-zinc-800 hover:border-gray-500 dark:hover:border-zinc-400"
            : "border-gray-300 dark:border-zinc-700 hover:border-gray-400 dark:hover:border-zinc-500"
        }`}
        title={`MCP Tools: ${selectedToolsCount} of ${totalToolsCount} tools selected`}
      >
        {/* MCP Logo */}
        <div className="relative w-4 h-4 flex-shrink-0">
          <Image
            src="/technologies/mcp-light.webp"
            alt="MCP"
            width={16}
            height={16}
            className="dark:hidden"
          />
          <Image
            src="/technologies/mcp.webp"
            alt="MCP"
            width={16}
            height={16}
            className="hidden dark:block"
          />
        </div>
        <span className={`text-[10px] sm:text-xs font-medium ${
          hasSelectedTools
            ? "text-gray-900 dark:text-white"
            : "text-gray-700 dark:text-gray-300"
        }`}>
          MCP
        </span>
        {hasSelectedTools && (
          <span className="text-[9px] sm:text-[10px] font-semibold text-gray-900 dark:text-white bg-gray-200 dark:bg-zinc-700 px-1.5 py-0.5 rounded-full">
            {selectedToolsCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          <div className="absolute bottom-full mb-2 left-0 md:left-0 bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-700/50 rounded-2xl shadow-2xl backdrop-blur-xl z-50 w-full md:min-w-[300px] md:max-w-[340px] max-h-[60vh] overflow-hidden">

            {/* Header with count and actions */}
            <div className="px-3 py-2.5 border-b border-gray-200/80 dark:border-zinc-700/50 bg-gray-50/50 dark:bg-zinc-800/30">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                  <span className="text-xs font-semibold text-gray-900 dark:text-white">
                    MCP Servers
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={selectAll}
                    className="text-[11px] font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors px-2 py-0.5 rounded hover:bg-gray-200/50 dark:hover:bg-zinc-700/50"
                  >
                    select all
                  </button>
                  <span className="text-gray-300 dark:text-gray-600">|</span>
                  <button
                    onClick={deselectAll}
                    className="text-[11px] font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors px-2 py-0.5 rounded hover:bg-gray-200/50 dark:hover:bg-zinc-700/50"
                  >
                    deselect all
                  </button>
                </div>
              </div>
              {/* Count display */}
              <div className="text-[10px] text-gray-600 dark:text-gray-400">
                {selectedToolsCount}/{totalToolsCount} tools • {selectedServersCount} servers
              </div>
            </div>

            {/* MCP Servers and Tools List */}
            <div className="overflow-y-auto max-h-[50vh] scrollbar-minimal">
              {loading ? (
                <div className="p-3 text-center text-xs text-gray-500 dark:text-gray-400">
                  Loading MCP servers...
                </div>
              ) : mcpServers.length === 0 ? (
                <div className="p-3 text-center text-xs text-gray-500 dark:text-gray-400">
                  No active MCP servers connected.
                  <br />
                  <span className="text-[10px]">Connect servers from the MCP page first.</span>
                </div>
              ) : (
                <div className="p-1.5">
                  {mcpServers.map((server) => {
                    const serverToolNames = server.tools.map(t => t.name);
                    const selectedToolsInServer = serverToolNames.filter(t => localSelection.selectedTools.includes(t)).length;
                    const allToolsSelected = serverToolNames.length > 0 && serverToolNames.every(t => localSelection.selectedTools.includes(t));

                    return (
                      <div key={server.serverName} className="mb-2 last:mb-0">
                        {/* Server Header */}
                        <div className="mb-1">
                          <button
                            onClick={() => toggleServer(server.serverName)}
                            className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all"
                          >
                            {/* Server Checkbox */}
                            {allToolsSelected ? (
                              <CheckCircle className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                            ) : selectedToolsInServer > 0 ? (
                              <Circle className="w-3.5 h-3.5 text-blue-400 dark:text-blue-500 fill-blue-200 dark:fill-blue-900 flex-shrink-0" />
                            ) : (
                              <Circle className="w-3.5 h-3.5 text-gray-400 dark:text-gray-600 flex-shrink-0" />
                            )}

                            {/* Server Info */}
                            <div className="flex-1 text-left">
                              <div className="flex items-center gap-1.5">
                                <Server className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                                <span className="text-[11px] font-semibold text-gray-900 dark:text-white truncate">
                                  {server.serverName}
                                </span>
                                <span className="text-[9px] text-gray-500 dark:text-gray-400">
                                  ({selectedToolsInServer}/{server.tools.length})
                                </span>
                              </div>
                            </div>
                          </button>

                          {/* Tools List */}
                          <div className="ml-5 mt-1 space-y-0.5">
                            {server.tools.map((tool) => {
                              const isToolSelected = localSelection.selectedTools.includes(tool.name);

                              return (
                                <button
                                  key={tool.name}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleTool(tool.name);
                                  }}
                                  className="w-full flex items-start gap-1.5 px-2 py-1 rounded hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-all text-left"
                                >
                                  {/* Tool Checkbox */}
                                  {isToolSelected ? (
                                    <CheckCircle className="w-3 h-3 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                  ) : (
                                    <Circle className="w-3 h-3 text-gray-400 dark:text-gray-600 mt-0.5 flex-shrink-0" />
                                  )}

                                  {/* Tool Info */}
                                  <div className="flex-1 min-w-0">
                                    <div className="text-[10px] font-medium text-gray-900 dark:text-white truncate">
                                      {tool.name}
                                    </div>
                                    {tool.description && (
                                      <div className="text-[9px] text-gray-500 dark:text-gray-400 line-clamp-1">
                                        {tool.description}
                                      </div>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer with summary */}
            {mcpServers.length > 0 && (
              <div className="px-4 py-2 border-t border-gray-200/80 dark:border-zinc-700/50 bg-gray-50 dark:bg-zinc-800/50">
                <div className="text-[10px] text-gray-600 dark:text-gray-400">
                  {selectedToolsCount} of {totalToolsCount} tools selected ({selectedServersCount} servers)
                </div>
              </div>
            )}
          </div>

          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />
        </>
      )}
    </div>
  );
};

export default MCPToolsDropdown;
