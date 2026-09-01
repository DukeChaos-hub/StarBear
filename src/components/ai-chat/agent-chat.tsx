'use client';
import { Bot } from 'lucide-react';

export function AgentChat() {
  return (
    <div className="flex h-full flex-col gap-2 p-4 text-sm text-muted-foreground">
      <div className="flex items-center gap-2 text-foreground">
        <Bot className="h-4 w-4" />
        <h2 className="font-semibold">AI Agent</h2>
      </div>
      <p>Full chat lands in a follow-up. For now, visit <code>/workspace/agent</code>.</p>
    </div>
  );
}
