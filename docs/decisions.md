# Decisions

Newest last. Decided by the project owner on 2026-11-06 unless noted.

## D1: The project is non-commercial

No monetisation, and no use to promote a company or generate leads.

- **Consequence:** Vercel Hobby is acceptable, and the non-commercial terms of Cloudflare Radar and ransomware.live apply.
- **Revisit if this changes:** commercial use needs written approval from ransomware.live, separate permission from Cloudflare, clarification from SANS, and Vercel Pro.

## D2: Threat Level measures change, not absolute danger

The formula stays as briefed, with volume shown next to the score.

- **Squash:** z≤0 gives 0, rising in a straight line to 1 at a z-score cap of 3. The alternative puts every normal country at about 50, which is Elevated. Engineering choice, to review at M2.
- **Consequence:** a typical week reads Low even for heavily targeted countries, so Low means "no worse than usual". `/methodology` must say so.

## D3: Hostile Attention uses Cloudflare only in phase 1

MISP victim lists have no dates, so they can't support a 7-day vs 90-day comparison.

- Actor-victim lists are shown as context and not scored.
- "Recently active" lists ransomware groups only.
- State-linked actors stay in the directory with no activity claim.

## D4: Stack changes from the brief

| Change                                                | Reason                                                            |
| ----------------------------------------------------- | ----------------------------------------------------------------- |
| Don't install deck.gl until something draws arcs      | Nothing through M5 needs it, and it adds bundle weight            |
| No third-party tiles, just country fills              | Tighter CSP, with no tile licence or cost                         |
| Server-rendered SVG map, then lazy-load MapLibre      | Protects the Lighthouse target and gives a no-WebGL fallback      |
| 110m shapes plus clickable dots for missing countries | 110m has no Singapore, Hong Kong, Malta or Bahrain                |
| Private Blob store with a versioned manifest          | Avoids a public feed and half-updated snapshot sets               |
| All countries in one `countries.json`                 | Per-country files would exceed Hobby's 2,000 monthly Blob uploads |
| Separate Vercel project for `/admin/review`           | Vercel Authentication can't protect a single path                 |

## D5: Repo and open items

- **Repo:** public, at `broski-gman/global-threat-pulse`. Commits so far are authored as `QMC4`, the machine's global git identity.
- **Contact address:** to follow. `FEED_CONTACT` stays empty until then, and SANS asks for contact details.
- **Domain:** `globalthreatpulse.io` is being purchased, so nothing depends on it yet.

## D6: Engineering choices made during M0

Made by the lead engineer, for review.

- **TypeScript 6.0, not 7.0.** `typescript-eslint` doesn't support 7.0 yet (its peer range is below 6.1).
- **Committed fixtures use field allowlists, and real ransomware.live samples drop victim fields.** This follows principle 5 and the ransomware.live terms, and differs from the brief's plain "save a sample".
- **Upstream free text stays out of snapshots.** NVD and KEV text can contain version strings that match the IP check, and MISP text can name people. Patch Clock cards don't need it. NVD and MISP text also stays out of fixtures. KEV's `shortDescription` stays in its fixture because the data is CC0 and the sample passes the safety test.
- **Layer 3 Radar "origin" won't be shown as an attack source.** It is a Cloudflare data centre location. Pulse pairs use layer 7, with a caption saying the source is a machine's location.
