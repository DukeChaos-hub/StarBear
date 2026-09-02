'use client';

import { useEffect, useRef, useState } from 'react';
import { Bot, Send, User, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';

type ChatMessage =
  | { id: string; role: 'user' | 'assistant'; content: string }
  | { id: string; role: 'tool-call'; name: string; args: unknown; result?: unknown }
  | { id: string; role: 'error'; content: string };

interface ToolCallWire {
  id?: string;
  name: string;
  args: unknown;
}

export function AgentChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  }, [messages]);

  const send = async () => {
    if (!input.trim() || busy) return;
    const userText = input;
    setInput('');
    setMessages((m) => [...m, { id: `u-${Date.now()}`, role: 'user', content: userText }]);
    setBusy(true);

    try {
      const res = await fetch('/api/ai-agent', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          ...(conversationId ? { conversationId } : {}),
          ssrfMode: 'allow-local',
        }),
      });
      if (!res.ok || !res.body) {
        const t = await res.text();
        setMessages((m) => [
          ...m,
          { id: `e-${Date.now()}`, role: 'error', content: t || `HTTP ${res.status}` },
        ]);
        return;
      }
      const newConv = res.headers.get('x-starbear-conv');
      if (newConv) setConversationId(newConv);

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += dec.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';
        for (const e of events) {
          const line = e.replace(/^data: /, '').trim();
          if (!line || line === '[DONE]') continue;
          try {
            const ev = JSON.parse(line) as
              | { type: 'text'; text: string }
              | { type: 'tool-call'; toolCall: ToolCallWire }
              | { type: 'tool-result'; toolCall: ToolCallWire; result: unknown }
              | { type: 'finish'; reason: string }
              | { type: 'error'; error: string };
            setMessages((m) => applyEvent(m, ev));
          } catch {
            /* ignore malformed chunk */
          }
        }
      }
    } catch (e) {
      setMessages((m) => [
        ...m,
        { id: `e-${Date.now()}`, role: 'error', content: (e as Error).message },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b bg-background/80 px-3 py-2 backdrop-blur">
        <Bot className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">AI Agent</h2>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {conversationId ? `conv: ${conversationId.slice(0, 6)}…` : 'new conv'}
        </span>
      </div>
      <div
        ref={scrollerRef}
        className="flex-1 overflow-auto p-3 space-y-2"
        data-testid="chat-scroll"
      >
        {messages.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-muted-foreground">
            Ask the agent to list, save, or send requests.
            <br />
            {'e.g. "find all POST requests" or "send a request to /users/1"'}
          </p>
        )}
        {messages.map((m) => (
          <Bubble key={m.id} m={m} />
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            <span>thinking…</span>
          </div>
        )}
      </div>
      <div className="border-t p-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
          className="flex items-end gap-1"
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder="Ask the agent…"
            className="min-h-[40px] flex-1 resize-none"
            rows={2}
          />
          <Button type="submit" size="icon" disabled={busy || !input.trim()} aria-label="Send">
            <Send className="h-3.5 w-3.5" />
          </Button>
        </form>
      </div>
    </div>
  );
}

function Bubble({ m }: { m: ChatMessage }) {
  if (m.role === 'user') {
    return (
      <div className="flex items-start gap-2">
        <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted">
          <User className="h-3 w-3" />
        </span>
        <div className="rounded-md bg-primary/10 px-2.5 py-1.5 text-sm">{m.content}</div>
      </div>
    );
  }
  if (m.role === 'assistant') {
    return (
      <div className="flex items-start gap-2">
        <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/15">
          <Bot className="h-3 w-3 text-primary" />
        </span>
        <div className="rounded-md bg-muted/50 px-2.5 py-1.5 text-sm whitespace-pre-wrap break-words">
          {m.content}
        </div>
      </div>
    );
  }
  if (m.role === 'tool-call') {
    return (
      <div
        className={cn(
          'ml-7 flex items-center gap-2 rounded border bg-muted/30 px-2 py-1 text-[10px]',
        )}
      >
        <Wrench className="h-3 w-3" />
        <Badge variant="outline" className="px-1 py-0 text-[10px]">
          {m.name}
        </Badge>
        <span className="font-mono text-muted-foreground">{summarize(m.args)}</span>
        {m.result !== undefined && (
          <span className={cn('ml-auto', isOk(m.result) ? 'text-emerald-600' : 'text-rose-600')}>
            {isOk(m.result) ? 'ok' : 'err'}
          </span>
        )}
      </div>
    );
  }
  return (
    <div className="ml-7 rounded border border-destructive/30 bg-destructive/10 px-2 py-1 text-xs text-destructive">
      {m.content}
    </div>
  );
}

function applyEvent(
  msgs: ChatMessage[],
  ev:
    | { type: 'text'; text: string }
    | { type: 'tool-call'; toolCall: ToolCallWire }
    | { type: 'tool-result'; toolCall: ToolCallWire; result: unknown }
    | { type: 'finish'; reason: string }
    | { type: 'error'; error: string },
): ChatMessage[] {
  if (ev.type === 'text') {
    const last = msgs[msgs.length - 1];
    if (last && last.role === 'assistant') {
      return [...msgs.slice(0, -1), { ...last, content: last.content + ev.text }];
    }
    return [...msgs, { id: `a-${Date.now()}`, role: 'assistant', content: ev.text }];
  }
  if (ev.type === 'tool-call') {
    return [
      ...msgs,
      {
        id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        role: 'tool-call',
        name: ev.toolCall.name,
        args: ev.toolCall.args,
      },
    ];
  }
  if (ev.type === 'tool-result') {
    return msgs.map((m) =>
      m.role === 'tool-call' && m.name === ev.toolCall.name && m.result === undefined
        ? { ...m, result: ev.result }
        : m,
    );
  }
  if (ev.type === 'error') {
    return [...msgs, { id: `e-${Date.now()}`, role: 'error', content: ev.error }];
  }
  return msgs;
}

function summarize(args: unknown): string {
  try {
    const s = JSON.stringify(args);
    return s.length > 80 ? s.slice(0, 77) + '…' : s;
  } catch {
    return String(args);
  }
}

function isOk(result: unknown): boolean {
  if (result && typeof result === 'object' && 'error' in (result as Record<string, unknown>)) {
    return false;
  }
  return true;
}
