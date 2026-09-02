'use client';
import { useEffect, useState } from 'react';
import { ChevronDown, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Environment {
  id: string;
  name: string;
  is_active: number;
}

export function EnvSwitcher() {
  const [envs, setEnvs] = useState<Environment[]>([]);
  const [active, setActive] = useState<Environment | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    const res = await fetch('/api/environments');
    const list = (await res.json()) as Environment[];
    setEnvs(list);
    setActive(list.find((e) => e.is_active === 1) ?? null);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function pick(id: string) {
    await fetch(`/api/environments/${id}/activate`, { method: 'POST' });
    refresh();
  }

  if (loading) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <Globe className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1">
          <Globe className="h-4 w-4" />
          <span className="text-xs">{active?.name ?? 'No env'}</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {envs.length === 0 && <DropdownMenuItem disabled>No environments yet</DropdownMenuItem>}
        {envs.map((e) => (
          <DropdownMenuItem
            key={e.id}
            onClick={() => pick(e.id)}
            className={e.id === active?.id ? 'font-semibold' : ''}
          >
            {e.name}
            {e.is_active === 1 && (
              <span className="ml-auto text-xs text-muted-foreground">active</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
