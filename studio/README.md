# Legal Platform Template — Sanity Studio

Sanity Studio for the Legal Platform Template. Standalone Sanity Studio package — the consuming Next.js site lives in `../site/`.

This repo is the **template** that the Client Provisioning Tool clones from. The studio's `projectId`, `studioHost`, and identity strings are sentinels (`TEMPLATE_SANITY_PROJECT_ID`, `TEMPLATE_CLIENT_SLUG`, `TEMPLATE_CLIENT_NAME`) that get rewritten per-client at provisioning time from `CS-CLIENT-CONFIG.json`.

## Stack

- Sanity Studio `^3.65.0` (v3 framework — the consuming site uses the v5 client library)
- React `^18.3.1`
- TypeScript `^5.4.5`
- `@sanity/vision` for GROQ playground

> The site (`../site/`) uses Sanity client `^5.20.0` + `next-sanity ^12.2.2`. This is the supported v3-Studio / v5-Client split.

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
