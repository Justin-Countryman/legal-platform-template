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

### v0.1.0 — (unreleased)

Initial template extraction from the platform's first reference build, after the second-client dogfood validated the 8-tool BE pipeline end-to-end.

- 5-page Sample Firm baseline (homePage, practiceArea, attorneyPage, contactPage, locationPage + empty-but-valid singletons)
- 5-value neutral palette across `globals.css` fallbacks (`#1a1a1a`, `#4a4a4a`, `#666666`, `#f5f5f5`, `#ffffff`) — runtime overrides emit the active client's derivation
- BI-UI sm typography preset, radius `md`
- Template sentinels: `TEMPLATE_CLIENT_SLUG`, `TEMPLATE_CLIENT_NAME`, `TEMPLATE_SANITY_PROJECT_ID`, `template-client-studio`, `example.com`
- **No favicon ships in v0.1.0** — `app/favicon.ico` is intentionally absent so the browser tab shows Next.js's default rather than leaking a client brand mark on parity-test or pre-customization deploys. A neutral branded favicon is owed for **v0.2.0**.
