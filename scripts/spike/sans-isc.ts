import { get, savePublic, type Spike } from "./lib";

const LEVELS = new Set(["green", "yellow", "orange", "red"]);

export const sansIsc: Spike = {
  id: "sans-isc",
  async run() {
    const level = (await (await get("https://isc.sans.edu/infocon.txt")).text()).trim();
    if (!LEVELS.has(level)) {
      return { id: "sans-isc", status: "failed", detail: "unexpected InfoCon value" };
    }
    savePublic("sans-isc", "infocon.txt", `${level}\n`);
    return { id: "sans-isc", status: "ok", records: 1, detail: `InfoCon ${level}` };
  },
};
