import { existsSync, readFileSync } from "node:fs";
import { rootPath, type Spike } from "./lib";

export const ituGci: Spike = {
  id: "itu-gci",
  async run() {
    const path = rootPath("data", "gci-2024.csv");
    if (!existsSync(path)) {
      return { id: "itu-gci", status: "skipped", detail: "data/gci-2024.csv not supplied yet" };
    }
    const lines = readFileSync(path, "utf8").split(/\r?\n/).filter(Boolean);
    return {
      id: "itu-gci",
      status: "ok",
      records: Math.max(lines.length - 1, 0),
      detail: `columns: ${lines[0] ?? "none"}`,
    };
  },
};
