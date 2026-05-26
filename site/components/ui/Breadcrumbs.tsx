import Link from 'next/link'

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
function resolvePageLabel(page: {
  title?: string | null
  slug?: string | null
  hero?: {heading?: string | null} | null
}): string | null {
  if (page.title) return page.title
  if (page.hero?.heading) return page.hero.heading
  if (page.slug) {
    const segment = page.slug.split('/').filter(Boolean).pop() ?? ''
    return segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || null
  }
  return null
}

export function buildBreadcrumbs(page: {
  title?: string | null
  slug?: string | null
  hero?: {heading?: string | null} | null
  parentPage?: {
    title?: string | null
    slug?: string | null
    hero?: {heading?: string | null} | null
    parentPage?: {
      title?: string | null
      slug?: string | null
      hero?: {heading?: string | null} | null
    } | null
  } | null
}): BreadcrumbItem[] {
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

      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1 text-sm text-foreground-muted">
          {items.map((item, i) => {
            const isLast = i === items.length - 1
            return (
              <li key={item.href} className="flex items-center gap-1">
                {i > 0 && <span aria-hidden="true">/</span>}
                {isLast ? (
                  <span className="font-medium text-foreground" aria-current="page">
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
