"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Check, AlertCircle, Loader2, Globe, Github, Tag, FileText, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function PublishServer() {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        version: "1.0.0",
        title: "",
        websiteUrl: "",
        repositoryUrl: "",
        registryToken: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            // Construct the payload matching RegistryServerData structure
            // Note: This is a simplified payload. A real world scenario might need more fields like remotes/packages.
            // For now we assume the user is just registering the metadata or a simple server.
            // If the API requires 'remotes' or 'packages', we might need to add those fields or default them.
            // Based on the OpenAPI spec, 'remotes' or 'packages' are not strictly required at the top level if not present,
            // but 'name', 'description', 'version' are required.

            const payload = {
                $schema: "https://static.modelcontextprotocol.io/schemas/2025-10-17/server.schema.json",
                name: formData.name,
                description: formData.description,
                version: formData.version,
                title: formData.title || undefined,
                websiteUrl: formData.websiteUrl || undefined,
                repository: formData.repositoryUrl ? { url: formData.repositoryUrl } : undefined,
                // We can add empty arrays or defaults if needed, but let's try minimal valid payload first
            };

            const response = await fetch("/api/registry/publish", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${formData.registryToken}`,
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error?.message || data.message || data.error || "Failed to publish server");
            }

            setSuccess(true);
            // Reset form (optional, maybe keep it for reference)
            // setFormData({ ...formData, name: "", description: "", version: "1.0.0", title: "", websiteUrl: "", repositoryUrl: "" }); 
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="w-full py-2 md:py-4 lg:py-6">
            <div className="container px-4 md:px-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="mx-auto max-w-2xl space-y-8"
                >
                    <div className="text-center">
                            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                                Publish Your Server to the Registry
                            </h1>
                        <p className="mt-4 text-gray-500 md:text-xl dark:text-gray-400">
                            Register your server with the Model Context Protocol registry.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid gap-4">
                            <Label htmlFor="name">Server Name</Label>
                            <Input
                                id="name"
                                name="name"
                                placeholder="e.g., MyAwesomeServer"
                                value={formData.name}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="grid gap-4">
                            <Label htmlFor="title">Server Title (Optional)</Label>
                            <Input
                                id="title"
                                name="title"
                                placeholder="e.g., My Awesome Server for Data Processing"
                                value={formData.title}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="grid gap-4">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                name="description"
                                placeholder="A brief description of what your server does."
                                value={formData.description}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="grid gap-4 md:col-span-1">
                                <Label htmlFor="version">Version</Label>
                                <Input
                                    id="version"
                                    name="version"
                                    placeholder="e.g., 1.0.0"
                                    value={formData.version}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="grid gap-4 md:col-span-2">
                                <Label htmlFor="repositoryUrl">Repository URL (Optional)</Label>
                                <Input
                                    id="repositoryUrl"
                                    name="repositoryUrl"
                                    type="url"
                                    placeholder="https://github.com/yourorg/yourserver"
                                    value={formData.repositoryUrl}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                        <div className="grid gap-4">
                            <Label htmlFor="websiteUrl">Website URL (Optional)</Label>
                            <Input
                                id="websiteUrl"
                                name="websiteUrl"
                                type="url"
                                placeholder="https://yourserver.com"
                                value={formData.websiteUrl}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="grid gap-4">
                            <Label htmlFor="registryToken">Registry API Token</Label>
                            <Input
                                id="registryToken"
                                name="registryToken"
                                type="password"
                                placeholder="Enter your registry API token"
                                value={formData.registryToken}
                                onChange={handleChange}
                                required
                            />
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                This token authenticates your request to the registry.
                            </p>
                        </div>

                        <div className="flex justify-end">
                            <Button type="submit" disabled={loading}>
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Publishing...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="mr-2 h-4 w-4" /> Publish Server
                                    </>
                                )}
                            </Button>
                        </div>

                        <AnimatePresence>
                            {success && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="mt-4"
                                >
                                    <Alert variant="default" className="bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-200">
                                        <Check className="h-4 w-4" />
                                        <AlertTitle>Success!</AlertTitle>
                                        <AlertDescription>
                                            Your server has been successfully published to the registry.
                                        </AlertDescription>
                                    </Alert>
                                </motion.div>
                            )}

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="mt-4"
                                >
                                    <Alert variant="destructive">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertTitle>Error</AlertTitle>
                                        <AlertDescription>{error}</AlertDescription>
                                    </Alert>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </form>
                </motion.div>
            </div>
        </section>
    );
}
