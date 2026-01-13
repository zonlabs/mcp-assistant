'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, getToolName, type ToolUIPart, type DynamicToolUIPart, isToolUIPart } from 'ai';
import { useRef, useEffect } from 'react';
import { Separator } from '@/components/ui/separator';
import MCPToolCall from '@/components/playground/MCPToolCall';
import { ChatInput } from '@/components/playground/ChatInput';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/playground/LoadingSpinner';
import { RecipeComponent } from '@/components/playground/RecipeComponent';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export default function PlaygroundPage() {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { error, status, sendMessage, messages } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Scrollable Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-12 space-y-8">
          {/* Only show messages here if they exist */}
          {messages.map((m) => (
            <div key={m.id} className={cn("group flex flex-col gap-3", m.role === 'user' ? "items-end" : "items-start")}>
              {m.parts.map((part, index) => {
                if (part.type === 'text') {
                  return m.role === 'user' ? (
                    <div key={index} className="max-w-[80%] bg-secondary px-4 py-2.5 rounded-[20px] text-sm">
                      {part.text}
                    </div>
                  ) : (
                    <div key={index} className="prose prose-sm dark:prose-invert max-w-full leading-7">
                      {part.text}
                    </div>
                  );
                }
                if (part.type === 'step-start' && index > 0) return <Separator key={index} className="my-4" />;
                if (isToolUIPart(part)) {
                  const toolPart = part as ToolUIPart<any> | DynamicToolUIPart;
                  return (
                    <div key={index} className="w-full">
                      <MCPToolCall
                        name={toolPart.title || getToolName(toolPart)}
                        state={toolPart.state}
                        input={toolPart.input}
                        output={toolPart.state === 'output-available' ? toolPart.output : undefined}
                        errorText={toolPart.state === 'output-error' ? toolPart.errorText : undefined}
                      />
                    </div>
                  );
                }
                return null;
              })}
            </div>
          ))}

          {/* Thinking State */}
          {(status === 'streaming' || status === 'submitted') && (
            <div className="flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="p-1"><LoadingSpinner/></div>
              <div className="prose prose-sm dark:prose-invert italic text-muted-foreground flex items-center h-8">
                Thinking...
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/20 text-destructive text-sm flex items-center justify-between">
              <span>{error.message || 'An error occurred'}</span>
              <Button variant="ghost" size="sm" onClick={() => sendMessage({ text: '' })}>
                <RefreshCw className="w-3 h-3 mr-2" /> Retry
              </Button>
            </div>
          )}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>

      {/* Input Area + Initial UI */}
      <footer className={cn(
        "flex flex-col items-center transition-all duration-500 pb-8",
        !hasMessages ? "justify-center flex-1 pb-20" : "sticky bottom-0 bg-gradient-to-t from-background via-background to-transparent pt-10"
      )}>
        {!hasMessages && (
          <div className="text-center mb-8 animate-in fade-in zoom-in-95 duration-1000">
            <h1 className="text-5xl md:text-6xl font-serif tracking-tight text-foreground mb-12">
              I'm here — let's talk it through
            </h1>
          </div>
        )}

        <div className="w-full max-w-3xl px-6">
          <ChatInput
            onSend={(text) => sendMessage({ text })}
            status={status}
            disabled={status === 'submitted' || status === 'streaming'}
          />
        </div>

        {!hasMessages && (
          <div className="w-full max-w-5xl px-6">
            <RecipeComponent onAction={(prompt) => sendMessage({ text: prompt })} />
          </div>
        )}
      </footer>
    </div>
  );
}