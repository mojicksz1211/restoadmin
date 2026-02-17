export async function withMinimumDelay<T>(
  promise: Promise<T>,
  minDelayMs: number = 1000
): Promise<T> {
  const [result] = await Promise.all([
    promise,
    new Promise(resolve => setTimeout(resolve, minDelayMs))
  ]);
  return result;
}

