# Template scripts

Maintenance scripts that ship with the template repo. These are not invoked by the Client Provisioning Tool at provision time — they're run once during template maintenance (seed regen, version cuts, etc.).

## `seed-bootstrap.mjs` — populate the scratch Sanity project with Sample Firm docs

Creates the 12 documents the Provisioning Tool imports into every new client's empty Sanity dataset:

- 2 reference-target docs: `sample-location-record`, `sample-contact-form`
- 5 singletons: `siteSettings`, `designSettings`, `mainNavigation`, `footerSettings`, `globalCta`
- 5 main pages: `sample-home`, `sample-practice-area`, `sample-attorney`, `sample-contact`, `sample-location`

### One-time setup (the scratch Sanity project)

1. **Create the scratch project.** From this template repo:
   ```bash
   cd studio
   npx sanity init --create-project "legal-platform-template-seed" --dataset production
   ```
   Choose the **free** plan. The CLI will print a project ID — note it.

2. **Deploy the template's schema to the scratch project.** Replace the template sentinel with your scratch project ID temporarily:
   ```bash
   # Set the scratch project ID + a dev studio host
   export SANITY_STUDIO_PROJECT_ID=<scratch-project-id>
   npx sanity deploy
   ```
   The Studio will be available at `https://legal-platform-template-seed.sanity.studio`.

3. **Generate a write token.** Go to `https://sanity.io/manage/personal/project/<scratch-project-id>/api/tokens` → **Add API token** → Name "seed-bootstrap", permissions **Editor**, save the token.

4. **Cache the credentials** alongside other tool tokens:
   ```bash
   # Edit ~/.legal-platform/tokens.json
   {
     "schema_version": 1,
     "tokens": {
       "github": "...",
       "vercel": "...",
       "sanity_management": "...",
       "seed_project_id": "<scratch-project-id>",
       "seed_token": "<editor-token>"
     }
   }
   ```

### Run the bootstrap

From the template repo root:

```bash
SANITY_SEED_PROJECT_ID=<scratch-project-id> \
  SANITY_SEED_TOKEN=<editor-token> \
  node scripts/seed-bootstrap.mjs
```

Expected output: 12 lines `✓ <type> <id>`, then a `Result: 12 OK, 0 failed.` summary and the export command.

### Export the dataset to NDJSON

```bash
cd studio
npx sanity dataset export production seedData/sampleFirm.ndjson \
  --raw --asset-concurrency 0 --overwrite
```

The `--raw` flag preserves system fields (`_id`, `_type`, `_rev`); `--asset-concurrency 0` skips asset downloads since the seed has no images.

### Commit + push

```bash
git add studio/seedData/sampleFirm.ndjson
git commit -m "studio(seed): regenerate sampleFirm.ndjson"
git push
```

The CI `seed-validation` job will go from warning to pass once the file is present (and once we bump the validation rule to `exit 1` for v0.2.0).

## When to re-run the bootstrap

- **Schema change PRs** that touch any of the 10 doc types or required singletons. See `studio/seedData/regenerate.md` for the full schema-PR procedure.
- **Sanity Studio major version bumps** that affect NDJSON format compatibility.
- **Content edits** to the placeholder copy. Easier path: edit in Studio UI directly, then re-export — no need to re-run the script unless schema shape changed.

## Recovery — script fails partway

`createOrReplace` is idempotent — re-running the script after a partial failure is safe. The most common cause of failure is a schema validation error (a required field changed type without the script being updated). Fix the script to match, re-run.

If the scratch project itself is broken (deleted, credentials lost), recreate per the one-time-setup steps above. The committed `sampleFirm.ndjson` is your safety net — import it into the recreated project to bootstrap:

```bash
sanity dataset import seedData/sampleFirm.ndjson production --replace
```

Then make your edits and re-export.
