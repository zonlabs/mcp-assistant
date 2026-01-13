// components/playground/ChatInput.tsx
'use client';

import { useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ArrowUp, Plus, Mic, Loader2 } from 'lucide-react';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  status: 'ready' | 'submitted' | 'streaming' | 'error';
}

export function ChatInput({ onSend, disabled, status }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const value = textareaRef.current?.value.trim();
      if (value) {
        onSend(value);
        textareaRef.current!.value = '';
      }
    }
  };

  const isPending = status === 'submitted' || status === 'streaming';

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-6">
      <div className="relative flex items-end gap-2 bg-secondary/50 border border-border rounded-[32px] p-2 pr-4 shadow-sm focus-within:ring-1 focus-within:ring-ring transition-all">
        {/* Left Actions */}
        <div className="flex items-center pb-1 pl-2">
           <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 shrink-0">
              <Plus className="w-5 h-5" />
           </Button>
           {/* <div className="flex items-center gap-1.5 px-3 py-1.5 bg-background border border-border rounded-full ml-1 cursor-pointer hover:bg-accent transition-colors">
              <span className="text-xs font-medium">MCP</span>
           </div> */}
        </div>

        {/* Textarea */}
        <Textarea
          ref={textareaRef}
          rows={1}
          placeholder="Send a message..."
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className="flex-1 min-h-[44px] max-h-[200px] py-3 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none text-base"
        />

        {/* Right Actions */}
        <div className="flex items-center gap-2 pb-1">
          {isPending ? (
            <div className="flex items-center gap-2 px-3">
               <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Button variant="ghost" size="icon" className="rounded-full h-10 w-10">
              <Mic className="w-5 h-5 text-muted-foreground" />
            </Button>
          )}
          
          <Button 
            size="icon" 
            className="rounded-full h-10 w-10 bg-foreground text-background hover:bg-foreground/90 shrink-0"
            disabled={disabled || isPending}
            onClick={() => {
              const value = textareaRef.current?.value.trim();
              if (value) {
                onSend(value);
                textareaRef.current!.value = '';
              }
            }}
          >
            <ArrowUp className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}