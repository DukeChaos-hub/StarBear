'use client';
import { PanelRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EnvSwitcher } from './env-switcher';
import { useWorkspace } from '@/lib/stores/workspace';
import { useState } from 'react';
import { CommandPalette } from './command-palette';

export function Topbar() {
  const { rightPaneOpen, toggleRightPane } = useWorkspace();
  const [paletteOpen, setPaletteOpen] = useState(false);
  return (
    <header className="flex h-12 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur">
      <div className="flex items-center gap-2 font-semibold">
        <span className="text-primary">★</span>
        StarBear
      </div>
      <div className="ml-2">
        <EnvSwitcher />
      </div>
      <div className="ml-auto flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={() => setPaletteOpen(true)}>
          <Search className="h-4 w-4" />
          <span className="ml-1 text-xs text-muted-foreground">⌘K</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleRightPane}
          aria-label="Toggle right pane"
        >
          <PanelRight className={rightPaneOpen ? 'h-4 w-4' : 'h-4 w-4 opacity-50'} />
        </Button>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </header>
  );
}
