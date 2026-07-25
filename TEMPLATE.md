# Template version policy

This template is versioned with semver tags. Each tag marks a released, end-to-end-tested checkpoint.

> **What a tag does NOT do (corrected 2026-07-25).** A tag or Release does **not** select the code a client receives. Provisioning calls GitHub's generate-from-template endpoint, which always copies the template's **default branch** (`main`); the tool sends no `ref`. So **every new client gets `main` at the moment it is provisioned, whatever the latest tag says.** The resolved version string is a **label**, written to `template-provenance.json` and into the new repo's GitHub description, and nothing else. Cutting a release keeps that label honest; it does not change what anybody receives. Provisioning at a chosen version is not supported today (monorepo `OUTSTANDING.md` item 71).

## Tag scheme

- `MAJOR` — breaking changes to schema shape, environment variable contract, or the Sample Firm seed format. Existing clients pinned to an older major will NOT receive these changes automatically; migration is out of scope for the template itself.
- `MINOR` — additive schema fields, new components, new optional env vars. Safe for new clients pinned to the same minor on re-provision.
- `PATCH` — bug fixes, dependency bumps, documentation updates. Always safe.

## How clients pin — they do not (corrected 2026-07-25)

**This section previously said the Provisioning Tool passes `template_version` as the `ref` to GitHub's generate API. It does not, and cannot.** GitHub's generate-from-template endpoint accepts no `ref`; the tool's request body carries only `owner`, `name`, `private`, `include_all_branches` and a description. Verified by reading `BE/Client-Provisioning-Tool/client_provisioning_tool.py` in the monorepo: `resolve_template_version()`'s result reaches only a log line, the new repo's description string, and `template-provenance.json`. It never selects code.

What is actually true:

- `CS-CLIENT-CONFIG.json` may set `template_version`. When set it overrides the **recorded label** only. When unset the tool queries `GET /repos/Justin-Countryman/legal-platform-template/releases/latest` and records that tag as the label. If the repo has **no** Release at all the tool errors out, so at least one published Release must exist.
- Either way the client repo is generated from **`main`**.
- The resolved version is persisted to `Clients/<slug>/output/template-provenance.json`. Treat it as a **provenance label, not a reproducibility guarantee** — two clients provisioned weeks apart can carry the same label and different code, and nothing surfaces the difference.

The workaround for genuine pinning, named in the tool's own docstring and deliberately out of scope, is to switch the template's default branch to a tag before generating. Tracked as monorepo `OUTSTANDING.md` item 71.

## How to cut a release

1. Land all PRs targeting `main` through CI.
2. Update the changelog below.
3. Tag: `git tag -a v0.X.Y -m "release notes"` then `git push origin v0.X.Y`.
4. Create a GitHub Release from the tag. **Not optional.** The tool reads `/releases/latest`, not the tag list, so a tag with no Release leaves the recorded label stale on every client provisioned afterwards.

> Changelog entries were skipped for v0.4.0, v0.5.0 and v0.6.0 — all three have Releases but no entry below. Not backfilled; their GitHub Release notes are the record.

## Schema-change PRs must regenerate the seed

Any PR that changes the shape of a singleton or a Sample Firm document type (`homePage`, `practiceArea`, `attorneyPage`, `contactPage`, `locationPage`, `siteSettings`, `designSettings`, `mainNavigation`, `footerSettings`, `globalCta`) MUST include a regenerated `studio/seedData/sampleFirm.ndjson` in the same PR. See `studio/seedData/regenerate.md` for the workflow.

The CI seed-validation gate enforces this — a schema-change PR without a matching seed regen will fail merge.

## Changelog

### v0.7.0 — 2026-07-25

**Two breaking changes. Read these first.**

1. **Every stored web address is now written out in full.** In Sanity, the address field on a page now holds the whole path, exactly as it appears in the browser: `blog/category/family-law`, not `family-law`. Before, some page types stored a short name and the code glued the rest on. It does not any more. The rule is simple now: what you see in Sanity is what the address is.
2. **The "languages" field is gone from attorney profiles.** It was removed from the attorney page in Sanity and from what the website displays.

**No existing site needs its data migrated. There are no live client sites**, so there is no firm's content to convert.

**Why this is 0.7.0 and not 1.0.0.** Under this file's own rule, a breaking change is a MAJOR, which would make this 1.0.0. It is deliberately not. The project is still numbered below 1.0, where breaking changes ride the minor position by convention, and **1.0.0 is reserved for a passing end-to-end dogfood.** Recorded here so this is not reopened later.

**What this release is for.** It is bookkeeping, and it is worth being precise about that. Cutting it does **not** push anything to anyone and does not change what a new client receives, because provisioning always copies `main` (see "How clients pin" above). What it fixes is the record: `main` had run 59 commits past v0.6.0, so every client provisioned in that window was stamped "v0.6.0" in its provenance file and its repo description while actually carrying much newer code. New clients are now labelled v0.7.0, which matches what they get.

**What is new since v0.6.0, in plain terms:**

- **A build-your-own homepage.** The homepage is now assembled from five reusable blocks (accolade badges, what-makes-us-different, a narrative section, case results, and an attorney spotlight), plus opening and closing sections. Editors arrange them in Sanity instead of getting one fixed layout.
- **Three new content types you can create once and reuse:** accolade badges, case results, and press mentions.
- **Fuller attorney, office and footer details** feeding both the page and the search-engine data: Justia and Lawyers.com profile links, a profile video, map coordinates, street addresses shown only for real offices, offices marked "do not display" now correctly hidden everywhere, Super Lawyers and LawInfo firm links, and a toll-free number handled as its own contact number.
- **Google Analytics and Google Search Console are now set up inside Sanity** rather than in code or hosting settings, and the paid Vercel analytics add-on is gone.
- **Accessibility and layout fixes:** star ratings meet the contrast standard, "reduced motion" is honoured everywhere, "Read More" links announce the article they lead to, the header switches to its mobile menu based on the space the menu actually needs, and hero sections no longer clip their content.
- **Page titles behave.** No more stray separator on pages with no title set, and a homepage title typed in Sanity is used exactly as written instead of having the firm name appended twice.

**Case results carry a legal obligation.** The case-results block renders a disclaimer, and the wording lives in one place in the code. Do not remove it per client.

**Known gaps carried into this release:** the sample-firm seed file is still not committed (it is a template-development fixture only and is never imported into a client), and the automated check that generated Sanity types are current is still blind (monorepo `OUTSTANDING.md` item 22).

### v0.3.0 — 2026-06-26

Lands the **homepage hero builder** and a **canonical Sanity image pipeline** in the template (ported from the Dudley dogfood). MINOR per the tag scheme — net-additive (one new object type, new components, additive fields); the single field removal is an unused legacy fallback with no query consumer, non-breaking for fresh provisioning.

- **Homepage Hero builder** (`studio/schemas/objects/homeHero.ts` + `homeHeroReveal.ts` + `heroSurfaceFields.ts` + `practiceAreaNavItem.ts`; `site/components/layout/homeHero/*`). A Sanity-driven wizard: pick a Layout (Overlay | Split), relevant fields reveal. Renders via a client dispatcher that code-splits one of two skeletons composed from a shared atoms layer; reuses the internal-hero surface/scheme/backdrop/button infrastructure. New layout controls this release: **Silo Nav card layout** (`siloLayout`: cards | spotlight | tile — reuses the silo library's photo-forward layouts on the hero band), **Scrim Style** (`scrimStyle`: flat | gradient), Fit hidden on Split, and the Silo Nav strip works on both Overlay and Split. The `Primary` toggle on practice-area items is hidden outside the Practice Area Navigation section (Bento-only).
- **Canonical Sanity image pipeline** (`site/lib/sanity/image.ts`, `site/components/ui/SanityImage.tsx`, `IMAGE_FRAGMENT` in `queries.ts`). One GROQ fragment projects the asset ref + `hotspot` + `crop` + `lqip` + dimensions; `<SanityImage>` (fixed | fill | natural modes) renders via `@sanity/image-url` + `next-sanity`'s loader so the editor's **crop + hotspot are honored** (was discarded before — images center-cropped regardless of focal point). LQIP blur-up included. Migrated every focal-sensitive render (attorney/staff photos, testimonial avatars, video thumbnails, section/CTA images, silo cards, blog featured image, PortableText body images). Logos/badges/profile object-contain images stay on `next/image` (no crop). `vitest.setup.ts` stubs `next-sanity/image` (its loader's extensionless `next/image` import fails Vitest ESM; production is unaffected).
- **homePage schema:** removed the unused `h1` SEO-fallback field (the visible H1 comes from the hero; the field had no query consumer).

**Seed regen still pending.** `homePage` singleton shape changed (h1 removed) + the new `homeHero` object — per policy `studio/seedData/sampleFirm.ndjson` should be regenerated, but the seed still isn't committed (the `seed-validation` job remains a soft warn). Non-blocking for fresh provisioning; owed alongside the still-open initial-seed commit.

### v0.2.0 — 2026-05-27

Ports two improvements from the monorepo's client builds (source commits `6e4032c`, `b8e9762` in `Justin-Countryman/legal-platform`). MINOR per the tag scheme — additive schema fields + an inert one-shot migration; safe for new clients pinned at v0.2.0.

- **footerSettings — firm-level Avvo + Justia URLs.** Two new optional `url` fields land at the bottom of the `social` fieldset: `avvoUrl`, `justiaUrl`. Both flow through `ORGANIZATION_SCHEMA_QUERY.socials` and concatenate into the root `<RootLayout>` JSON-LD `sameAs` array (order: LinkedIn → Facebook → Twitter → Instagram → YouTube → Avvo → Justia). Empty fields stay filtered by the existing string-narrowing predicate. Closes the H2 Organization JSON-LD gap that motivated the OUTSTANDING entry in the monorepo (locked D2 decision: "Avvo + Justia desired").
- **Studio migration — `cleanup-empty-ctaFormOverride.ts`.** One-shot cleanup at `studio/migrations/`. Detects docs where `ctaFormOverride` is defined but `buttons[]` is empty or all entries have neither `title` nor `url` (variant-only entries count as empty), then `unset`s the entire `ctaFormOverride` so the page falls through to globalCtaData defaults. Default dry-run; `--apply` mutates. No `--reverse` (cleanup drops malformed data — nothing to restore). Inert against fresh client datasets — new clients should see zero matches because they haven't run the Phase 4 named-slot → buttons[] migration that produces this drift shape. Kept canonical so it's available if a future client inherits the drift from imported data.

**Render-side scope:** JSON-LD `sameAs` only. Footer icon strip is unchanged — Avvo/Justia do not get rendered icons.

**Seed regen still pending.** The schema-change policy at the top of this file requires `studio/seedData/sampleFirm.ndjson` to be regenerated alongside `footerSettings` shape changes, but v0.1.0 shipped without the seed and the CI `seed-validation` job is still a soft warn (`exit 0`). v0.2.0 ships without the regen too; the seed-validation gate remains a warn until the seed lands in a future PR. The two new fields are optional, so the absence of a regen is non-blocking for new clients — they'll provision with the v0.2.0 footerSettings schema, and the empty seed simply means no default Avvo/Justia URLs (correct behavior).

**Owed for next minor:** the **v0.1.0** entry below flagged a neutral branded favicon for v0.2.0; that scope item remains open and is now owed for v0.3.0+. Also owed: the initial `sampleFirm.ndjson` commit + flipping `seed-validation` from warn to hard-fail per the policy in `studio/seedData/regenerate.md`.

### v0.1.0 — (unreleased)

Initial template extraction from the platform's first reference build, after the second-client dogfood validated the 8-tool BE pipeline end-to-end.

- 5-page Sample Firm baseline (homePage, practiceArea, attorneyPage, contactPage, locationPage + empty-but-valid singletons)
- 5-value neutral palette across `globals.css` fallbacks (`#1a1a1a`, `#4a4a4a`, `#666666`, `#f5f5f5`, `#ffffff`) — runtime overrides emit the active client's derivation
- BI-UI sm typography preset, radius `md`
- Template sentinels: `TEMPLATE_CLIENT_SLUG`, `TEMPLATE_CLIENT_NAME`, `TEMPLATE_SANITY_PROJECT_ID`, `template-client-studio`, `example.com`
- **No favicon ships in v0.1.0** — `app/favicon.ico` is intentionally absent so the browser tab shows Next.js's default rather than leaking a client brand mark on parity-test or pre-customization deploys. A neutral branded favicon is owed for **v0.2.0**.
