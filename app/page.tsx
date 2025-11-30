"use client";
import Link from "next/link";
import Image from "next/image";
import {
  Server,
  Play,
  ArrowRight,
  MessageSquare,
  Plug
} from "lucide-react";
import RecentMcpServers from "@/components/home/RecentMcpServers";
import Categories from "@/components/home/Categories";
import McpArchitecture from "@/components/home/McpArchitecture";
import Footer from "@/components/home/Footer";
import { motion, Variants } from 'framer-motion';
// -------------------------------------------------------------------
// Animation Variants
// -------------------------------------------------------------------
const container: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.6,
      when: "beforeChildren",
      staggerChildren: 0.12,
    },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94] as const // Smooth easing
    },
  },
};

const logoHover: Variants = {
  rest: { y: 0, scale: 1 },
  hover: {
    y: -6,
    scale: 1.05,
    transition: {
      duration: 0.3,
      ease: "easeOut" as const
    }
  },
};

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] as const }
  }
};

// -------------------------------------------------------------------
// Component
// -------------------------------------------------------------------
export default function Home() {
  // const session = await getServerSession(authOptions);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 overflow-hidden">
      {/* Animated Background Orbs */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            x: [0, 100, 0],
            y: [0, -100, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-30"
        />
        <motion.div
          animate={{
            x: [0, -100, 0],
            y: [0, 100, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl opacity-30"
        />
      </div>

      {/* Hero Section */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={container}
        className="relative h-[90vh] flex flex-col justify-center items-center px-6"
      >
        {/* Main Hero Content - Centered */}
        <div className="container mx-auto text-center max-w-5xl">
          {/* Tagline */}
          <motion.h1
            variants={item}
            className="text-2xl sm:text-3xl md:text-5xl font-bold text-foreground mb-4 sm:mb-5 tracking-tight leading-[1.1]"
          >
           A Web Based MCP Client to access
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-blue-500 to-primary bg-[length:200%_auto] animate-gradient">
              {/* without the hassle */}
              <br/> remote MCP&apos;s
            </span>
          </motion.h1>

          {/* Description */}
          <motion.p
            variants={item}
            className="text-sm sm:text-base md:text-lg lg:text-xl text-muted-foreground mb-4 sm:mb-5 max-w-3xl mx-auto leading-relaxed"
          >
            The MCP Assistant Web Client is a browser-based implementation of a Model Context Protocol (MCP) client that allows users to easily connect to and interact with any MCP-compatible server.
          </motion.p>

          {/* Additional Description */}
          <motion.p
            variants={item}
            className="text-sm sm:text-base md:text-lg lg:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-3xl mx-auto leading-relaxed"
          >
            Designed to be <strong className="text-foreground">lightweight, accessible, and developer-friendly</strong>, providing a convenient interface for testing MCP servers and experimenting with tool calls.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            variants={item}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-6 sm:mb-7"
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link
                href="/mcp"
                className="group relative inline-flex items-center justify-center gap-2.5 bg-primary text-primary-foreground px-8 py-4 rounded-xl font-semibold text-base shadow-lg hover:shadow-2xl hover:shadow-primary/50 transition-all duration-300 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <Server className="h-5 w-5 relative z-10" />
                <span className="relative z-10">Explore MCP</span>
                <ArrowRight className="h-4 w-4 relative z-10 group-hover:translate-x-1 transition-transform duration-300" />
              </Link>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link
                href="/playground"
                className="group inline-flex items-center justify-center gap-2.5 border-2 border-border bg-background/50 backdrop-blur-sm text-foreground px-8 py-4 rounded-xl font-semibold text-base hover:bg-accent/50 hover:border-primary/50 transition-all duration-300"
              >
                <Play className="h-5 w-5 group-hover:text-primary transition-colors" />
                <span>Try Playground</span>
              </Link>
            </motion.div>
          </motion.div>

          {/* Powered By */}
          <motion.div
            variants={item}
            className="pt-3 sm:pt-4 border-t border-border/30"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 sm:mb-4">
              Powered by
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5 md:gap-8 lg:gap-12">
              {[
                { light: '/technologies/mcp-light.webp', dark: '/technologies/mcp.webp', label: 'MCP' },
                { light: '/technologies/langgraph-light.webp', dark: '/technologies/langgraph.webp', label: 'LangGraph' },
                { light: '/technologies/agui-light.webp', dark: '/technologies/agui.webp', label: 'AGUI Protocol' },
              ].map((tech, i) => (
                <motion.div
                  key={i}
                  variants={logoHover}
                  initial="rest"
                  whileHover="hover"
                  className="group flex flex-col items-center gap-1 sm:gap-2 cursor-pointer"
                >
                  <div className="relative h-7 sm:h-9 w-auto p-1.5 sm:p-2 rounded-lg bg-background/50 backdrop-blur-sm border border-border/50 group-hover:border-primary/50 group-hover:bg-primary/5 transition-all duration-300">
                    <Image
                      src={tech.light}
                      alt={tech.label}
                      width={100}
                      height={32}
                      className="h-4 sm:h-5 w-auto opacity-80 group-hover:opacity-100 transition-opacity dark:hidden"
                    />
                    <Image
                      src={tech.dark}
                      alt={tech.label}
                      width={100}
                      height={32}
                      className="h-4 sm:h-5 w-auto opacity-80 group-hover:opacity-100 transition-opacity hidden dark:block"
                    />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors hidden sm:block">
                    {tech.label}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Recent MCP Servers Section */}
      <div className="container mx-auto px-6 py-16">
        <RecentMcpServers />
      </div>

      {/* Categories Section */}
      <div className="container mx-auto px-6 py-16">
        <Categories />
      </div>

      {/* Architecture Visualization Section */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={container}
        className="container mx-auto px-6 py-10"
      >
        <motion.div variants={fadeInUp} className="text-center mb-6">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
            How It Works
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg md:text-xl max-w-3xl mx-auto leading-relaxed">
            A seamless flow from your interface to AI-powered agents with dynamic MCP server connections
          </p>
        </motion.div>
          <McpArchitecture className="max-w-6xl w-full" />
      </motion.div>
      
      {/* Feature Highlights Section */}
      <div id="features" className="relative pb-28 bg-gradient-to-b from-background via-muted/20 to-background overflow-hidden">
        {/* Gradient blobs */}
        <div className="absolute inset-0 -z-10">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.2, 0.3, 0.2],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute top-10 left-20 w-96 h-96 bg-primary/30 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.25, 0.35, 0.25],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute bottom-10 right-32 w-[30rem] h-[30rem] bg-blue-500/20 rounded-full blur-3xl"
          />
        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={container}
          className="container mx-auto px-6 grid md:grid-cols-2 gap-20 items-center"
        >
          {/* Left side content */}
          <motion.div
            variants={fadeInUp}
            className="max-w-xl mx-auto text-center md:text-left"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight bg-clip-text text-transparent bg-gradient-to-br from-primary via-blue-500 to-foreground">
              Direct Access to MCP Servers, Simplified
            </h2>
            <p className="text-base md:text-lg text-muted-foreground mb-10 leading-relaxed">
              Skip the setup and subscriptions. Instantly connect to any remote MCP server through your browser — fast, secure, and ready to use.
            </p>

            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              {["No Client Setup", "Instant Access", "Secure Isolation"].map((tag, i) => (
                <motion.span
                  key={tag}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                  className="px-4 py-2 rounded-full border border-primary/30 text-primary/90 text-sm font-medium bg-primary/5 backdrop-blur-sm hover:bg-primary/10 hover:border-primary/50 transition-all cursor-default"
                >
                  {tag}
                </motion.span>
              ))}
            </div>
          </motion.div>

          {/* Right side stacked cards */}
          <motion.div variants={container} className="space-y-5">
            {[
              {
                icon: <Server className="h-6 w-6 text-primary" />,
                title: "MCP",
                desc: "Instantly connect to remote MCP servers with zero local configuration — just a URL away.",
              },
              {
                icon: <MessageSquare className="h-6 w-6 text-primary" />,
                title: "AI Playground",
                desc: "Chat with LangGraph agents that dynamically connect to your active MCP tools in real-time.",
              },
              {
                icon: <Plug className="h-6 w-6 text-primary" />,
                title: "Dynamic Tools",
                desc: "Automatically discover, bind, and execute remote tools scoped securely to your session.",
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                variants={item}
                whileHover={{
                  y: -8,
                  transition: { duration: 0.3 }
                }}
                className="group relative flex items-start gap-5 bg-background/70 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-lg hover:shadow-2xl hover:shadow-primary/10 hover:border-primary/40 transition-all duration-300"
              >
                <div className="p-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 group-hover:from-primary/20 group-hover:to-primary/10 transition-all duration-300 group-hover:scale-110">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
