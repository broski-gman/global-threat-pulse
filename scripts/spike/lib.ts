import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export type SpikeResult = {
  id: string;
  status: "ok" | "skipped" | "failed";
  /** Total records upstream reported or that we parsed. */
  records?: number;
  detail: string;
};

export type Spike = { id: string; run: () => Promise<SpikeResult> };

const ROOT = join(import.meta.dirname, "..", "..");

function userAgent(): string {
  const contact = process.env.FEED_CONTACT?.trim();
  return `GlobalThreatPulse/0.1 (non-commercial threat research${contact ? `; ${contact}` : ""})`;
}

export function loadEnv(): void {
  try {
    process.loadEnvFile(join(ROOT, ".env.local"));
  } catch {
    // No .env.local is fine: scripts that need a key report themselves as skipped.
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * GET with a project User-Agent and exponential backoff on 429 and 5xx.
 * Errors name only the host and status, so keys can never reach the logs.
 */
export async function get(url: string, headers: Record<string, string> = {}): Promise<Response> {
  const { host } = new URL(url);
  let lastError = "no attempt made";
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await sleep(2 ** attempt * 1000);
    const response = await fetch(url, { headers: { "User-Agent": userAgent(), ...headers } });
    if (response.ok) return response;
    lastError = `${host} returned HTTP ${response.status}`;
    if (response.status !== 429 && response.status < 500) break;
  }
  throw new Error(lastError);
}

function write(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

const asText = (data: unknown): string =>
  typeof data === "string" ? data : `${JSON.stringify(data, null, 2)}\n`;

/** Committed to the repo, so the caller must have trimmed and sanitised `data` first. */
export function savePublic(adapter: string, file: string, data: unknown): void {
  write(join(ROOT, "fixtures", adapter, file), asText(data));
}

/** Gitignored, for full upstream responses that may hold names or IPs. */
export function savePrivate(adapter: string, file: string, data: unknown): void {
  write(join(ROOT, "fixtures", ".private", adapter, file), asText(data));
}

export function rootPath(...parts: string[]): string {
  return join(ROOT, ...parts);
}

/** Keeps only the named keys, so anything new upstream stays out of committed fixtures. */
export function pick<T extends object>(source: T, keys: readonly string[]): Partial<T> {
  return Object.fromEntries(
    Object.entries(source).filter(([key]) => keys.includes(key)),
  ) as Partial<T>;
}
