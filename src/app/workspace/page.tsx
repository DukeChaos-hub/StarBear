'use client';
import Link from 'next/link';
import { Bot, FlaskConical, Globe, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function WorkspaceWelcome() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-semibold">Welcome to StarBear</h1>
      <p className="mt-1 text-muted-foreground">An AI-Native API client and testing tool.</p>
      <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-2">
        <Link href="/workspace/environments">
          <Button variant="outline" className="w-full justify-start gap-2">
            <Globe className="h-4 w-4" /> Set up an environment
          </Button>
        </Link>
        <Link href="/workspace/agent">
          <Button variant="outline" className="w-full justify-start gap-2">
            <Bot className="h-4 w-4" /> Talk to the AI Agent
          </Button>
        </Link>
        <Link href="/workspace/tests">
          <Button variant="outline" className="w-full justify-start gap-2">
            <FlaskConical className="h-4 w-4" /> Run a test suite
          </Button>
        </Link>
        <Link href="/workspace/collections">
          <Button variant="outline" className="w-full justify-start gap-2">
            <Plus className="h-4 w-4" /> Create a collection
          </Button>
        </Link>
      </div>
    </div>
  );
}
