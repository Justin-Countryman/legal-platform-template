/**
 * Retired URLs answer 410 Gone; an unknown URL keeps 404 (monorepo `[R-562]`,
 * TECH-11). A retired URL is an old address the operator decided is gone for
 * good: no page and no redirect. Telling a search engine so, rather than 404,
 * is what makes it drop the address.
 *
 * ONE SOURCE, per client: `CS/retired.csv`, written by the monorepo's Site Prep
 * Tool from the `404page` rows of `CS-SITEMAP.csv` on every run (the sheet is
 * its only author; nothing edits it by hand). Shape: a header `old_path`, then
 * one old path per line; `#` lines are comments. A missing file is no retired
 * URLs, which is every client until its sheet retires one.
 *
 * HOW IT IS SERVED. `next.config.ts` turns each path into an `afterFiles`
 * rewrite to `/api/gone`, whose handler answers 410. `afterFiles` runs after
 * the redirects and the static routes and BEFORE the dynamic ones (the
 * `[...slug]` catch-all among them), so a retired path answers 410 where it
 * would otherwise render the not-found page (ADV-410-A, probed on `next start`
 * and read in Vercel's route table). A redirect of the same path wins, because
 * redirects run first; the build log says so.
 *
 * A RETIRED PATH MUST NEVER HIDE A PAGE. Next matches custom routes ignoring
 * case, and every CMS page is served by the catch-all, so a listed path that
 * case-folds to a live page would answer 410 in its place (ADV-410-A). The
 * build therefore drops, and names, any listed path that is a route of this
 * site or a page published in the dataset at build time; the page keeps
 * answering. The Sitemap Builder refuses the same at the source.
 *
 * The 410 page is plain, with no site header or footer: a route handler has no
 * layout, and Next gives a page render no supported way to answer 410
 * (Justin, 2026-09-29: "1, go with your recommendation").
 */

import {readFileSync} from 'node:fs'
import {stripTrailingSlash} from './redirects'

/** Where every retired path is rewritten; its handler answers 410. */
export const RETIRED_DESTINATION = '/api/gone'

/**
 * The routes of this site that are not a CMS page's own slug. A retired path
 * equal to one of these, or under one of the prefixes, would hide the route.
 * `lib/__tests__/retired.test.ts` holds this list to the `app/` tree.
 */
export const SITE_ROUTES = [
  '/',
  '/attorneys',
  '/blog',
  '/contact',
  '/design-studio',
  '/events',
  '/service-area',
  '/staff',
  '/testimonials',
  '/videos',
  // Pages the platform always makes, protected even when the dataset cannot be
  // read at build.
  '/about',
  '/disclaimer',
  '/privacy-policy',
  '/thank-you',
]
export const SITE_ROUTE_PREFIXES = ['/api/', '/design-preview/', '/site-preview/', '/review/', '/review-', '/_next/']

// A path-to-regexp source must hold nothing but path characters: `(`, `:`, `*`
// and friends would be read as pattern syntax (the same set the Sitemap
// Builder's `source` check refuses).
const SAFE_PATH = /^\/[A-Za-z0-9._~%/-]*$/

export type RetiredDrop = {path: string; reason: string}
export type RetiredRead = {paths: string[]; rows: number; dropped: RetiredDrop[]}

/** Parse `CS/retired.csv`: one usable path per row, first spelling of each kept. */
export function parseRetiredCsv(raw: string): RetiredRead {
  const paths: string[] = []
  const dropped: RetiredDrop[] = []
  const seen = new Set<string>()
  let rows = 0
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const first = trimmed.split(',')[0].trim()
    if (first.toLowerCase() === 'old_path') continue // header
    rows++
    const path = stripTrailingSlash(first)
    if (!SAFE_PATH.test(path)) {
      dropped.push({path: first, reason: 'it holds characters a route cannot carry'})
      continue
    }
    if (path === '/') {
      dropped.push({path, reason: 'it is the homepage'})
      continue
    }
    const key = path.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    paths.push(path)
  }
  return {paths, rows, dropped}
}

/** Read the file; a missing file is no retired URLs. */
export function loadRetired(csvPath: string): RetiredRead {
  let raw: string
  try {
    raw = readFileSync(csvPath, 'utf8')
  } catch {
    return {paths: [], rows: 0, dropped: []}
  }
  return parseRetiredCsv(raw)
}

/**
 * Split the listed paths into the ones that may answer 410 and the ones that
 * would hide a route or a published page. `pages` is the set of published
 * page paths, lower-cased, or null when the dataset could not be read.
 */
export function guardRetired(
  paths: string[],
  pages: Set<string> | null,
  redirectSources: string[] = [],
): {kept: string[]; dropped: RetiredDrop[]; redirected: string[]} {
  const routes = new Set(SITE_ROUTES.map((r) => r.toLowerCase()))
  const redirects = new Set(redirectSources.map((s) => stripTrailingSlash(s).toLowerCase()))
  const kept: string[] = []
  const dropped: RetiredDrop[] = []
  const redirected: string[] = []
  for (const path of paths) {
    const key = path.toLowerCase()
    if (routes.has(key) || SITE_ROUTE_PREFIXES.some((p) => key.startsWith(p))) {
      dropped.push({path, reason: 'a route of this site answers there'})
      continue
    }
    if (pages && pages.has(key)) {
      dropped.push({path, reason: 'a page is published there'})
      continue
    }
    if (redirects.has(key)) redirected.push(path)
    kept.push(path)
  }
  return {kept, dropped, redirected}
}

/** The rewrites `next.config.ts` returns under `afterFiles`. */
export function retiredRewrites(kept: string[]): {source: string; destination: string}[] {
  return kept.map((source) => ({source, destination: RETIRED_DESTINATION}))
}

/** The build-log lines, every one prefixed `[retired]`, the summary always. */
export function formatRetiredReport(
  read: RetiredRead,
  guard: {kept: string[]; dropped: RetiredDrop[]; redirected: string[]},
  pagesUnread: string | null,
): string[] {
  const lines = [`[retired] ${guard.kept.length} answer 410 from CS/retired.csv (${read.rows} row(s) read)`]
  for (const d of [...read.dropped, ...guard.dropped]) {
    lines.push(`[retired] DROPPED ${d.path}: ${d.reason}, so it keeps answering as it does. Take it off the sheet's retired rows.`)
  }
  for (const path of guard.redirected) {
    lines.push(`[retired] ${path} is also redirected in CS/redirects.csv; the redirect wins. Delete one of them.`)
  }
  if (pagesUnread && read.paths.length) {
    lines.push(`[retired] WARNING: the published pages could not be read (${pagesUnread}), so a retired path that is a page was not caught.`)
  }
  return lines
}

// Every published document's path: the stored slug IS the URL path (item 69).
const PUBLISHED_PATHS_QUERY = '*[defined(slug.current)].slug.current'

/**
 * The published page paths, lower-cased, read once at build through the same
 * endpoint and override `fetchSiteHiddenAtBuild` uses (`lib/searchVisibility.ts`).
 * `{pages: null, why}` when it cannot be read: the build goes on, the routes
 * are still guarded, and the log says the pages were not checked.
 */
export async function fetchPublishedPathsAtBuild(): Promise<{pages: Set<string> | null; why: string | null}> {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET
  if (!projectId || !dataset) return {pages: null, why: 'the Sanity project or dataset is unset'}
  try {
    const origin = process.env.SANITY_API_HOST_OVERRIDE
      ? process.env.SANITY_API_HOST_OVERRIDE.replace(/\/$/, '')
      : `https://${projectId}.api.sanity.io`
    const url =
      `${origin}/v2024-01-01/data/query/${dataset}` +
      `?query=${encodeURIComponent(PUBLISHED_PATHS_QUERY)}&perspective=published`
    const token = process.env.SANITY_API_READ_TOKEN
    const res = await fetch(url, {headers: token ? {Authorization: `Bearer ${token}`} : {}, cache: 'no-store'})
    if (!res.ok) return {pages: null, why: `HTTP ${res.status}`}
    const body = (await res.json()) as {result?: unknown}
    const slugs = Array.isArray(body?.result) ? body.result : []
    const pages = new Set<string>()
    for (const slug of slugs) {
      if (typeof slug !== 'string' || !slug) continue
      pages.add(('/' + slug.replace(/^\/+/, '')).replace(/\/+$/, '').toLowerCase() || '/')
    }
    return {pages, why: null}
  } catch (error) {
    return {pages: null, why: error instanceof Error ? error.message : String(error)}
  }
}

/**
 * Everything `rewrites()` needs: read, guard, report, rewrite. The dataset is
 * read only when the file lists a path, so a client with no retired URLs (every
 * client today) builds exactly as before.
 */
export async function retiredRewritesAtBuild(
  csvPath: string,
  redirectSources: string[],
  fetchPages: typeof fetchPublishedPathsAtBuild = fetchPublishedPathsAtBuild,
  log: (line: string) => void = console.log,
): Promise<{source: string; destination: string}[]> {
  const read = loadRetired(csvPath)
  const {pages, why} = read.paths.length ? await fetchPages() : {pages: null, why: null}
  const guard = guardRetired(read.paths, pages, redirectSources)
  for (const line of formatRetiredReport(read, guard, why)) log(line)
  return retiredRewrites(guard.kept)
}
