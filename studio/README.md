# Legal Platform Template — Sanity Studio

Sanity Studio for the Legal Platform Template. Standalone Sanity Studio package — the consuming Next.js site lives in `../site/`.

This repo is the **template** that the Client Provisioning Tool clones from. The studio's `projectId`, `studioHost`, and identity strings are sentinels (`TEMPLATE_SANITY_PROJECT_ID`, `TEMPLATE_CLIENT_SLUG`, `TEMPLATE_CLIENT_NAME`) that get rewritten per-client at provisioning time from `CS-CLIENT-CONFIG.json`.

## Stack

- Sanity Studio `6.13.2` (exact pin, with `@sanity/ui 4.2.1`, `@sanity/icons 5.2.2`, `@sanity/client 8.6.1`, `@sanity/vision 6.13.2`). Upgraded from `^3.65.0` on 2026-09-11 (monorepo `BI/_workstreams/WS-V1-PHASE5-DESIGN.md` §3 and §9). The pins are exact on purpose: between 6.0 and 6.13 the Studio swapped three dependency majors (`@sanity/ui` 3→4, `@sanity/icons` 3→5, `@sanity/client` 7→8), each of which broke `sanity build` on this tree, and a caret range would inherit the next such swap on any `npm update`. Bump them together, deliberately, and re-run the proof below.
- React `^19.2.2` (Studio v5+ requires React 19.2)
- TypeScript `^5.4.5`, `@types/node ^24` (declared because the v6 tree no longer carries it transitively)
- Node `>=22.12` (`.nvmrc` says 24)
- `@sanity/vision` for GROQ playground

> The site (`../site/`) uses `next-sanity ^12.2.2` and its own `sanity` dependency. The Studio and the site are installed separately; the Studio's config still imports `../site/lib/designTokens` (monorepo OUTSTANDING item 22), so `site/` must be installed before the Studio can extract, build or deploy.

### What changed on the v6 upgrade, and how it is proven

- `sanity schema extract` refuses to overwrite `schema.json` without `--force`; the `schema:extract` script carries it.
- The extract has 118 types (it hoists every `<type>.reference` into its own entry); the monorepo's reader parses both shapes.
- Typegen output renamed every query result type from `X_QUERYResult` to `X_QUERY_RESULT` and is prettier-formatted; the site imports none of the renamed names.
- Typegen configuration moved from `sanity-typegen.json` to the `typegen` key of `sanity.cli.ts`; `deployment.autoUpdates` is written `false` there so a deployed client Studio never swaps its bundle underneath the platform.
- `@sanity/icons` 5 removed the root barrel (`import {TagIcon} from '@sanity/icons/Tag'`); `@sanity/ui` 4 moved the menu family to `@sanity/ui/menu`, `space` became `gap`, and `placement` moved into `popover`.
- The v6 CLI (oclif) rejects unknown flags; the monorepo's provisioning tool no longer passes `--hide-major-message` to a v4+ CLI.
- Proof, every push: `Studio: sanity build` (a required check) now also runs `tsc --noEmit` in `studio/`; `Sanity types freshness` regenerates the extract and the types offline and plants a field to prove it can fail.

## Local development

```bash
npm install
npm run dev           # http://localhost:3333
```

> Local dev against the template's literal sentinel project ID will fail — the Studio cannot connect to a project called `TEMPLATE_SANITY_PROJECT_ID`. After cloning, either run the Client Provisioning Tool to rewrite sentinels for a real client, or manually replace the sentinels in `sanity.config.ts` + `sanity.cli.ts` + `package.json` with a scratch Sanity project ID for local exploration.

## Common commands

```bash
npm run dev              # Local studio (port 3333)
npm run build            # Build static studio bundle to dist/
npm run deploy           # Deploy studio to <studioHost>.sanity.studio
npm run deploy-graphql   # Deploy the GraphQL playground (if used)
```

## Sample Firm seed data

`seedData/sampleFirm.ndjson` ships with a minimal neutral 5-page firm baseline (homePage, practiceArea, attorneyPage, contactPage, locationPage + required singletons). The Client Provisioning Tool imports this post-clone via:

```bash
sanity dataset import seedData/sampleFirm.ndjson production --replace --missing
```

The Site Prep Tool later overrides the sample data with the real client's content from `CS-FIRM-DATA.json`. See `seedData/regenerate.md` for the regeneration workflow when schemas change.

## Project layout

```
sanity.config.ts        Studio config (project ID, dataset, plugins, structure)
sanity.cli.ts           CLI config (deploy target, studio host)
structure.ts            Custom Studio navigation structure
schemas/
  documents/            Document types (homePage, attorneyPage, blogPost, faqItem, etc.)
  objects/              Reusable object types
  index.ts              Schema registry
components/             Custom input components (PageLinkInput, TokenStringInput, etc.)
migrations/             Historical migration scripts (one-shot, completed)
seedData/               Sample Firm NDJSON + regeneration docs
skip-to-main.js         A11y skip-link injected into the Studio shell
```

## Schema editing

- Use `defineField()` for new schema fields (per platform convention).
- Validation rules: use `.error()` for required content (slug, SEO title, meta description, alt text), `.warning()` only for soft guidance.
- Preview config: every document type should have `preview: {select, prepare}` rendering a meaningful title + subtitle.

See `BI/BI-SANITY.md` in the platform repo for the canonical schema-authoring conventions.

**When you change a document schema's shape, you must also regenerate `seedData/sampleFirm.ndjson`.** See `seedData/regenerate.md` for the workflow.
