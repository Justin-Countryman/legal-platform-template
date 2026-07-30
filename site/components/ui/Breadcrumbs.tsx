import Link from 'next/link'

import {resolvePageLabel} from '@/lib/pageLabel'

// ─── Types ────────────────────────────────────────────────────────────────────

type BreadcrumbItem = {
  label: string
  href: string
}

type Props = {
  items: BreadcrumbItem[]
  domain?: string
}

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Build breadcrumb items from a practiceArea page with optional parentPage chain.
 * Returns items in order: Home → [grandparent →] [parent →] current
 */
// The local resolver that used to sit here is GONE (2026-07-29, NAME-3). It was
// one of the four things that answered "what is this page called", and its second
// rung was `hero.heading` — which NAME-2 forbids and which made Dudley's /staff
// show two different strings for one page. `lib/pageLabel.ts` is now the only
// answer, and it cannot see a heading at all.

/**
 * Page types that render NO breadcrumb, from `BI-PRINCIPLES.md` CRUMB-6 and
 * CRUMB-7. A page with no position in the site's hierarchy has no trail to
 * build, and neither does one whose layouts admit no place to put it.
 *
 * ONLY `landingPage` IS REACHABLE FROM HERE, and the rest are listed anyway so
 * the roster reads as the rule rather than as one special case. `homePage` has
 * its own route and renders none; `reviewPage` sits outside the `(site)` group
 * entirely; `attorneyPage` and `staffPage` render through profile layouts that
 * no longer call a breadcrumb at all.
 *
 * WHY THE GUARD IS HERE RATHER THAN IN THE ROUTE. `landingPage` is served by the
 * catch-all alongside eight types that DO get a trail, and the only gate there
 * was `breadcrumbs.length > 1` — a length check, which a landing page with a
 * parent would pass. CRUMB-6 recorded that as "a rule the code has no way to
 * obey". Putting the exclusion in the builder means any future caller inherits
 * it without knowing it exists.
 */
export const NO_BREADCRUMB_TYPES = new Set([
  'homePage',
  'landingPage',
  'reviewPage',
  'attorneyPage',
  'staffPage',
])

export function buildBreadcrumbs(page: {
  _type?: string | null
  navLabel?: string | null
  title?: string | null
  slug?: string | null
  parentPage?: {
    navLabel?: string | null
    title?: string | null
    slug?: string | null
    parentPage?: {
      navLabel?: string | null
      title?: string | null
      slug?: string | null
    } | null
  } | null
}): BreadcrumbItem[] {
  // CRUMB-6 / CRUMB-7. Empty rather than a Home-only trail: the component
  // renders nothing below two items, but an empty array says "this page has no
  // trail" where a one-item array says "its trail is just Home".
  if (page._type && NO_BREADCRUMB_TYPES.has(page._type)) return []

  const items: BreadcrumbItem[] = [{label: 'Home', href: '/'}]

  const grandparent = page.parentPage?.parentPage
  if (grandparent?.slug) {
    const label = resolvePageLabel(grandparent)
    if (label) items.push({label, href: `/${grandparent.slug}/`})
  }

  const parent = page.parentPage
  if (parent?.slug) {
    const label = resolvePageLabel(parent)
    if (label) items.push({label, href: `/${parent.slug}/`})
  }

  if (page.slug) {
    const label = resolvePageLabel(page)
    if (label) items.push({label, href: `/${page.slug}/`})
  }

  return items
}

// ─── Schema Builder ───────────────────────────────────────────────────────────

function buildBreadcrumbListSchema(items: BreadcrumbItem[], domain: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.label,
      item: `https://${domain}${item.href}`,
    })),
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Breadcrumbs({items, domain}: Props) {
  if (items.length <= 1) return null

  return (
    <>
      {domain && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(buildBreadcrumbListSchema(items, domain)),
          }}
        />
      )}

      {/*
        NAME-8: a long label is clipped VISUALLY, in CSS. The full string stays in
        the HTML, so search engines, the BreadcrumbList schema above and screen
        readers all get the whole thing. Nothing is shortened at source — that is
        the half of the rule that matters, because a truncated STORED value cannot
        be recovered and a truncated EMITTED value costs the keyword.

        `max-w-*` + `truncate` is what does it: overflow hidden, one line, a real
        ellipsis. `title` is deliberately NOT set — the visible text and the
        accessible name are already the same complete string, and a tooltip
        duplicating it would make a screen reader announce the label twice.

        It applies to the LAST crumb only. That is the post's own title, the one
        that runs long; every ancestor is a section name that does not. Clipping
        the ancestors would cost the trail its shape for nothing.
      */}
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1 text-sm text-foreground-muted">
          {items.map((item, i) => {
            const isLast = i === items.length - 1
            return (
              <li key={item.href} className="flex min-w-0 items-center gap-1">
                {i > 0 && <span aria-hidden="true">/</span>}
                {isLast ? (
                  <span
                    className="max-w-[18rem] truncate font-medium text-foreground sm:max-w-[28rem] lg:max-w-[40rem]"
                    aria-current="page"
                  >
                    {item.label}
                  </span>
                ) : (
                  <Link href={item.href} className="transition-colors duration-ui-fast hover:text-foreground">
                    {item.label}
                  </Link>
                )}
              </li>
            )
          })}
        </ol>
      </nav>
    </>
  )
}
