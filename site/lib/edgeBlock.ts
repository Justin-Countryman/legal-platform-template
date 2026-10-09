import {existsSync, readFileSync} from 'node:fs'

// ─── Scanner addresses denied at Vercel's edge ────────────────────────────────
// Monorepo `[R-660]`, design `BI/_workstreams/WS-V1-EDGE-BLOCK-DESIGN.md` as challenged.
//
// WHAT IT STOPS. Every interior page is the catch-all (`app/(site)/[...slug]`), an ISR route with an empty
// `generateStaticParams`, so an unknown address renders the not-found page and Vercel stores it, one entry per unique
// address. Scanners send thousands of those a month to every public site (`/wp-login.php`, `/.env`, `/.git/config`,
// `/wp-admin/...`): each was a function run, Sanity calls and a stored page. The one `routes` entry in `vercel.json`
// denies them at the edge (`mitigate: {action: "deny"}`, a 403 before anything of ours runs; Vercel does not bill
// mitigated traffic as CDN requests or transfer). JSON holds no comments, so the reasons live here.
//
// WHAT IT NEVER TOUCHES. `/.well-known/*`; `/wp-content/uploads/*` but a `.php` file there (an old WordPress site's PDFs
// and images, which a migration's map may 301); every other `.php` address (`/index.php`, `/contact.php`: an old PHP
// site's pages); `/robots.txt`, `/sitemap.xml`, `/_next/*`, `/api/*`; every slug. `pma`, `phpmyadmin`, `cgi-bin` and
// `vendor/phpunit` are denied only at the root, the WordPress and dot-file families under any prefix (`/blog/wp-includes`).
//
// HOW VERCEL READS IT, which this module copies so the guard agrees with the edge: a `src` without `^` gets one; the match
// ignores case ("the `src` property is case-insensitive", vercel.json docs) and the query string; an inline `(?i)` is not
// JavaScript and fails the deploy (`checkRegexSyntax` compiles `src` with `new RegExp`).
//
// THE GUARD. The edge runs before Next's redirects, so a deny that matched a legacy address in `CS/redirects.csv`, or a
// retired one in `CS/retired.csv`, would swallow a redirect or a 410 that carries search value. `next.config.ts` checks
// both lists against every deny route on every build, prints what it checked, and FAILS the build naming each colliding
// row. Across the five client folders' 1,682 redirect, retired and sitemap paths none collides (2026-10-09), so the
// failure is a backstop; the remedy is a narrower pattern here, never a dropped redirect row.

export type DenyPattern = {src: string; re: RegExp}

/** Every `mitigate` route in a parsed `vercel.json`, compiled as Vercel matches it. */
export function edgeDenyPatterns(config: unknown): DenyPattern[] {
  const routes = (config as {routes?: unknown} | null)?.routes
  if (!Array.isArray(routes)) return []
  return routes
    .filter((r): r is {src: string; mitigate: unknown} => !!r && typeof r === 'object' && 'mitigate' in r && typeof r.src === 'string')
    .map(({src}) => ({src, re: new RegExp(src.startsWith('^') ? src : `^${src}`, 'i')}))
}

/** True when the edge would deny this address (its query string ignored). */
export function edgeDenies(address: string, patterns: DenyPattern[]): boolean {
  const path = address.split('?')[0]
  return patterns.some(({re}) => re.test(path))
}

export type EdgeList = {label: string; paths: string[]}

/** The rows of each list the edge would deny, as `label: path`. */
export function edgeCollisions(lists: EdgeList[], patterns: DenyPattern[]): string[] {
  return lists.flatMap(({label, paths}) => paths.filter((p) => edgeDenies(p, patterns)).map((p) => `${label}: ${p}`))
}

/**
 * Read `vercel.json`, check every list against its deny routes, print one line saying what was checked, and throw naming
 * every collision. A missing `vercel.json` denies nothing and says so.
 */
export function assertNoEdgeCollisions(vercelJsonPath: string, lists: EdgeList[], log: (line: string) => void = console.log): void {
  if (!existsSync(vercelJsonPath)) {
    log('[edge-block] no vercel.json; nothing is denied at the edge')
    return
  }
  const patterns = edgeDenyPatterns(JSON.parse(readFileSync(vercelJsonPath, 'utf8')))
  const hits = edgeCollisions(lists, patterns)
  const checked = lists.map(({label, paths}) => `${paths.length} in ${label}`).join(', ')
  if (hits.length) {
    throw new Error(
      `[edge-block] ${hits.length} address(es) the site must serve would be denied at Vercel's edge before any redirect ` +
        `runs. Narrow the deny route in site/vercel.json (lib/edgeBlock.ts says why each family is there); never drop the row.\n` +
        hits.map((h) => `  ${h}`).join('\n'),
    )
  }
  log(`[edge-block] ${patterns.length} deny route(s); checked ${checked}; no collision`)
}
