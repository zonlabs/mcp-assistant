import { cn } from "@/lib/utils";
import React from "react";

interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
    dir?: "row" | "column";
    items?: "start" | "center" | "end" | "stretch";
    justify?: "start" | "center" | "end" | "between" | "around" | "evenly";
    gap?: number;
}

export function Stack({
    children,
    className,
    dir = "column",
    items,
    justify,
    gap = 2,
    ...props
}: StackProps) {
    return (
        <div
            className={cn(
                "flex",
                dir === "column" ? "flex-col" : "flex-row",
                items && `items-${items}`,
                justify && `justify-${justify}`,
                `gap-${gap}`,
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}
