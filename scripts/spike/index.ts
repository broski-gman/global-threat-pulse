import { cisaKev } from "./cisa-kev";
import { cloudflareRadar } from "./cloudflare-radar";
import { firstEpss } from "./first-epss";
import { ituGci } from "./itu-gci";
import { loadEnv, type Spike, type SpikeResult } from "./lib";
import { mispGalaxy } from "./misp-galaxy";
import { mitreAttack } from "./mitre-attack";
import { nvd } from "./nvd";
import { ransomwareLive } from "./ransomware-live";
import { sansIsc } from "./sans-isc";

loadEnv();

const SPIKES: Spike[] = [
  cisaKev,
  firstEpss,
  nvd,
  ransomwareLive,
  cloudflareRadar,
  mispGalaxy,
  mitreAttack,
  sansIsc,
  ituGci,
];

const requested = process.argv.slice(2);
const unknown = requested.filter((id) => !SPIKES.some((spike) => spike.id === id));
if (unknown.length > 0) {
  console.error(`Unknown feed: ${unknown.join(", ")}`);
  process.exit(2);
}

const results: SpikeResult[] = [];
for (const spike of SPIKES) {
  if (requested.length > 0 && !requested.includes(spike.id)) continue;
  try {
    results.push(await spike.run());
  } catch (error) {
    results.push({
      id: spike.id,
      status: "failed",
      detail: error instanceof Error ? error.message : "unknown error",
    });
  }
  const latest = results.at(-1);
  if (latest) {
    console.log(
      `${latest.status.padEnd(8)}${latest.id.padEnd(18)}${String(latest.records ?? "-").padStart(8)}  ${latest.detail}`,
    );
  }
}

if (results.some((result) => result.status === "failed")) process.exitCode = 1;
