"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Rss,
  Globe,
  AlertCircle
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { McpServer } from "@/types/mcp";
import { toast } from "react-hot-toast";
import { Session } from "next-auth";
import Link from "next/link";
import { useQuery } from "@apollo/client/react";
import { CATEGORIES_QUERY } from "@/lib/graphql";
import { Category } from "@/types/mcp";
import { gql } from "@apollo/client";

const GET_CATEGORIES = gql`${CATEGORIES_QUERY}`;

const serverSchema = z.object({
  name: z.string().min(1, "Server name is required"),
  description: z.string().optional(),
  transport: z.enum(["sse", "streamable_http"]),
  categoryIds: z.array(z.string()).optional(),
  url: z.string().optional(),
  command: z.string().optional(),
  args: z.string().optional(),
  requiresOauth: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  headers: z.array(z.object({
    key: z.string(),
    value: z.string()
  })).optional()
});

type ServerFormData = z.infer<typeof serverSchema>;

interface ServerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ServerFormData) => Promise<void>;
  server?: McpServer | null;
  mode: 'add' | 'edit';
  session: Session | null;
}

export default function ServerFormModal({
  isOpen,
  onClose,
  onSubmit,
  server,
  mode,
  session
}: ServerFormModalProps) {
  const [showHeaders, setShowHeaders] = useState(false);
  const [transportType, setTransportType] = useState<"sse" | "streamable_http">("sse");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  const { loading, error, data } = useQuery<{
    categories: {
      edges: Array<{ node: Category }>;
    };
  }>(GET_CATEGORIES, {
    fetchPolicy: "cache-and-network",
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    control,
    watch,
    setValue
  } = useForm<ServerFormData>({
    resolver: zodResolver(serverSchema),
    defaultValues: {
      name: "",
      description: "",
      transport: "sse",
      categoryIds: [],
      url: "",
      command: "",
      args: "",
      requiresOauth: false,
      isPublic: false,
      headers: []
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "headers"
  });

  const watchedTransport = watch("transport");

  useEffect(() => {
    setTransportType(watchedTransport);
  }, [watchedTransport]);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && server) {
        const categoryIds = server.categories ? server.categories.map(cat => cat.id) : [];
        setSelectedCategoryIds(categoryIds);
        reset({
          name: server.name,
          description: server.description || "",
          transport: server.transport as "sse" | "streamable_http",
          categoryIds: categoryIds,
          url: server.url || "",
          command: server.command || "",
          args: server.args ? (typeof server.args === 'string' ? server.args : JSON.stringify(server.args)) : "",
          requiresOauth: server.requiresOauth2 || false,
          isPublic: server.isPublic || false,
          headers: []
        });
        setTransportType(server.transport as "sse" | "streamable_http");
      } else {
        setSelectedCategoryIds([]);
        reset({
          name: "",
          description: "",
          transport: "sse",
          categoryIds: [],
          url: "",
          command: "",
          args: "",
          requiresOauth: false,
          isPublic: false,
          headers: []
        });
        setTransportType("sse");
      }
      setShowHeaders(false);
    }
  }, [isOpen, mode, server, reset]);

  const handleFormSubmit = async (data: ServerFormData) => {
    if (!session) {
      toast.error("Please sign in to save server configuration");
      return;
    }

    try {
      await onSubmit(data);
      onClose();
      toast.success(`Server ${mode === 'add' ? 'added' : 'updated'} successfully`);
    } catch (error) {
      toast.error(`Failed to ${mode === 'add' ? 'add' : 'update'} server`);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-2 flex-shrink-0">
          <DialogTitle>
            {mode === 'add' ? 'Add MCP' : 'Edit MCP'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 scrollbar-minimal">

            {/* Authentication Warning */}
            {!session && (
              <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                <AlertDescription className="text-sm text-amber-800 dark:text-amber-200">
                  Please <Link href="/api/auth/signin" className="font-semibold underline hover:text-amber-900 dark:hover:text-amber-100">sign in</Link> to save your server configuration.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-1">
              <Label htmlFor="name" className="text-xs">Server Name</Label>
              <Input
                {...register("name")}
                id="name"
                placeholder="My MCP Server"
                className="h-9"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="description" className="text-xs">Description</Label>
              <Textarea
                {...register("description")}
                id="description"
                placeholder="What does this server do? (optional/markdown supported)"
                className="min-h-[60px] resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Help others understand what this server is for
              </p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Transport Type</Label>
              <p className="text-xs -mt-1 text-muted-foreground">
                Choose how to connect to your MCP server:
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <label className={`
                flex flex-col items-center justify-center p-2 rounded-lg border-2 cursor-pointer transition-colors
                ${transportType === 'sse' ? "border-primary bg-primary/10" : "border-input hover:bg-accent"}
              `}>
                  <input type="radio" {...register("transport")} value="sse" className="sr-only" />
                  <Rss className="h-4 w-4 mb-1" />
                  <span className="font-semibold text-xs">SSE</span>
                  <span className="text-xs text-muted-foreground">Server-Sent Events</span>
                </label>
                <label className={`
                flex flex-col items-center justify-center p-2 rounded-lg border-2 cursor-pointer transition-colors
                ${transportType === 'streamable_http' ? "border-primary bg-primary/10" : "border-input hover:bg-accent"}
              `}>
                  <input type="radio" {...register("transport")} value="streamable_http" className="sr-only" />
                  <Globe className="h-4 w-4 mb-1" />
                  <span className="font-semibold text-xs">HTTP</span>
                  <span className="text-xs text-muted-foreground">Streamable HTTP</span>
                </label>
              </div>
            </div>

            {/* Category Multiselect Dropdown */}
            <div className="space-y-1">
              <Label htmlFor="categoryIds" className="text-xs">Categories</Label>

              {loading ? (
                <p className="text-xs text-muted-foreground">Loading categories...</p>
              ) : error ? (
                <p className="text-xs text-red-500">Failed to load categories</p>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-9 justify-between text-sm font-normal"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        {selectedCategoryIds.length > 0 ? (
                          selectedCategoryIds.map((id) => {
                            const category = data?.categories?.edges.find(
                              ({ node }) => node.id === id
                            )?.node;
                            if (!category) return null;
                            return (
                              <div key={id} className="flex items-center gap-1 bg-secondary px-2 py-0.5 rounded">
                                {category.icon && (
                                  category.icon.includes('.') ? (
                                    <Image
                                      src={`/categories/${category.icon}`}
                                      alt={category.name}
                                      width={14}
                                      height={14}
                                    />
                                  ) : (
                                    <span className="text-xs">{category.icon}</span>
                                  )
                                )}
                                <span className="text-xs">{category.name}</span>
                              </div>
                            );
                          })
                        ) : (
                          <span className="text-muted-foreground">Select categories</span>
                        )}
                      </div>
                      <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[300px]" align="start">
                    {data?.categories?.edges.map(({ node }) => (
                      <DropdownMenuCheckboxItem
                        key={node.id}
                        checked={selectedCategoryIds.includes(node.id)}
                        onCheckedChange={(checked) => {
                          const newIds = checked
                            ? [...selectedCategoryIds, node.id]
                            : selectedCategoryIds.filter((id) => id !== node.id);
                          setSelectedCategoryIds(newIds);
                          setValue("categoryIds", newIds);
                        }}
                      >
                        {node.icon && (
                          node.icon.includes('.') ? (
                            <Image
                              src={`/categories/${node.icon}`}
                              alt={node.name}
                              width={16}
                              height={16}
                              className="mr-2"
                            />
                          ) : (
                            <span className="mr-2">{node.icon}</span>
                          )
                        )}
                        {node.name}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <p className="text-xs pt-1 text-muted-foreground">
                Select one or more categories to help organize your MCP server (Optional)
              </p>
            </div>



            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Controller
                  name="requiresOauth"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      id="requiresOauth"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="requiresOauth" className="text-xs">
                  Requires OAuth2 Authentication
                </Label>
              </div>
              <p className="text-xs pt-1 text-muted-foreground">
                Enable if this server requires OAuth2 authentication
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Controller
                  name="isPublic"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      id="isPublic"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="isPublic" className="text-xs">
                  Share with other users
                </Label>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="url" className="text-xs">Server URL</Label>
              <Input {...register("url")} id="url" placeholder="https://mcp.example.com/token/mcp" className="h-9" />
              {errors.url && <p className="text-red-500 text-xs mt-1">{errors.url.message}</p>}
              <p className="text-xs pt-1 text-muted-foreground">
                Full URL to the endpoint of the MCP server
              </p>
            </div>

            {/* HTTP Headers Section */}
            <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setShowHeaders(!showHeaders)}
                  className="flex items-center justify-between w-full text-left pt-1"
                >
                  <Label className="text-xs">HTTP Headers</Label>
                  {showHeaders ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                <AnimatePresence>
                  {showHeaders && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2 pt-1"
                    >
                      {fields.map((field, index) => (
                        <div key={field.id} className="flex items-center gap-2">
                          <Input
                            {...register(`headers.${index}.key`)}
                            placeholder="Authorization"
                            className="w-1/3 h-9"
                          />
                          <Input
                            {...register(`headers.${index}.value`)}
                            placeholder="Bearer token123"
                            className="flex-1 h-9"
                          />
                          <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => append({ key: "", value: "" })}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Header
                      </Button>
                      <p className="text-xs pt-1 text-muted-foreground">
                        HTTP headers will be sent with requests to the endpoint.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
            </div>
          </div>

          <div className="flex justify-end gap-2 px-6 py-2 border-t bg-background flex-shrink-0 rounded-b-md">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!session || isSubmitting}>
              {isSubmitting ? "Saving..." : !session ? (mode === 'add' ? "Sign in to Add" : "Sign in to Update") : mode === 'add' ? 'Add Server' : 'Update Server'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
