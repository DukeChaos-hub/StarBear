'use client';
import { Bot } from 'lucide-react';

export default function AgentPage() {
  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="flex items-center gap-2 text-xl font-semibold">
        <Bot className="h-5 w-5" />
        AI Agent
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        The agent can drive the HTTP client, run test cases, and search your workspace.
      </p>
      <p className="mt-4 text-sm text-muted-foreground">
        Full chat UI ships in Phase 9. The backend SSE endpoint is ready:{' '}
        <code>POST /api/ai-agent</code>. Configure your provider in Settings first.
      </p>
    </div>
  );
}
