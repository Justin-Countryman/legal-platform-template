/**
 * The redirect map: what the site serves, and what the build says about the
 * rows it could not serve as written.
 *
 * `BI/rules/technical-seo.md` → TECH-9. ONE SOURCE, ruled 2026-08-17:
 * `CS/redirects.csv` is the only store of redirects, the app's Redirects screen
 * is where an operator edits it, and the build resolves it. The Studio
 * redirects singleton and everything that reconciled the site against it were
 * deleted in the same change; TECH-10, which was the rule about that second
 * store, is deleted with it.
 *
 * WHY THIS FILE EXISTS.
 *
 * `loadRedirects` had zero tests in either repository — `OUTSTANDING.md` item
 * 159, counted rather than estimated. Six ruled behaviours ran unasserted in
 * the one function that decides whether a migrated client's legacy URLs
 * resolve: the header skip, the both-side trailing-slash normalization, the
 * self-redirect drop, the `302` branch, the default-301 fall-through, and the
 * missing-file warning. Those six have a `describe` block each below, named so
 * the mapping is legible without this comment.
 *
 * WHAT THE ONE-STORE RULING ADDED, and it is the second half of this file.
 * Flattening, duplicate handling and loop handling used to be split: Site Prep
 * flattened on the way to the CSV, and the build re-merged two stores without
 * flattening anything. With one store the build is where a chain is resolved,
 * so the three cases the ruling names are asserted here — a chain is flattened,
 * a duplicate source keeps the first row, and a loop emits NO rule and is
 * reported. A loop that emitted a rule would bounce a visitor between two
 * pages; a loop that was dropped in silence would 404 a URL with nothing said.
 *
 * THE ONE THING THESE TESTS CANNOT DO, stated so the coverage is not read as
 * larger than it is: they exercise the resolution, not the server. Next's own
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
  formatRedirectReport,
  loadRedirects,
  MAX_REDIRECT_HOPS,
  normalizeStatusCode,
  parseRedirectsCsv,
  resolveRedirects,
  stripTrailingSlash,
  type RedirectRule,
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

/** Every served rule, keyed by source, for assertions that do not care about order. */
const bySource = (rules: RedirectRule[]) => Object.fromEntries(rules.map((r) => [r.source, r]))

// ===========================================================================
// ITEM 159, BEHAVIOUR 1 OF 6 — the header skip
// ===========================================================================

describe('item 159 / the header skip', () => {
  it('drops a leading `old_path` header row and keeps the rules under it', () => {
    const rules = parseRedirectsCsv('old_path,new_path,redirect_type\n/a/,/b/,301\n')
    expect(rules).toEqual([csvRule('/a', '/b')])
  })

  it('is case-insensitive about the header, as a hand-edited file may be', () => {
    expect(parseRedirectsCsv('Old_Path,New_Path\n/a/,/b/\n')).toEqual([csvRule('/a', '/b')])
  })

  it('only skips it on line one, so a later row starting `old_path` still parses', () => {
    // A path may legitimately begin with the header word. Skipping by content
    // anywhere in the file would delete a real rule.
    const rules = parseRedirectsCsv('old_path,new_path\n/old_path-guide/,/guide/\n')
    expect(rules).toEqual([csvRule('/old_path-guide', '/guide')])
  })
})

// ===========================================================================
// ITEM 159, BEHAVIOUR 2 OF 6 — trailing-slash normalization, both sides
// ===========================================================================

describe('item 159 / trailing-slash normalization on both sides (TECH-1)', () => {
  it('strips the slash off the source, or the rule never matches', () => {
    expect(stripTrailingSlash('/about/attorney/')).toBe('/about/attorney')
  })

  it('strips the slash off the destination, avoiding a second hop', () => {
    expect(parseRedirectsCsv('old_path,new_path\n/a/,/b/\n')[0].destination).toBe('/b')
  })

  it('leaves the root alone', () => {
    expect(stripTrailingSlash('/')).toBe('/')
  })

  it('collapses repeated trailing slashes', () => {
    expect(stripTrailingSlash('/a///')).toBe('/a')
  })
})

// ===========================================================================
// ITEM 159, BEHAVIOUR 3 OF 6 — the self-redirect drop
// ===========================================================================

describe('item 159 / the self-redirect drop', () => {
  it('drops a row that collapses to a self-redirect under normalization', () => {
    // `/blog/,/blog` is one row in every migration CSV and Next rejects the
    // rule outright, failing the whole build.
    expect(parseRedirectsCsv('old_path,new_path\n/blog/,/blog\n')).toEqual([])
  })

  it('drops a row that was a self-redirect as written', () => {
    expect(parseRedirectsCsv('old_path,new_path\n/a,/a\n')).toEqual([])
  })
})

// ===========================================================================
// ITEM 159, BEHAVIOUR 4 OF 6 — the 302 branch
// ===========================================================================

describe('item 159 / the 302 branch', () => {
  it('honours an explicit 302', () => {
    expect(parseRedirectsCsv('old_path,new_path,redirect_type\n/a/,/b/,302\n')[0].statusCode).toBe(
      302,
    )
  })

  it('is the only value that is not a 301', () => {
    expect(normalizeStatusCode('302')).toBe(302)
    expect(normalizeStatusCode('301')).toBe(301)
    expect(normalizeStatusCode('307')).toBe(301)
    expect(normalizeStatusCode('temporary')).toBe(301)
  })
})

// ===========================================================================
// ITEM 159, BEHAVIOUR 5 OF 6 — the default-301 fall-through
// ===========================================================================

describe('item 159 / the default-301 fall-through', () => {
  it('defaults a blank type to 301', () => {
    expect(parseRedirectsCsv('old_path,new_path,redirect_type\n/a/,/b/,\n')[0].statusCode).toBe(301)
  })

  it('defaults a missing third column to 301', () => {
    expect(parseRedirectsCsv('old_path,new_path\n/a/,/b/\n')[0].statusCode).toBe(301)
  })

  it('defaults an unrecognised type to 301 rather than passing it through', () => {
    expect(parseRedirectsCsv('old_path,new_path,redirect_type\n/a/,/b/,gone\n')[0].statusCode).toBe(
      301,
    )
  })
})

// ===========================================================================
// ITEM 159, BEHAVIOUR 6 OF 6 — the missing-file warning
// ===========================================================================

describe('item 159 / the missing-file warning', () => {
  it('warns when the CSV is absent and a sitemap says this client was migrated', () => {
    const warn = vi.fn()
    const rules = loadRedirects(join(dir, 'nope.csv'), withSitemap(), warn)
    expect(rules).toEqual([])
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0][0]).toContain('ZERO redirects')
  })

  it('stays silent when the CSV is absent and no sitemap exists, which is a new firm', () => {
    const warn = vi.fn()
    expect(loadRedirects(join(dir, 'nope.csv'), join(dir, 'no-sitemap.csv'), warn)).toEqual([])
    expect(warn).not.toHaveBeenCalled()
  })

  it('stays silent when the CSV is present', () => {
    const warn = vi.fn()
    const {csv} = withCsv('old_path,new_path\n/a/,/b/\n')
    withSitemap()
    expect(loadRedirects(csv, join(dir, 'CS-SITEMAP.csv'), warn)).toEqual([csvRule('/a', '/b')])
    expect(warn).not.toHaveBeenCalled()
  })
})

// ===========================================================================
// PARSING HYGIENE
// ===========================================================================

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
// TECH-9 / ONE STORE — the file is read and nothing else is
// ===========================================================================

describe('TECH-9 / CS/redirects.csv is the only source', () => {
  // The second store is gone. This block is what would go red if a Sanity read
  // were ever reintroduced into this module, because the module would then need
  // a network stub to answer at all.
  it('resolves with no network, no environment and no second argument', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        throw new Error('the build must not fetch anything to resolve redirects')
      }),
    )
    const {rules} = resolveRedirects([csvRule('/a', '/b')])
    expect(rules).toEqual([csvRule('/a', '/b')])
  })

  it('exports nothing that reads Sanity', async () => {
    // Named rather than grepped, so a reintroduction under a new name still
    // has to pass a human. `STUDIO_REDIRECTS_QUERY`, `fetchStudioRedirectsAtBuild`,
    // `normalizeStudioRedirects` and `MIGRATION_SOURCE_MARKER` were the four.
    const mod = await import('../redirects')
    expect(Object.keys(mod).sort()).toEqual([
      'MAX_REDIRECT_HOPS',
      'formatRedirectReport',
      'loadRedirects',
      'normalizeStatusCode',
      'parseRedirectsCsv',
      'resolveRedirects',
      'stripTrailingSlash',
    ])
  })
})

// ===========================================================================
// TECH-9 / CHAIN FLATTENING
// ===========================================================================

describe('TECH-9 / a multi-hop chain is flattened at build', () => {
  it('serves /a to /c when the file says /a to /b and /b to /c', () => {
    const {rules} = resolveRedirects([csvRule('/a', '/b'), csvRule('/b', '/c')])
    expect(bySource(rules)['/a'].destination).toBe('/c')
  })

  it('keeps the row that made the chain, resolved to the same end', () => {
    // `/b` is a legacy URL in its own right. Flattening `/a` must not delete it.
    const {rules} = resolveRedirects([csvRule('/a', '/b'), csvRule('/b', '/c')])
    expect(bySource(rules)['/b'].destination).toBe('/c')
  })

  it('keeps the ORIGINATING hop status code, which is what the visitor gets', () => {
    const {rules} = resolveRedirects([csvRule('/a', '/b', 302), csvRule('/b', '/c', 301)])
    expect(bySource(rules)['/a'].statusCode).toBe(302)
  })

  it('walks a chain several hops deep', () => {
    const {rules} = resolveRedirects([
      csvRule('/a', '/b'),
      csvRule('/b', '/c'),
      csvRule('/c', '/d'),
      csvRule('/d', '/e'),
    ])
    expect(bySource(rules)['/a'].destination).toBe('/e')
  })

  it('reports every flattening, naming the row as written and the target served', () => {
    const {report} = resolveRedirects([csvRule('/a', '/b'), csvRule('/b', '/c')])
    expect(report.flattened).toEqual([{source: '/a', via: '/b', destination: '/c', hops: 2}])
  })

  it('reports nothing when no chain exists', () => {
    const {report} = resolveRedirects([csvRule('/a', '/b'), csvRule('/c', '/d')])
    expect(report.flattened).toEqual([])
  })
})

// ===========================================================================
// TECH-9 / DUPLICATE SOURCES
// ===========================================================================

describe('TECH-9 / two rows claiming one source', () => {
  it('serves the first row and drops the second', () => {
    const {rules} = resolveRedirects([csvRule('/a', '/first'), csvRule('/a', '/second')])
    expect(rules).toEqual([csvRule('/a', '/first')])
  })

  it('reports the dropped row rather than dropping it in silence', () => {
    const {report} = resolveRedirects([csvRule('/a', '/first'), csvRule('/a', '/second')])
    expect(report.duplicates).toEqual([
      {source: '/a', kept: csvRule('/a', '/first'), dropped: csvRule('/a', '/second')},
    ])
  })

  it('reports a third row for the same source too', () => {
    const {report} = resolveRedirects([
      csvRule('/a', '/first'),
      csvRule('/a', '/second'),
      csvRule('/a', '/third'),
    ])
    expect(report.duplicates.map((d) => d.dropped.destination)).toEqual(['/second', '/third'])
  })

  it('does not report two rows that merely share a destination', () => {
    const {report} = resolveRedirects([csvRule('/a', '/z'), csvRule('/b', '/z')])
    expect(report.duplicates).toEqual([])
  })
})

// ===========================================================================
// TECH-9 / LOOPS
// ===========================================================================

describe('TECH-9 / a loop emits no rule and is reported', () => {
  it('emits NO rule for either leg of /a to /b to /a', () => {
    // The alternative is a visitor bouncing between two pages until the browser
    // gives up, which is worse than the 404 this produces.
    const {rules} = resolveRedirects([csvRule('/a', '/b'), csvRule('/b', '/a')])
    expect(rules).toEqual([])
  })

  it('names the cycle it found, in order, closing on the repeat', () => {
    const {report} = resolveRedirects([csvRule('/a', '/b'), csvRule('/b', '/a')])
    expect(report.loops).toEqual([
      {source: '/a', chain: ['/a', '/b', '/a'], reason: 'cycle'},
      {source: '/b', chain: ['/b', '/a', '/b'], reason: 'cycle'},
    ])
  })

  it('drops a row that merely FEEDS a loop, because it cannot resolve either', () => {
    const {rules, report} = resolveRedirects([
      csvRule('/x', '/a'),
      csvRule('/a', '/b'),
      csvRule('/b', '/a'),
    ])
    expect(rules).toEqual([])
    expect(report.loops.map((l) => l.source).sort()).toEqual(['/a', '/b', '/x'])
  })

  it('leaves every rule outside the loop serving', () => {
    const {rules} = resolveRedirects([
      csvRule('/a', '/b'),
      csvRule('/b', '/a'),
      csvRule('/good', '/target'),
    ])
    expect(rules).toEqual([csvRule('/good', '/target')])
  })

  it('caps at ten hops and refuses a chain longer than that', () => {
    // Without a cap a pathological file hangs the build rather than failing it.
    const long = Array.from({length: MAX_REDIRECT_HOPS + 2}, (_, i) =>
      csvRule(`/h${i}`, `/h${i + 1}`),
    )
    const {rules, report} = resolveRedirects(long)
    expect(bySource(rules)['/h0']).toBeUndefined()
    expect(report.loops.find((l) => l.source === '/h0')?.reason).toBe('hop-cap')
  })

  it('is ten, matching generate_redirects in the Site Prep Tool', () => {
    expect(MAX_REDIRECT_HOPS).toBe(10)
  })
})

// ===========================================================================
// THE REPORT AN OPERATOR READS
// ===========================================================================

describe('the build log report', () => {
  it('speaks on every build, including a clean one', () => {
    // A guard that only speaks on failure is indistinguishable from a guard
    // that is not running.
    const {report} = resolveRedirects([csvRule('/a', '/b')])
    const lines = formatRedirectReport(report)
    expect(lines.length).toBeGreaterThan(0)
    expect(lines.every((l) => l.startsWith('[redirects]'))).toBe(true)
  })

  it('counts the rows read and the rules served', () => {
    const {report} = resolveRedirects([csvRule('/a', '/b'), csvRule('/a', '/c')])
    expect(report.counts).toEqual({rows: 2, served: 1})
  })

  it('names CS/redirects.csv as the source, since it is now the only one', () => {
    const {report} = resolveRedirects([csvRule('/a', '/b')])
    expect(formatRedirectReport(report)[0]).toContain('CS/redirects.csv')
  })

  it('says so plainly when there is nothing to report', () => {
    const {report} = resolveRedirects([csvRule('/a', '/b')])
    expect(formatRedirectReport(report).join('\n')).toContain('no duplicate, no chain, no loop')
  })

  it('prints a LOOP line naming the path that now 404s', () => {
    const {report} = resolveRedirects([csvRule('/a', '/b'), csvRule('/b', '/a')])
    const loop = formatRedirectReport(report).find((l) => l.includes('LOOP'))
    expect(loop).toContain('/a -> /b -> /a')
    expect(loop).toContain('404')
  })

  it('prints a FLATTENED line naming both the written target and the served one', () => {
    const {report} = resolveRedirects([csvRule('/a', '/b'), csvRule('/b', '/c')])
    const line = formatRedirectReport(report).find((l) => l.includes('FLATTENED'))
    expect(line).toContain('/b')
    expect(line).toContain('/c')
  })

  it('prints a DUPLICATE line naming the row that was ignored', () => {
    const {report} = resolveRedirects([csvRule('/a', '/first'), csvRule('/a', '/second')])
    const line = formatRedirectReport(report).find((l) => l.includes('DUPLICATE'))
    expect(line).toContain('/second')
  })
})

// ===========================================================================
// next.config.ts ACTUALLY SERVES IT
// ===========================================================================

describe('next.config.ts serves the resolved set', () => {
  // Without this block every test above stays green while `redirects()` returns
  // nothing at all — which is precisely the state the Studio screen was in for
  // months. A specification is not a mechanism, and a tested pure function that
  // no caller reaches is a specification.
  it('returns the rules the CSV resolves to, from the config Next actually loads', async () => {
    const config = (await import('@/next.config')).default
    const rules = await config.redirects!()
    // The template ships no `CS/redirects.csv`, so the served set is empty and
    // the assertion that matters is that the call completes without a dataset.
    expect(Array.isArray(rules)).toBe(true)
  })

  it('resolves redirects without reading Sanity at all', async () => {
    const fetchSpy = vi.fn(() => {
      throw new Error('redirects() must not fetch')
    })
    vi.stubGlobal('fetch', fetchSpy)
    vi.spyOn(console, 'log').mockImplementation(() => {})

    const config = (await import('@/next.config')).default
    await config.redirects!()

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('prints the report into the build log', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const config = (await import('@/next.config')).default
    await config.redirects!()
    const printed = log.mock.calls
      .map((c) => String(c[0]))
      .filter((l) => l.startsWith('[redirects]'))
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

describe('a migrated client, one file, every case at once', () => {
  it('serves the clean rows, flattens the chain, keeps the first duplicate and drops the loop', () => {
    const {csv, sitemap} = withCsv(
      [
        'old_path,new_path,redirect_type',
        '# seeded by Site-Prep generate_redirects, then edited in the app',
        '/about/our-firm/,/about/,301',
        '/attorney/jane-doe/,/attorneys/jane-doe/',
        '/promo/,/contact/,302',
        '/blog/,/blog',
        '/old-team/,/about/our-firm/',
        '/promo/,/contact/thanks',
        '/ping/,/pong/',
        '/pong/,/ping/',
        '',
      ].join('\n'),
    )
    const rows = loadRedirects(csv, sitemap)
    // `/blog/,/blog` collapsed to a self-redirect and never reaches resolution.
    expect(rows.map((r) => r.source)).toEqual([
      '/about/our-firm',
      '/attorney/jane-doe',
      '/promo',
      '/old-team',
      '/promo',
      '/ping',
      '/pong',
    ])

    const {rules, report} = resolveRedirects(rows)
    const served = bySource(rules)

    expect(Object.keys(served).sort()).toEqual([
      '/about/our-firm',
      '/attorney/jane-doe',
      '/old-team',
      '/promo',
    ])
    // The chain: the row says `/about/our-firm`, the visitor lands on `/about`.
    expect(served['/old-team'].destination).toBe('/about')
    // The first `/promo` row wins; the operator's later duplicate is reported.
    expect(served['/promo'].destination).toBe('/contact')
    expect(served['/promo'].statusCode).toBe(302)
    expect(report.duplicates.map((d) => d.dropped.destination)).toEqual(['/contact/thanks'])
    // The ping-pong pair serves nothing and is named twice, once per leg.
    expect(report.loops.map((l) => l.source)).toEqual(['/ping', '/pong'])
    expect(report.flattened.map((f) => f.source)).toEqual(['/old-team'])
    expect(report.counts).toEqual({rows: 7, served: 4})
  })
})
