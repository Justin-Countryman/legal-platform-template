/**
 * The redirect map: what the site serves, from which source, and what happens
 * when the two sources disagree.
 *
 * `BI/rules/technical-seo.md` → TECH-9 (redirects are build-time and come from
 * `CS/redirects.csv`, defaulting to 301) and TECH-10 (the Studio screen is live:
 * the site reads it, the build writes into it, a Studio entry wins a conflict,
 * and a disagreement is reported).
 *
 * WHY THIS FILE EXISTS, two reasons that arrived from opposite directions.
 *
 * ONE. `loadRedirects` had zero tests in either repository — `OUTSTANDING.md`
 * item 159, counted rather than estimated. Six ruled behaviours ran unasserted
 * in the one function that decides whether a migrated client's legacy URLs
 * resolve: the header skip, the both-side trailing-slash normalization, the
 * self-redirect drop, the `302` branch, the default-301 fall-through, and the
 * missing-file warning. It was the largest untested surface the 2026-08-08
 * technical-SEO inventory found. Those six have a `describe` block each below,
 * named so the mapping is legible without this comment.
 *
 * TWO. The Studio redirects singleton was inert. `studio/schemas/documents/
 * redirects.ts` claimed in its own header comment that the site builder read
 * its array; no file under `site/` referenced it, grepped 2026-08-08 and again
 * at this build. An operator could add a redirect, publish, and change nothing.
 *
 * THE ONE THING THESE TESTS CANNOT DO, stated so the coverage is not read as
 * larger than it is: they exercise the merge, not the server. Next's own
 * matching of a served rule against an incoming request is outside them, and so
 * is the 308-then-301 chain a slashed legacy URL actually receives. The
 * end-to-end half stays with `BI/runbooks/site-qa.md` §7 and its known limit —
 * sampled, human-run, and it only ever asks "not 404".
 */
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {basename, dirname, join} from 'node:path'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {CS_SITEMAP_CSV} from '@/next.config'
import {
  fetchStudioRedirectsAtBuild,
  formatRedirectReport,
  loadRedirects,
  normalizeStudioRedirects,
  parseRedirectsCsv,
  resolveRedirects,
  STUDIO_REDIRECTS_QUERY,
  stripTrailingSlash,
  type RedirectRule,
  type StudioRedirectItem,
} from '../redirects'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

let dir: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'redirects-'))
})

afterEach(() => {
  rmSync(dir, {recursive: true, force: true})
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

/** Write a CSV into the temp client tree and return the two paths `loadRedirects` takes. */
function withCsv(contents: string): {csv: string; sitemap: string} {
  const csv = join(dir, 'redirects.csv')
  writeFileSync(csv, contents, 'utf8')
  return {csv, sitemap: join(dir, 'CS-SITEMAP.csv')}
}

function withSitemap(): string {
  const sitemap = join(dir, 'CS-SITEMAP.csv')
  writeFileSync(sitemap, 'Current Address,New Site Address\n', 'utf8')
  return sitemap
}

const csvRule = (source: string, destination: string, statusCode = 301): RedirectRule => ({
  source,
  destination,
  statusCode,
})

const studioItem = (
  from: string,
  to: string,
  extra: Partial<StudioRedirectItem> = {},
): StudioRedirectItem => ({from, to, type: '301', ...extra})

const migrationItem = (from: string, to: string, extra: Partial<StudioRedirectItem> = {}) =>
  studioItem(from, to, {source: 'migration', ...extra})

const reachable = (items: StudioRedirectItem[]) => ({items, reachable: true})

// ===========================================================================
// ITEM 159, BEHAVIOUR 1 OF 6 — the header skip
// ===========================================================================

describe('item 159 / the header skip', () => {
  it('drops a first line beginning `old_path` rather than serving it as a rule', () => {
    const rules = parseRedirectsCsv('old_path,new_path,redirect_type\n/a/,/b/,301\n')
    expect(rules).toEqual([csvRule('/a', '/b')])
  })

  it('is case-insensitive, because the header has been written both ways', () => {
    expect(parseRedirectsCsv('OLD_PATH,NEW_PATH\n/a/,/b/\n')).toEqual([csvRule('/a', '/b')])
  })

  it('only skips the header on line ONE — a later `old_path` row is data', () => {
    // The guard is `i === 0`, so a legacy URL that genuinely starts with the
    // string cannot be eaten by it further down the file.
    const rules = parseRedirectsCsv('old_path,new_path\n/x/,/y/\nold_path-archive/,/z/\n')
    expect(rules).toContainEqual(csvRule('old_path-archive', '/z'))
  })

  it('keeps the first row when the file has no header at all', () => {
    expect(parseRedirectsCsv('/a/,/b/\n')).toEqual([csvRule('/a', '/b')])
  })
})

// ===========================================================================
// ITEM 159, BEHAVIOUR 2 OF 6 — trailing-slash normalization, BOTH sides
// ===========================================================================

describe('item 159 / trailing-slash normalization on both sides (TECH-1)', () => {
  it('strips the slash off the SOURCE, which is what makes a WordPress URL match', () => {
    // The whole reason the normalization exists: Next 308-strips the incoming
    // path before matching, so a rule keyed on `/about/attorney/` never fires.
    expect(parseRedirectsCsv('/about/attorney/,/attorneys/jane-doe\n')[0].source).toBe(
      '/about/attorney',
    )
  })

  it('strips the slash off the DESTINATION, avoiding a trailing 308 hop', () => {
    expect(parseRedirectsCsv('/old,/new/\n')[0].destination).toBe('/new')
  })

  it('collapses repeated trailing slashes', () => {
    expect(stripTrailingSlash('/a///')).toBe('/a')
  })

  it('leaves the root path alone — `/` is not a slash to strip', () => {
    expect(stripTrailingSlash('/')).toBe('/')
    expect(parseRedirectsCsv('/legacy-home/,/\n')[0].destination).toBe('/')
  })
})

// ===========================================================================
// ITEM 159, BEHAVIOUR 3 OF 6 — the self-redirect drop
// ===========================================================================

describe('item 159 / the self-redirect drop', () => {
  it('drops a row that collapses to source === destination after normalization', () => {
    // Next rejects a rule whose source equals its destination, so a `/foo/`→`/foo`
    // row is not merely useless — it fails the build.
    expect(parseRedirectsCsv('/foo/,/foo\n')).toEqual([])
  })

  it('drops it in the other direction too', () => {
    expect(parseRedirectsCsv('/foo,/foo/\n')).toEqual([])
  })

  it('keeps the rows either side of a dropped one', () => {
    const rules = parseRedirectsCsv('/a/,/b\n/foo/,/foo\n/c/,/d\n')
    expect(rules.map((r) => r.source)).toEqual(['/a', '/c'])
  })
})

// ===========================================================================
// ITEM 159, BEHAVIOUR 4 OF 6 — the 302 branch
// ===========================================================================

describe('item 159 / the 302 branch', () => {
  it('serves 302 when the third column says so', () => {
    expect(parseRedirectsCsv('/a/,/b/,302\n')[0].statusCode).toBe(302)
  })

  it('is exact — `302 ` with whitespace still reads as 302 because fields are trimmed', () => {
    expect(parseRedirectsCsv('/a/, /b/ , 302 \n')[0].statusCode).toBe(302)
  })
})

// ===========================================================================
// ITEM 159, BEHAVIOUR 5 OF 6 — the default-301 fall-through
// ===========================================================================

describe('item 159 / the default-301 fall-through', () => {
  it('defaults a blank type column to 301, the correct status for a migration', () => {
    expect(parseRedirectsCsv('/a/,/b/,\n')[0].statusCode).toBe(301)
  })

  it('defaults an ABSENT third column to 301', () => {
    expect(parseRedirectsCsv('/a/,/b/\n')[0].statusCode).toBe(301)
  })

  it.each(['301', '307', '308', 'permanent', 'NA', 'garbage'])(
    'reads %s as 301, because 302 is the only accepted alternative',
    (type) => {
      expect(parseRedirectsCsv(`/a/,/b/,${type}\n`)[0].statusCode).toBe(301)
    },
  )
})

// ===========================================================================
// ITEM 159, BEHAVIOUR 6 OF 6 — the missing-file warning
// ===========================================================================

describe('item 159 / the missing-file warning', () => {
  it('WARNS when redirects.csv is absent and CS-SITEMAP.csv exists (a migrated client)', () => {
    // The case that previously failed silently and 404'd every legacy URL.
    const sitemap = withSitemap()
    const warn = vi.fn()
    const rules = loadRedirects(join(dir, 'does-not-exist.csv'), sitemap, warn)
    expect(rules).toEqual([])
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0][0]).toContain('ZERO redirects')
  })

  it('stays SILENT when neither file exists — a brand-new firm has no legacy URLs', () => {
    const warn = vi.fn()
    expect(loadRedirects(join(dir, 'nope.csv'), join(dir, 'also-nope.csv'), warn)).toEqual([])
    expect(warn).not.toHaveBeenCalled()
  })

  it('does not warn when the file is present, however empty its contents', () => {
    withSitemap()
    const {csv, sitemap} = withCsv('old_path,new_path\n')
    const warn = vi.fn()
    expect(loadRedirects(csv, sitemap, warn)).toEqual([])
    expect(warn).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// The ordinary parsing the item deliberately did not count among the six
// ---------------------------------------------------------------------------

describe('parsing hygiene (comments, blanks, half-filled rows)', () => {
  it('skips `#` comments, blank lines and rows missing either side', () => {
    const rules = parseRedirectsCsv(
      ['old_path,new_path', '# a comment', '', '   ', '/a/,/b/', '/c/,', ',/d/'].join('\n'),
    )
    expect(rules).toEqual([csvRule('/a', '/b')])
  })

  it('reads a real file off disk end to end', () => {
    const {csv, sitemap} = withCsv('old_path,new_path,redirect_type\n/x/,/y/,302\n')
    expect(loadRedirects(csv, sitemap)).toEqual([csvRule('/x', '/y', 302)])
  })
})

// ===========================================================================
// TECH-10 HALF 1 — THE SITE SERVES THE STUDIO SCREEN'S ENTRIES
// ===========================================================================

describe('TECH-10 half 1 / the site serves Studio entries', () => {
  it('serves a Studio-authored entry that appears in no CSV', () => {
    // The failure this rule ends: before this build nothing under site/ read
    // the singleton, so this entry changed nothing and the screen said otherwise.
    const {rules} = resolveRedirects([], reachable([studioItem('/renamed/', '/new-home')]))
    expect(rules).toEqual([csvRule('/renamed', '/new-home')])
  })

  it('serves Studio entries ALONGSIDE the CSV, not instead of it', () => {
    const {rules} = resolveRedirects(
      [csvRule('/legacy', '/current')],
      reachable([studioItem('/renamed', '/new-home')]),
    )
    expect(rules).toHaveLength(2)
    expect(rules.map((r) => r.source).sort()).toEqual(['/legacy', '/renamed'])
  })

  it('applies TECH-1 to a Studio entry too — the operator types the slashed form', () => {
    // The schema's own placeholder says `e.g. /old-page/`, so slashed input is
    // the expected case rather than an edge one.
    const {rules} = resolveRedirects([], reachable([studioItem('/old-page/', '/new-page/')]))
    expect(rules).toEqual([csvRule('/old-page', '/new-page')])
  })

  it('honours the 302 option on a Studio entry and defaults the rest to 301', () => {
    const {rules} = resolveRedirects(
      [],
      reachable([studioItem('/a', '/b', {type: '302'}), studioItem('/c', '/d', {type: null})]),
    )
    expect(rules.find((r) => r.source === '/a')!.statusCode).toBe(302)
    expect(rules.find((r) => r.source === '/c')!.statusCode).toBe(301)
  })

  it('drops a half-filled Studio row rather than serving it', () => {
    // Both fields are `required()` at WARNING severity, so a row with one side
    // blank can be published. It must not reach `redirects()`.
    expect(
      normalizeStudioRedirects([
        {from: '/a', to: ''},
        {from: '', to: '/b'},
        {from: '/c', to: '/d'},
      ]),
    ).toEqual([{source: '/c', destination: '/d', statusCode: 301, origin: 'studio'}])
  })

  it('drops a Studio row that collapses to a self-redirect', () => {
    expect(normalizeStudioRedirects([{from: '/foo/', to: '/foo'}])).toEqual([])
  })

  it('marks an entry carrying the build marker `migration`, and anything else `studio`', () => {
    const normalized = normalizeStudioRedirects([
      migrationItem('/m', '/1'),
      studioItem('/s', '/2'),
      studioItem('/u', '/3', {source: 'something-else'}),
    ])
    expect(normalized.map((r) => r.origin)).toEqual(['migration', 'studio', 'studio'])
  })
})

describe('TECH-10 half 1 / the build-time read', () => {
  it('reads the PUBLISHED document by id, never a draft', () => {
    // `*[_type == "redirects"][0]` also matches `drafts.redirects`, and GROQ
    // orders by `_id` — where the draft sorts FIRST. A build with a
    // draft-capable read token would then serve an unpublished redirect map.
    expect(STUDIO_REDIRECTS_QUERY).toContain('_id == "redirects"')
    expect(STUDIO_REDIRECTS_QUERY).not.toContain('_type ==')
  })

  const env = () => {
    vi.stubEnv('NEXT_PUBLIC_SANITY_PROJECT_ID', 'proj')
    vi.stubEnv('NEXT_PUBLIC_SANITY_DATASET', 'production')
  }

  it('returns the singleton items and reports the document reachable', async () => {
    env()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ok: true, json: async () => ({result: [{from: '/a', to: '/b'}]})})),
    )
    await expect(fetchStudioRedirectsAtBuild()).resolves.toEqual({
      items: [{from: '/a', to: '/b'}],
      reachable: true,
    })
  })

  it('treats a singleton that does not exist yet as reachable and empty', async () => {
    // `null` is the honest answer for a dataset nobody has added a redirect to.
    // Calling that unreachable would suppress the drift check on every clean site.
    env()
    vi.stubGlobal('fetch', vi.fn(async () => ({ok: true, json: async () => ({result: null})})))
    await expect(fetchStudioRedirectsAtBuild()).resolves.toEqual({items: [], reachable: true})
  })

  it.each([
    ['no project env', false, undefined],
    ['a non-200', true, {ok: false, json: async () => ({})}],
    ['a malformed body', true, {ok: true, json: async () => ({result: {not: 'an array'}})}],
  ])('reports UNREACHABLE on %s', async (_label, hasEnv, response) => {
    if (hasEnv) env()
    vi.stubGlobal('fetch', vi.fn(async () => response))
    await expect(fetchStudioRedirectsAtBuild()).resolves.toEqual({items: [], reachable: false})
  })

  it('reports unreachable rather than throwing when the network fails', async () => {
    env()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('ECONNREFUSED')
      }),
    )
    await expect(fetchStudioRedirectsAtBuild()).resolves.toEqual({items: [], reachable: false})
  })

  it('FAILS OPEN: an unreadable Studio document never deletes the CSV redirects', async () => {
    // The opposite polarity to searchVisibility's fail-closed default, and
    // deliberately so — see the module header. Serving the migration set alone
    // is the safe degradation.
    const {rules} = resolveRedirects([csvRule('/legacy', '/current')], {
      items: [],
      reachable: false,
    })
    expect(rules).toEqual([csvRule('/legacy', '/current')])
  })
})

// ===========================================================================
// TECH-10 HALF 3 — PRECEDENCE
// ===========================================================================

describe('TECH-10 half 3 / a Studio entry beats a migration entry for the same source', () => {
  it('serves the Studio destination, not the CSV one', () => {
    const {rules} = resolveRedirects(
      [csvRule('/moved', '/old-target')],
      reachable([studioItem('/moved', '/new-target')]),
    )
    expect(rules).toEqual([csvRule('/moved', '/new-target')])
  })

  it('serves the Studio STATUS too, not only its destination', () => {
    const {rules} = resolveRedirects(
      [csvRule('/moved', '/target', 301)],
      reachable([studioItem('/moved', '/target', {type: '302'})]),
    )
    expect(rules).toEqual([csvRule('/moved', '/target', 302)])
  })

  it('beats a migration entry inside the Studio document as well as a CSV row', () => {
    const {rules} = resolveRedirects(
      [csvRule('/moved', '/from-csv')],
      reachable([migrationItem('/moved', '/from-csv'), studioItem('/moved', '/authored')]),
    )
    expect(rules).toEqual([csvRule('/moved', '/authored')])
  })

  it('matches on the NORMALIZED source, so a slashed Studio entry still wins', () => {
    // Without normalization before the match, `/moved/` and `/moved` are two
    // sources and both are served — Next then takes whichever it sees first,
    // which is precedence by accident.
    const {rules} = resolveRedirects(
      [csvRule('/moved', '/old-target')],
      reachable([studioItem('/moved/', '/new-target')]),
    )
    expect(rules).toEqual([csvRule('/moved', '/new-target')])
  })

  it('is decided by origin, not by array order', () => {
    // Feeding the same inputs in the other order must not change the winner.
    const studioFirst = resolveRedirects(
      [csvRule('/p', '/csv')],
      reachable([studioItem('/p', '/studio'), migrationItem('/p', '/mig')]),
    )
    const migrationFirst = resolveRedirects(
      [csvRule('/p', '/csv')],
      reachable([migrationItem('/p', '/mig'), studioItem('/p', '/studio')]),
    )
    expect(studioFirst.rules).toEqual([csvRule('/p', '/studio')])
    expect(migrationFirst.rules).toEqual([csvRule('/p', '/studio')])
  })

  it('serves exactly one rule per source — Next must not receive two', () => {
    const {rules} = resolveRedirects(
      [csvRule('/p', '/csv')],
      reachable([studioItem('/p', '/studio'), migrationItem('/p', '/mig')]),
    )
    expect(rules).toHaveLength(1)
  })

  it('a migration entry beats a CSV row when no Studio entry claims the source', () => {
    const {rules} = resolveRedirects(
      [csvRule('/p', '/stale')],
      reachable([migrationItem('/p', '/fresh')]),
    )
    expect(rules).toEqual([csvRule('/p', '/fresh')])
  })

  it('leaves every unclaimed CSV row untouched', () => {
    const {rules} = resolveRedirects(
      [csvRule('/a', '/1'), csvRule('/b', '/2'), csvRule('/c', '/3')],
      reachable([studioItem('/b', '/override')]),
    )
    expect(rules.sort((x, y) => x.source.localeCompare(y.source))).toEqual([
      csvRule('/a', '/1'),
      csvRule('/b', '/override'),
      csvRule('/c', '/3'),
    ])
  })
})

// ===========================================================================
// TECH-10 HALF 4 — THE GUARD. THE TWO SOURCES CANNOT SILENTLY DISAGREE.
// ===========================================================================

describe('TECH-10 half 4 / conflicts are reported, not resolved in silence', () => {
  it('reports a Studio entry overriding a CSV row to a different destination', () => {
    const {report} = resolveRedirects(
      [csvRule('/moved', '/old-target')],
      reachable([studioItem('/moved', '/new-target')]),
    )
    expect(report.conflicts).toEqual([
      {
        source: '/moved',
        winner: {source: '/moved', destination: '/new-target', statusCode: 301, origin: 'studio'},
        loser: {source: '/moved', destination: '/old-target', statusCode: 301, origin: 'csv'},
      },
    ])
    expect(formatRedirectReport(report).join('\n')).toContain('CONFLICT /moved')
  })

  it('reports a status-only disagreement, where both sides name the same target', () => {
    // The quietest possible conflict: the URL lands in the right place and the
    // permanence is wrong, which nothing downstream would ever notice.
    const {report} = resolveRedirects(
      [csvRule('/p', '/t', 301)],
      reachable([studioItem('/p', '/t', {type: '302'})]),
    )
    expect(report.conflicts).toHaveLength(1)
  })

  it('does NOT report a conflict when the two sources agree exactly', () => {
    // Agreement is the normal case after a build writes the CSV into Studio.
    // Reporting it would bury the real conflicts in noise.
    const {report} = resolveRedirects(
      [csvRule('/p', '/t')],
      reachable([migrationItem('/p', '/t')]),
    )
    expect(report.conflicts).toEqual([])
    expect(report.drift).toEqual([])
    expect(formatRedirectReport(report).join('\n')).toContain('the two sources agree')
  })

  it('reports two entries of the SAME origin claiming one source as a duplicate', () => {
    const {rules, report} = resolveRedirects(
      [],
      reachable([studioItem('/p', '/first'), studioItem('/p', '/second')]),
    )
    expect(rules).toEqual([csvRule('/p', '/first')])
    expect(report.duplicates).toEqual([{source: '/p', origin: 'studio'}])
    expect(formatRedirectReport(report).join('\n')).toContain('DUPLICATE /p')
  })
})

describe('TECH-10 half 4 / drift between the CSV and the Studio migration set', () => {
  it('reports a CSV row the build never wrote into Studio', () => {
    // The operator is looking at an incomplete redirect map and cannot tell.
    const {report} = resolveRedirects([csvRule('/only-in-csv', '/t')], reachable([]))
    expect(report.drift).toEqual([
      {
        source: '/only-in-csv',
        kind: 'csv-row-missing-from-studio',
        csv: csvRule('/only-in-csv', '/t'),
      },
    ])
    expect(formatRedirectReport(report).join('\n')).toContain('DRIFT /only-in-csv')
  })

  it('reports a Studio migration entry with no row left in the CSV', () => {
    const {report} = resolveRedirects([], reachable([migrationItem('/only-in-studio', '/t')]))
    expect(report.drift.map((d) => d.kind)).toEqual(['studio-migration-row-missing-from-csv'])
  })

  it('reports a migration entry whose destination no longer matches its CSV row', () => {
    const {report} = resolveRedirects(
      [csvRule('/p', '/csv-target')],
      reachable([migrationItem('/p', '/studio-target')]),
    )
    expect(report.drift).toEqual([
      {
        source: '/p',
        kind: 'migration-row-disagrees-with-csv',
        csv: csvRule('/p', '/csv-target'),
        studio: {
          source: '/p',
          destination: '/studio-target',
          statusCode: 301,
          origin: 'migration',
        },
      },
    ])
  })

  it('does not count a Studio-AUTHORED entry as drift — that is the ruled workflow', () => {
    // Half 3 exists precisely so an operator can override without editing the
    // CSV. Reporting that as drift would make the guard fire on correct use.
    const {report} = resolveRedirects(
      [csvRule('/p', '/csv-target')],
      reachable([migrationItem('/p', '/csv-target'), studioItem('/p', '/authored')]),
    )
    expect(report.drift).toEqual([])
    expect(report.conflicts).toHaveLength(1)
  })

  it('SUPPRESSES the drift check when Studio was unreadable, and says so out loud', () => {
    // The failure mode this guards: an unreachable dataset yields an empty
    // array, every CSV row then looks "missing from Studio", and the noise
    // trains the reader to ignore the report. Reporting "no drift" off the same
    // empty array is worse — that is silent agreement, which is the exact shape
    // TECH-10 exists to end.
    const {report} = resolveRedirects([csvRule('/a', '/b')], {items: [], reachable: false})
    expect(report.drift).toEqual([])
    const printed = formatRedirectReport(report).join('\n')
    expect(printed).toContain('DID NOT RUN')
    expect(printed).not.toContain('the two sources agree')
  })
})

describe('TECH-10 half 4 / the report speaks on every build', () => {
  it('prints the per-source counts even when nothing is wrong', () => {
    // A guard that only speaks on failure is indistinguishable from a guard
    // that is not running.
    const {report} = resolveRedirects(
      [csvRule('/a', '/1')],
      reachable([migrationItem('/a', '/1'), studioItem('/b', '/2')]),
    )
    expect(report.counts).toEqual({csv: 1, migration: 1, studio: 1, served: 2})
    expect(formatRedirectReport(report)[0]).toContain('2 served')
  })

  it('prefixes every line `[redirects]` so one grep finds the whole story', () => {
    const {report} = resolveRedirects(
      [csvRule('/a', '/1')],
      reachable([studioItem('/a', '/2'), studioItem('/a', '/3')]),
    )
    const lines = formatRedirectReport(report)
    expect(lines.length).toBeGreaterThan(1)
    expect(lines.every((l) => l.startsWith('[redirects]'))).toBe(true)
  })
})

// ===========================================================================
// THE WIRING. Everything above tests the merge; this tests that anything CALLS it.
// ===========================================================================

describe('next.config.ts actually serves the merged set', () => {
  // Without this block every test above stays green while `redirects()` returns
  // the CSV alone, or returns nothing at all — which is precisely the state the
  // Studio screen was in for months. `specification is not a mechanism`, and a
  // tested pure function that no caller reaches is a specification.
  it('returns Studio entries from the config Next actually loads', async () => {
    vi.stubEnv('NEXT_PUBLIC_SANITY_PROJECT_ID', 'proj')
    vi.stubEnv('NEXT_PUBLIC_SANITY_DATASET', 'production')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({result: [{from: '/studio-only/', to: '/somewhere'}]}),
      })),
    )
    vi.spyOn(console, 'log').mockImplementation(() => {})

    const config = (await import('@/next.config')).default
    const rules = await config.redirects!()

    // The template ships no `CS/redirects.csv`, so the Studio entry is the
    // whole served set — and its presence is only possible if the config reads
    // the singleton.
    expect(rules).toEqual([{source: '/studio-only', destination: '/somewhere', statusCode: 301}])
  })

  it('prints the disagreement report into the build log', async () => {
    // Half 4's delivery mechanism. The report existing as a return value proves
    // nothing about anyone seeing it.
    vi.stubEnv('NEXT_PUBLIC_SANITY_PROJECT_ID', 'proj')
    vi.stubEnv('NEXT_PUBLIC_SANITY_DATASET', 'production')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ok: true, json: async () => ({result: []})})),
    )
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})

    const config = (await import('@/next.config')).default
    await config.redirects!()

    const printed = log.mock.calls.map((c) => String(c[0])).filter((l) => l.startsWith('[redirects]'))
    expect(printed.length).toBeGreaterThan(0)
  })
})

// ===========================================================================
// THE FILENAME. `OUTSTANDING.md` item 203.
// ===========================================================================

describe('item 203 / the sitemap filename the config hands loadRedirects', () => {
  // The migrated-client warning is conditional on `existsSync(sitemapPath)`, so
  // the NAME in that path is what decides whether the guard ever speaks. It
  // shipped for seven weeks as `CS-Sitemap.csv` — a spelling no writer or
  // reader in the pipeline uses. macOS is case-insensitive by default, so the
  // warning fired on the machine the template is developed on; the Linux
  // container a client actually builds in is not, so it did not fire where it
  // mattered. The failure was the exact one the warning exists to prevent — a
  // migrated client shipping zero redirects — and the guard against it was
  // silent.
  //
  // ASSERTED AS A STRING, NEVER WITH `existsSync`. A filesystem probe passes on
  // macOS under either spelling, which is precisely the instrument that hid
  // this for a day; comparing the name is case-sensitive on every host, so this
  // file reds identically in the container and on the laptop.
  it('is the canonical CS-SITEMAP.csv, spelled exactly', () => {
    expect(basename(CS_SITEMAP_CSV)).toBe('CS-SITEMAP.csv')
  })

  it('resolves inside the client tree CS/ directory', () => {
    expect(basename(dirname(CS_SITEMAP_CSV))).toBe('CS')
  })

  it('names that same file in the warning an operator reads', () => {
    // The path and the message are two places one filename is written, and the
    // item found them wrong together. Deriving the expectation from the
    // constant is what keeps them from drifting apart again.
    const warn = vi.fn()
    loadRedirects(join(dir, 'does-not-exist.csv'), withSitemap(), warn)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0][0]).toContain(basename(CS_SITEMAP_CSV))
  })
})

// ---------------------------------------------------------------------------
// End to end, on the shapes a real migrated client actually carries
// ---------------------------------------------------------------------------

describe('a migrated client, all three sources at once', () => {
  it('serves the union, Studio wins its one override, and the drift is named', () => {
    const {csv, sitemap} = withCsv(
      [
        'old_path,new_path,redirect_type',
        '# seeded by Site-Prep generate_redirects',
        '/about/our-firm/,/about/,301',
        '/attorney/jane-doe/,/attorneys/jane-doe/',
        '/promo/,/contact/,302',
        '/blog/,/blog',
        '',
      ].join('\n'),
    )
    const csvRules = loadRedirects(csv, sitemap)
    // `/blog/,/blog` collapsed to a self-redirect and never reaches the merge.
    expect(csvRules.map((r) => r.source)).toEqual([
      '/about/our-firm',
      '/attorney/jane-doe',
      '/promo',
    ])

    const {rules, report} = resolveRedirects(
      csvRules,
      reachable([
        migrationItem('/about/our-firm', '/about'),
        migrationItem('/attorney/jane-doe', '/attorneys/jane-doe'),
        // The operator retargeted the promo after the build wrote it.
        studioItem('/promo/', '/contact/thanks'),
        // And added one the CSV never knew about.
        studioItem('/seasonal-offer', '/contact'),
      ]),
    )

    const bySource = Object.fromEntries(rules.map((r) => [r.source, r]))
    expect(Object.keys(bySource).sort()).toEqual([
      '/about/our-firm',
      '/attorney/jane-doe',
      '/promo',
      '/seasonal-offer',
    ])
    expect(bySource['/promo'].destination).toBe('/contact/thanks')
    expect(bySource['/attorney/jane-doe'].statusCode).toBe(301)

    // The promo override is a conflict; the missing migration twin is drift.
    expect(report.conflicts.map((c) => c.source)).toEqual(['/promo'])
    expect(report.drift.map((d) => d.source)).toEqual(['/promo'])
    expect(report.drift[0].kind).toBe('csv-row-missing-from-studio')
  })
})
