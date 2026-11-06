import { fetchKev, newest } from "./cisa-kev";
import { get, pick, savePrivate, savePublic, sleep, type Spike } from "./lib";

const BASE = "https://services.nvd.nist.gov/rest/json/cves/2.0";

type NvdResponse = {
  totalResults: number;
  vulnerabilities: { cve: Record<string, unknown> & { id: string } }[];
};

/**
 * Only what the Patch Clock needs. References can credit named people, and CPE version strings
 * look like IP addresses. Vendor and product come from KEV instead.
 */
const CVE_FIELDS = ["id", "published", "lastModified", "vulnStatus", "metrics", "descriptions"];

export const nvd: Spike = {
  id: "nvd",
  async run() {
    const key = process.env.NVD_API_KEY?.trim();
    const headers: Record<string, string> = key ? { apiKey: key } : {};
    const spacing = key ? 1_000 : 6_000;

    const total = (await (await get(`${BASE}?resultsPerPage=1`, headers)).json()) as NvdResponse;

    const sample: Record<string, unknown>[] = [];
    for (const entry of newest(await fetchKev(), 5)) {
      await sleep(spacing);
      const body = (await (
        await get(`${BASE}?cveId=${encodeURIComponent(entry.cveID)}`, headers)
      ).json()) as NvdResponse;
      savePrivate("nvd", `${entry.cveID}.json`, body);
      for (const item of body.vulnerabilities) sample.push({ cve: pick(item.cve, CVE_FIELDS) });
    }

    savePublic("nvd", "sample.json", { totalResults: sample.length, vulnerabilities: sample });
    return {
      id: "nvd",
      status: "ok",
      records: total.totalResults,
      detail: `${sample.length} CVE lookups, ${key ? "with" : "without"} API key`,
    };
  },
};
