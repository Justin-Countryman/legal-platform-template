# Template version policy

This template is versioned with semver tags. Each tag is a released, end-to-end-tested checkpoint that the Client Provisioning Tool can pin to.

## Tag scheme

- `MAJOR` — breaking changes to schema shape, environment variable contract, or the Sample Firm seed format. Existing clients pinned to an older major will NOT receive these changes automatically; migration is out of scope for the template itself.
- `MINOR` — additive schema fields, new components, new optional env vars. Safe for new clients pinned to the same minor on re-provision.
- `PATCH` — bug fixes, dependency bumps, documentation updates. Always safe.

## How clients pin

`CS-CLIENT-CONFIG.json` per-client may specify a `template_version` field (e.g. `"v0.3.1"`). When set, the Provisioning Tool passes it as the `ref` to GitHub's generate API. When unset, the tool queries `GET /repos/Justin-Countryman/legal-platform-template/releases/latest` and uses that tag.

The resolved version is persisted to `Clients/<slug>/output/template-provenance.json` for reproducibility.

## How to cut a release

1. Land all PRs targeting `main` through CI.
2. Update the changelog below.
3. Tag: `git tag -a v0.X.Y -m "release notes"` then `git push origin v0.X.Y`.
4. Create a GitHub Release from the tag (optional; the tag itself is the source of truth).

## Schema-change PRs must regenerate the seed

Any PR that changes the shape of a singleton or a Sample Firm document type (`homePage`, `practiceArea`, `attorneyPage`, `contactPage`, `locationPage`, `siteSettings`, `designSettings`, `mainNavigation`, `footerSettings`, `globalCta`) MUST include a regenerated `studio/seedData/sampleFirm.ndjson` in the same PR. See `studio/seedData/regenerate.md` for the workflow.

The CI seed-validation gate enforces this — a schema-change PR without a matching seed regen will fail merge.

## Changelog

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
