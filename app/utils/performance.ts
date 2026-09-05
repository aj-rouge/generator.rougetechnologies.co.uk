// utils/performance.ts
export function measureTime<T>(
  label: string,
  fn: () => Promise<T>,
): Promise<T> {
  const start = performance.now();
  return fn().finally(() => {
    const duration = performance.now() - start;
    // Log in a consistent, parseable format
    console.log(
      JSON.stringify({
        level: "perf",
        label,
        duration_ms: Math.round(duration),
      }),
    );
  });
}

// For synchronous functions
export function measureTimeSync<T>(label: string, fn: () => T): T {
  const start = performance.now();
  try {
    return fn();
  } finally {
    const duration = performance.now() - start;
    console.log(
      JSON.stringify({
        level: "perf",
        label,
        duration_ms: Math.round(duration),
      }),
    );
  }
}

// Log a final summary metric
export function logMetric(
  name: string,
  value: number,
  tags: Record<string, any> = {},
) {
  console.log(
    JSON.stringify({
      level: "metric",
      metric: name,
      value,
      ...tags,
    }),
  );
}
