// @vitest-environment node
/**
 * Retired URLs answer 410; an unknown URL keeps 404 (monorepo [R-562], TECH-11).
 * `lib/retired.ts` reads `CS/retired.csv`, drops any path that would hide a
 * route or a published page, and `next.config.ts` rewrites the rest to
 * `/api/gone`. ADV-410-A found a case-folded retired path answering 410 in
 * place of a live CMS page; the guard below is why that cannot ship.
 */

import {mkdtempSync, readdirSync, rmSync, statSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join, relative, resolve, sep} from 'node:path'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {assertRedirectCapNotExceeded} from '@/lib/redirects'
import {
  formatRetiredReport,
  guardRetired,
  loadRetired,
  parseRetiredCsv,
  RETIRED_DESTINATION,
  retiredRewrites,
  retiredRewritesAtBuild,
  SITE_ROUTE_PREFIXES,
  SITE_ROUTES,
} from '@/lib/retired'

describe('reading CS/retired.csv', () => {
  it('reads one path per row, past a comment and the header, slashless, first spelling kept', () => {
    const read = parseRetiredCsv(
      '# written by Site Prep from CS-SITEMAP.csv\nold_path\n/old-news/\n/Old-News\n\n/2019/05/a-post/\n',
    )
    expect(read.paths).toEqual(['/old-news', '/2019/05/a-post'])
    expect(read.rows).toBe(3)
    expect(read.dropped).toEqual([])
  })

  it('drops a path a route cannot carry, and the homepage, and says why', () => {
    const read = parseRetiredCsv('old_path\n/a(b)\n/\n/ok\n')
    expect(read.paths).toEqual(['/ok'])
    expect(read.dropped.map((d) => d.path)).toEqual(['/a(b)', '/'])
  })

  it('reads a missing file as no retired URLs', () => {
    expect(loadRetired('/nowhere/retired.csv')).toEqual({paths: [], rows: 0, dropped: []})
  })
})

describe('a retired path never hides a route or a page', () => {
  it('drops a route of the site, ignoring case, and anything under a reserved prefix', () => {
    const {kept, dropped} = guardRetired(['/Contact', '/api/og', '/review-old', '/old-page'], new Set())
    expect(kept).toEqual(['/old-page'])
    expect(dropped.map((d) => d.path)).toEqual(['/Contact', '/api/og', '/review-old'])
  })

  it('drops a page published in the dataset, ignoring case', () => {
    const {kept, dropped} = guardRetired(['/Estate-Planning', '/blog/old-post'], new Set(['/estate-planning']))
    expect(kept).toEqual(['/blog/old-post'])
    expect(dropped).toEqual([{path: '/Estate-Planning', reason: 'a page is published there'}])
  })

  it('keeps a path that is also redirected, and names it: the redirect runs first', () => {
    expect(guardRetired(['/old'], new Set(), ['/old/']).redirected).toEqual(['/old'])
  })

  it('holds its list of routes to the app tree', () => {
    // Every static route of app/ that is not a CMS slug must be listed, or a
    // retired path could hide it.
    const app = resolve(__dirname, '../../app')
    const found = new Set<string>()
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name)
        if (name === '__tests__' || name === 'node_modules') continue
        if (statSync(path).isDirectory()) walk(path)
        else if (/^page\.tsx?$/.test(name)) {
          const segments = relative(app, dir).split(sep).filter((s) => s && !/^\(.*\)$/.test(s))
          if (segments.some((s) => s.startsWith('['))) continue
          found.add('/' + segments.join('/'))
        }
      }
    }
    walk(app)
    for (const route of found) {
      const covered = SITE_ROUTES.includes(route) || SITE_ROUTE_PREFIXES.some((p) => (route + '/').startsWith(p))
      expect(covered, `${route} is a route of the site that a retired path could hide`).toBe(true)
    }
  })
})

describe('what the build does with them', () => {
  it('rewrites each kept path to the 410 handler', () => {
    expect(retiredRewrites(['/old'])).toEqual([{source: '/old', destination: RETIRED_DESTINATION}])
    expect(RETIRED_DESTINATION).toBe('/api/gone')
  })

  it('says every drop, every overlap with a redirect, and when the pages went unread', () => {
    const read = parseRetiredCsv('old_path\n/a(b)\n/contact\n/old\n')
    const guard = guardRetired(read.paths, null, ['/old'])
    const lines = formatRetiredReport(read, guard, 'HTTP 500')
    expect(lines[0]).toBe('[retired] 1 answer 410 from CS/retired.csv (3 row(s) read)')
    expect(lines.filter((l) => l.startsWith('[retired] DROPPED'))).toHaveLength(2)
    expect(lines.some((l) => l.includes('/old is also redirected'))).toBe(true)
    expect(lines.at(-1)).toMatch(/WARNING: the published pages could not be read \(HTTP 500\)/)
  })

  describe('from a file on disk', () => {
    let dir = ''
    afterEach(() => {
      if (dir) rmSync(dir, {recursive: true, force: true})
      dir = ''
    })

    it('reads the dataset only when the file lists a path', async () => {
      const fetchPages = vi.fn(async () => ({pages: new Set<string>(), why: null}))
      const log = vi.fn()
      expect(await retiredRewritesAtBuild('/nowhere/retired.csv', [], fetchPages, log)).toEqual([])
      expect(fetchPages).not.toHaveBeenCalled()
      expect(log).toHaveBeenCalledWith('[retired] 0 answer 410 from CS/retired.csv (0 row(s) read)')
    })

    it('drops a listed page it finds published, and rewrites the rest', async () => {
      dir = mkdtempSync(join(tmpdir(), 'retired-'))
      const csv = join(dir, 'retired.csv')
      writeFileSync(csv, 'old_path\n/old-page/\n/estate-planning/\n')
      const rules = await retiredRewritesAtBuild(
        csv, [], async () => ({pages: new Set(['/estate-planning']), why: null}), () => {})
      expect(rules).toEqual([{source: '/old-page', destination: '/api/gone'}])
    })
  })
})

describe('retired URLs share the route budget with redirects', () => {
  it('counts both, and names both files when over', () => {
    expect(() => assertRedirectCapNotExceeded(1000, 'CS/redirects.csv', 24)).not.toThrow()
    expect(() => assertRedirectCapNotExceeded(1000, 'CS/redirects.csv', 30)).toThrow(
      /1000 redirects from CS\/redirects.csv and 30 retired URLs from CS\/retired.csv .* Remove 6 of them/,
    )
  })
})

describe('next.config.ts serves them', () => {
  it('returns afterFiles rewrites from the config Next loads, reading nothing when none are listed', async () => {
    const fetchSpy = vi.fn(() => {
      throw new Error('rewrites() must not fetch with no retired URLs')
    })
    vi.stubGlobal('fetch', fetchSpy)
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const config = (await import('@/next.config')).default
    const rewrites = (await config.rewrites!()) as {afterFiles: unknown[]}
    // The template ships no CS/retired.csv.
    expect(rewrites.afterFiles).toEqual([])
    expect(fetchSpy).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})
