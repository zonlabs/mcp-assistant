import { cn } from "@/lib/utils";
import React from "react";

function H1({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
    return (
        <h1
            className={cn(
                "text-4xl font-bold tracking-tight lg:text-5xl",
                className
            )}
            {...props}
        >
            {children}
        </h1>
    );
}

function P({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
    return (
        <p
            className={cn("leading-7 [&:not(:first-child)]:mt-6", className)}
            {...props}
        >
            {children}
        </p>
    );
}

function Small({ className, children, ...props }: React.HTMLAttributes<HTMLElement>) {
    return (
        <small
            className={cn("text-sm font-medium leading-none", className)}
            {...props}
        >
            {children}
        </small>
    );
}

export const Typography = {
    H1,
    P,
    Small,
};
