// ─── Redirects: the two sources, merged ───────────────────────────────────────
// Doctrine: `BI/rules/technical-seo.md` → TECH-9 (redirects are build-time and
// come from `CS/redirects.csv`) and TECH-10 (the Studio redirects screen is
// live: the site reads it, the build writes into it, a Studio entry wins a
// conflict, and a disagreement is reported).
//
// WHY THIS MODULE EXISTS AT ALL, in two parts.
//
// (1) `loadRedirects` used to live inline in `next.config.ts`, where no test
// could reach it. Six ruled behaviours ran unasserted in the one function that
// decides whether a migrated client's legacy URLs resolve (`OUTSTANDING.md`
// item 159). The parsing half is now a pure function over a string, and the
// filesystem half takes its paths as arguments, so both are testable.
//
// (2) `studio/schemas/documents/redirects.ts` is a registered singleton whose
// own header comment claimed the site builder read its array. Nothing under
// `site/` referenced it — an operator could add a redirect in Studio, publish,
// and change nothing, while the screen told them otherwise. That is the failure
// TECH-10 was ruled to end.
//
// THE PRECEDENCE, stated once here and again in the schema description the
// operator reads:
//
//     Studio-authored entry  >  migration entry (build-written)  >  CSV row
//
// A Studio entry wins because it is the later and more deliberate edit. The
// migration entries in the Studio document and the rows in `CS/redirects.csv`
// are meant to be the same set — the build writes one from the other — so any
// difference between them is drift, and drift is reported rather than resolved
// in silence. That report is the fourth half of TECH-10 and is the reason the
// other three are worth building: two sources of truth about a path that cannot
// disagree out loud will disagree quietly instead.

import {existsSync, readFileSync} from 'node:fs'

/** A rule in the shape Next's `redirects()` returns. */
export type RedirectRule = {source: string; destination: string; statusCode: number}

/** Where a served rule came from. Ordered by precedence in `ORIGIN_RANK`. */
export type RedirectOrigin = 'studio' | 'migration' | 'csv'

export type OriginatedRedirect = RedirectRule & {origin: RedirectOrigin}

/** One row of the Studio singleton's `items` array, as it arrives from GROQ. */
export type StudioRedirectItem = {
  from?: string | null
  to?: string | null
  type?: string | null
  source?: string | null
}

/** A lower-precedence entry that lost to a higher one and did not agree with it. */
export type RedirectConflict = {
  source: string
  winner: OriginatedRedirect
  loser: OriginatedRedirect
}

export type RedirectDriftKind =
  | 'csv-row-missing-from-studio'
  | 'studio-migration-row-missing-from-csv'
  | 'migration-row-disagrees-with-csv'

/** The two sources disagreeing about the migration set. */
export type RedirectDrift = {
  source: string
  kind: RedirectDriftKind
  csv?: RedirectRule
  studio?: OriginatedRedirect
}

export type RedirectReport = {
  conflicts: RedirectConflict[]
  drift: RedirectDrift[]
  duplicates: {source: string; origin: RedirectOrigin}[]
  /** False when the Studio document could not be read; drift is not computable then. */
  studioReachable: boolean
  counts: {csv: number; migration: number; studio: number; served: number}
}

/**
 * TECH-1 on this surface. The site runs with the default `trailingSlash: false`,
 * so Next 308-strips a trailing slash off the incoming path BEFORE matching
 * redirect rules. CSV paths are WordPress-style slashed (`/about/attorney/`),
 * so both source and destination are stripped to the site's canonical slashless
 * form. Without this the rule (keyed on the slashed source) never matches and
 * the legacy URL 404s. Normalizing the destination too avoids a trailing 308
 * hop to the canonical target.
 */
export function stripTrailingSlash(p: string): string {
  return p === '/' ? '/' : p.replace(/\/+$/, '')
}

/** `302` is the only accepted alternative; everything else, blank included, is a 301. */
export function normalizeStatusCode(rawType: string | null | undefined): number {
  return rawType === '302' ? 302 : 301
}

// ─── Source 1: the migration CSV ──────────────────────────────────────────────

/**
 * Parse `CS/redirects.csv`. Shape: `old_path,new_path[,redirect_type]` with a
 * header row. Lines beginning with `#` are comments; empty lines are skipped.
 *
 * The ruled behaviours, all of them asserted in `__tests__/redirects.test.ts`:
 * the header skip, the both-side trailing-slash normalization, the
 * self-redirect drop (Next rejects a rule whose source equals its destination),
 * the `302` branch and the default-301 fall-through.
 */
export function parseRedirectsCsv(raw: string): RedirectRule[] {
  const lines = raw.split('\n')
  const out: RedirectRule[] = []
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    if (i === 0 && trimmed.toLowerCase().startsWith('old_path')) continue // header
    const [rawSource, rawDestination, rawType] = trimmed.split(',').map((s) => s.trim())
    if (!rawSource || !rawDestination) continue
    const source = stripTrailingSlash(rawSource)
    const destination = stripTrailingSlash(rawDestination)
    // After normalization a `/foo/`→`/foo` row collapses to a self-redirect —
    // skip it (Next rejects a rule whose source equals its destination).
    if (source === destination) continue
    out.push({source, destination, statusCode: normalizeStatusCode(rawType)})
  }
  return out
}

/**
 * Read and parse the CSV, warning loudly when it is absent on a MIGRATED client.
 *
 * A missing `redirects.csv` is fine for a brand-new firm. But a migrated client
 * has a `CS-SITEMAP.csv` full of legacy URLs and MUST ship redirects — a missing
 * file there is a real defect that previously failed silently and 404'd every
 * legacy URL. The warning is conditional on the sitemap existing for exactly
 * that reason.
 *
 * The filename is `CS-SITEMAP.csv` in every case, here and in the caller's
 * path. Both sites read `CS-Sitemap.csv` from this guard's first build on
 * 2026-06-23 until 2026-08-11 — a spelling nothing in the pipeline writes,
 * which cost the guard its whole purpose on a case-sensitive filesystem
 * (`OUTSTANDING.md` item 203).
 *
 * `warn` is injectable so the warning itself is assertable.
 */
export function loadRedirects(
  csvPath: string,
  sitemapPath: string,
  warn: (message: string) => void = console.warn,
): RedirectRule[] {
  let raw: string
  try {
    raw = readFileSync(csvPath, 'utf8')
  } catch {
    try {
      if (existsSync(sitemapPath)) {
        warn(
          '[redirects] WARNING: CS/redirects.csv not found but CS-SITEMAP.csv exists — ' +
            'this migrated client will ship ZERO redirects and legacy URLs will 404. ' +
            'Seed CS/redirects.csv via Site-Prep generate_redirects.',
        )
      }
    } catch {
      /* ignore */
    }
    return []
  }
  return parseRedirectsCsv(raw)
}

// ─── Source 2: the Studio singleton ───────────────────────────────────────────

/**
 * The one document this module reads. `_id` is fixed by `studio/structure.ts`,
 * and the filter is on `_id` rather than `_type` DELIBERATELY.
 *
 * `*[_type == "redirects"][0]` would also match `drafts.redirects`, and GROQ
 * orders an unordered filter by `_id`, where `drafts.redirects` sorts BEFORE
 * `redirects`. A build carrying a read token with draft access would then serve
 * an unpublished redirect map — silently, and only on the clients where someone
 * happened to leave a draft open. Filtering on the published `_id` cannot.
 * `BE/Site-Prep-Tool/site_prep_tool.py` reads the same document the same way.
 */
export const STUDIO_REDIRECTS_QUERY =
  `*[_id == "redirects"][0].items[]{from, to, type, source}`

/**
 * The value the build marks its own rows with. Anything else — including an
 * absent value, which is every row an operator adds in Studio — is authored.
 * Written by `generate_redirects` in `BE/Site-Prep-Tool/site_prep_tool.py`.
 */
export const MIGRATION_SOURCE_MARKER = 'migration'

/** Distinguishes "the operator has no entries" from "the document was unreadable". */
export type StudioRedirectFetch = {items: StudioRedirectItem[]; reachable: boolean}

/**
 * Build-time read for callers OUTSIDE the Next module graph — specifically
 * `next.config.ts`, which cannot import the Sanity client. Uses bare `fetch` so
 * it pulls in no dependencies, exactly as `fetchSiteHiddenAtBuild` does.
 *
 * FAIL-OPEN, and deliberately the opposite of `searchVisibility`'s fail-closed
 * default. There, an unreachable dataset must not un-hide a site. Here, an
 * unreachable dataset must not delete the CSV's redirects: serving the migration
 * set alone is the safe degradation, and `reachable: false` tells the caller the
 * disagreement guard could not run so it can say so rather than report "no
 * drift" off an empty array.
 */
export async function fetchStudioRedirectsAtBuild(): Promise<StudioRedirectFetch> {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET
  if (!projectId || !dataset) return {items: [], reachable: false}

  try {
    const url =
      `https://${projectId}.api.sanity.io/v2024-01-01/data/query/${dataset}` +
      `?query=${encodeURIComponent(STUDIO_REDIRECTS_QUERY)}`
    const token = process.env.SANITY_API_READ_TOKEN
    const res = await fetch(url, {
      headers: token ? {Authorization: `Bearer ${token}`} : {},
      cache: 'no-store',
    })
    if (!res.ok) return {items: [], reachable: false}
    const body = (await res.json()) as {result?: unknown}
    // A singleton that does not exist yet answers `null`, which is reachable
    // and empty — not the same thing as a failed read.
    if (body?.result == null) return {items: [], reachable: true}
    if (!Array.isArray(body.result)) return {items: [], reachable: false}
    return {items: body.result as StudioRedirectItem[], reachable: true}
  } catch {
    return {items: [], reachable: false}
  }
}

/**
 * Studio rows into served rules, under the same TECH-1 normalization and the
 * same self-redirect drop the CSV rows get. A row missing either side is
 * skipped: the schema marks both `required()` at warning severity, so a
 * half-filled row can be published and must not reach `redirects()`.
 */
export function normalizeStudioRedirects(items: StudioRedirectItem[]): OriginatedRedirect[] {
  const out: OriginatedRedirect[] = []
  for (const item of items ?? []) {
    const rawSource = (item?.from ?? '').trim()
    const rawDestination = (item?.to ?? '').trim()
    if (!rawSource || !rawDestination) continue
    const source = stripTrailingSlash(rawSource)
    const destination = stripTrailingSlash(rawDestination)
    if (source === destination) continue
    out.push({
      source,
      destination,
      statusCode: normalizeStatusCode(item?.type),
      origin: item?.source === MIGRATION_SOURCE_MARKER ? 'migration' : 'studio',
    })
  }
  return out
}

// ─── The merge: precedence, then the disagreement report ──────────────────────

/** Higher wins. The Studio entry is the later and more deliberate edit. */
const ORIGIN_RANK: Record<RedirectOrigin, number> = {studio: 3, migration: 2, csv: 1}

function agrees(a: RedirectRule, b: RedirectRule): boolean {
  return a.destination === b.destination && a.statusCode === b.statusCode
}

/**
 * Merge the two sources into the array `redirects()` returns, and report every
 * way they disagreed on the way through.
 *
 * Precedence is by origin rank and nothing else, so it does not depend on array
 * order and is the same on every build. Two entries of the SAME origin claiming
 * one source are a duplicate: the first wins and the second is reported.
 *
 * `studioReachable: false` suppresses the drift half — with no Studio read there
 * is nothing to compare the CSV against, and reporting "no drift" off an empty
 * array is the silent-agreement failure this rule exists to prevent.
 */
export function resolveRedirects(
  csvRules: RedirectRule[],
  studio: StudioRedirectFetch,
): {rules: RedirectRule[]; report: RedirectReport} {
  const studioRules = normalizeStudioRedirects(studio.items)
  const authored = studioRules.filter((r) => r.origin === 'studio')
  const migration = studioRules.filter((r) => r.origin === 'migration')
  const csv: OriginatedRedirect[] = csvRules.map((r) => ({...r, origin: 'csv' as const}))

  // Group first, resolve second. Deciding as entries stream past makes the
  // winner depend on arrival order and reports one override once per loser —
  // a Studio entry beating a migration entry that agrees with its CSV row is
  // ONE conflict, not two.
  //
  // The Studio rows go in AS THEY COME OFF THE DOCUMENT, deliberately not
  // pre-partitioned into authored-then-migration. Pre-partitioning would make
  // the rank sort below dead code that could be deleted with every test still
  // green — which is what it was until a red-proof at this build caught it.
  const bySource = new Map<string, OriginatedRedirect[]>()
  for (const entry of [...studioRules, ...csv]) {
    const held = bySource.get(entry.source)
    if (held) held.push(entry)
    else bySource.set(entry.source, [entry])
  }

  const conflicts: RedirectConflict[] = []
  const duplicates: {source: string; origin: RedirectOrigin}[] = []
  const winners = new Map<string, OriginatedRedirect>()

  for (const [source, candidates] of bySource) {
    // Stable sort by rank, so precedence is a property of the origin and not of
    // the order the two sources happened to be read in.
    const ranked = [...candidates].sort((a, b) => ORIGIN_RANK[b.origin] - ORIGIN_RANK[a.origin])
    const winner = ranked[0]
    winners.set(source, winner)

    const seenOrigins = new Set<RedirectOrigin>()
    for (const entry of ranked) {
      if (seenOrigins.has(entry.origin)) duplicates.push({source, origin: entry.origin})
      seenOrigins.add(entry.origin)
    }

    // One conflict per source: the winner against the best-ranked entry that
    // does not agree with it. Anything below that either agrees or is the same
    // disagreement seen again.
    const loser = ranked.slice(1).find((entry) => !agrees(winner, entry))
    if (loser) conflicts.push({source, winner, loser})
  }

  const drift: RedirectDrift[] = []
  if (studio.reachable) {
    const migrationBySource = new Map(migration.map((r) => [r.source, r]))
    const csvBySource = new Map(csv.map((r) => [r.source, r]))
    // Drop `origin` on the way in: a drift entry records the two RULES that
    // disagree, and re-stating which side each came from is already the `kind`.
    for (const entry of csv) {
      const row: RedirectRule = {
        source: entry.source,
        destination: entry.destination,
        statusCode: entry.statusCode,
      }
      const twin = migrationBySource.get(row.source)
      if (!twin) {
        drift.push({source: row.source, kind: 'csv-row-missing-from-studio', csv: row})
      } else if (!agrees(row, twin)) {
        drift.push({
          source: row.source,
          kind: 'migration-row-disagrees-with-csv',
          csv: row,
          studio: twin,
        })
      }
    }
    for (const row of migration) {
      if (!csvBySource.has(row.source)) {
        drift.push({
          source: row.source,
          kind: 'studio-migration-row-missing-from-csv',
          studio: row,
        })
      }
    }
  }

  const rules = [...winners.values()].map(({source, destination, statusCode}) => ({
    source,
    destination,
    statusCode,
  }))

  return {
    rules,
    report: {
      conflicts,
      drift,
      duplicates,
      studioReachable: studio.reachable,
      counts: {
        csv: csv.length,
        migration: migration.length,
        studio: authored.length,
        served: rules.length,
      },
    },
  }
}

/**
 * The report as build-log lines. Returned rather than printed so the guard is
 * assertable without capturing console output.
 *
 * Every line is prefixed `[redirects]` so a build log can be grepped for the
 * whole story with one string.
 */
export function formatRedirectReport(report: RedirectReport): string[] {
  const {counts} = report
  const lines: string[] = [
    `[redirects] ${counts.served} served — ` +
      `${counts.studio} Studio-authored, ${counts.migration} migration (Studio), ` +
      `${counts.csv} from CS/redirects.csv`,
  ]

  if (!report.studioReachable) {
    lines.push(
      '[redirects] WARNING: the Studio redirects document could not be read. ' +
        'Serving CS/redirects.csv alone, and the CSV-versus-Studio disagreement ' +
        'check DID NOT RUN — this is not a clean result, it is an unchecked one.',
    )
    return lines
  }

  for (const c of report.conflicts) {
    lines.push(
      `[redirects] CONFLICT ${c.source}: ${c.winner.origin} entry ` +
        `→ ${c.winner.destination} (${c.winner.statusCode}) WINS over ${c.loser.origin} ` +
        `→ ${c.loser.destination} (${c.loser.statusCode})`,
    )
  }
  for (const d of report.duplicates) {
    lines.push(
      `[redirects] DUPLICATE ${d.source}: two ${d.origin} entries claim this source; ` +
        'the first is served and the second is ignored',
    )
  }
  for (const d of report.drift) {
    if (d.kind === 'csv-row-missing-from-studio') {
      lines.push(
        `[redirects] DRIFT ${d.source}: in CS/redirects.csv but not in the Studio ` +
          'screen — the operator is looking at an incomplete redirect map. Re-run ' +
          'Site-Prep generate_redirects.',
      )
    } else if (d.kind === 'studio-migration-row-missing-from-csv') {
      lines.push(
        `[redirects] DRIFT ${d.source}: a migration entry in Studio with no row in ` +
          'CS/redirects.csv — the CSV was edited without re-running Site-Prep, or the ' +
          'row was deleted.',
      )
    } else {
      lines.push(
        `[redirects] DRIFT ${d.source}: CS/redirects.csv says ` +
          `→ ${d.csv?.destination} (${d.csv?.statusCode}) and the Studio migration entry ` +
          `says → ${d.studio?.destination} (${d.studio?.statusCode}). The Studio entry is ` +
          'served. Re-run Site-Prep generate_redirects to reconcile.',
      )
    }
  }

  if (!report.conflicts.length && !report.duplicates.length && !report.drift.length) {
    lines.push('[redirects] the two sources agree — no conflict, no drift')
  }
  return lines
}
