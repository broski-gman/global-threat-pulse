import { get, pick, savePublic, type Spike } from "./lib";

const URL =
  "https://raw.githubusercontent.com/mitre/cti/master/enterprise-attack/enterprise-attack.json";

type StixObject = { id: string; type: string; relationship_type?: string } & Record<
  string,
  unknown
>;
type Bundle = { type: string; id: string; objects: StixObject[] };

/**
 * Allowlist rather than denylist: descriptions and x_mitre_contributors can name people.
 * The upstream bundle is about 49 MB, so it isn't kept even privately.
 */
const FIELDS = [
  "id",
  "type",
  "name",
  "aliases",
  "x_mitre_aliases",
  "created",
  "modified",
  "revoked",
  "x_mitre_deprecated",
  "x_mitre_version",
  "first_seen",
  "last_seen",
  "relationship_type",
  "source_ref",
  "target_ref",
];

export const mitreAttack: Spike = {
  id: "mitre-attack",
  async run() {
    const bundle = (await (await get(URL)).json()) as Bundle;

    const byType: Record<string, number> = {};
    for (const object of bundle.objects) byType[object.type] = (byType[object.type] ?? 0) + 1;

    const groups = bundle.objects.filter((object) => object.type === "intrusion-set").slice(0, 10);
    const groupIds = new Set(groups.map((group) => group.id));
    const uses = bundle.objects
      .filter(
        (object) => object.relationship_type === "uses" && groupIds.has(String(object.source_ref)),
      )
      .slice(0, 25);
    const targetIds = new Set(uses.map((relationship) => String(relationship.target_ref)));
    const targets = bundle.objects.filter((object) => targetIds.has(object.id));

    savePublic("mitre-attack", "sample.json", {
      type: bundle.type,
      id: bundle.id,
      objects: [...groups, ...uses, ...targets].map((object) => pick(object, FIELDS)),
    });

    const summary = [
      "intrusion-set",
      "attack-pattern",
      "malware",
      "tool",
      "campaign",
      "relationship",
    ]
      .map((type) => `${type}=${byType[type] ?? 0}`)
      .join(", ");
    return { id: "mitre-attack", status: "ok", records: bundle.objects.length, detail: summary };
  },
};
