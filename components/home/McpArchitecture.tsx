"use client";

import { AnimatedBeam } from "@/components/ui/animated-beam/animated-beam";
import React, { forwardRef, useRef } from "react";
import { cn } from "@/lib/utils";
import { User } from "lucide-react";
import Image from "next/image";

const Circle = forwardRef<
  HTMLDivElement,
  { className?: string; children?: React.ReactNode }
>(({ className, children }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "z-10 flex size-12 items-center justify-center rounded-full border-2 border-border bg-background p-3 shadow-lg",
        className,
      )}
    >
      {children}
    </div>
  );
});

Circle.displayName = "Circle";

export default function McpArchitecture({
  className,
}: {
  className?: string;
}) {
  const containerRef = useRef<HTMLElement>(null);
  const userRef = useRef<HTMLElement>(null);
  const aguiRef = useRef<HTMLElement>(null);
  const openaiRef = useRef<HTMLElement>(null);
  const mcpHubRef = useRef<HTMLElement>(null);
  const server1Ref = useRef<HTMLElement>(null);
  const server2Ref = useRef<HTMLElement>(null);
  const server3Ref = useRef<HTMLElement>(null);

  return (
    <div
      className={cn(
        "relative flex h-[380px] w-full items-center justify-center overflow-hidden py-4 px-8",
        className,
      )}
      ref={containerRef as React.RefObject<HTMLDivElement>}
    >
      <div className="flex size-full flex-row items-stretch justify-between gap-6 max-w-5xl">
        {/* User */}
        <div className="flex flex-col justify-center items-center gap-3">
          <Circle ref={userRef as React.RefObject<HTMLDivElement>} className="size-16">
            <Icons.user />
          </Circle>
          <div className="text-center">
            <div className="text-sm font-semibold mb-1">You</div>
            <p className="text-xs text-muted-foreground leading-tight max-w-[120px] line-clamp-2">
              Interact through MCP Assistant
            </p>
          </div>
        </div>

        {/* AG-UI Protocol */}
        <div className="flex flex-col justify-center items-center gap-3">
          <Circle ref={aguiRef as React.RefObject<HTMLDivElement>} className="size-16 p-2">
            <Icons.agui />
          </Circle>
          <div className="text-center">
            <div className="text-sm font-semibold mb-1">AG-UI</div>
            <p className="text-xs text-muted-foreground leading-tight max-w-[120px] line-clamp-2">
              Connects UI to AI Assistant
            </p>
          </div>
        </div>

        {/* OpenAI */}
        <div className="flex flex-col justify-center items-center gap-3">
          <Circle ref={openaiRef as React.RefObject<HTMLDivElement>} className="size-16">
            <Icons.openai />
          </Circle>
          <div className="text-center">
            <div className="text-sm font-semibold mb-1">OpenAI</div>
            <p className="text-xs text-muted-foreground leading-tight max-w-[120px] line-clamp-2">
              AI model processes and understands
            </p>
          </div>
        </div>

        {/* MCP */}
        <div className="flex flex-col justify-center items-center gap-3">
          <Circle ref={mcpHubRef as React.RefObject<HTMLDivElement>} className="size-16 p-2">
            <Icons.mcpHub />
          </Circle>
          <div className="text-center">
            <div className="text-sm font-semibold mb-1">MCP</div>
            <p className="text-xs text-muted-foreground leading-tight max-w-[120px] line-clamp-2">
              Interfaces AI with external tools
            </p>
          </div>
        </div>

        {/* MCP Servers - Show 3 servers */}
        <div className="flex flex-col justify-center items-center gap-3">
          <div className="flex flex-col gap-4">
            <Circle ref={server1Ref as React.RefObject<HTMLDivElement>} className="size-14">
              <Icons.server />
            </Circle>
            <Circle ref={server2Ref as React.RefObject<HTMLDivElement>} className="size-14">
              <Icons.server />
            </Circle>
            <Circle ref={server3Ref as React.RefObject<HTMLDivElement>} className="size-14">
              <Icons.server />
            </Circle>
          </div>
          <div className="text-center">
            <div className="text-sm font-semibold mb-1">Servers</div>
            <p className="text-xs text-muted-foreground leading-tight max-w-[120px] line-clamp-2">
              Expose tools and data
            </p>
          </div>
        </div>
      </div>

      {/* Animated Beams */}
      {/* User to AG-UI */}
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={userRef}
        toRef={aguiRef}
        curvature={0}
        duration={2}
      />

      {/* AG-UI to OpenAI */}
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={aguiRef}
        toRef={openaiRef}
        curvature={0}
        duration={2}
        delay={0.3}
      />

      {/* OpenAI to MCP Hub */}
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={openaiRef}
        toRef={mcpHubRef}
        curvature={0}
        duration={2}
        delay={0.6}
      />

      {/* MCP Hub to Servers */}
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={mcpHubRef}
        toRef={server1Ref}
        curvature={-25}
        duration={2}
        delay={0.9}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={mcpHubRef}
        toRef={server2Ref}
        curvature={0}
        duration={2}
        delay={1.1}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={mcpHubRef}
        toRef={server3Ref}
        curvature={25}
        duration={2}
        delay={1.3}
      />
    </div>
  );
}

const Icons = {
  user: () => (
    <User className="h-6 w-6 text-foreground" strokeWidth={2} />
  ),
  agui: () => (
    <>
      {/* Light mode */}
      <Image
        src="/technologies/agui-light.webp"
        alt="AG-UI Protocol"
        width={28}
        height={28}
        className="h-7 w-7 object-contain dark:hidden"
      />
      {/* Dark mode */}
      <Image
        src="/technologies/agui.webp"
        alt="AG-UI Protocol"
        width={28}
        height={28}
        className="h-7 w-7 object-contain hidden dark:block"
      />
    </>
  ),
  openai: () => (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className="h-6 w-6"
    >
      <path
        d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"
        fill="currentColor"
      />
    </svg>
  ),
  mcpHub: () => (
    <>
      {/* Light mode */}
      <Image
        src="/technologies/mcp-light.webp"
        alt="MCP Hub"
        width={28}
        height={28}
        className="h-7 w-7 object-contain dark:hidden"
      />
      {/* Dark mode */}
      <Image
        src="/technologies/mcp.webp"
        alt="MCP Hub"
        width={28}
        height={28}
        className="h-7 w-7 object-contain hidden dark:block"
      />
    </>
  ),
  server: () => (
    <Image
      src="/servers/server-on.png"
      alt="MCP Server"
      width={24}
      height={24}
      className="h-6 w-6 object-contain"
    />
  ),
};
