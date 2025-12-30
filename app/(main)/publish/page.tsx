"use client";

import PublishServer from "@/components/registry/PublishServer";


export default function PublishPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
            <div className="container mx-auto px-6 py-8">
                <PublishServer />
            </div>
        </div>
    );
}
