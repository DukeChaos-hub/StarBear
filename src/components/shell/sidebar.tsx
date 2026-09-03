'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Beaker,
  Bot,
  Clock,
  Folder,
  Server,
  Settings as SettingsIcon,
  Sparkles,
  TestTube2,
  Upload,
  Variable,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useWorkspace } from '@/lib/stores/workspace';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV: NavItem[] = [
  { label: 'Overview', href: '/workspace', icon: Folder },
  { label: 'Environments', href: '/workspace/environments', icon: Variable },
  { label: 'Tests', href: '/workspace/tests', icon: TestTube2 },
  { label: 'Schedules', href: '/workspace/schedules', icon: Clock },
  { label: 'Mocks', href: '/workspace/mocks', icon: Server },
  { label: 'Import', href: '/workspace/import', icon: Upload },
  { label: 'AI Agent', href: '/workspace/agent', icon: Bot },
  { label: 'Settings', href: '/workspace/settings', icon: SettingsIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useWorkspace();
  return (
    <aside
      data-testid="sidebar"
      className={cn(
        'flex flex-col border-r bg-muted/30 transition-all',
        sidebarCollapsed ? 'w-12' : 'w-56',
      )}
    >
      <nav className="flex-1 space-y-1 p-2">
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = href === '/workspace' ? pathname === href : pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                active
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!sidebarCollapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-2">
        <button
          type="button"
          onClick={toggleSidebar}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent/60 hover:text-foreground"
        >
          <Sparkles className="h-3.5 w-3.5" />
          {!sidebarCollapsed && <span>{sidebarCollapsed ? 'Expand' : 'Collapse'}</span>}
        </button>
        {!sidebarCollapsed && (
          <p className="mt-2 flex items-center gap-1 px-2 text-[10px] text-muted-foreground">
            <Beaker className="h-3 w-3" /> StarBear v0.1
          </p>
        )}
      </div>
    </aside>
  );
}
