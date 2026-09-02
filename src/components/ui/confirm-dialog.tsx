'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ConfirmDialogProps {
  /** Render-prop so the trigger stays where the caller wants it. */
  trigger: (open: () => void) => React.ReactNode;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Variant controls the confirm button color. Default: 'destructive'. */
  variant?: 'destructive' | 'default';
  onConfirm: () => void | Promise<void>;
}

/**
 * Headless confirm dialog built on Radix. Replaces blocking `confirm()` calls
 * with an accessible in-page dialog. The trigger is a render-prop so the
 * caller can place it on any button, link, or list row.
 *
 * Usage:
 *   <ConfirmDialog
 *     title="Delete env?"
 *     description="This cannot be undone."
 *     onConfirm={async () => { await del(); }}
 *     trigger={(open) => <Button onClick={open}>Delete</Button>}
 *   />
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  variant = 'destructive',
  onConfirm,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const handle = async () => {
    setBusy(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger(() => setOpen(true))}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant={variant} onClick={handle} disabled={busy}>
            {busy ? 'Working…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
