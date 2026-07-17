"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Square } from "lucide-react";

interface AssistantComposerProps {
  onSubmit: (text: string) => void;
  loading?: boolean;
  disabled?: boolean;
}

const SOURCES = ["All", "Drive", "SharePoint", "Slack"];

export function AssistantComposer({ onSubmit, loading, disabled }: AssistantComposerProps) {
  const [text, setText] = useState("");
  const [activeSource, setActiveSource] = useState("All");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (text.trim() && !loading) {
      onSubmit(text);
      setText("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t bg-background p-4 space-y-3">
      <div className="flex gap-2">
        {SOURCES.map((source) => (
          <Button
            key={source}
            variant={activeSource === source ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveSource(source)}
            className="rounded-full text-xs"
          >
            {source}
          </Button>
        ))}
      </div>
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 8000))}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question..."
          className="min-h-[80px] pr-12 resize-none"
          disabled={disabled || loading}
        />
        <div className="absolute bottom-2 right-2 flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground mr-2">
            {text.length}/8000
          </span>
          <Button
            size="icon"
            onClick={loading ? () => {} : handleSubmit}
            disabled={disabled || (!text.trim() && !loading)}
          >
            {loading ? <Square className="h-4 w-4" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
