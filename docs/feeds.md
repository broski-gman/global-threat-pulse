# Feeds

Status of each phase-1 feed, checked on 2026-11-06. "Live test" means `pnpm spike <id>` fetched real data that day. This is an engineering summary of published terms, not legal advice.

The project is **non-commercial** (see `decisions.md`, D1). Several licences below depend on that staying true.

## Summary

| Adapter            | Live test             | Records         | Auth           | Public, non-commercial use | Commercial use             |
| ------------------ | --------------------- | --------------- | -------------- | -------------------------- | -------------------------- |
| `cisa-kev`         | Passed                | 1,768           | None           | Allowed (CC0)              | Allowed                    |
| `first-epss`       | Passed                | 100 of 100      | None           | Allowed, attribution asked | Formal terms not found     |
| `nvd`              | Passed, without a key | 420,179 CVEs    | Optional key   | Allowed, with disclaimer   | Not checked in detail      |
| `ransomware-live`  | **Waiting for key**   | Not tested      | `X-API-KEY`    | Allowed, with conditions   | **Needs written approval** |
| `cloudflare-radar` | **Waiting for token** | Not tested      | Bearer token   | Allowed, with attribution  | **Blocked by CC BY-NC**    |
| `misp-galaxy`      | Passed                | 1,118 actors    | None           | Allowed (CC0 option)       | Allowed                    |
| `mitre-attack`     | Passed                | 26,698 objects  | None           | Allowed, notice required   | Allowed                    |
| `sans-isc`         | Passed                | 1 value (green) | None           | Allowed, attribution       | **Terms are ambiguous**    |
| `itu-gci`          | **Waiting for CSV**   | Not tested      | Not applicable | **Terms not confirmed**    | **Terms not confirmed**    |

## Licence flags

1. **Cloudflare Radar:** API data is CC BY-NC 4.0, confirmed in the [Radar docs](https://developers.cloudflare.com/radar/) and on the [About page](https://radar.cloudflare.com/about). The French About page says CC BY, which looks like a translation error, so we follow the English text. Commercial use would need separate permission.
2. **ransomware.live:** commercial use needs prior written approval. Public raw data and feed-style redistribution are banned for everyone. See its section below for how we comply.
3. **SANS ISC:** the [API page](https://isc.sans.edu/api/) names CC BY-NC-SA 4.0 and also says commercial use is OK, without saying how the two fit together. This is fine while non-commercial, but ask SANS before any change.
4. **ITU GCI:** I couldn't find terms covering reuse of tier data. ITU's copyright page URLs that I tried returned 404. Check the licence in the report itself when the CSV arrives, and before public launch.

## Feed details

### `cisa-kev`

- **Endpoint:** `https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json`, as briefed. [Catalog page](https://www.cisa.gov/known-exploited-vulnerabilities-catalog).
- **Rate limit:** none published. Fetch every 6 hours.
- **Licence:** [CC0 1.0](https://www.cisa.gov/sites/default/files/licenses/kev/license.txt). Don't use the CISA logo or DHS seal, or imply endorsement.
- **Differs from the brief:** entries also carry `forensicTriage`, `notes` and `cwes`. 361 of 1,768 entries are marked as known ransomware use.

### `first-epss`

- **Endpoint:** `https://api.first.org/data/v1/epss`. [API docs](https://api.first.org/epss).
- **Rate limit:** [1,000 requests per minute](https://api.first.org/) without authentication.
- **Licence:** "Attribution is requested" and scores are "published freely" ([FAQ](https://www.first.org/epss/faq)). I found no formal licence.
- **Differs from the brief:** the documented limit on `cve` is 2,000 characters rather than 100 CVEs. Batches of 100 stay within it for current CVE ID lengths, and we must pass `limit=100`.
- **Backfill:** `date` returns historic scores back to 2021-04-14.

### `nvd`

- **Endpoint:** `https://services.nvd.nist.gov/rest/json/cves/2.0`. [Getting started](https://nvd.nist.gov/developers/start-here).
- **Auth:** optional key, sent as the `apiKey` header.
- **Rate limit:** 5 requests per rolling 30 seconds without a key and 50 with one. NVD advises sleeping between requests even with a key. We use 6 seconds without one.
- **Licence:** NVD provides a not-endorsed disclaimer for applications to display, which goes on `/sources`.
- **Impact:** enriching all 1,768 KEV entries takes about 3 hours without a key, so M1 runs must resume across invocations. A key is strongly recommended.
- **Differs from the brief:** a sampled NVD description contains the version `25.1.1.3`, which matches the IP check, and 3 of 1,768 KEV entries contain similar strings. Descriptions and CPE data stay out of fixtures and snapshots, and vendor and product come from KEV.

### `ransomware-live`

- **Endpoint:** `https://api-pro.ransomware.live`, documented in a [public Swagger file](https://api-pro.ransomware.live/swagger.json). A keyless request to `/validate` returned 401.
- **Auth:** `X-API-KEY` header, as briefed.
- **Rate limit:** 500,000 calls a month under fair use ([tiers](https://www.ransomware.live/api)). Data is cached for 30 minutes, so polling faster adds nothing.
- **Licence:** [Terms](https://www.ransomware.live/t&c), updated 2026-08-19. Non-commercial use is free with attribution.
- **Compliance:**
  - Name the source with a link on every page that shows the data: `Source: Ransomware.live`.
  - No public raw data, including in this repo, so committed fixtures drop victim fields.
  - No public feed. Snapshots live in a private Blob store and are read server-side.
  - No polling on behalf of visitors, which principle 4 already guarantees.
  - The site must not mimic ransomware.live's look or branding.
- **Backfill:** `/victims/?year=YYYY&month=MM` filters by discovery or attack date, which should cover the 90-day baseline. **Not yet tested live.**
- **Differs from the brief:** `/victims/recent` returns only the latest 100, so regular ingestion must also page by month to avoid missing claims.

### `cloudflare-radar`

- **Endpoints:** `/radar/attacks/layer7/top/attacks` and `/radar/attacks/layer3/top/attacks`, as briefed. Target share comes from `/layer7/top/locations/target`, which the brief doesn't list.
- **Auth:** `Authorization: Bearer $CLOUDFLARE_API_TOKEN`. I couldn't confirm the exact token permission name from the docs.
- **Rate limit:** [1,200 requests per 5 minutes per user](https://developers.cloudflare.com/fundamentals/api/reference/limits/), shared across the account.
- **Licence:** CC BY-NC 4.0, with attribution.
- **Backfill:** `dateRange` accepts up to `364d` on the layer 3 endpoints I could read. **Not yet tested live.** Daily history may need one call per day.
- **Caveats that change what we can claim:**
  - **Layer 3 origin is not the attack source.** It is [the Cloudflare data centre location](https://developers.cloudflare.com/radar/investigate/network-layer-attacks/), because source IPs can be spoofed. Layer 3 "origin" must not be shown as where an attack came from.
  - **Layer 7 source is a machine.** It is [the location of the IP](https://developers.cloudflare.com/radar/investigate/application-layer-attacks/), and the person behind it may be elsewhere.
  - **Layer 7 target is a billing address.** It is the billing location of the attacked zone, not where servers or users are.
  - **Coverage:** only traffic Cloudflare sees, and only top-N rows. A missing country means no data, not zero.

### `misp-galaxy`

- **Endpoint:** `https://raw.githubusercontent.com/MISP/misp-galaxy/main/clusters/threat-actor.json`, as briefed.
- **Rate limit:** none published. Fetch daily.
- **Licence:** [CC0 1.0 or BSD 2-Clause](https://github.com/MISP/misp-galaxy/blob/main/LICENSE.md).
- **Differs from the brief:** the fields are much sparser than the data model assumes. Out of 1,118 actors:

  | Field                         | Actors with it |
  | ----------------------------- | -------------- |
  | `country`                     | 487            |
  | `synonyms`                    | 418            |
  | `attribution-confidence`      | 164            |
  | `cfr-suspected-victims`       | 146            |
  | `cfr-target-category`         | 128            |
  | `cfr-type-of-incident`        | 108            |
  | `cfr-suspected-state-sponsor` | 99             |
  | `motive`                      | 10             |
  - `motive` is nearly empty and free text. `cfr-type-of-incident` is the better source, and blanks must show as "unknown".
  - `attribution-confidence` is a number (10, 25, 50, 75 or 100), so M1 needs a mapping to words.
  - Victims and sponsors are country names such as `Korea (Republic of)`, which need mapping to ISO codes.
  - Descriptions and refs stay out of snapshots because they can name individuals.

### `mitre-attack`

- **Endpoint:** `https://raw.githubusercontent.com/mitre/cti/master/enterprise-attack/enterprise-attack.json`, as briefed. About 49 MB.
- **Rate limit:** none published. Fetch daily at most, since ATT&CK changes only with releases.
- **Licence:** [ATT&CK terms](https://attack.mitre.org/resources/legal-and-branding/terms-of-use/) allow commercial and non-commercial use. Copies must keep MITRE's copyright notice and licence, so the notice goes on `/sources`.
- **Differs from the brief:** [`mitre/cti`](https://github.com/mitre/cti) is STIX 2.0 and still maintained, while `mitre-attack/attack-stix-data` is STIX 2.1 with an improved data model. We'll keep the briefed source for now and log a possible move in `backlog.md`.
- **Contents:** 193 groups, 867 techniques, 750 malware, 95 tools, 57 campaigns and 21,822 relationships. Campaigns have dates but lag events, so they don't count as live activity.

### `sans-isc`

- **Endpoint:** `https://isc.sans.edu/infocon.txt`, as briefed. It returns a single word, currently `green`.
- **Rate limit:** none stated. Fetch hourly at most and include contact details in the `User-Agent`, as the [API page](https://isc.sans.edu/api/) asks. `FEED_CONTACT` is still empty (see `decisions.md`, D5).
- **Licence:** see licence flag 3.

### `itu-gci`

- **Source:** `data/gci-2024.csv`, supplied by the project owner. The [report](https://www.itu.int/dms_pub/itu-d/opb/hdb/D-HDB-GCI.01-2024-TOC-HTM-E.htm) covers 194 countries in tiers T1 to T5.
- **Status:** the script reports `skipped` until the file exists. See licence flag 4.

## Map shapes

Not a feed, but also part of the public output.

- **Source:** [`world-atlas`](https://github.com/topojson/world-atlas) 110m, built from Natural Earth.
- **Coverage:** 177 shapes keyed by ISO numeric ID, so we need a numeric to alpha-2 table. Singapore, Hong Kong, Malta and Bahrain have no shape and get clickable dots. Kosovo, N. Cyprus and Somaliland have no ID.
- **Licence:** to confirm in M3, when the package is added.

## Running the scripts

```bash
pnpm spike
```

Pass feed IDs to run only those, such as `pnpm spike cisa-kev nvd`. Keys come from `.env.local`.

- **Committed fixtures** in `fixtures/<adapter>/` use field allowlists and are checked by `tests/fixtures-safety.test.ts`.
- **Full responses** go to `fixtures/.private/`, which is gitignored.
- **`fixtures/ransomware-live/synthetic.json`** is invented data following the documented fields, for parser tests without a key.
