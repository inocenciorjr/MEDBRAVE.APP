/**
 * Helper utilities
 */

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function randomSleep(min: number, max: number): Promise<void> {
  const delay = randomDelay(min, max);
  await sleep(delay);
}
