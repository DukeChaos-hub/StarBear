'use client';
import { useRouter } from 'next/navigation';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

const items = [
  { label: 'Go to Workspace', href: '/workspace' },
  { label: 'Go to Environments', href: '/workspace/environments' },
  { label: 'Go to Tests', href: '/workspace/tests' },
  { label: 'Go to AI Agent', href: '/workspace/agent' },
  { label: 'Go to Settings', href: '/workspace/settings' },
];

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Navigate">
          {items.map((i) => (
            <CommandItem
              key={i.href}
              onSelect={() => {
                router.push(i.href);
                onOpenChange(false);
              }}
            >
              {i.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
