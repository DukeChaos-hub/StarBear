// Next.js 15 calls `register()` once on server startup in the Node
// runtime. We use it to start the background scheduler tick so jobs
// fire while the dev / prod server is running. No-op in the edge
// runtime (which never hosts the API) and in the browser.
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { ensureSchedulerStarted } = await import('./lib/scheduler/boot');
  ensureSchedulerStarted();
}
