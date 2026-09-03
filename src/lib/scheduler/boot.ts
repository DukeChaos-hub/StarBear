import { tick } from './tick';

let _interval: NodeJS.Timeout | null = null;
let _started = false;

/** Tick interval in milliseconds. 30s is the right balance between
 *  responsiveness and DB load. */
const TICK_MS = 30_000;

/**
 * Idempotent. Call this once on server startup. Subsequent calls (e.g.
 * from HMR in dev, or from tests) are no-ops. Safe to import during
 * static analysis; the timer is only started in the Node runtime.
 */
export function ensureSchedulerStarted(): void {
  if (_started) return;
  if (typeof window !== 'undefined') return;
  _started = true;
  _interval = setInterval(() => {
    void tick().catch(() => {
      /* swallow — tick is internally self-isolating */
    });
  }, TICK_MS);
  // Allow the process to exit naturally; don't keep it alive for the timer.
  _interval.unref?.();
}

/** Test-only: stop the running timer and reset the started flag. */
export function _resetForTests(): void {
  if (_interval) {
    clearInterval(_interval);
    _interval = null;
  }
  _started = false;
}
