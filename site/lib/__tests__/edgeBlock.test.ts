import {describe, expect, it} from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {assertNoEdgeCollisions, edgeCollisions, edgeDenies, edgeDenyPatterns} from '../edgeBlock'

// SCANNER ADDRESSES DENIED AT THE EDGE (monorepo `[R-660]`, WS-V1-EDGE-BLOCK-DESIGN.md as challenged): the one deny
// route in `vercel.json` is valid as Vercel validates it, denies every scanner family, never denies an address a firm's
// site or a migration serves, and the build fails naming any redirect or retired row it would swallow.

const VERCEL_JSON = path.resolve(__dirname, '../../vercel.json')
const config = JSON.parse(fs.readFileSync(VERCEL_JSON, 'utf8'))
const patterns = edgeDenyPatterns(config)

const PROBES = [
  '/wp-login.php', '/WP-Login.PHP', '/wp-login.php/', '/wp-login.php?redirect_to=x', '/xmlrpc.php', '/xmlrpc.php/',
  '/wp-config.php', '/wp-config.php.bak', '/wp-config.bak', '/wp-admin', '/wp-admin/', '/wp-admin/setup-config.php',
  '/wp-includes/wlwmanifest.xml', '/blog/wp-includes/wlwmanifest.xml', '/wordpress/wp-admin/setup-config.php',
  '/wp/wp-login.php', '/wp-content/plugins/revslider/readme.txt', '/wp-content/themes/twentytwenty/style.css',
  '/wp-content/uploads/2020/01/shell.php', '/.env', '/.env.local', '/.env.production', '/api/.env', '/.git', '/.git/config',
  '/.svn/entries', '/.hg/store', '/.aws/credentials', '/.ssh/id_rsa', '/.DS_Store', '/phpmyadmin', '/phpmyadmin/index.php',
  '/pma', '/adminer.php', '/adminer-4.8.1.php', '/cgi-bin/luci', '/vendor/phpunit/phpunit/src/Util/PHP/eval-stdin.php',
]

const SERVED = [
  '/', '/practice-areas/car-accidents', '/attorneys/miriam-ashgrove', '/blog/environmental-law', '/practice-areas/pma',
  '/blog/phpmyadmin-for-lawyers', '/.well-known/security.txt', '/.well-known/acme-challenge/abc', '/.github',
  '/wp-content/uploads/2019/05/brochure.pdf', '/wp-content/uploads/2019/05/portrait.jpg', '/index.php',
  '/index.php?page_id=7', '/contact.php', '/about-us.php', '/robots.txt', '/sitemap.xml', '/favicon.ico',
  '/_next/static/chunks/main.js', '/api/revalidate', '/api/og', '/review-us', '/site-preview/x',
]

describe('the deny route in vercel.json', () => {
  it('is one route, src and a deny, valid as Vercel validates it (anchored, compiles as JavaScript, no inline flag)', () => {
    const routes = config.routes as Record<string, unknown>[]
    expect(routes).toHaveLength(1)
    expect(Object.keys(routes[0]).sort()).toEqual(['mitigate', 'src'])
    expect(routes[0].mitigate).toEqual({action: 'deny'})
    const src = routes[0].src as string
    expect(src.startsWith('^')).toBe(true)
    expect(() => new RegExp(src)).not.toThrow()
    expect(src).not.toMatch(/\(\?[a-z]/)
    expect(patterns).toHaveLength(1)
  })

  it('denies every scanner family, in any case, with a trailing slash, under a prefix, whatever the query', () => {
    expect(PROBES.filter((p) => !edgeDenies(p, patterns))).toEqual([])
  })

  it('never denies an address a firm site, a migration or the platform serves', () => {
    expect(SERVED.filter((p) => edgeDenies(p, patterns))).toEqual([])
  })
})

describe('the collision guard', () => {
  const lists = (redirects: string[], retired: string[] = []) => [
    {label: 'CS/redirects.csv', paths: redirects},
    {label: 'CS/retired.csv', paths: retired},
  ]

  it('names each redirect or retired row the edge would deny', () => {
    expect(edgeCollisions(lists(['/old-page', '/wp-admin/old'], ['/gone', '/wp-login.php']), patterns)).toEqual([
      'CS/redirects.csv: /wp-admin/old',
      'CS/retired.csv: /wp-login.php',
    ])
  })

  it('anchors a src the way Vercel does, so a mid-path match is never a deny', () => {
    const loose = edgeDenyPatterns({routes: [{src: '/secret', mitigate: {action: 'deny'}}, {src: '/plain', dest: '/x'}]})
    expect(loose).toHaveLength(1)
    expect(edgeDenies('/secret', loose)).toBe(true)
    expect(edgeDenies('/a/secret', loose)).toBe(false)
  })

  it('fails the build naming the rows, and prints what it checked when nothing collides', () => {
    const lines: string[] = []
    expect(() => assertNoEdgeCollisions(VERCEL_JSON, lists(['/.env']), (l) => lines.push(l))).toThrow(/CS\/redirects\.csv: \/\.env/)
    assertNoEdgeCollisions(VERCEL_JSON, lists(['/old-page'], ['/gone']), (l) => lines.push(l))
    expect(lines).toEqual(['[edge-block] 1 deny route(s); checked 1 in CS/redirects.csv, 1 in CS/retired.csv; no collision'])
  })

  it('denies nothing and says so without a vercel.json', () => {
    const lines: string[] = []
    assertNoEdgeCollisions(path.join(os.tmpdir(), 'no-such-dir', 'vercel.json'), lists(['/.env']), (l) => lines.push(l))
    expect(lines).toEqual(['[edge-block] no vercel.json; nothing is denied at the edge'])
  })

  it('runs in next.config on every build, over the redirect rows and the retired list', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../../next.config.ts'), 'utf8')
    expect(src).toMatch(/assertNoEdgeCollisions\(VERCEL_JSON, \[\s*\{label: 'CS\/redirects\.csv', paths: rows\.map\(\(r\) => r\.source\)\},\s*\{label: 'CS\/retired\.csv', paths: loadRetired\(CS_RETIRED_CSV\)\.paths\},/)
  })
})
