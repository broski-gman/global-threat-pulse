import { get, savePublic, sleep, type Spike } from "./lib";

const BASE = "https://api.cloudflare.com/client/v4/radar/attacks";

const QUERIES = {
  "layer7-pairs": "/layer7/top/attacks?dateRange=1d&limit=20&format=json",
  "layer3-pairs": "/layer3/top/attacks?dateRange=1d&limit=20&format=json",
  "layer7-targets": "/layer7/top/locations/target?dateRange=7d&limit=20&format=json",
  // Proves history is available, which the 90-day baseline backfill depends on.
  "layer7-targets-90d": "/layer7/top/locations/target?dateRange=90d&limit=20&format=json",
} as const;

type RadarResponse = { result?: { top_0?: unknown[] } };

export const cloudflareRadar: Spike = {
  id: "cloudflare-radar",
  async run() {
    const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
    if (!token) {
      return { id: "cloudflare-radar", status: "skipped", detail: "CLOUDFLARE_API_TOKEN not set" };
    }

    const counts: string[] = [];
    let total = 0;
    for (const [name, query] of Object.entries(QUERIES)) {
      const body = (await (
        await get(`${BASE}${query}`, { Authorization: `Bearer ${token}` })
      ).json()) as RadarResponse;
      savePublic("cloudflare-radar", `${name}.json`, body);
      const rows = body.result?.top_0?.length ?? 0;
      counts.push(`${name}=${rows}`);
      total += rows;
      await sleep(500);
    }
    return { id: "cloudflare-radar", status: "ok", records: total, detail: counts.join(", ") };
  },
};
