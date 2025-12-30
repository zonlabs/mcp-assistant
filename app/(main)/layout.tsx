import Header from "@/components/common/Header";

export default function MainLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="min-h-screen">
            <div className="max-w-5xl mx-auto">
                <Header />
                <main>
                    {children}
                </main>
            </div>
        </div>
    );
}
