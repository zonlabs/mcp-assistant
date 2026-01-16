"use client";
import Link from "next/link";
import Image from "next/image";
import {
  Server,
  Play,
  ArrowRight,
  Code,
  Package
} from "lucide-react";
import McpServersSection from "@/components/home/McpServersSection";
import McpArchitecture from "@/components/home/McpArchitecture";
import Footer from "@/components/home/Footer";
import { motion, Variants } from 'framer-motion';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowUpRight } from "lucide-react";
import { HeroGridPattern } from "@/components/home/hero-grid-pattern";
import { Stack } from "@/components/stack";

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
  return (
    <div className="relative max-w-5xl mx-auto min-h-screen overflow-hidden">
      {/* Hero Section */}
      <Stack
        dir="column"
        justify="center"
        items="center"
        className="h-[93vh] overflow-hidden relative"
      >
        <HeroGridPattern />

        <Stack gap={3} className="z-50 w-full pointer-events-none">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={container}
            className="relative flex flex-col items-center justify-center px-6"
          >
            {/* ===== Hero Content ===== */}
            <div className="relative z-10 max-w-5xl text-center px-6">
              <motion.h2
                variants={item}
                className="text-3xl sm:text-4xl md:text-6xl  tracking-tight leading-[1.05] mb-6"
              >
                A Web Based MCP Client to access
                <br />
                <span className="text-zinc-600">remote MCP&apos;s</span>
              </motion.h2>

              <motion.p
                variants={item}
                className="mx-auto max-w-3xl text-sm sm:text-base md:text-lg lg:text-xl text-muted-foreground leading-relaxed mb-5"
              >
                <span className="font-semibold text-foreground">
                  MCP Assistant
                </span>{' '}
                is a web-based{' '}
                <Link
                  href="https://modelcontextprotocol.io/docs/learn/client-concepts"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-primary/50 hover:decoration-primary transition-colors pointer-events-auto"
                >
                  Model Context Protocol (MCP)
                </Link>{' '}
                client that lets you easily connect to and interact with remote
                MCP-compatible servers directly from your browser.
              </motion.p>

              <motion.p
                variants={item}
                className="mx-auto max-w-3xl text-sm sm:text-base md:text-lg lg:text-xl text-muted-foreground leading-relaxed mb-8"
              >
                Designed to be{' '}
                <strong className="text-foreground">
                  lightweight, accessible, and developer-friendly
                </strong>
                , providing a convenient interface for testing MCP servers and
                experimenting with tool calls.
              </motion.p>

              {/* ===== CTA Buttons ===== */}
              <motion.div
                variants={item}
                className="flex flex-col sm:flex-row gap-4 justify-center mb-7 pointer-events-auto"
              >
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                  <Link
                    href="/mcp"
                    className="group relative inline-flex items-center gap-2.5 px-8 py-4 rounded-xl font-semibold text-base bg-primary text-primary-foreground shadow-lg hover:shadow-2xl hover:shadow-foreground/20 transition-all overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Server className="h-5 w-5 relative z-10" />
                    <span className="relative z-10">Explore MCP</span>
                    <ArrowRight className="h-4 w-4 relative z-10 transition-transform group-hover:translate-x-1" />
                  </Link>
                </motion.div>

                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                  <Link
                    href="/playground"
                    className="inline-flex items-center gap-2.5 px-8 py-4 rounded-xl font-semibold text-base border-2 border-border bg-background/50 backdrop-blur-sm hover:bg-accent/50 hover:border-primary/50 transition-all"
                  >
                    <Play className="h-5 w-5" />
                    <span>Try Playground</span>
                  </Link>
                </motion.div>
              </motion.div>

            </div>
          </motion.div>
        </Stack>
      </Stack>

      {/* Recent MCP Servers Section */}
      <div className="container mx-auto px-6 py-10">
        <McpServersSection />
      </div>

      {/* Categories Section */}
      {/* <div className="container mx-auto px-6 py-16">
        <Categories />
      </div> */}

      {/* Architecture Visualization Section */}
      <div className="relative max-w-5xl mx-auto py-8 overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={container}
          className="container mx-auto px-6"
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
      </div>

      {/* Features Section */}
      <section className="py-24 relative overflow-hidden bg-background">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(var(--primary-rgb),0.03),transparent_70%)]" />

        <div className="max-w-5xl mx-auto px-6 relative">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={container}
            className="text-center max-w-4xl mx-auto mb-20 space-y-6"
          >
            <motion.h2
              variants={fadeInUp}
              className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground"
            >
              Everything you need to work with MCP&apos;s
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-muted-foreground text-base sm:text-lg md:text-xl max-w-3xl mx-auto leading-relaxed"
            >
              The <Link href="https://modelcontextprotocol.io/docs/getting-started/intro" target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline">Model Context Protocol (MCP)</Link> is the open standard for connecting AI agents to external tools and data. Use our client to instantly connect to remote servers, explore technical docs, or chat with agents—all for free, in your browser. Have an MCP server? <Link href="/publish" className="text-primary font-medium hover:underline inline-flex items-center gap-1">Publish it to modelcontextprotocol.io registry <ArrowUpRight className="h-3.5 w-3.5" /></Link> so others can discover and use it instantly.
            </motion.p>
          </motion.div>

          <div className="max-w-5xl mx-auto">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={container}
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {[
                {
                  icon: <Server className="h-5 w-5" />,
                  title: "Connect to MCP servers",
                  desc: "Add your remote server to connect to it."
                },
                {
                  icon: <Code className="h-5 w-5" />,
                  title: "Playground",
                  desc: "Chat with the assistant and use tools exposed by connected servers."
                },
                {
                  icon: <Package className="h-5 w-5" />,
                  title: "MCP Registry",
                  desc: "Browse MCP servers from the official registry and connect instantly."
                }
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  variants={item}
                  whileHover={{ y: -5 }}
                  className="group flex flex-col gap-4 p-8 rounded-2xl border border-border/50 bg-card/30 hover:bg-card/60 hover:border-primary/30 transition-all duration-300"
                >
                  <div className="shrink-0 h-12 w-12 rounded-xl flex items-center justify-center bg-primary/10 text-primary group-hover:scale-110 transition-transform duration-300">
                    {feature.icon}
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-xl text-foreground/90 group-hover:text-primary transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {feature.desc}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>


      {/* FAQ Section */}
      < section className="relative max-w-5xl mx-auto py-16 overflow-hidden" >
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
        <div className="px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={container}
            className="text-center mb-12"
          >
            <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl font-bold mb-4">
              Frequently Asked Questions
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-muted-foreground text-lg">
              Find answers to the most common questions about MCP Assistant.
            </motion.p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Accordion type="single" collapsible className="w-full space-y-4">
              {[
                {
                  q: "What is MCP Assistant?",
                  a: "MCP Assistant is a web-based Model Context Protocol (MCP) client that lets you connect to and interact with remote MCP-compatible servers directly through your browser. It offers a lightweight, accessible, and developer-friendly way to test MCP servers without installing anything locally."
                },
                {
                  q: "What does “MCP” stand for?",
                  a: "MCP stands for Model Context Protocol, an open standard that enables AI assistants and applications to communicate effectively with external tools, data sources, and services."
                },
                {
                  q: "Do I need to install anything?",
                  a: "No — MCP Assistant works entirely in your browser. There’s no local setup or installation required. Just open the site, connect to a remote MCP server, and start interacting."
                },
                {
                  q: "Is using MCP Assistant free?",
                  a: "Yes. MCP Assistant is completely free and will always remain free, making it easy for developers and enthusiasts to explore and experiment with MCP servers without any cost."
                },
                {
                  q: "What can I do with MCP Assistant?",
                  a: "You can connect instantly to remote MCP servers via URL, interact with tools to execute calls and retrieve data, and use the AI Playground to experiment with dynamic toolsets."
                }
              ].map((faq, i) => (
                <AccordionItem
                  key={i}
                  value={`item-${i}`}
                  className="border border-border/50 rounded-xl px-6 bg-background/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
                >
                  <AccordionTrigger className="text-base font-semibold hover:no-underline py-5">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed pb-5">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            <div className="mt-10 text-center">
              <Link
                href="/faq"
                className="inline-flex items-center gap-2 text-primary font-medium hover:underline transition-all"
              >
                View all FAQs
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section >

      {/* Footer */}
      < Footer />
    </div>
  );
}
