import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const FIXTURES = join(import.meta.dirname, "..", "fixtures");
const MAX_FIXTURE_BYTES = 1_000_000;

/** Every fixture that would be committed. Gitignored raw responses are out of scope. */
function committedFixtures(dir = FIXTURES): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === ".private") return [];
    const path = join(dir, entry.name);
    return entry.isDirectory() ? committedFixtures(path) : [path];
  });
}

const IPV4 = /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/;
const IPV6 = /\b(?:[0-9a-f]{1,4}:){7}[0-9a-f]{1,4}\b|\b(?:[0-9a-f]{1,4}:){2,6}:[0-9a-f]{0,4}\b/i;
const PRIVATE_KEY = /"(?:website|screenshot|infostealer|post_url|press|x_mitre_contributors)"/;

describe("committed fixtures", () => {
  const files = committedFixtures();

  it("finds fixtures to check", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files.map((path) => [relative(FIXTURES, path), path] as const))(
    "%s is small and free of IPs and victim fields",
    (name, path) => {
      expect(statSync(path).size).toBeLessThan(MAX_FIXTURE_BYTES);
      const text = readFileSync(path, "utf8");
      expect(text).not.toMatch(IPV4);
      expect(text).not.toMatch(IPV6);
      // The synthetic file deliberately has these fields, so M1 can prove the parser drops them.
      if (!name.endsWith("synthetic.json")) expect(text).not.toMatch(PRIVATE_KEY);
    },
  );
});
