"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ToolInfo } from "@/types/mcp";
import { toast } from "react-hot-toast";
import { AlertCircle, CheckCircle, Loader } from "lucide-react";
import SyntaxHighlighter from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';

interface ToolCallDialogProps {
  isOpen: boolean;
  onClose: () => void;
  serverName: string;
  tool: ToolInfo;
}

interface ToolCallResult {
  success: boolean;
  message: string;
  tool_name?: string;
  server_name?: string;
  result?: unknown;
  error?: string;
}

export default function ToolCallDialog({
  isOpen,
  onClose,
  serverName,
  tool
}: ToolCallDialogProps) {
  const [inputJson, setInputJson] = useState("{}");
  const [result, setResult] = useState<ToolCallResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { theme } = useTheme();

  const parseSchema = (schema: unknown) => {
    if (typeof schema === 'object' && schema !== null) {
      return schema;
    }
    if (typeof schema === 'string') {
      try {
        return JSON.parse(schema);
      } catch {
        return null;
      }
    }
    return null;
  };

  const handleCall = async () => {
    setIsSubmitting(true);
    setResult(null);

    try {
      // Validate JSON input
      let toolInput: Record<string, unknown>;
      try {
        toolInput = JSON.parse(inputJson);
      } catch {
        toast.error("Invalid JSON input");
        setIsSubmitting(false);
        return;
      }

      // Call the API endpoint
      const response = await fetch('/api/mcp/call-tool', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serverName,
          toolName: tool.name,
          toolInput
        })
      });

      const result = await response.json();

      if (!response.ok || result.errors) {
        const errorMessage = result.errors?.[0]?.message || 'Failed to call tool';
        toast.error(errorMessage);
        setResult({
          success: false,
          message: errorMessage,
          error: errorMessage
        });
        return;
      }

      const toolResult = result.data?.callMcpServerTool;

      if (!toolResult) {
        throw new Error('Invalid response from server');
      }

      if (!toolResult.success) {
        toast.error(toolResult.message);
      } else {
        toast.success(toolResult.message);
      }

      setResult(toolResult);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to call tool";
      toast.error(errorMessage);
      setResult({
        success: false,
        message: errorMessage,
        error: errorMessage
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setInputJson("{}");
    setResult(null);
    onClose();
  };

  const schema = parseSchema(tool.schema);
  const schemaProperties = schema?.properties || {};

  // Generate example input based on schema
  const generateExampleInput = () => {
    const example: Record<string, unknown> = {};
    Object.entries(schemaProperties).forEach(([key, prop]) => {
      const propObj = prop as Record<string, unknown>;
      if (propObj.type === 'string') {
        example[key] = `example_${key}`;
      } else if (propObj.type === 'number' || propObj.type === 'integer') {
        example[key] = 0;
      } else if (propObj.type === 'boolean') {
        example[key] = true;
      } else if (propObj.type === 'array') {
        example[key] = [];
      } else {
        example[key] = null;
      }
    });
    setInputJson(JSON.stringify(example, null, 2));
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-minimal">
        <DialogHeader>
          <DialogTitle>Call Tool: {tool.name}</DialogTitle>
          <DialogDescription>
            {tool.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Schema Info */}
          {schema && (
            <div>
              <label className="text-sm font-medium">Schema</label>
              <div className="mt-2 max-h-40 overflow-y-auto overflow-x-hidden rounded-md border border-slate-700 scrollbar-minimal">
                <SyntaxHighlighter
                  language="json"
                  style={atomOneDark}
                  customStyle={{
                    margin: 0,
                    padding: '12px',
                    fontSize: '12px',
                    borderRadius: '6px'
                  }}
                >
                  {JSON.stringify(schema, null, 2)}
                </SyntaxHighlighter>
              </div>
              {Object.keys(schemaProperties).length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateExampleInput}
                  className="mt-2 cursor-pointer"
                >
                  Generate Example Input
                </Button>
              )}
            </div>
          )}

          {/* Input */}
          <div>
            <label className="text-sm font-medium">Tool Input (JSON)</label>
            <textarea
              value={inputJson}
              onChange={(e) => setInputJson(e.target.value)}
              placeholder='{"key": "value"}'
              className={`w-full mt-2 font-mono text-xs h-32 p-3 rounded-md border focus:outline-none focus:ring-2 resize-none overflow-x-hidden scrollbar-minimal ${
                theme === 'dark'
                  ? 'border-slate-700 bg-slate-950 text-gray-200 placeholder:text-gray-600 focus:ring-slate-600'
                  : 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:ring-slate-400'
              }`}
            />
          </div>

          {/* Result */}
          {result && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Result</label>
              {result.success ? (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    {result.message}
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    {result.message}
                    {result.error && <div className="text-xs mt-2">{result.error}</div>}
                  </AlertDescription>
                </Alert>
              )}

              {result.result ? (
                <div className="mt-2 rounded-md border border-slate-700 overflow-hidden">
                  <p className="text-xs font-semibold text-gray-300 px-3 pt-3">Response:</p>
                  <div className="max-h-48 overflow-y-auto overflow-x-hidden scrollbar-minimal">
                    <SyntaxHighlighter
                      language="json"
                      style={atomOneDark}
                      customStyle={{
                        margin: 0,
                        padding: '12px',
                        fontSize: '12px'
                      }}
                    >
                      {typeof result.result === 'string' && result.result.startsWith('{')
                        ? result.result
                        : JSON.stringify(result.result, null, 2)}
                    </SyntaxHighlighter>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleClose} className="cursor-pointer">
              Close
            </Button>
            <Button onClick={handleCall} disabled={isSubmitting} className="cursor-pointer">
              {isSubmitting && <Loader className="h-4 w-4 mr-2 animate-spin" />}
              {isSubmitting ? "Calling..." : "Call Tool"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
