# Claude Code kickoff prompt v2 — Global Threat Pulse

> Paste everything below the line into Claude Code from an empty repo folder. Start in **plan mode** (Shift+Tab twice) so it proposes a plan before it writes any code. This version supersedes v1: it adds the AI-Enabled Operations tracker and includes its seed data inline, so no separate file is needed.

---

You are the lead engineer on **Global Threat Pulse** (globalthreatpulse.io), a new public web app. It is a **cyber threat "weather service"** and deliberately NOT another animated attack map. Every country gets a Threat Level that explains itself, shows its sources and data age, and carries a confidence rating. Around the map sit:

- a threat-actor directory,
- a "Patch Clock" board of actively exploited and zero-day vulnerabilities, and
- an **AI-Enabled Operations** tracker covering agentic offensive frameworks (ARTEX, CyberStrikeAI and similar) and the campaigns they were reported in.

Work through this brief in order. **Before writing any code, produce a written plan, list your assumptions, and ask me up to 5 clarifying questions.** Then build in small committed steps, and stop at the end of each milestone for my review.

## 1. Product principles (non-negotiable)

1. **Truth over theatre.** No synthetic or decorative attack animations. Draw arcs only for real origin→target pairs or attributed actor campaigns.
2. **Provenance everywhere.** Every number on screen shows its source, its fetch time ("updated 14 min ago") and a confidence indicator. Every stored record keeps `source`, `fetched_at`, `source_url` and `licence`.
3. **Explainable scores.** Clicking a country shows the top three drivers of its level in plain English.
4. **Visitors never hit upstream feeds.** Scheduled ingestion writes to the database. A scorer writes pre-computed JSON snapshots. Pages read only snapshots.
5. **No victim names on public pages.** Ransomware leak-site posts are unverified claims about real companies. Store them, but expose only aggregates (counts by country, sector and group).
6. **Attribution is shown with confidence, never as fact.** Use "suspected" language and always show the source.
7. **Separate tool origin, actor and state involvement.** A tool built in one country does not prove the attacker's nationality or any state role. Store and display these as three separate fields.
8. **Dual-use restraint.** Never link to offensive-tool downloads. Never publish raw infrastructure IPs or the names of individuals (developers, suspects or victims' staff).
9. **API keys stay server-side.** Nothing secret goes in client bundles, URLs or logs.

## 2. Tech stack

- Next.js (App Router, TypeScript strict), deployed to **Vercel**.
- Tailwind CSS, dark theme by default, light theme supported.
- Map: **MapLibre GL JS**, with **deck.gl** for arcs and marker layers. Country shapes come from `world-atlas` (Natural Earth 110m TopoJSON), joined on ISO 3166-1 codes.
- Database: **Postgres** (Neon via the Vercel Marketplace) with **Drizzle ORM** and migrations.
- Snapshots: **Vercel Blob**, one JSON file per view, plus `revalidate` and edge caching on pages.
- Scheduling: **GitHub Actions** cron calls secured ingest routes using `Authorization: Bearer $CRON_SECRET`. Vercel Hobby cron runs only once a day, so do not rely on it. Keep the routes scheduler-agnostic so we can move to Vercel Pro cron later.
- Validation: **zod** on every upstream response and on every curated data file. Tests: **Vitest**. Lint: ESLint and Prettier. Package manager: pnpm.

If you think a choice above is wrong, say so in the plan and give a reason. Do not swap it silently.

## 3. Data sources

Build one **adapter per feed** behind a common interface:

```ts
interface FeedAdapter {
  id: string;              // e.g. "cisa-kev"
  schedule: string;        // human note, e.g. "every 6h"
  fetch(): Promise<unknown>;
  parse(raw: unknown): NormalisedEvent[];  // zod-validated
  licence: string;         // stored on every row
}
```

Before coding against any endpoint, verify its URL, auth, rate limit and licence against the provider's current docs. The URLs below are starting points, not guarantees.

| Adapter | Endpoint (verify) | Auth | Phase | Use |
|---|---|---|---|---|
| `cisa-kev` | `https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json` | none | 1 | Patch Clock: exploited CVEs, dateAdded, dueDate, knownRansomwareCampaignUse |
| `first-epss` | `https://api.first.org/data/v1/epss?cve=...` (batches of up to 100) | none | 1 | 30-day exploitation probability |
| `nvd` | `https://services.nvd.nist.gov/rest/json/cves/2.0` | optional `NVD_API_KEY` | 1 | CVE description, CVSS, vendor and product |
| `ransomware-live` | `https://api-pro.ransomware.live` (header `X-API-KEY`) | free PRO key `RANSOMWARE_LIVE_API_KEY` | 1 | Victim claims by country, sector and group (aggregates only). Do NOT use the keyless v2 API, which is personal-use only |
| `cloudflare-radar` | `https://api.cloudflare.com/client/v4/radar/attacks/layer7/top/attacks` and `/layer3/top/attacks` | `CLOUDFLARE_API_TOKEN` | 1 | DDoS origin→target country pairs and target share |
| `misp-galaxy` | `https://raw.githubusercontent.com/MISP/misp-galaxy/main/clusters/threat-actor.json` | none | 1 | Actors: synonyms, country, motive, cfr-suspected-state-sponsor, cfr-suspected-victims, attribution-confidence |
| `mitre-attack` | `https://raw.githubusercontent.com/mitre/cti/master/enterprise-attack/enterprise-attack.json` | none | 1 | Actor techniques and software, linked by name or alias |
| `sans-isc` | `https://isc.sans.edu/infocon.txt` | none | 1 | Global InfoCon badge |
| `itu-gci` | Seed CSV at `/data/gci-2024.csv` (I will supply it) | n/a | 1 | Readiness tier T1–T5 per country |
| `ai-tools` (curated) | `/data/ai-tools.yaml` and `/data/ai-campaigns.yaml` in the repo (see section 6) | n/a | 2 | AI-Enabled Operations core dataset |
| `github-stats` | GitHub REST API: repo stars, forks, latest release | `GITHUB_TOKEN` (read-only) | 2 | Proliferation signal for open-source AI tools |
| `research-rss` | Vendor research RSS feeds: CrowdStrike, Microsoft Security, Google Threat Intelligence, Team Cymru, AWS Security, Palo Alto Unit 42, plus BleepingComputer and The Hacker News | none | 2 | Keyword-match AI tool names into a review queue. **Never auto-publish** |
| `abusech-threatfox` | `https://threatfox-api.abuse.ch/api/v1/` (header `Auth-Key`) | `ABUSECH_AUTH_KEY` | 2 | C2 and IOC hosting country |
| `feedly` | Feedly Cyber Attacks Dashboard API | paid | 3 | Named incidents; entity search for AI tool names |

Respect rate limits. Add per-adapter throttling, exponential backoff, and a `User-Agent` that identifies the project. Mark a feed **stale** if it misses two scheduled runs, and show that on the UI.

## 4. Data model (starting point — refine it in your plan)

- `events`: id, adapter_id, event_type (`ransomware_claim` | `ddos_pair` | `kev_added` | `actor_activity` | `c2_hosted` | `advisory` | `ai_campaign`), country_iso2, target_country_iso2, actor_id, sector, occurred_at, fetched_at, source_url, licence, raw jsonb.
- `vulnerabilities`: cve_id, vendor, product, cvss, epss, epss_percentile, kev_date_added, kev_due_date, ransomware_use, used_by_ai_agents (bool), description, updated_at.
- `actors`: id, name, synonyms[], suspected_sponsor_iso2, suspected_victims_iso2[], motive, attribution_confidence, mitre_group_id, ai_enabled (bool), refs[].
- `ai_tools`: id, name, aliases[], origin_country_iso2, licence_status (`open_source` | `closed` | `unknown`), repo_url (nullable; store it but never render it as a link), first_public_sighting, description, refs[].
- `ai_campaigns`: id, tool_id, actor_id (nullable), attribution_label, attribution_confidence (`high` | `moderate` | `low` | `unattributed`), reported_at, activity_start, activity_end, target_countries_iso2[], target_regions[], sectors[], cves[], model_backends[], attack_techniques[], summary, sources[] (url, publisher, date; at least one required).
- `ai_tool_stats`: tool_id, captured_at, stars, forks, latest_release, latest_release_at.
- `review_queue`: id, source_url, title, matched_terms[], found_at, status (`new` | `accepted` | `rejected`), reviewer_note.
- `country_scores`: country_iso2, computed_at, score, band, confidence, drivers jsonb (top three, with values and source refs), signals jsonb.
- `feed_runs`: adapter_id, started_at, finished_at, status, rows_in, error.

Store victim names only in `raw`, and never select them into any public snapshot.

## 5. Country Threat Level (CTL) v1

For each country and each signal, compare the last 7 days with that country's trailing 90-day baseline, using a capped z-score squashed to 0–1. Then:

```
CTL = 100 × (0.40·A + 0.25·H + 0.15·I + 0.10·G + 0.10·R)
```

| Signal | Weight | Inputs |
|---|---|---|
| A Activity | 0.40 | Ransomware claims per country |
| H Hostile attention | 0.25 | Cloudflare DDoS target share; actor campaigns naming the country as a victim |
| I Infrastructure abuse | 0.15 | abuse.ch (phase 2). Weight 0 until then; renormalise the others |
| G Global pressure | 0.10 | New KEV entries in the last 7 days, plus the InfoCon level (same for all countries) |
| R Regional advisories | 0.10 | Phase 3. Weight 0 until then; renormalise |

Keep the weights in a single config file.

- **Bands:** Low 0–19, Guarded 20–39, Elevated 40–59, High 60–79, Severe 80–100.
- **Hysteresis:** a band changes only when two consecutive runs agree, and it then holds for at least 24 hours.
- **Confidence:** High, Medium or Low, from how many signals have enough baseline observations. Render Low-confidence countries hatched with "insufficient data", never as "Low".
- **Drivers:** generate the text deterministically, for example "Ransomware claims 2.3× the 90-day norm; Qilin most active; manufacturing hit hardest." Do not use an LLM in v1.
- **AI campaigns are NOT part of the score in v1.** A reported AI-enabled campaign against a country in the last 30 days adds a driver line ("AI-enabled intrusion reported: ARTEX, Oct 2026") but no weight.

Unit-test the scorer for baseline maths, renormalisation, hysteresis and confidence edge cases (zero baseline, a new country, a single huge spike).

## 6. AI-Enabled Operations tracker (phase 2)

No public feed tracks agentic offensive tools yet, so the core is a **curated, sourced dataset kept in the repo** and edited through pull requests. Validate it with zod in CI, and fail the build if any campaign lacks a source URL, a date or an attribution confidence.

### 6.1 Seed data

Create these two files exactly from the rows below, then re-check each source link and correct any field that disagrees with its source.

`/data/ai-tools.yaml`

| id | name | origin_country | licence_status | notes |
|---|---|---|---|---|
| artex | ARTEX | CN | closed | Agentic pentest framework. Released open source, then made proprietary after reported abuse; no new releases |
| cyberstrikeai | CyberStrikeAI | CN | open_source | AI-native security testing platform in Go with 100+ integrated tools. Public repository, tracked via github-stats |
| hexstrike-ai | HexStrike AI | unknown | open_source | Connects AI models to 150+ security tools. Named by Google threat intelligence as abused in incident response engagements. Verify the details before seeding |

`/data/ai-campaigns.yaml` (newest first)

| reported_at | tool | actor / attribution | confidence | targets | source |
|---|---|---|---|---|---|
| 2026-11-02 | artex | Vapor Panda (China-nexus, named by CrowdStrike) | high | 200+ organisations in 14 countries from 2026-10-17; government ministries, telecoms, pharma, semiconductor, defence, nuclear, finance; ≥9 compromised. Confirmed victims include US and Belgian telecoms, government bodies in Greece, the Middle East and Latin America, and US pharma | https://www.bleepingcomputer.com/news/security/chinese-hackers-use-artex-ai-in-automated-attacks-against-200-orgs/ |
| 2026-10 | artex | Storm-0940 (China-linked, named by Microsoft) | high | Cloud infrastructure of organisations worldwide | https://therecord.media/china-cyber-connectwise-ai |
| 2026-10-19 | artex | Unattributed | unattributed | About 20 Japanese companies, 9 in one industry | https://www.ithome.com.tw/news/179850 |
| 2026-10-07 | artex | Unattributed; likely Chinese-speaking and financially motivated | moderate | South Korean financial organisations, late Sep to early Oct 2026. Model backends reported: DeepSeek, GLM, Grok | https://www.crowdstrike.com/en-us/blog/unknown-threat-actor-uses-artex-to-target-south-korean-finance/ |
| 2026-09 | artex | Unattributed | unattributed | DIVD (Netherlands): initial access to root in 12 minutes, chaining a Zammad zero-day with a local privilege-escalation zero-day | https://www.bleepingcomputer.com/news/security/chinese-hackers-use-artex-ai-in-automated-attacks-against-200-orgs/ |
| 2026-03-02 | cyberstrikeai | Infrastructure linked to the AI-augmented FortiGate access campaign reported by Amazon. Developer assessed to have some ties to the Chinese government; this is not an actor attribution | low | 21 servers observed running the tool between 2026-01-20 and 2026-02-26, mostly hosted in CN, SG and HK. Targeting of Fortinet FortiGate devices | https://www.team-cymru.com/post/tracking-cyberstrikeai-usage |

Map every campaign to MITRE ATT&CK **T1588.007, Obtain Capabilities: Artificial Intelligence**, plus any techniques the source names.

Do **not** store or display the IP addresses, Telegram handles, personal names or résumé details that appear in these sources.

### 6.2 UI

- **AI Ops panel.** One card per tool, showing origin, licence status, first public sighting, campaign count, linked actors, target countries, CVEs used, reported model backends, GitHub trend (open-source tools only), last seen, and sources.
- **Map layer "AI-enabled campaigns".** A ring marker on countries with a reported AI campaign in the last 90 days, drawn over the Threat Level fill. It must be distinguishable without colour.
- **Actor directory.** An "AI-enabled" badge naming the tool.
- **Patch Clock.** A "used by AI agents" tag on CVEs listed in any campaign.
- **`/ai-ops` page.** A tradecraft timeline of tool releases, licence changes and campaign disclosures, with a methodology note and the attribution caveat.
- **Shareable OG image** for `/ai-ops`.

### 6.3 Discovery workflow

The `research-rss` adapter keyword-matches tool names (from `ai_tools.name` and `aliases`) plus terms like "agentic", "AI agent" and "AI-augmented" into `review_queue`.

Add a protected `/admin/review` page behind Vercel Authentication. From it, a reviewer accepts an item, which opens a GitHub issue pre-filled with a YAML stub, or rejects it. Nothing from the queue reaches public pages without a human-merged pull request.

## 7. UI layout (phase 1 core)

A single dashboard page, plus a country detail route, `/methodology`, `/sources` and (from phase 2) `/ai-ops`.

**Desktop (12-column grid):**

- **Header:** "Global Threat Pulse" (keep the name in one constant), global InfoCon badge, a lens switch (Global / Region / Sector; My Stack shown disabled until phase 3), and the last-updated time.
- **Map (about 8 columns, left):** bands as fills, low-confidence countries hatched, a hover tooltip, and click to open the Why panel and set `/?country=GB`.
- **Why this level (right):** band, score, top three drivers, a 7-day vs 90-day sparkline, sources with ages, and confidence.
- **Threat actors (right):** recently active groups, suspected sponsor, motive, aliases and sources. Clicking an actor highlights its suspected victim countries.
- **Patch Clock (bottom, wide):** KEV entries from the last 30 days as cards, sorted by urgency: ransomware use first, then EPSS, then days remaining to the CISA due date. Each card shows the CVE, vendor/product, days since added, days to due date, EPSS percentile, CVSS, the ransomware flag and the AI-agents tag.
- **Live pulse (bottom, narrow):** the top DDoS origin→target pairs over 24 hours, and ransomware claim counts by sector (no victim names).
- **AI Ops (phase 2):** a compact strip under the header showing the latest AI-enabled campaign, linking to `/ai-ops`.
- **Footer:** "Every panel shows its source, its age and a confidence level", plus links to methodology and sources.

**Mobile:** stack the panels as map, Why, Patch Clock, AI Ops, Actors, Live pulse. No horizontal scrolling.

**Accessibility:** WCAG 2.2 AA contrast, a keyboard-navigable searchable country combobox, and bands and markers distinguishable without colour.

`/methodology` explains the formula, weights, bands, hysteresis and confidence, and states the caveats: leak-site claims are unverified, victim geolocation is approximate, attribution is contested, and tool origin is not attacker identity.

`/sources` is generated automatically from adapter metadata: licence, cadence, last successful run and stale status.

## 8. Security and operations

- Ingest, score and admin routes require auth. Cron routes use `Authorization: Bearer $CRON_SECRET` checked with a constant-time compare; return 401 otherwise.
- Provide a `.env.example` listing every variable. Never commit values.
- Set security headers: a CSP with an allowlist for map tiles, HSTS, X-Content-Type-Options, Referrer-Policy, and frame-ancestors none.
- Use structured logs with no secrets, no raw victim data and no IOCs.
- Add a GitHub Actions workflow `.github/workflows/ingest.yml`: a matrix with one job per adapter on its own schedule, then a scorer job that runs after ingest. Use repository secrets.
- In CI, add Dependabot, `pnpm audit`, zod validation of the `/data/*.yaml` files, and a **public-output safety test** that fails if any snapshot contains an IPv4 or IPv6 pattern, a victim-name field, or a person-name field.

## 9. Milestones (stop for review after each)

- **M0 — Spike (no UI).** Scaffold the repo. For each phase-1 adapter, write a script that fetches once, saves a sample to `/fixtures` and prints the record count. Write `docs/feeds.md` with each feed's confirmed endpoint, auth, rate limit and licence, linked to where you confirmed them. **Flag any licence that may block public or commercial reuse**, and check Cloudflare Radar's data licence specifically.
- **M1 — Data layer.** Drizzle schema and migrations, adapters with zod parsing and fixture tests, secured ingest routes, `feed_runs`, and the GitHub Actions workflow.
- **M2 — Scorer and snapshots.** CTL v1 with tests, drivers text, and the snapshot writer (`global.json`, `country/{iso2}.json`, `actors.json`, `patch-clock.json`, `pulse.json`).
- **M3 — Core UI.** Dashboard, country route, methodology and sources pages, reading snapshots only. Add a fixtures mode so the UI runs without keys.
- **M4 — Deploy.** Vercel project, environment variables, a preview protected by Vercel Authentication (invite-only beta), and a README.
- **M5 — AI-Enabled Operations.** Curated YAML with its schema, CI validation and seed data; the `github-stats` and `research-rss` adapters; `review_queue` and `/admin/review`; the AI Ops panel, map ring layer, actor badge, Patch Clock tag, `/ai-ops` timeline and OG image; snapshot `ai-ops.json`.

## 10. Definition of done

- `pnpm test`, `pnpm lint` and a type-checked build all pass.
- Pages render from snapshots only, with no upstream calls during render.
- Every visible metric links to a source and shows its age.
- The public-output safety test passes: no IPs, victim names or person names in any snapshot.
- Every AI campaign shows its attribution confidence and at least one source link, and tool origin is never displayed as attacker identity.
- Lighthouse performance and accessibility are both ≥ 90 on the dashboard.
- `docs/feeds.md`, `docs/methodology.md`, `docs/ai-ops.md` and `README.md` are complete.

## 11. How to work with me

- Start with the plan and your questions. Do not scaffold until I answer.
- Commit after each coherent step, using conventional commit messages.
- If an upstream API differs from this brief, trust the live docs, update `docs/feeds.md` and tell me.
- Keep `docs/decisions.md` (ADR-lite) for any choice I would want to know about.
- Do not build features from later phases. Log them in `docs/backlog.md`.

**Backlog (do not build now):**

- actor arcs (solid for confirmed, dashed for suspected),
- the "since you last looked" delta strip,
- wall mode,
- shareable country OG cards,
- a Threat vs Readiness 2x2,
- the My Stack lens,
- Feedly incidents,
- a weekly AI-written briefing with linked sources,
- a small-territory view (Crown Dependencies, Gibraltar, Malta and similar),
- Censys/Shodan banner counts for AI tool servers (aggregated by hosting country only, subject to their terms),
- AI campaigns as a weighted Threat Level signal once there is enough data.
