import {describe, expect, it} from 'vitest'
import {readFileSync} from 'node:fs'
import path from 'node:path'
import {evaluate, parse} from 'groq-js'
import {titleFragment} from '../tokens'
import {buildFullName} from '@/components/attorney/types'
import {SERVICE_AREA_INDEX_PAGE_NAME} from '../seoTitle'
import {resolvePageLabel} from '../pageLabel'
import {
  ATTORNEY_INDEX_QUERY,
  ATTORNEY_PAGE_QUERY,
  BLOG_CATEGORY_PAGE_QUERY,
  BLOG_INDEX_PAGE_QUERY,
  BLOG_POST_PAGE_QUERY,
  CONTACT_PAGE_QUERY,
  CONTENT_PAGE_QUERY,
  EVENT_INDEX_PAGE_QUERY,
  EVENT_PAGE_QUERY,
  LOCATION_PAGE_QUERY,
  PRACTICE_AREA_QUERY,
  REVIEW_PAGE_QUERY,
  SERVICE_AREA_INDEX_QUERY,
  STAFF_INDEX_QUERY,
  STAFF_PAGE_QUERY,
  TESTIMONIALS_PAGE_QUERY,
  VIDEO_INDEX_PAGE_QUERY,
} from '../sanity/queries'

/**
 * Doctrine: `BI-Content.md` § Title tags — "a blank cell falls back to the page
 * name, which produces a correct title, so this is a fallback and not an
 * error."
 *
 * That was FALSE for blogPost until 2026-07-26: the route read `post.title`,
 * `blogPost` has no `title` field, and `BLOG_POST_PAGE_QUERY` did not project
 * one, so the second rung was `undefined` and an empty `seoTitle` rendered the
 * bare firm name instead of the headline. Reading the routes is what missed it
 * for four days — the route compiles, the field is simply never there.
 *
 * So this suite does not read. It RUNS each real query, exactly as exported, in
 * groq-js against a document with NO `seoTitle`, then pushes the result through
 * the real `titleFragment`. A rung that does not exist produces `undefined`
 * here and fails, the way it should have failed for blogPost.
 *
 * Two things keep it honest:
 *   - `accessor` is matched against the SECOND ARGUMENT of the route's actual
 *     `titleFragment(...)` call, so a route that changes which field it falls
 *     back to fails here instead of drifting. See titleFragmentFallbackArgs
 *     below for why a substring search was not enough.
 *   - `expected` is the page's OWN name, never a literal typed twice. Where the
 *     query supplies a hardcoded literal via coalesce(), that literal IS the
 *     page name (doctrine's "page name, then firm" group) and is asserted as
 *     such.
 *
 * Mutation-verified 2026-07-26, not asserted: reinstating `post.title` in the
 * blog route turns this suite red, and only that one case.
 */

const SITE_ROOT = path.resolve(__dirname, '..', '..')

async function run(query: string, dataset: unknown[], params: Record<string, unknown> = {}) {
  const tree = parse(query)
  const value = await evaluate(tree, {dataset, params})
  return (await value.get()) as Record<string, unknown> | null
}

function routeSource(rel: string): string {
  return readFileSync(path.join(SITE_ROOT, 'app', rel), 'utf8')
}

/**
 * The 2nd argument of every `resolveTitle(...)` call in a route file.
 *
 * A plain `source.includes(accessor)` is NOT enough and was the first version
 * of this check: it passed while the blog route read `post.title`, because
 * `post.h1` also appears further down where the route renders the H1. The
 * substring was present and meant nothing. Mutation-testing the fix — putting
 * `post.title` back and expecting red — is what exposed it. So this scans the
 * call itself, with balanced brackets, and compares the argument.
 */
function resolveTitleFallbackArgs(source: string): string[] {
  const out: string[] = []
  const marker = 'resolveTitle('
  let i = source.indexOf(marker)
  while (i !== -1) {
    let depth = 1
    let j = i + marker.length
    const args: string[] = []
    let current = ''
    for (; j < source.length && depth > 0; j++) {
      const ch = source[j]
      if (ch === '(' || ch === '[' || ch === '{') depth++
      else if (ch === ')' || ch === ']' || ch === '}') depth--
      if (depth === 0) break
      if (ch === ',' && depth === 1) {
        args.push(current)
        current = ''
        continue
      }
      current += ch
    }
    args.push(current)
    if (args.length >= 2) out.push(args[1].replace(/\s+/g, ' ').trim())
    i = source.indexOf(marker, j)
  }
  return out
}

type Case = {
  name: string
  route: string
  /** The exact expression the route passes as titleFragment's 2nd argument. */
  accessor: string
  query: string
  params?: Record<string, unknown>
  dataset: unknown[]
  fallback: (doc: Record<string, unknown>) => string | null | undefined
  expected: string
}

const SLUG = 'x/y'

const CASES: Case[] = [
  {
    name: 'practiceArea (catch-all)',
    route: '(site)/[...slug]/page.tsx',
    accessor: 'geoName || serviceAreaName || areaOfLawName || locationName || page.title',
    query: PRACTICE_AREA_QUERY,
    params: {slug: SLUG},
    dataset: [{_id: 'p', _type: 'practiceArea', slug: {current: SLUG}, title: 'Family Law'}],
    fallback: (d) => d.title as string,
    expected: 'Family Law',
  },
  {
    name: 'geoPracticeArea (catch-all, same query)',
    route: '(site)/[...slug]/page.tsx',
    accessor: 'geoName || serviceAreaName || areaOfLawName || locationName || page.title',
    query: PRACTICE_AREA_QUERY,
    params: {slug: SLUG},
    dataset: [{_id: 'g', _type: 'geoPracticeArea', slug: {current: SLUG}, title: 'Divorce in Blaine'}],
    fallback: (d) => d.title as string,
    expected: 'Divorce in Blaine',
  },
  {
    name: 'serviceAreaPage (catch-all, same query)',
    route: '(site)/[...slug]/page.tsx',
    accessor: 'geoName || serviceAreaName || areaOfLawName || locationName || page.title',
    query: PRACTICE_AREA_QUERY,
    params: {slug: SLUG},
    dataset: [{_id: 's', _type: 'serviceAreaPage', slug: {current: SLUG}, title: 'Blaine'}],
    fallback: (d) => d.title as string,
    expected: 'Blaine',
  },
  {
    name: 'locationPage (catch-all)',
    route: '(site)/[...slug]/page.tsx',
    accessor: 'geoName || serviceAreaName || areaOfLawName || locationName || page.title',
    query: LOCATION_PAGE_QUERY,
    params: {slug: SLUG},
    dataset: [{_id: 'l', _type: 'locationPage', slug: {current: SLUG}, title: 'St. Paul Office'}],
    fallback: (d) => d.title as string,
    expected: 'St. Paul Office',
  },
  {
    name: 'generalPage (catch-all) — thank-you / privacy / disclaimer live here',
    route: '(site)/[...slug]/page.tsx',
    accessor: 'geoName || serviceAreaName || areaOfLawName || locationName || page.title',
    query: CONTENT_PAGE_QUERY,
    params: {slug: SLUG},
    dataset: [{_id: 'gp', _type: 'generalPage', slug: {current: SLUG}, title: 'Thank You'}],
    fallback: (d) => d.title as string,
    expected: 'Thank You',
  },
  {
    name: 'aboutPage (catch-all, same query)',
    route: '(site)/[...slug]/page.tsx',
    accessor: 'geoName || serviceAreaName || areaOfLawName || locationName || page.title',
    query: CONTENT_PAGE_QUERY,
    params: {slug: SLUG},
    dataset: [{_id: 'ab', _type: 'aboutPage', slug: {current: SLUG}, title: 'About'}],
    fallback: (d) => d.title as string,
    expected: 'About',
  },
  {
    name: 'faqPage (catch-all, same query)',
    route: '(site)/[...slug]/page.tsx',
    accessor: 'geoName || serviceAreaName || areaOfLawName || locationName || page.title',
    query: CONTENT_PAGE_QUERY,
    params: {slug: SLUG},
    dataset: [{_id: 'fq', _type: 'faqPage', slug: {current: SLUG}, title: 'FAQ'}],
    fallback: (d) => d.title as string,
    expected: 'FAQ',
  },
  {
    name: 'landingPage (catch-all, same query)',
    route: '(site)/[...slug]/page.tsx',
    accessor: 'geoName || serviceAreaName || areaOfLawName || locationName || page.title',
    query: CONTENT_PAGE_QUERY,
    params: {slug: SLUG},
    dataset: [{_id: 'lp', _type: 'landingPage', slug: {current: SLUG}, title: 'Free Consultation'}],
    fallback: (d) => d.title as string,
    expected: 'Free Consultation',
  },
  {
    // The regression this suite exists for.
    name: 'blogPost — the Name (NAME-4: the headline in full), then h1 for an unrebuilt post',
    route: '(site)/blog/[slug]/page.tsx',
    accessor: 'resolvePageLabel(post) ?? post.h1',
    query: BLOG_POST_PAGE_QUERY,
    params: {slug: SLUG},
    dataset: [{_id: 'bp', _type: 'blogPost', slug: {current: SLUG}, h1: 'What To Do After A Crash',
               title: 'What To Do After A Crash In Minnesota'}],
    fallback: (d) => resolvePageLabel(d) ?? (d.h1 as string),
    expected: 'What To Do After A Crash In Minnesota',
  },
  {
    name: 'blogCategory',
    route: '(site)/blog/category/[slug]/page.tsx',
    accessor: 'category.title',
    query: BLOG_CATEGORY_PAGE_QUERY,
    params: {slug: SLUG},
    dataset: [{_id: 'bc', _type: 'blogCategory', slug: {current: SLUG}, title: 'Family Law'}],
    fallback: (d) => d.title as string,
    expected: 'Family Law',
  },
  {
    name: 'eventPage',
    route: '(site)/events/[slug]/page.tsx',
    accessor: 'event.title',
    query: EVENT_PAGE_QUERY,
    params: {slug: SLUG},
    dataset: [{_id: 'ev', _type: 'eventPage', slug: {current: SLUG}, title: 'Open House'}],
    fallback: (d) => d.title as string,
    expected: 'Open House',
  },
  {
    name: 'reviewPage — falls back to h1 (the type has no seoTitle field at all)',
    route: 'review/[slug]/page.tsx',
    accessor: 'data.page.h1',
    query: REVIEW_PAGE_QUERY,
    params: {slug: SLUG},
    dataset: [{_id: 'rv', _type: 'reviewPage', slug: {current: SLUG}, h1: 'Review Us in St. Paul'}],
    fallback: (d) => (d.page as Record<string, unknown>).h1 as string,
    expected: 'Review Us in St. Paul',
  },
  {
    name: 'contactPage',
    route: '(site)/contact/page.tsx',
    accessor: 'page.title',
    query: CONTACT_PAGE_QUERY,
    dataset: [{_id: 'ct', _type: 'contactPage', title: 'Contact'}],
    fallback: (d) => d.title as string,
    expected: 'Contact',
  },
  {
    name: 'testimonialsPage',
    route: '(site)/testimonials/page.tsx',
    accessor: "resolvePageLabel(page, 'testimonialsPage') ?? ''",
    query: TESTIMONIALS_PAGE_QUERY,
    dataset: [{_id: 'tp', _type: 'testimonialsPage'}],
    fallback: (d) => resolvePageLabel(d, 'testimonialsPage'),
    expected: 'Testimonials',
  },
  {
    name: 'blogIndex — the Name, else the per-type preset (NAME-4)',
    route: '(site)/blog/page.tsx',
    accessor: "resolvePageLabel(indexPage, 'blogIndex') ?? ''",
    query: BLOG_INDEX_PAGE_QUERY,
    dataset: [{_id: 'bi', _type: 'blogIndex'}],
    fallback: (d) => resolvePageLabel(d, 'blogIndex'),
    expected: 'Blog',
  },
  {
    name: 'attorneyIndex — the Name, else the per-type preset (NAME-4)',
    route: '(site)/attorneys/page.tsx',
    accessor: "resolvePageLabel(indexPage, 'attorneyIndex') ?? ''",
    query: ATTORNEY_INDEX_QUERY,
    dataset: [{_id: 'ai', _type: 'attorneyIndex'}],
    fallback: (d) => resolvePageLabel(d, 'attorneyIndex'),
    expected: 'Our Attorneys',
  },
  {
    name: 'staffIndex — Our Staff, not the superseded Our Team (NAME-4)',
    route: '(site)/staff/page.tsx',
    accessor: "resolvePageLabel(indexPage, 'staffIndex') ?? ''",
    query: STAFF_INDEX_QUERY,
    dataset: [{_id: 'si', _type: 'staffIndex'}],
    fallback: (d) => resolvePageLabel(d, 'staffIndex'),
    expected: 'Our Staff',
  },
  {
    name: 'eventIndex — the Name, else the per-type preset (NAME-4)',
    route: '(site)/events/page.tsx',
    accessor: "resolvePageLabel(indexPage, 'eventIndex') ?? ''",
    query: EVENT_INDEX_PAGE_QUERY,
    dataset: [{_id: 'ei', _type: 'eventIndex'}],
    fallback: (d) => resolvePageLabel(d, 'eventIndex'),
    expected: 'Events',
  },
  {
    // Doctrine said "Videos" until 2026-07-26. The code is right and the
    // doctrine literal was wrong; this pins the code's answer.
    name: 'videoIndex — page name is Video Library, not Videos',
    route: '(site)/videos/page.tsx',
    accessor: "resolvePageLabel(indexPage, 'videoIndex') ?? ''",
    query: VIDEO_INDEX_PAGE_QUERY,
    dataset: [{_id: 'vi', _type: 'videoIndex'}],
    fallback: (d) => resolvePageLabel(d, 'videoIndex'),
    expected: 'Video Library',
  },
  {
    // TITLE-10 (2026-07-26): the title-tag fallback is a FIXED page name and
    // no longer the query's `title`. The query still has to match, because the
    // route reads its seoTitle — that is what the dataset row guards.
    name: 'serviceAreaIndex — TITLE-10 fixed page name, not the GROQ literal',
    route: '(site)/service-area/page.tsx',
    accessor: 'SERVICE_AREA_INDEX_PAGE_NAME',
    query: SERVICE_AREA_INDEX_QUERY,
    dataset: [{_id: 'sa', _type: 'serviceAreaIndex'}],
    fallback: () => SERVICE_AREA_INDEX_PAGE_NAME,
    expected: 'Areas We Serve',
  },
  {
    name: 'attorneyPage — falls back to the joined name fields',
    route: '(site)/attorneys/[slug]/page.tsx',
    accessor: 'buildFullName(attorney)',
    query: ATTORNEY_PAGE_QUERY,
    params: {slug: SLUG},
    dataset: [{
      _id: 'at', _type: 'attorneyPage', slug: {current: SLUG},
      firstName: 'Jane', middleName: 'A.', lastName: 'Smith', suffix: 'Jr.',
    }],
    fallback: (d) => buildFullName(d as Parameters<typeof buildFullName>[0]),
    expected: 'Jane A. Smith Jr.',
  },
  {
    name: 'staffPage — falls back to first + last',
    route: '(site)/staff/[slug]/page.tsx',
    accessor: "[member.firstName, member.lastName].filter(Boolean).join(' ')",
    query: STAFF_PAGE_QUERY,
    params: {slug: SLUG},
    dataset: [{
      _id: 'st', _type: 'staffPage', slug: {current: SLUG},
      firstName: 'John', lastName: 'Roe',
    }],
    fallback: (d) => [d.firstName, d.lastName].filter(Boolean).join(' '),
    expected: 'John Roe',
  },
]

describe('every title fallback reaches the page\'s own name', () => {
  for (const c of CASES) {
    it(`${c.name}`, async () => {
      const doc = await run(c.query, c.dataset, c.params)
      expect(doc, `${c.name}: query matched no document — fixture is wrong`).not.toBeNull()

      // The precondition this whole suite is about: no stored seoTitle.
      const seoTitle = (doc as Record<string, unknown>).seoTitle
      expect(seoTitle ?? null, `${c.name}: fixture must have no seoTitle`).toBeNull()

      const fragment = titleFragment(seoTitle as string | null, c.fallback(doc!), null)
      expect(fragment, `${c.name}: fallback rung is empty — this is the blogPost bug`).toBe(c.expected)
    })

    it(`${c.name} — route's resolveTitle still falls back to ${c.accessor}`, () => {
      expect(resolveTitleFallbackArgs(routeSource(c.route))).toContain(c.accessor)
    })
  }
})

describe('the homepage is the one deliberate exception', () => {
  it('has no page-name rung, by design', () => {
    // Its absent branch is the unruled from-scratch formula seam, not a
    // fallback. BI-Content.md § Title tags → What is not settled.
    expect(routeSource('(site)/page.tsx')).toContain('resolveTitle(\n    home?.seoTitle,\n    null,')
  })
})

describe('the 404 title depends on three things staying true', () => {
  /**
   * Each of these is individually reasonable to "clean up", and removing any
   * one drops the firm name from the 404 title WITHOUT failing anything else.
   * That is the whole reason they are pinned here.
   */
  it('the root layout still carries a template', () => {
    // TITLE-1 removed appending for every route. The template survives for the
    // 404 alone, because a not-found boundary cannot compute its own title.
    expect(routeSource('layout.tsx')).toContain('template: titleTemplate(firmName)')
  })

  for (const boundary of ['(site)/not-found.tsx', 'not-found.tsx']) {
    it(`${boundary} exports STATIC metadata, not generateMetadata`, () => {
      const src = routeSource(boundary)
      expect(src).toContain('export const metadata')
      // `generateMetadata` in a not-found boundary emits NO title at all —
      // measured 2026-07-26 with a clean .next. It fails silently, which is
      // why this is asserted rather than left to review.
      expect(src).not.toContain('export async function generateMetadata')
    })
  }
})

describe('every route composes its title through the one shared function', () => {
  const ROUTES = [...new Set(CASES.map((c) => c.route)), '(site)/page.tsx']
  for (const route of ROUTES) {
    it(`${route} calls resolveTitle`, () => {
      expect(routeSource(route)).toContain('resolveTitle(')
    })
    it(`${route} hand-rolls no absolute title`, () => {
      // A route building `{absolute: ...}` itself is a second implementation of
      // TITLE-1 and will drift from resolveTitle. The homepage used to do this
      // and no longer does.
      expect(routeSource(route)).not.toContain('title: {absolute:')
    })
  }
})
