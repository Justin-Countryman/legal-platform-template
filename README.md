# Legal Platform Template

GitHub Template repository for the Legal Platform — a Sanity-backed Next.js website for law firms, deployed to Vercel.

This repo is the **canonical template** that the Client Provisioning Tool clones from for every new client site. It is intentionally de-branded: all client-specific identity strings are template sentinels (`TEMPLATE_CLIENT_SLUG`, `TEMPLATE_CLIENT_NAME`, `TEMPLATE_SANITY_PROJECT_ID`) that get rewritten per-client at provisioning time from `CS-CLIENT-CONFIG.json`.

## Use this template

### Recommended path — via the Client Provisioning Tool (8-tool BE pipeline)

```bash
python3 BE/Client-Provisioning-Tool/client_provisioning_tool.py <client-slug>
```

The tool calls GitHub's `POST /repos/Justin-Countryman/legal-platform-template/generate` API, pins to the template version specified in `CS-CLIENT-CONFIG.json` (`template_version` field, defaults to latest tag), clones the new repo, rewrites template sentinels, and imports the Sample Firm seed data into the client's empty Sanity dataset. See `BI/BI-Workflow.md` for the full pipeline.

### Manual path — for one-off exploration

1. Click **Use this template** → **Create a new repository** on GitHub.
2. Clone your new repo locally.
3. Create a Sanity project (`npx sanity init` in a scratch dir, or via sanity.io/manage).
4. Replace `TEMPLATE_SANITY_PROJECT_ID` in `studio/sanity.config.ts`, `studio/sanity.cli.ts`, and `site/.env.local` with your project ID.
5. Replace `TEMPLATE_CLIENT_SLUG` and `TEMPLATE_CLIENT_NAME` in `studio/sanity.config.ts`, `studio/sanity.cli.ts`, and `studio/package.json` + `studio/package-lock.json`.
6. From `studio/`: `npm install && npx sanity dataset import seedData/sampleFirm.ndjson production --replace --missing` to load the Sample Firm baseline.
7. From `site/`: `npm install && npm run dev`.

## Repo layout

```
site/                  Next.js 16 marketing site (see site/README.md)
studio/                Sanity Studio (see studio/README.md)
  seedData/            Sample Firm NDJSON + regeneration workflow
.github/workflows/     CI gates (lint, test, seed validation)
TEMPLATE.md            Version policy + changelog
README.md              You are here
```

## Versioning

Semver tags govern compatibility with the Client Provisioning Tool. See `TEMPLATE.md` for the full policy and changelog.

## What's intentionally NOT in this template

- Client-specific firm data — supplied via `CS-FIRM-DATA.json` and loaded into Sanity by the Site Prep Tool, not committed here
- Brand colors, logos, OG images, favicons — `site/app/favicon.ico` ships as a generic placeholder; client brand assets are supplied at provisioning time
- `.env.local` — secrets never live in the template; copy `site/.env.example`
- Real attorney/location/practice-area content — Sample Firm seed ships only enough docs for the build to compile

## License

UNLICENSED — internal use only. Not for public redistribution.
