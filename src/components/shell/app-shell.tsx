'use client';
import { ReactNode } from 'react';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { useWorkspace } from '@/lib/stores/workspace';
import { cn } from '@/lib/utils/cn';

export function AppShell({ children, right }: { children: ReactNode; right?: ReactNode }) {
  const { rightPaneOpen } = useWorkspace();
  return (
    <div className="flex h-screen flex-col">
      <Topbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto">{children}</main>
        {right && (
          <aside
            className={cn(
              'border-l bg-muted/30 transition-all',
              rightPaneOpen ? 'w-80' : 'w-0 overflow-hidden',
            )}
          >
            {right}
          </aside>
        )}
      </div>
    </div>
  );
}
