# Sample Firm seed — regeneration workflow

`sampleFirm.ndjson` is a Sanity NDJSON export of the 11 sample CONTENT documents (5 pages + 6 reference targets — see the table below). The Client Provisioning Tool imports this into every new client's empty Sanity dataset post-clone, giving the client a working deployable site before SBT overwrites with real client data.

## READ THIS FIRST: the seed must NOT contain the configuration singletons

**`siteSettings`, `designSettings`, `mainNavigation`, `footerSettings`, `globalCta` and `redirects` must never appear in this seed.** CI fails the build if they do.

**This document used to instruct the opposite**, and that is why the rule is stated here rather than assumed. It listed those singletons as things to include, and the export step below emits them by default. Following the old procedure produced a silent, platform-wide bug.

**Why.** Site Build composes those six documents from the client's own data and writes them **create-only**: if the document already exists in the dataset, Site Build **preserves it and throws its composed version away**. That is intended, and it is load-bearing. It is what stops a rebuild from clobbering the design an operator tuned in Studio.

But the seed is imported **before** Site Build ever runs. So a seed carrying those documents **wins the race, permanently**. The client silently inherits the sample firm's design, navigation, footer, global CTA and site settings, and the documents composed from that client's real data are discarded. `CS-DESIGN-SYSTEM.md` is ignored entirely.

**Nothing reports it.** The failure mode is a *preserve*, not an error: the build says `Warnings: 0` and exits 0. It looks exactly like success, and the wrong site is traceable to nothing.

**Two guards, and you do not get to rely on either.** The Client Provisioning Tool strips these documents out before importing, and CI fails a seed that carries them. Both exist because a rule that lives only in a document does not survive the next person who follows the document. Keep them out of the seed anyway.

The site renders fine without them: the singletons are Site Build's to write, and a client dataset with no seeded singletons is exactly the state the platform has always shipped in.

## When to regenerate

Regenerate `sampleFirm.ndjson` whenever ANY of these occur:

1. A document schema in `studio/schemas/documents/{homePage,practiceArea,attorneyPage,contactPage,locationPage,location,siteForm,badge,caseResult,faqItem,testimonial}.ts` changes shape: new required field, type change, validation change. **The six configuration singletons are deliberately not in this list.** They are not in the seed, so their schemas changing does not require a seed regen.
2. Sanity Studio major version bump that affects NDJSON format compatibility.

**Enforcement, honestly stated:** the CI `seed-validation` job (`.github/workflows/ci.yml`) hard-fails a committed seed carrying any create-only singleton, and only **warns** when the seed file is missing (the promised v0.2.0 hard-fail was never flipped — it cannot be until a seed is committed at all). **Nothing couples a schema change to a seed regen.** The regen-on-schema-change rule above is enforced by this document and reviewer discipline alone; a schema-change PR with a stale seed merges clean. (This paragraph previously claimed CI refuses such a PR. It does not, and never has.)

## Scratch project

- **Project name:** `legal-platform-template-seed`
- **Owner:** Justin Countryman (single-owner write access; prevents drift)
- **Dataset:** `production`
- **Project ID:** stored in `~/.legal-platform/tokens.json` under `seedProjectId` (run the Client Provisioning Tool once to populate)
- **Read token:** stored in same file under `seedReadToken`

## Sample documents (do not rename or change `_id` values)

| `_id` | Type | Slug | Notes |
|---|---|---|---|
| `sample-home` | `homePage` | (singleton) | Hero with neutral copy, single CTA; canvas carries a case-results block and a badges block wired to the reference-target docs below (item 43 — reference-only blocks must not render empty on a fresh client) |
| `sample-practice-area` | `practiceArea` | `general-practice` | Title "General Practice", 2-paragraph generic blurb, no FAQ items |
| `sample-attorney` | `attorneyPage` | `attorneys/jane-doe` | Jane Doe, J.D., "Partner", neutral 1-paragraph bio, no admissions/awards/education |
| `sample-contact` | `contactPage` | `contact` | Placeholder "123 Example St, Springfield, IL 62701", "+1 (555) 555-0100", contact form embed |
| `sample-location` | `locationPage` | `springfield-office` | "Springfield Office", same placeholder address, no GBP embed |
| `sample-location-record` | `location` | — | Reference target for `locationPage`/`siteSettings` |
| `sample-contact-form` | `siteForm` | — | Reference target for `contactPage` |
| `sample-badge` | `badge` | — | "Sample Legal Excellence Award", generated placeholder seal artwork (embedded PNG uploaded by the bootstrap); wired into `sample-home`'s badges block |
| `sample-case-result` | `caseResult` | — | Non-monetary "Favorable Outcome" (sample content must not ship a fabricated dollar figure); the results disclaimer renders automatically from `site/lib/legal.ts`; wired into `sample-home`'s case-results block |
| `sample-faq-item` | `faqItem` | `what-should-i-bring-to-my-first-consultation` | Reference target for the operator to wire; no `faqSection` document ships in the seed, so nothing renders empty |
| `sample-testimonial` | `testimonial` | — | "Jordan D.", 5 stars; reference target for the operator to wire; no `testimonialsGrid`/`featuredTestimonial` document ships in the seed |

**That is the whole seed.** The configuration singletons are NOT part of it. See the warning at the top of this file. Two types are deliberately absent: `video` (its section embeds an external video URL a sample cannot honestly provide) and `pressItem` (no section, query, or component renders the type — orphaned; see OUTSTANDING items 43/66).

## Regeneration procedure

In your schema-change PR branch:

1. Apply the schema change locally; verify it builds: `cd studio && npm run build`.
2. Deploy the schema to the scratch project: `npx sanity deploy` (uses the scratch project ID + token from `~/.legal-platform/tokens.json`).
3. If the schema added or changed a required field on any of the seed docs, update `scripts/seed-bootstrap.mjs` to populate the new field with a neutral default (no client names; "Springfield, IL" or generic placeholders only).
4. Re-run the bootstrap to overwrite docs in the scratch project (`createOrReplace` is idempotent):
   ```bash
   SANITY_SEED_PROJECT_ID=<scratch-id> SANITY_SEED_TOKEN=<token> \
     node scripts/seed-bootstrap.mjs
   ```
5. If touch-ups are needed (richer prose, references between seed docs), open the scratch Studio in a browser and edit there. The bootstrap script will only need updating when schema **shape** changes.
6. Export, then **filter**. The export takes the whole scratch dataset, and the scratch Studio will have created the configuration singletons whether you asked it to or not, so the raw export carries them. **The filter is not optional and it is not a formality.** It is the step that keeps the sample firm's design out of every client on the platform.
   ```bash
   cd studio
   npx sanity dataset export production seedData/sampleFirm.raw.ndjson --raw --asset-concurrency 0 --overwrite

   # Drop every document Site Build writes create-only, drafts included.
   # This list must match BE/_shared/sanity_singletons.py::CREATE_ONLY_SINGLETONS.
   jq -c --argjson s '["siteSettings","designSettings","mainNavigation","footerSettings","globalCta","redirects"]' '
     ((._id // "") | sub("^drafts\\."; "")) as $id
     | (._type // "") as $type
     | select(($s | index($id)) == null and ($s | index($type)) == null)
   ' seedData/sampleFirm.raw.ndjson > seedData/sampleFirm.ndjson

   rm seedData/sampleFirm.raw.ndjson
   ```
7. Confirm the filter did its job before you commit. This must print nothing:
   ```bash
   grep -E '"_id"\s*:\s*"(drafts\.)?(siteSettings|designSettings|mainNavigation|footerSettings|globalCta|redirects)"' \
     seedData/sampleFirm.ndjson
   ```
8. Commit `studio/seedData/sampleFirm.ndjson` (and any `scripts/seed-bootstrap.mjs` updates) in the same PR as the schema change. Never commit `sampleFirm.raw.ndjson`.
9. Push; the CI `seed-validation` job should pass. If it fails naming a create-only singleton, step 6's filter did not run.

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
4. Open the studio, verify all sample docs render correctly.
5. Future regenerations proceed normally.

**The import in step 3 targets the SCRATCH project. Never point it at a client's dataset.** A hand-run `sanity dataset import` is the one path that bypasses the Client Provisioning Tool, and therefore the one path its filter cannot protect. The committed seed is clean because CI enforces it, so importing the committed file is safe; importing a locally regenerated one that has not been through step 6's filter is not. If you are seeding a client, use the Client Provisioning Tool and let it do the filtering.
