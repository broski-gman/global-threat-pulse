import { get, savePrivate, savePublic, type Spike } from "./lib";

export const KEV_URL =
  "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";

export type KevEntry = { cveID: string; dateAdded: string } & Record<string, unknown>;
export type KevFeed = {
  title: string;
  catalogVersion: string;
  dateReleased: string;
  count: number;
  vulnerabilities: KevEntry[];
};

export async function fetchKev(): Promise<KevFeed> {
  return (await (await get(KEV_URL)).json()) as KevFeed;
}

/** The most recently added entries, newest first. */
export function newest(feed: KevFeed, count: number): KevEntry[] {
  return [...feed.vulnerabilities]
    .sort((a, b) => b.dateAdded.localeCompare(a.dateAdded))
    .slice(0, count);
}

export const cisaKev: Spike = {
  id: "cisa-kev",
  async run() {
    const feed = await fetchKev();
    savePrivate("cisa-kev", "raw.json", feed);
    const { vulnerabilities, ...metadata } = feed;
    savePublic("cisa-kev", "sample.json", {
      ...metadata,
      vulnerabilities: newest(feed, 25),
    });
    return {
      id: "cisa-kev",
      status: "ok",
      records: vulnerabilities.length,
      detail: `catalog ${feed.catalogVersion}`,
    };
  },
};
