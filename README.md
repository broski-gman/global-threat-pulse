# Global Threat Pulse

A cyber threat weather service: explainable country threat levels with sources, data age and confidence. Currently at milestone M0, a data-feed spike with no UI.

## Setup

Needs Node 22 or later and pnpm through Corepack.

```bash
corepack enable
```

```bash
pnpm install
```

```bash
cp .env.example .env.local
```

## Commands

| Command          | What it does                                        |
| ---------------- | --------------------------------------------------- |
| `pnpm spike`     | Fetches each phase-1 feed once and prints counts    |
| `pnpm test`      | Runs tests, including the fixture safety check      |
| `pnpm lint`      | Runs ESLint                                         |
| `pnpm typecheck` | Runs the TypeScript compiler without emitting files |
| `pnpm build`     | Builds the Next.js app                              |

## Docs

- [Brief](docs/brief.md)
- [Feeds and licences](docs/feeds.md)
- [Decisions](docs/decisions.md)
- [Backlog](docs/backlog.md)
