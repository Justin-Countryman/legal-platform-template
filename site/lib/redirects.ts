// ─── Redirects: one source, resolved at build ─────────────────────────────────
// Doctrine: `BI/rules/technical-seo.md` → TECH-9. Redirects are build-time and
// come from `CS/redirects.csv` and nowhere else.
//
// WHY THIS MODULE EXISTS AT ALL.
//
// `loadRedirects` used to live inline in `next.config.ts`, where no test could
// reach it. Six ruled behaviours ran unasserted in the one function that decides
// whether a migrated client's legacy URLs resolve (`OUTSTANDING.md` item 159).
// The parsing half is now a pure function over a string, and the filesystem half
// takes its paths as arguments, so both are testable.
//
// WHAT WAS DELETED HERE ON 2026-08-17, AND WHY, because the shape of this file
// is the record of it. There used to be a SECOND store: a `redirects` singleton
// in Sanity that this module read at build and merged with the CSV under a
// three-rank precedence, reporting every conflict and every drift between the
// two. That machinery was correct and it is gone, because the thing it
// reconciled should never have existed. Measured before the deletion: no
// operator had ever authored a row in that screen on either real client, all
// 148 rows across both were machine written, a row published there returned a
// 200 and a `revalidated: true` and then never served, and the operator's own
// `CS/redirects.csv` ranked LOWEST of the three, so curating it was overruled by
// the build. The proposal that ruled this is
// `BI/_scratch/PROPOSAL-REDIRECTS-2026-08-17.md`; the evidence is findings F21
// and F21-V1 through F21-V18 in `BI/_workstreams/WS-Dogfood-2026-08-16-NOTES.md`.
//
// WHAT MOVED INTO THIS FILE AS A RESULT. With one store, the build is the only
// place a chain can be resolved, so `resolveRedirects` now does the three things
// the ruling names as having exactly one right answer: flatten a multi-hop
// chain, keep the first of two rows claiming one source, and drop a self
// redirect. A LOOP is the fourth case and it has no right answer, so it emits no
// rule and is reported: a rule for a loop bounces a visitor between two pages
// until the browser gives up, which is worse than the 404 that dropping it
// produces.
//
// WHERE THE OPERATOR EDITS. The app's Redirects screen for that client, which
// writes `CS/redirects.csv` and deploys. A row is stored exactly as it was
// typed; flattening happens here, when the build reads the file, so the file
// keeps `/a -> /b` while the site serves `/a -> /c`.

import {existsSync, readFileSync} from 'node:fs'

/** A rule in the shape Next's `redirects()` returns. */
export type RedirectRule = {source: string; destination: string; statusCode: number}

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

// ─── Reading the file ─────────────────────────────────────────────────────────

/**
 * Parse `CS/redirects.csv`. Shape: `old_path,new_path[,redirect_type]` with a
 * header row. Lines beginning with `#` are comments; empty lines are skipped.
 *
 * The ruled behaviours, all of them asserted in `__tests__/redirects.test.ts`:
 * the header skip, the both-side trailing-slash normalization, the
 * self-redirect drop (Next rejects a rule whose source equals its destination),
 * the `302` branch and the default-301 fall-through.
 *
 * DUPLICATE SOURCES ARE NOT RESOLVED HERE, deliberately. This function is a
 * faithful read of the file and returns one rule per usable row, duplicates
 * included; `resolveRedirects` is where the file becomes the served set and is
 * the only place a row is dropped for a reason other than being unusable.
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

// ─── Resolving the file into the served set ───────────────────────────────────

/** A second row claiming a source the file already claimed. The first is served. */
export type RedirectDuplicate = {source: string; kept: RedirectRule; dropped: RedirectRule}

/** A row whose written target is itself a redirect, so the visitor is sent past it. */
export type RedirectFlattened = {
  source: string
  /** The destination the operator typed. */
  via: string
  /** The destination actually served. */
  destination: string
  /** How many hops the walk took to get there. */
  hops: number
}

/** A row that never reaches a terminal target. No rule is emitted for it. */
export type RedirectLoop = {
  source: string
  /** The walk, in order, closing on the path that repeated or on the last hop reached. */
  chain: string[]
  reason: 'cycle' | 'hop-cap'
}

export type RedirectReport = {
  duplicates: RedirectDuplicate[]
  flattened: RedirectFlattened[]
  loops: RedirectLoop[]
  counts: {rows: number; served: number}
}

/**
 * The hop cap. Ten, matching `generate_redirects` in
 * `BE/Site-Prep-Tool/site_prep_tool.py`, so the same file resolves the same way
 * in both places.
 *
 * It is a SECOND guard, not the cycle detector: a revisited path is caught by
 * the visited set below regardless of length. The cap is what bounds a
 * pathological chain that is long without repeating, so a bad file fails the
 * build rather than hanging it.
 */
export const MAX_REDIRECT_HOPS = 10

/**
 * Turn the rows of `CS/redirects.csv` into the array `redirects()` returns, and
 * report every row that could not be served as written.
 *
 * THE FOUR CASES, and which of them has one right answer:
 *
 *  - DUPLICATE source: first row wins, later rows are dropped and reported.
 *  - CHAIN `/a`→`/b`→`/c`: `/a` serves `/c` directly, reported. `/b` keeps its
 *    own rule — it is a legacy URL in its own right and flattening `/a` must not
 *    delete it.
 *  - SELF redirect: already dropped by `parseRedirectsCsv`; Next rejects it.
 *  - LOOP: NO right answer, so no rule and a report. Both legs of `/a`→`/b`→`/a`
 *    are dropped, and so is anything that merely feeds the loop, because it
 *    cannot resolve either.
 *
 * The status code served is the ORIGINATING hop's, because that is the status
 * the visitor actually receives; the hops in between never happen.
 */
export function resolveRedirects(rows: RedirectRule[]): {
  rules: RedirectRule[]
  report: RedirectReport
} {
  const duplicates: RedirectDuplicate[] = []
  const byPath = new Map<string, RedirectRule>()
  for (const row of rows) {
    const held = byPath.get(row.source)
    if (held) duplicates.push({source: row.source, kept: held, dropped: row})
    else byPath.set(row.source, row)
  }

  const flattened: RedirectFlattened[] = []
  const loops: RedirectLoop[] = []
  const rules: RedirectRule[] = []

  for (const [source, row] of byPath) {
    const chain = [source]
    let current = row.destination
    let hops = 1
    let loop: RedirectLoop | null = null

    while (byPath.has(current)) {
      if (chain.includes(current)) {
        loop = {source, chain: [...chain, current], reason: 'cycle'}
        break
      }
      if (hops >= MAX_REDIRECT_HOPS) {
        loop = {source, chain: [...chain, current], reason: 'hop-cap'}
        break
      }
      chain.push(current)
      current = byPath.get(current)!.destination
      hops++
    }

    if (loop) {
      loops.push(loop)
      continue
    }
    if (current !== row.destination) {
      flattened.push({source, via: row.destination, destination: current, hops})
    }
    rules.push({source, destination: current, statusCode: row.statusCode})
  }

  return {
    rules,
    report: {duplicates, flattened, loops, counts: {rows: rows.length, served: rules.length}},
  }
}

/**
 * The report as build-log lines. Returned rather than printed so the guard is
 * assertable without capturing console output.
 *
 * Every line is prefixed `[redirects]` so a build log can be grepped for the
 * whole story with one string. The summary line is printed on EVERY build, not
 * only when something is wrong: a guard that only speaks on failure is
 * indistinguishable from a guard that is not running.
 */
/**
 * The most config redirects this platform will let a build emit.
 *
 * WHY 1,024 AND NOT VERCEL'S PUBLISHED REDIRECT CAP. Vercel's redirects
 * reference gives "Number of redirects in the array: 2,048". The stricter
 * number is the ROUTES budget: a deployment has a documented maximum of 1,024
 * routes, and every emitted redirect spends one of them alongside the
 * framework's own rules, the headers and the rewrites. So 1,024 is the ceiling
 * that binds first, and it is also the number
 * `BE/Site-Builder-App/redirects_store.py` already refuses to save above. One
 * number in both places is the point: the screen and the build must not
 * disagree about what is publishable.
 *
 * WHAT HAPPENS ABOVE THE CAP ON VERCEL IS NOT ESTABLISHED HERE. The platform's
 * own record has said the overflow is dropped silently; Vercel's community
 * error string "Maximum number of routes exceeded. Max is 1024" says a build
 * can fail on it instead. Nothing on this platform has ever deployed near the
 * cap, so neither was measured. The throw below does not depend on which is
 * true, and that is deliberate: both outcomes are worse than a local failure
 * with a message naming the file.
 */
export const MAX_CONFIG_REDIRECTS = 1024

/**
 * Fail the build rather than deploy a redirect set that is over the cap.
 *
 * WHY THIS EXISTS AT ALL, given the app already refuses to save above the cap
 * (finding F29, 2026-08-19). The app guards where the operator TYPES. Two paths
 * reach `CS/redirects.csv` without passing that screen: Site Prep's
 * `merge_cs_redirects` adds every new migration row with no count check, and a
 * hand edit or a `cp` bypasses the app entirely. The build is where those paths
 * converge and is the last place before the deploy, so it is where the count
 * has to be true.
 *
 * It counts the SERVED rules rather than the file's rows, because served rules
 * are what reach the manifest and spend the routes budget: a duplicate, a self
 * redirect and a loop are all rows that cost nothing.
 */
export function assertRedirectCapNotExceeded(
  served: number,
  csvPath = 'CS/redirects.csv',
): void {
  if (served <= MAX_CONFIG_REDIRECTS) return
  throw new Error(
    `[redirects] ${served} redirects would be emitted from ${csvPath}, above the ` +
      `${MAX_CONFIG_REDIRECTS}-rule limit a Vercel deployment can carry. The build ` +
      `stops here rather than shipping a set the platform cannot serve in full. ` +
      `Remove ${served - MAX_CONFIG_REDIRECTS} redirect(s) in the app's Redirects ` +
      `screen for this client.`,
  )
}

export function formatRedirectReport(report: RedirectReport): string[] {
  const {counts} = report
  const lines: string[] = [
    `[redirects] ${counts.served} served from CS/redirects.csv (${counts.rows} row(s) read)`,
  ]

  for (const d of report.duplicates) {
    lines.push(
      `[redirects] DUPLICATE ${d.source}: two rows claim this source. Serving ` +
        `-> ${d.kept.destination} (${d.kept.statusCode}) and IGNORING ` +
        `-> ${d.dropped.destination} (${d.dropped.statusCode}). Delete one of them ` +
        `in the app's Redirects screen.`,
    )
  }
  for (const f of report.flattened) {
    lines.push(
      `[redirects] FLATTENED ${f.source}: the row says -> ${f.via}, which is itself ` +
        `a redirect, so ${f.source} serves -> ${f.destination} directly (${f.hops} hops ` +
        `collapsed). Your row is unchanged; this is what the visitor gets.`,
    )
  }
  for (const l of report.loops) {
    const why =
      l.reason === 'cycle'
        ? 'this chain returns to a path it already visited'
        : `this chain did not resolve within ${MAX_REDIRECT_HOPS} hops`
    lines.push(
      `[redirects] LOOP ${l.source}: ${l.chain.join(' -> ')} — ${why}, so NO redirect ` +
        `is emitted and ${l.source} returns 404. Fix the chain in the app's Redirects ` +
        `screen; there is no correct target to pick automatically.`,
    )
  }

  if (!report.duplicates.length && !report.flattened.length && !report.loops.length) {
    lines.push('[redirects] no duplicate, no chain, no loop')
  }
  return lines
}
