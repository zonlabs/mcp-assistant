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
    AlertCircle,
    Save,
    X,
    Edit2
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { McpServer } from "@/types/mcp";
import { toast } from "react-hot-toast";
import { Session } from "@supabase/supabase-js";
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

interface ServerFormProps {
    server?: McpServer | null;
    mode: 'add' | 'edit';
    session: Session | null;
    onSubmit: (data: ServerFormData) => Promise<void>;
    onCancel: () => void;
}

export default function ServerForm({
    server,
    mode,
    session,
    onSubmit,
    onCancel
}: ServerFormProps) {
    const [showHeaders, setShowHeaders] = useState(false);
    const [transportType, setTransportType] = useState<"sse" | "streamable_http">("streamable_http");
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
            transport: "streamable_http",
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

    // Initial Data Load
    useEffect(() => {
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
                transport: "streamable_http",
                categoryIds: [],
                url: "",
                command: "",
                args: "",
                requiresOauth: false,
                isPublic: false,
                headers: []
            });
            setTransportType("streamable_http");
        }
        setShowHeaders(false);
    }, [mode, server, reset]);

    const handleFormSubmit = async (data: ServerFormData) => {
        if (!session) {
            toast.error("Please sign in to save server configuration");
            return;
        }

        try {
            await onSubmit(data);
            toast.success(`Server ${mode === 'add' ? 'added' : 'updated'} successfully`);
            onCancel(); // Use onCancel to "close" or navigate away
        } catch (error) {
            toast.error(`Failed to ${mode === 'add' ? 'add' : 'update'} server`);
        }
    };

    return (
        <div className="h-full flex flex-col bg-background animate-in slide-in-from-bottom-4 duration-300 max-w-2xl mx-auto w-full">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Edit2 className="h-4 w-4 text-primary" />
                    </div>
                    <h2 className="text-xl font-semibold">
                        {mode === 'add' ? 'Add New Server' : 'Edit Server'}
                    </h2>
                </div>

            </div>

            {/* Form Content */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="w-full mx-auto space-y-8">

                    {/* Auth Warning */}
                    {!session && (
                        <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
                            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                            <AlertDescription className="text-sm text-amber-800 dark:text-amber-200">
                                Please <Link href="/signin" className="font-semibold underline hover:text-amber-900 dark:hover:text-amber-100">sign in</Link> to save your server configuration.
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Basic Info */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium border-b pb-2">Basic Information</h3>

                        <div className="space-y-1">
                            <Label htmlFor="name" className="text-xs">Server Name</Label>
                            <Input
                                {...register("name")}
                                id="name"
                                placeholder="My MCP Server"
                                className="h-10"
                            />
                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="description" className="text-xs">Description</Label>
                            <Textarea
                                {...register("description")}
                                id="description"
                                placeholder="What does this server do? (optional/markdown supported)"
                                className="min-h-[100px] resize-none leading-relaxed"
                            />
                            <p className="text-xs text-muted-foreground">
                                Markdown supported. Help others understand this server.
                            </p>
                        </div>
                    </div>

                    {/* Configuration */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium border-b pb-2">Connection Configuration</h3>

                        <div className="space-y-1">
                            <Label className="text-xs">Transport Type</Label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                                <label className={`
                        flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all
                        ${transportType === 'streamable_http' ? "border-primary bg-primary/5 shadow-sm" : "border-muted hover:border-primary/50 hover:bg-muted/50"}
                        `}>
                                    <input type="radio" {...register("transport")} value="streamable_http" className="sr-only" />
                                    <Globe className="h-5 w-5 mb-2" />
                                    <span className="font-semibold text-sm">HTTP</span>
                                    <span className="text-[10px] text-muted-foreground">Streamable HTTP</span>
                                </label>
                                <label className={`
                        flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all
                        ${transportType === 'sse' ? "border-primary bg-primary/5 shadow-sm" : "border-muted hover:border-primary/50 hover:bg-muted/50"}
                        `}>
                                    <input type="radio" {...register("transport")} value="sse" className="sr-only" />
                                    <Rss className="h-5 w-5 mb-2" />
                                    <span className="font-semibold text-sm">SSE</span>
                                    <span className="text-[10px] text-muted-foreground">Server-Sent Events</span>
                                </label>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="url" className="text-xs">Server URL</Label>
                            <Input {...register("url")} id="url" placeholder="https://mcp.example.com/token/mcp" className="h-10 font-mono text-sm" />
                            {errors.url && <p className="text-red-500 text-xs mt-1">{errors.url.message}</p>}
                        </div>
                    </div>

                    {/* HTTP Headers */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b pb-2">
                            <h3 className="text-lg font-medium">HTTP Headers</h3>
                            <Button
                                type="button"
                                variant="default"
                                size="sm"
                                onClick={() => append({ key: "", value: "" })}
                                className="h-8 text-xs"
                            >
                                <Plus className="mr-1 h-3 w-3" />
                                Add Header
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {fields.map((field, index) => (
                                <div key={field.id} className="flex items-center gap-2 group">
                                    <Input
                                        {...register(`headers.${index}.key`)}
                                        placeholder="Authorization"
                                        className="w-1/3 h-9 font-mono text-xs"
                                    />
                                    <Input
                                        {...register(`headers.${index}.value`)}
                                        placeholder="Bearer token123"
                                        className="flex-1 h-9 font-mono text-xs"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => remove(index)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            ))}
                            {fields.length === 0 && (
                                <div className="text-center py-6 border-2 border-dashed rounded-lg text-muted-foreground text-sm">
                                    No custom headers configured.
                                </div>
                            )}
                        </div>
                    </div>


                    {/* Metadata & Visibility */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium border-b pb-2">Metadata & Visibility</h3>

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
                                            className="w-full h-10 justify-between text-sm font-normal"
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
                                                    <span className="text-muted-foreground">Select categories...</span>
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
                                                {node.name}
                                            </DropdownMenuCheckboxItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-2">

                            {/* Requires OAuth2 */}
                            <div className="flex items-start space-x-3 py-3 border-b">
                                <Controller
                                    name="requiresOauth"
                                    control={control}
                                    render={({ field }) => (
                                        <Checkbox
                                            id="requiresOauth"
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                            className="mt-0.5"
                                        />
                                    )}
                                />
                                <div className="space-y-1">
                                    <Label htmlFor="requiresOauth" className="text-sm font-medium">
                                        OAuth2.1
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        Enable if the server requires OAuth2.1.
                                    </p>
                                </div>
                            </div>

                            {/* Public */}
                            <div className="flex items-start space-x-3 py-3 border-b">
                                <Controller
                                    name="isPublic"
                                    control={control}
                                    render={({ field }) => (
                                        <Checkbox
                                            id="isPublic"
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                            className="mt-0.5"
                                        />
                                    )}
                                />
                                <div className="space-y-1">
                                    <Label htmlFor="isPublic" className="text-sm font-medium">
                                        Public
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        Make this server accessible to the public.                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Buttons Row */}
                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="ghost" onClick={onCancel}>
                                Cancel
                            </Button>

                            <Button
                                onClick={handleSubmit(handleFormSubmit)}
                                disabled={!session || isSubmitting}
                                className="gap-2"
                            >
                                {isSubmitting ? (
                                    <span className="animate-spin">⏳</span>
                                ) : (
                                    <Save className="h-4 w-4" />
                                )}
                                {mode === "add" ? "Save Server" : "Update Server"}
                            </Button>
                        </div>



                    </div>

                    <div className="h-12" /> {/* Spacer */}
                </div>
            </div>
        </div>
    );
}
