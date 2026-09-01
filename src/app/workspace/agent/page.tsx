'use client';

import { useState } from 'react';
import { AgentChat } from '@/components/ai-chat/agent-chat';

export default function AgentPage() {
  // The right-pane is the same AgentChat. We render a wider, focused full-page version.
  const [key] = useState(() => Math.random().toString(36).slice(2));
  return (
    <div className="flex h-full">
      <div className="hidden flex-1 items-center justify-center border-r bg-muted/10 p-12 text-center text-sm text-muted-foreground lg:flex">
        <div className="max-w-sm space-y-2">
          <h2 className="text-base font-semibold text-foreground">AI Test Agent</h2>
          <p>
            Ask the agent to inspect your collections, send requests, or run test cases. It has access to
            five tools (send_request, run_test_case, save_request, list_collections, search_requests) and
            respects the active environment's variables.
          </p>
          <p className="text-xs">
            Configure an AI provider in <a className="underline" href="/workspace/settings">Settings</a>{' '}
            to start.
          </p>
        </div>
      </div>
      <div className="w-full max-w-2xl border-l" key={key}>
        <AgentChat />
      </div>
    </div>
  );
}
