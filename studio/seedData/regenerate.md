# Sample Firm seed — regeneration workflow

`sampleFirm.ndjson` is a Sanity NDJSON export of 5 sample documents + required singletons. The Client Provisioning Tool imports this into every new client's empty Sanity dataset post-clone, giving the client a working deployable site before SBT overwrites with real client data.

## When to regenerate

Regenerate `sampleFirm.ndjson` whenever ANY of these occur:

1. A document schema in `studio/schemas/documents/{homePage,practiceArea,attorneyPage,contactPage,locationPage,siteSettings,designSettings,mainNavigation,footerSettings,globalCta}.ts` changes shape — new required field, type change, validation change.
2. A required singleton is added or removed from the protected list.
3. Sanity Studio major version bump that affects NDJSON format compatibility.

The CI `seed-validation` job (`.github/workflows/ci.yml`) refuses to merge a schema-change PR without a matching seed regen.

## Scratch project

- **Project name:** `legal-platform-template-seed`
- **Owner:** Justin Countryman (single-owner write access; prevents drift)
- **Dataset:** `production`
- **Project ID:** stored in `~/.legal-platform/tokens.json` under `seedProjectId` (run the Client Provisioning Tool once to populate)
- **Read token:** stored in same file under `seedReadToken`

## Sample documents (do not rename or change `_id` values)

| `_id` | Type | Slug | Notes |
|---|---|---|---|
| `sample-home` | `homePage` | (singleton) | Hero with neutral copy, single CTA, no testimonials, no attorneys-section |
| `sample-practice-area` | `practiceArea` | `general-practice` | Title "General Practice", 2-paragraph generic blurb, no FAQ items |
| `sample-attorney` | `attorneyPage` | `jane-doe` | Jane Doe, J.D., "Partner", neutral 1-paragraph bio, no admissions/awards/education |
| `sample-contact` | `contactPage` | `contact` | Placeholder "123 Example St, Springfield, IL 62701", "+1 (555) 555-0100", contact form embed |
| `sample-location` | `locationPage` | `springfield-office` | "Springfield Office", same placeholder address, no GBP embed |

Plus empty-but-valid singletons: `siteSettings`, `designSettings`, `mainNavigation`, `footerSettings`, `globalCta`.

## Regeneration procedure

In your schema-change PR branch:

1. Apply the schema change locally; verify it builds: `cd studio && npm run build`.
2. Deploy the schema to the scratch project: `npx sanity deploy` (uses the scratch project ID + token from `~/.legal-platform/tokens.json`).
3. If the schema added or changed a required field on any of the 10 seed docs, update `scripts/seed-bootstrap.mjs` to populate the new field with a neutral default (no client names; "Springfield, IL" or generic placeholders only).
4. Re-run the bootstrap to overwrite docs in the scratch project (`createOrReplace` is idempotent):
   ```bash
   SANITY_SEED_PROJECT_ID=<scratch-id> SANITY_SEED_TOKEN=<token> \
     node scripts/seed-bootstrap.mjs
   ```
5. If touch-ups are needed (richer prose, references between seed docs), open the scratch Studio in a browser and edit there. The bootstrap script will only need updating when schema **shape** changes.
6. Export:
   ```bash
   cd studio
   npx sanity dataset export production seedData/sampleFirm.ndjson --raw --asset-concurrency 0 --overwrite
   ```
7. Commit `studio/seedData/sampleFirm.ndjson` (and any `scripts/seed-bootstrap.mjs` updates) in the same PR as the schema change.
8. Push; CI seed-validation job should pass.

See `scripts/README.md` for the one-time setup of the scratch project + token caching.

## What "neutral defaults" means

- No real city/state outside "Springfield, IL" (chosen for being a generic everyplace name)
- No real attorney names — `Jane Doe`, `John Roe`, etc.
- No real firm names — `Sample Firm`, `Sample Firm LLC`
- No real domains beyond `example.com`
- No real phone numbers — use `555-XXX-XXXX` (US "fictional" range)
- No real email addresses — `contact@example.com`
- No real social URLs

When in doubt: lift placeholders from `site/app/(site)/design-studio/DesignStudioClient.tsx`'s mock data — that file's mock content is curated to be neutral.

## Recovery — if scratch project is lost

If the scratch project is deleted or its credentials are lost, recreate it:

1. `sanity.io/manage` → create project `legal-platform-template-seed`, dataset `production`.
2. Update `~/.legal-platform/tokens.json` with the new `seedProjectId` + a fresh read token.
3. Run the import from the current `sampleFirm.ndjson` to seed the new project: `sanity dataset import seedData/sampleFirm.ndjson production --replace`.
4. Open the studio, verify all 5 sample docs render correctly.
5. Future regenerations proceed normally.
