/**
 * Server-side timing for page data loads.
 *
 * Off unless PERF_LOG is set, so production logs stay quiet until someone is
 * actually chasing a slowdown. Timings go to stdout, which is where the
 * platform's log viewer picks them up.
 */
const enabled = process.env.PERF_LOG === "1";

export async function measure<T>(label: string, load: () => Promise<T>): Promise<T> {
  if (!enabled) return load();

  const started = performance.now();
  try {
    return await load();
  } finally {
    const ms = Math.round(performance.now() - started);
    console.log(`[perf] ${label} ${ms}ms`);
  }
}
