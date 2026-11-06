import { get, pick, savePrivate, savePublic, sleep, type Spike } from "./lib";

const BASE = "https://api-pro.ransomware.live";

/**
 * Public samples keep aggregate-safe fields only. Victim name, website, screenshot, infostealer
 * and press data stay out, and the terms also ban publishing raw data in any form.
 */
const SAFE_FIELDS = ["group", "attackdate", "discovered", "country", "activity"];

type Victim = Record<string, unknown>;

function victimsOf(body: unknown): Victim[] {
  if (Array.isArray(body)) return body as Victim[];
  const wrapped = (body as { victims?: unknown }).victims;
  return Array.isArray(wrapped) ? (wrapped as Victim[]) : [];
}

export const ransomwareLive: Spike = {
  id: "ransomware-live",
  async run() {
    const key = process.env.RANSOMWARE_LIVE_API_KEY?.trim();
    if (!key) {
      return {
        id: "ransomware-live",
        status: "skipped",
        detail: "RANSOMWARE_LIVE_API_KEY not set",
      };
    }
    const headers = { "X-API-KEY": key };

    const recent: unknown = await (await get(`${BASE}/victims/recent`, headers)).json();
    savePrivate("ransomware-live", "recent.json", recent);
    const victims = victimsOf(recent);
    savePublic(
      "ransomware-live",
      "sample.json",
      victims.slice(0, 25).map((victim) => pick(victim, SAFE_FIELDS)),
    );

    await sleep(1_000);
    // Proves the month filter works, which the 90-day baseline backfill depends on.
    const past = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const year = past.getUTCFullYear();
    const month = String(past.getUTCMonth() + 1).padStart(2, "0");
    const monthly: unknown = await (
      await get(`${BASE}/victims/?year=${year}&month=${month}`, headers)
    ).json();

    return {
      id: "ransomware-live",
      status: "ok",
      records: victims.length,
      detail: `${victimsOf(monthly).length} claims in backfill test month ${year}-${month}`,
    };
  },
};
