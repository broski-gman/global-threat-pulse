import { get, pick, savePrivate, savePublic, type Spike } from "./lib";

const URL = "https://raw.githubusercontent.com/MISP/misp-galaxy/main/clusters/threat-actor.json";

type Cluster = {
  version: number;
  values: { value: string; uuid: string; meta?: Record<string, unknown> }[];
};

/** Structured fields only. Descriptions and refs stay out because they can name individuals. */
const META_FIELDS = [
  "synonyms",
  "country",
  "motive",
  "cfr-suspected-state-sponsor",
  "cfr-suspected-victims",
  "cfr-target-category",
  "cfr-type-of-incident",
  "attribution-confidence",
];

export const mispGalaxy: Spike = {
  id: "misp-galaxy",
  async run() {
    const cluster = (await (await get(URL)).json()) as Cluster;
    savePrivate("misp-galaxy", "raw.json", cluster);

    const fieldCounts: Record<string, number> = {};
    for (const actor of cluster.values) {
      for (const key of Object.keys(actor.meta ?? {})) {
        fieldCounts[key] = (fieldCounts[key] ?? 0) + 1;
      }
    }

    const richest = cluster.values
      .filter((actor) => actor.meta?.["cfr-suspected-victims"])
      .slice(0, 25);
    savePublic("misp-galaxy", "sample.json", {
      version: cluster.version,
      values: richest.map(({ value, uuid, meta }) => ({
        value,
        uuid,
        meta: pick(meta ?? {}, META_FIELDS),
      })),
    });

    const coverage = META_FIELDS.map((field) => `${field}=${fieldCounts[field] ?? 0}`).join(", ");
    return {
      id: "misp-galaxy",
      status: "ok",
      records: cluster.values.length,
      detail: coverage,
    };
  },
};
