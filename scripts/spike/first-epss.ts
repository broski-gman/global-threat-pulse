import { fetchKev, newest } from "./cisa-kev";
import { get, savePublic, type Spike } from "./lib";

export const firstEpss: Spike = {
  id: "first-epss",
  async run() {
    const cves = newest(await fetchKev(), 100).map((entry) => entry.cveID);
    const url = new URL("https://api.first.org/data/v1/epss");
    url.searchParams.set("cve", cves.join(","));
    url.searchParams.set("limit", "100");
    const body = (await (await get(url.toString())).json()) as {
      total: number;
      data: { cve: string }[];
    };
    savePublic("first-epss", "sample.json", { ...body, data: body.data.slice(0, 25) });
    return {
      id: "first-epss",
      status: "ok",
      records: body.total,
      detail: `${body.data.length} scores for ${cves.length} requested CVEs`,
    };
  },
};
