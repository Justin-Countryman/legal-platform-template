import fs from 'node:fs'
import path from 'node:path'
import {describe, expect, it} from 'vitest'

// The accessibility fixture (monorepo WS-V1-ACCESSIBILITY-DESIGN-2026-10-13.md §1.8, ADV-A11Y-B amendment 8): the
// photo-set record plus named staff, blog, category, event and badge documents and a navigation with a dropdown, its
// homepage holding every section a known accessibility defect lived in. The monorepo's Verify scans a local build of it
// (BE/Post-Deploy-Check/local_template.py). A fixture that drifts from the schema renders nothing and scans clean, so
// this holds what it must contain: every document a declared type with declared fields, every reference resolving,
// every page named, and the sections present.

const CI = path.resolve(__dirname, '..')
const FILE = path.join(CI, 'record-a11y.ndjson')
const SCHEMA = path.resolve(__dirname, '../../../../studio/schema.json')

type SchemaType = {name: string; type: string; attributes?: Record<string, unknown>}
type Doc = Record<string, unknown> & {_id: string; _type: string}
type Section = {_type: string; _key: string; layout?: string; mobileDisplay?: string; marquee?: boolean; badges?: unknown[]}

describe.skipIf(!fs.existsSync(FILE))('scripts/ci/record-a11y.ndjson (skipped on a client tree: scripts/ci is pruned by the press)', () => {
  const docs = fs.readFileSync(FILE, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) as Doc[]
  const schema = JSON.parse(fs.readFileSync(SCHEMA, 'utf8')) as SchemaType[]
  const byName = new Map(schema.map((t) => [t.name, t]))

  it('every document is a declared type with declared fields, and every reference resolves', () => {
    const ids = new Set(docs.map((d) => d._id))
    expect(ids.size).toBe(docs.length)
    for (const doc of docs) {
      if (doc._type === 'sanity.imageAsset') continue
      const attributes = byName.get(doc._type)?.attributes ?? {}
      expect(byName.get(doc._type)?.type, `${doc._id}: ${doc._type}`).toBe('document')
      for (const field of Object.keys(doc)) {
        if (!field.startsWith('_')) expect(field in attributes, `${doc._id}: ${field} is not declared on ${doc._type}`).toBe(true)
      }
    }
    for (const ref of JSON.stringify(docs).matchAll(/"_ref":"([^"]+)"/g)) expect(ids.has(ref[1]), ref[1]).toBe(true)
  })

  it('every page is named, so a nameless placeholder never reads as a template defect', () => {
    for (const doc of docs.filter((d) => d.slug && d._type !== 'homePage')) {
      expect(String(doc.title ?? '').trim(), doc._id).not.toBe('')
    }
    const post = docs.find((d) => d._type === 'blogPost')!
    expect(String(post.h1 ?? '').trim(), 'a blog card links with the post H1').not.toBe('')
  })

  it('the homepage holds the carousel, the attorney slider and both moving bands', () => {
    const canvas = (docs.find((d) => d._type === 'homePage') as unknown as {canvas: Section[]}).canvas
    const has = (test: (s: Section) => boolean) => canvas.some(test)
    expect(has((s) => s._type === 'practiceAreaNavInline' && s.mobileDisplay === 'carousel'), 'practice-area carousel').toBe(true)
    expect(has((s) => s._type === 'attorneySectionInline' && s.layout === 'slider'), 'attorney slider').toBe(true)
    expect(has((s) => s._type === 'badgesSectionInline' && s.layout === 'scrolling' && (s.badges?.length ?? 0) >= 2), 'badges marquee').toBe(true)
    expect(has((s) => s._type === 'contentSectionInline' && s.layout === 'ribbon' && s.marquee === true), 'ribbon marquee').toBe(true)
    expect(docs.find((d) => d._type === 'heroSettings'), 'a photo hero').toBeTruthy()
  })

  // Monorepo backlog 468: the case results CMS (template PR #85, `[R-715]`) added /case-results, a result's own page and
  // the Featured Case Results section, and the fixture held no result, so Verify's scan of a local build never read them.
  it('the case results: a featured card only, a featured result with its own page, the index, and the Featured section', () => {
    const results = docs.filter((d) => d._type === 'caseResult') as unknown as Array<Doc & {featured?: boolean; hasPage?: boolean; slug?: {current?: string}; amount?: string; caption?: string; areaOfLaw?: {_ref: string}}>
    const shown = (r: (typeof results)[number]) => !!(r.amount?.trim() || r.caption?.trim())
    expect(results.some((r) => r.featured && !r.hasPage && shown(r)), 'a featured card with no page').toBe(true)
    // The address the route takes: case-results/ and one name (lib/caseResultPage.ts).
    const page = results.find((r) => r.featured && r.hasPage)
    expect(page?.slug?.current).toMatch(/^case-results\/[a-z0-9-]+$/)
    expect(String((page as unknown as {title?: string}).title ?? '').trim(), 'a page is named').not.toBe('')
    expect(Array.isArray((page as unknown as {body?: unknown[]}).body) && (page as unknown as {body: unknown[]}).body.length > 0, 'a page has its write-up').toBe(true)
    for (const r of results) expect(docs.some((d) => d._id === r.areaOfLaw?._ref && d._type === 'practiceArea'), `${r._id}: an area of law`).toBe(true)
    expect(docs.find((d) => d._type === 'caseResultIndex'), 'the index page').toBeTruthy()
    // Reached by a link, as a firm's menu reaches it: on a hidden site the served sitemap is empty, and Verify finds the
    // pages the template makes with no row through links alone.
    const nav = docs.find((d) => d._type === 'mainNavigation') as unknown as {items: Array<{href?: string}>}
    expect(nav.items.some((item) => item.href?.replace(/\/$/, '') === '/case-results'), 'the menu links the index').toBe(true)
    const canvas = (docs.find((d) => d._type === 'homePage') as unknown as {canvas: Section[]}).canvas
    expect(canvas.some((s) => s._type === 'caseResultsSectionInline'), 'the Featured Case Results section').toBe(true)
  })

  it('the header has a navigation with a dropdown, so the scan reads the menu and its submenu', () => {
    const nav = docs.find((d) => d._type === 'mainNavigation') as unknown as {sticky: boolean; items: Array<{children?: unknown[]}>}
    expect(nav.sticky).toBe(true)
    expect(nav.items.length).toBeGreaterThanOrEqual(3)
    expect(nav.items.some((item) => (item.children?.length ?? 0) > 0)).toBe(true)
  })
})
