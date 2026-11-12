// One request at a time; background tabs perform no polling.
export function createVisibilityPoller(task, delay, { immediate = false } = {}) {
  let disposed = false, running = false, timer;
  const schedule = () => { clearTimeout(timer); if (!disposed && !document.hidden) timer = setTimeout(run, delay); };
  const run = async () => {
    if (disposed || running || document.hidden) return;
    running = true;
    try { await task(); } catch { /* The owner handles errors and preserves its data. */ }
    finally { running = false; schedule(); }
  };
  const visibility = () => { clearTimeout(timer); if (!document.hidden) run(); };
  document.addEventListener('visibilitychange', visibility);
  if (immediate) run(); else schedule();
  return { refresh: run, dispose: () => { disposed = true; clearTimeout(timer); document.removeEventListener('visibilitychange', visibility); } };
}
export const retainEqual = (current, next) => JSON.stringify(current) === JSON.stringify(next) ? current : next;
