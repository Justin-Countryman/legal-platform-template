'use client'

import {useEffect, useId, useState} from 'react'
import Link from 'next/link'
import {SanityImage} from '@/components/ui/SanityImage'
import {hasImage, type SanityImage as SanityImageData} from '@/lib/sanity/image'
import {usePathname} from 'next/navigation'
import {resolveTokenString, type NapTokens} from '@/lib/tokens'
import {FormEmbed} from '@/components/layout/footers/FormEmbed'
import {Button} from '@/components/ui/Button'
import {Input} from '@/components/ui/Input'
import {SidebarPanel} from '@/components/ui/SidebarPanel'
import {
  derivePrimaryAolSlug,
  deriveCurrentChildSlug,
  sortAolsByNavOrder,
} from '@/lib/sidebarHierarchy'
import {
  useSidebarDesignSettings,
} from '@/lib/sidebarDesignSettingsContext'
import type {SidebarNavIconStyle} from '@/lib/designTokens'

// ─── Active-state helper (WS-Sidebar Phase 2.2) ───────────────────────────────
//
// Pathname comparison for current-page highlight. Normalizes trailing slashes
// because next.config has no `trailingSlash: true` — Next emits href without
// the trailing slash in rendered DOM, but the sidebar builds links with the
// canonical `/${slug}/` form. The two must compare equal.
//
// Returns false for non-navigable hrefs (`#`, empty) so they never light up
// as the current page when pathname happens to also be falsy.

function normalizePath(p: string): string {
  return p.endsWith('/') ? p : p + '/'
}

export function isCurrentPath(href: string | null | undefined, pathname: string | null): boolean {
  if (!pathname || !href || href === '#') return false
  return normalizePath(href) === normalizePath(pathname)
}

// Cascade-aware className for the active link state on tertiary-button-style
// sidebar nav rows. `!` defeats the Button tertiary defaults
// (`text-action-text font-medium`); both replacement tokens are surface-aware
// so they flip on dark contexts via the standard cascade.
const ACTIVE_TERTIARY_CLASS = '!text-foreground !font-semibold'

// ─── Icon style + separator helpers (WS-Sidebar Phase 2.5) ────────────────────
//
// `sidebarNavIconStyle` selects between Button's tertiary defaults
// (`'arrows'` — `→`), Button with chevron glyph (`'chevrons'`), and
// no-icon-with-bg-hover-shift (`'none'`). The hover-bg uses `bg-foreground/5`
// which is cascade-aware (foreground flips on dark surfaces). Hover timing
// inherits from Button's `transition-colors duration-ui-fast`, which the
// runtime maps to the site-level button animation speed.

type IconStyleProps = {
  noArrow: boolean
  arrowGlyph: 'arrow' | 'chevron'
  extraClassName: string
}

function iconStyleProps(iconStyle: SidebarNavIconStyle): IconStyleProps {
  if (iconStyle === 'none') {
    return {noArrow: true, arrowGlyph: 'arrow', extraClassName: 'hover:bg-foreground/5 rounded'}
  }
  if (iconStyle === 'chevrons') {
    return {noArrow: false, arrowGlyph: 'chevron', extraClassName: ''}
  }
  return {noArrow: false, arrowGlyph: 'arrow', extraClassName: ''}
}

// Returns the border-bottom className for a sibling list item per Edwards
// separator rules (BI/BI-Sidebar.md §5b):
//   - `itemSeparators=false` → no border
//   - last item in its list → no border
//   - sibling with an OPEN disclosure beneath it → no border (Edwards: the
//     omitted line is what visually anchors the grandchildren to their parent)
//   - otherwise → `border-b border-foreground/10` (cascade-aware)
function separatorClass(
  itemSeparators: boolean,
  isLast: boolean,
  disclosureOpen?: boolean,
): string {
  if (!itemSeparators) return ''
  if (isLast) return ''
  if (disclosureOpen) return ''
  // pb-3 gives the hairline breathing room from the row text above it; the
  // list's space-y supplies the gap below the line — premium, uncramped rhythm.
  return 'border-b border-foreground/10 pb-3'
}

// ─── Types ────────────────────────────────────────────────────────────────────
//
// Discriminated union of GROQ-projected sidebar widget shapes. Discriminator
// is `_componentType` — the GROQ projection at `lib/sanity/queries.ts` (the
// SIDEBAR_FRAGMENT + the inline blog projection) maps the underlying Sanity
// `_type` onto this literal so the dispatcher below narrows cleanly.
//
// Adding a new sidebar variant: extend `SidebarComponent` with a new branch,
// add the corresponding GROQ projection in `lib/sanity/queries.ts`, and add
// the dispatch case in the `Sidebar` component below.
//
// WS-Sidebar Phase 1 (2026-05-16) resolves WS8 Decision-2 — no `[key: string]: any`
// escape hatch. See `BI/BI-Sidebar.md` and `OUTSTANDING.md → "WS-Sidebar —
// Sidebar System workstream"`. Re-introduction is guarded by
// `eslint.config.mjs` (file-scoped no-restricted-syntax block).

export type SidebarPhoto = SanityImageData | null

export type SidebarAttorney = {
  _id: string
  title?: string
  slug?: string
  photo?: SidebarPhoto
}

export type SidebarLink = {
  _id?: string
  _type?: string
  slug?: string
  title?: string
}

// WS-Sidebar Phase 2.3 — the context-aware AOL tree projected by
// SIDEBAR_FRAGMENT (and the inline blog projection). Each AOL is a top-level
// practiceArea (no `parentPage` set); children are direct child practiceArea
// docs; grandchildren are practiceArea docs whose parent is itself a child.
//
// `slug` values are the full nested slugs Sanity emits — e.g. `family-law`,
// `family-law/divorce`, `family-law/divorce/contested-divorce`. The render
// path uses the terminal URL segment for child-match; hrefs use the full
// nested slug.

export type SidebarAolGrandchild = {
  slug: string
  title: string
}

export type SidebarAolChild = {
  _id: string
  slug: string
  title: string
  grandchildren: SidebarAolGrandchild[]
}

export type SidebarAol = {
  _id: string
  slug: string
  title: string
  children: SidebarAolChild[]
}

export type SidebarButton = {
  title?: string
  url?: string
  variant?: string
} | null

export type SidebarPostsItem = {h1: string; slug: string}

export type SidebarTocComponent = {
  _componentType: 'sidebarTableOfContents'
  enabled?: boolean
}

export type SidebarNavComponent = {
  _componentType: 'sidebarNav'
  header?: string
  description?: string
  mode?: 'practiceArea' | 'geoPracticeArea' | 'custom' | 'recentPosts' | 'faqPosts'
  // WS-Sidebar Phase 2.3 — hierarchy modes (practiceArea, geoPracticeArea)
  // render from the projected AOL tree + nav ordering. Both fields are
  // optional/nullable to tolerate datasets without practiceAreas or without
  // a mainNavigation document.
  areasOfLaw?: Array<SidebarAol | null> | null
  orderedAolIds?: string[] | null
  links?: Array<SidebarLink | null> | null
  posts?: Array<SidebarPostsItem> | null
  postCount?: number
}

export type SidebarCtaBoxComponent = {
  _componentType: 'sidebarCtaBox'
  header?: string
  supportingText1?: string
  supportingText2?: string
  phoneNumber?: string
  button?: SidebarButton
  layout?: 'left' | 'centered'
}

export type SidebarFormEmbedComponent = {
  _componentType: 'sidebarFormEmbed'
  header?: string
  description?: string
  // `null` covers the GROQ projection path where `form->formEmbed` resolves
  // to a referenced document with no embed HTML set; the runtime branch in
  // `SidebarFormEmbed` treats null and undefined identically (fallback text).
  formEmbed?: string | null
}

export type SidebarAttorneyListComponent = {
  _componentType: 'sidebarAttorneyList'
  header?: string
  mode?: 'practiceArea' | 'manual' | 'all'
  layout?: 'list' | 'avatar'
  attorneys?: Array<SidebarAttorney | null> | null
  orderedAttorneyIds?: string[] | null
}

export type SidebarComponent =
  | SidebarTocComponent
  | SidebarNavComponent
  | SidebarCtaBoxComponent
  | SidebarFormEmbedComponent
  | SidebarAttorneyListComponent

type Props = {
  components: SidebarComponent[]
  napTokens?: NapTokens | null
  /** Body content — used to extract headings for Table of Contents */
  body?: unknown[] | null
  /** Prepend a blog search widget at the top of the sidebar */
  showSearch?: boolean
}

// ─── Blog Search Widget ───────────────────────────────────────────────────────

function SidebarSearchWidget() {
  const settings = useSidebarDesignSettings()
  return (
    <SidebarPanel title="Search Articles" showHeaderLine={settings.sidebarWidgetHeaderLine}>
      <form action="/blog/" method="GET">
        <label htmlFor="sidebar-blog-search" className="sr-only">Search blog posts</label>
        <Input
          id="sidebar-blog-search"
          type="search"
          name="q"
          placeholder="Search blog posts…"
          trailingSlot={
            <button
              type="submit"
              aria-label="Search"
              className="flex h-full items-center px-3 text-foreground-muted transition-colors duration-ui-fast hover:text-foreground"
            >
              <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75">
                <circle cx="8.5" cy="8.5" r="5.5" />
                <path d="M13.5 13.5L18 18" strokeLinecap="round" />
              </svg>
            </button>
          }
        />
      </form>
    </SidebarPanel>
  )
}

// ─── Table of Contents ────────────────────────────────────────────────────────

function extractHeadings(body: unknown[] | null | undefined) {
  if (!body) return []
  return body
    .filter((block: unknown) => {
      const b = block as {_type?: string; style?: string}
      return b._type === 'block' && ['h2', 'h3'].includes(b.style ?? '')
    })
    .map((block: unknown) => {
      const b = block as {style?: string; children?: unknown[]}
      const text = (b.children ?? [])
        .filter((span: unknown) => (span as {_type?: string})._type === 'span')
        .map((span: unknown) => (span as {text?: string}).text ?? '')
        .join('')
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
      return {text, id, level: b.style as 'h2' | 'h3'}
    })
    .filter((h: {text: string}) => h.text)
}

function SidebarToc({body}: {body: unknown[] | null | undefined}) {
  const headings = extractHeadings(body)
  const settings = useSidebarDesignSettings()
  if (headings.length === 0) return null
  return (
    <SidebarPanel title="On This Page" showHeaderLine={settings.sidebarWidgetHeaderLine}>
      <nav aria-label="Table of contents">
        <ul className="space-y-1">
          {headings.map((h, i) => (
            <li key={i} className={h.level === 'h3' ? 'pl-3' : ''}>
              <a
                href={`#${h.id}`}
                className="block py-0.5 text-sm text-foreground hover:underline"
              >
                {h.text}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </SidebarPanel>
  )
}

// ─── Sidebar Nav — hierarchy helpers (WS-Sidebar Phase 2.3) ───────────────────
//
// One nav-row primitive shared across all hierarchy positions (AOL parent,
// child, grandchild) and the flat-list fallback. Centralizes the
// Phase-2.2 active-state contract (`isCurrentPath` + cascade-aware className
// + aria-current) so adding a new hierarchy depth later (Phase 2.4 accordion
// toggle, future deeper nesting) reuses the same row rendering.

function HierarchyNavRow({
  href,
  label,
  pathname,
  iconStyle,
  className,
}: {
  href: string
  label: string
  pathname: string | null
  iconStyle: SidebarNavIconStyle
  className?: string
}) {
  const active = isCurrentPath(href, pathname)
  const {noArrow, arrowGlyph, extraClassName} = iconStyleProps(iconStyle)
  const composed = [
    '!whitespace-normal',
    extraClassName,
    active ? ACTIVE_TERTIARY_CLASS : '',
    className ?? '',
  ].filter(Boolean).join(' ')
  return (
    <Button
      variant="tertiary"
      context="light"
      arrowPosition="leading"
      arrowGlyph={arrowGlyph}
      noArrow={noArrow}
      href={href}
      className={composed}
      aria-current={active ? 'page' : undefined}
    >
      {label}
    </Button>
  )
}

// ─── Grandchild accordion (WS-Sidebar Phase 2.4) ──────────────────────────────
//
// Per-child disclosure for grandchildren groupings. Plus icon toggle (fixed —
// not affected by sidebarNavIconStyle per BI/BI-Sidebar.md §2), aria-expanded
// + aria-controls + inert-on-collapsed, grid-rows height animation cribbed
// from FaqAccordion (the canonical disclosure primitive — see
// `components/ui/FaqAccordion.tsx` and BI-TESTING.md anchor for disclosure).
//
// Open-state semantics:
//   - Initial mount → `autoOpen` (true when this child is the current page
//     ancestor; doctrine §1 row 2 "that specific child's grandchildren
//     accordion is auto-open").
//   - Manual click → user-controlled toggle.
//   - Pathname-driven autoOpen change → re-sync to the new autoOpen value.
//     This honors doctrine §2 "Closed by default otherwise" when navigating
//     away from the child, while keeping the user's manual toggle sticky
//     within the same pathname (autoOpen doesn't change → effect doesn't
//     fire). The split-button pattern (separate <Link> for navigation,
//     separate <button> for toggle) preserves the canonical UX where clicking
//     the row text navigates and clicking the chevron-equivalent expands.

function HierarchyChildItem({
  child,
  pathname,
  autoOpen,
  iconStyle,
  itemSeparators,
  isLast,
}: {
  child: SidebarAolChild
  pathname: string | null
  autoOpen: boolean
  iconStyle: SidebarNavIconStyle
  itemSeparators: boolean
  isLast: boolean
}) {
  const baseId = useId()
  const panelId = `${baseId}-grandchildren`
  const hasGrandchildren = child.grandchildren.length > 0
  const [isOpen, setIsOpen] = useState(autoOpen)

  // Re-sync to the autoOpen value whenever pathname-derived context changes.
  // The dependency is `autoOpen` (not pathname) so user-triggered toggles
  // within the same context (autoOpen unchanged) stay sticky.
  useEffect(() => {
    setIsOpen(autoOpen)
  }, [autoOpen])

  // Edwards pattern (BI/BI-Sidebar.md §5b): suppress the line under a child
  // when its disclosure is open — the omitted line visually anchors the
  // grandchildren to their parent. `isOpen` covers both the auto-open and
  // user-toggled states.
  const sepCls = separatorClass(itemSeparators, isLast, hasGrandchildren && isOpen)

  if (!hasGrandchildren) {
    return (
      <li className={sepCls}>
        <HierarchyNavRow
          href={`/${child.slug}/`}
          label={child.title}
          pathname={pathname}
          iconStyle={iconStyle}
        />
      </li>
    )
  }

  return (
    <li className={sepCls}>
      <div className="flex w-full items-center justify-between gap-2">
        <HierarchyNavRow
          href={`/${child.slug}/`}
          label={child.title}
          pathname={pathname}
          iconStyle={iconStyle}
        />
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={panelId}
          aria-label={isOpen ? `Collapse ${child.title} subtopics` : `Expand ${child.title} subtopics`}
          onClick={() => setIsOpen((v) => !v)}
          // Focus ring uses `ring-inset` — matches the FaqAccordion exception
          // (row-based UI; outset ring would visually fight sibling rows).
          className={[
            'shrink-0 -mr-1 inline-flex h-6 w-6 items-center justify-center rounded',
            'text-foreground-muted hover:text-foreground',
            'transition-colors duration-ui-base ease-smooth',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus',
          ].join(' ')}
          data-sidebar-grandchildren-toggle={child.slug}
        >
          {/* Animated plus↔minus (matches the AOL toggle) — vertical bar scales
              to 0 on open. Decorative; button carries the aria-label. */}
          <span aria-hidden="true" className="relative inline-block h-3.5 w-3.5">
            <span className="absolute left-1/2 top-1/2 h-0.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current" />
            <span
              className={[
                'absolute left-1/2 top-1/2 h-3.5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current origin-center',
                'transition-transform duration-ui-base ease-smooth motion-reduce:transition-none',
                isOpen ? 'scale-y-0' : 'scale-y-100',
              ].join(' ')}
            />
          </span>
        </button>
      </div>

      {/* Disclosure panel — grid-template-rows transition animates without
          JS measurement; `inert` blocks keyboard focus on grandchild links
          when closed (WCAG 2.1.1). aria-hidden mirrors visibility for AT.
          Pattern lifted from FaqAccordion. */}
      <div
        id={panelId}
        aria-hidden={!isOpen}
        className={[
          'grid transition-[grid-template-rows] duration-structural-base ease-smooth',
          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        ].join(' ')}
      >
        <div className="overflow-hidden" inert={!isOpen}>
          <ul
            className={[
              'mt-1 space-y-1 pl-4 transition-opacity duration-structural-base ease-smooth',
              isOpen ? 'opacity-100' : 'opacity-0',
            ].join(' ')}
            data-sidebar-grandchildren={child.slug}
          >
            {child.grandchildren.map((gc, i) => {
              const gcSep = separatorClass(
                itemSeparators,
                i === child.grandchildren.length - 1,
              )
              return (
                <li key={gc.slug} className={gcSep}>
                  <HierarchyNavRow
                    href={`/${gc.slug}/`}
                    label={gc.title}
                    pathname={pathname}
                    iconStyle={iconStyle}
                  />
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </li>
  )
}

// Scenarios 1–3: the primary AOL renders with its parent link at the top, all
// direct children visible underneath. Each child with grandchildren gets a
// disclosure (Phase 2.4) — auto-open when the visitor is on that child page,
// closed otherwise.

function HierarchyExpandedAol({
  aol,
  pathname,
  currentChildSlug,
  iconStyle,
  trailingSeparator,
}: {
  aol: SidebarAol
  pathname: string | null
  currentChildSlug: string | null
  iconStyle: SidebarNavIconStyle
  trailingSeparator?: boolean
}) {
  const baseId = useId()
  const panelId = `${baseId}-aol-children`
  const hasChildren = aol.children.length > 0
  // The current area of law is an accordion, open by default (the visitor is
  // inside it). The plus toggle lets them collapse/expand its child pages.
  const [isOpen, setIsOpen] = useState(true)
  // Parent-level hairline beneath the whole block (after its children when
  // open, under the row when collapsed/childless) divides it from the AOLs below.
  const wrap = [
    'space-y-1.5',
    trailingSeparator ? 'border-b border-foreground/10 pb-3' : '',
  ].filter(Boolean).join(' ')

  if (!hasChildren) {
    return (
      <ul className={wrap}>
        <li>
          <HierarchyNavRow href={`/${aol.slug}/`} label={aol.title} pathname={pathname} iconStyle={iconStyle} />
        </li>
      </ul>
    )
  }

  return (
    <ul className={wrap}>
      <li>
        <div className="flex w-full items-center justify-between gap-2">
          {/* Leading icon follows the site design setting on EVERY row (with or
              without children) for consistency; the ± toggle is an additional,
              separate affordance on the right. */}
          <HierarchyNavRow href={`/${aol.slug}/`} label={aol.title} pathname={pathname} iconStyle={iconStyle} />
          <button
            type="button"
            aria-expanded={isOpen}
            aria-controls={panelId}
            aria-label={isOpen ? `Collapse ${aol.title} pages` : `Expand ${aol.title} pages`}
            onClick={() => setIsOpen((v) => !v)}
            className={[
              'shrink-0 -mr-1 inline-flex h-6 w-6 items-center justify-center rounded',
              'text-foreground-muted hover:text-foreground',
              'transition-colors duration-ui-base ease-smooth',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus',
            ].join(' ')}
            data-sidebar-aol-toggle={aol.slug}
          >
            {/* Animated plus↔minus (pure CSS): two `currentColor` bars; the
                vertical bar smoothly scales to 0 on open, morphing + into −.
                Cascade-aware (uses currentColor), GPU-cheap, reduced-motion safe.
                Chevrons are reserved for the page nav rows, so the toggle uses ±. */}
            <span aria-hidden="true" className="relative inline-block h-3.5 w-3.5">
              <span className="absolute left-1/2 top-1/2 h-0.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current" />
              <span
                className={[
                  'absolute left-1/2 top-1/2 h-3.5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current origin-center',
                  'transition-transform duration-ui-base ease-smooth motion-reduce:transition-none',
                  isOpen ? 'scale-y-0' : 'scale-y-100',
                ].join(' ')}
              />
            </span>
          </button>
        </div>
        {/* Children: indented (no rail), grouped — no separators between them. */}
        <div
          id={panelId}
          aria-hidden={!isOpen}
          className={[
            'grid transition-[grid-template-rows] duration-structural-base ease-smooth',
            isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
          ].join(' ')}
        >
          <div className="overflow-hidden" inert={!isOpen}>
            <ul
              className={[
                'mt-1.5 space-y-1.5 pl-5 transition-opacity duration-structural-base ease-smooth',
                isOpen ? 'opacity-100' : 'opacity-0',
              ].join(' ')}
              data-sidebar-aol-children={aol.slug}
            >
              {aol.children.map((child, i) => (
                <HierarchyChildItem
                  key={child._id}
                  child={child}
                  pathname={pathname}
                  autoOpen={currentChildSlug === child.slug && child.grandchildren.length > 0}
                  iconStyle={iconStyle}
                  itemSeparators={false}
                  isLast={i === aol.children.length - 1}
                />
              ))}
            </ul>
          </div>
        </div>
      </li>
    </ul>
  )
}

// Scenario 4 (non-practice page) + bottom list under scenarios 1–3.
// Flat parent-only links; no children rendered.

function HierarchyParentOnlyList({
  aols,
  pathname,
  className,
  iconStyle,
  itemSeparators,
}: {
  aols: SidebarAol[]
  pathname: string | null
  className?: string
  iconStyle: SidebarNavIconStyle
  itemSeparators: boolean
}) {
  return (
    <ul className={className ?? 'space-y-2'}>
      {aols.map((aol, i) => {
        const sep = separatorClass(itemSeparators, i === aols.length - 1)
        return (
          <li key={aol._id} className={sep}>
            <HierarchyNavRow
              href={`/${aol.slug}/`}
              label={aol.title}
              pathname={pathname}
              iconStyle={iconStyle}
            />
          </li>
        )
      })}
    </ul>
  )
}

// ─── Sidebar Nav ──────────────────────────────────────────────────────────────

function SidebarNav({component}: {component: SidebarNavComponent}) {
  const {header, description, mode, links, posts, areasOfLaw, orderedAolIds} = component
  const pathname = usePathname()
  const settings = useSidebarDesignSettings()
  const iconStyle = settings.sidebarNavIconStyle
  const itemSeparators = settings.sidebarItemSeparators
  const showHeaderLine = settings.sidebarWidgetHeaderLine

  const isHierarchyMode = mode === 'practiceArea' || mode === 'geoPracticeArea'

  // ─── Hierarchy modes (practiceArea, geoPracticeArea) — Phase 2.3 ──────────
  // Doctrine: BI/BI-Sidebar.md §1 (the 4-scenario decision table).
  if (isHierarchyMode) {
    const rawAols = (areasOfLaw ?? []).filter(
      (a): a is SidebarAol => a !== null && a !== undefined,
    )
    const orderedAols = sortAolsByNavOrder(rawAols, orderedAolIds ?? [])

    if (orderedAols.length === 0) {
      // No AOLs in the dataset — render header/description only if either is
      // set, otherwise emit nothing.
      if (!header && !description) return null
      return (
        <SidebarPanel title={header} showHeaderLine={showHeaderLine}>
          {description && (
            <p className="text-sm text-foreground-muted">{description}</p>
          )}
        </SidebarPanel>
      )
    }

    const aolSlugs = orderedAols.map((a) => a.slug)
    const primarySlug = derivePrimaryAolSlug(pathname, aolSlugs)
    const primaryAol = primarySlug
      ? orderedAols.find((a) => a.slug === primarySlug) ?? null
      : null
    const childSlugs = primaryAol ? primaryAol.children.map((c) => c.slug) : []
    const currentChildSlug = primaryAol
      ? deriveCurrentChildSlug(pathname, primaryAol.slug, childSlugs)
      : null
    const otherAols = primaryAol
      ? orderedAols.filter((a) => a._id !== primaryAol._id)
      : []

    return (
      <SidebarPanel title={header} showHeaderLine={showHeaderLine}>
        {description && (
          <p className="mb-3 text-sm text-foreground-muted">{description}</p>
        )}
        <nav aria-label={header ?? 'Practice area navigation'}>
          {primaryAol ? (
            // Scenarios 1–3: primary AOL expanded at top + others as parent-only
            <>
              <HierarchyExpandedAol
                aol={primaryAol}
                pathname={pathname}
                currentChildSlug={currentChildSlug}
                iconStyle={iconStyle}
                trailingSeparator={itemSeparators && otherAols.length > 0}
              />
              {otherAols.length > 0 && (
                <HierarchyParentOnlyList
                  aols={otherAols}
                  pathname={pathname}
                  className="mt-3 space-y-2"
                  iconStyle={iconStyle}
                  itemSeparators={itemSeparators}
                />
              )}
            </>
          ) : (
            // Scenario 4: non-practice page → flat parent-only list of all AOLs
            <HierarchyParentOnlyList
              aols={orderedAols}
              pathname={pathname}
              iconStyle={iconStyle}
              itemSeparators={itemSeparators}
            />
          )}
        </nav>
      </SidebarPanel>
    )
  }

  // ─── Non-hierarchy modes (custom, recentPosts, faqPosts) — Phase 2.2 ──────
  let navLinks: Array<{label: string; href: string}> = []

  if (mode === 'custom' && links) {
    // Belt-and-suspenders null filter — paired with GROQ post-projection
    // [defined(_id)] on sidebar links (see queries.ts SIDEBAR_FRAGMENT).
    navLinks = links
      .filter((l): l is SidebarLink => l !== null)
      .map((l) => ({
        label: l.title ?? '',
        href:  l.slug ? `/${l.slug}/` : '#',
      }))
  } else if ((mode === 'recentPosts' || mode === 'faqPosts') && posts) {
    const limit: number = component.postCount ?? 5
    navLinks = posts.slice(0, limit).map((p) => ({
      label: p.h1,
      href:  `/${p.slug}/`,
    }))
  }

  const hasNavLinks = navLinks.length > 0
  if (!header && !description && !hasNavLinks) return null
  const {noArrow, arrowGlyph, extraClassName} = iconStyleProps(iconStyle)

  return (
    <SidebarPanel title={header} showHeaderLine={showHeaderLine}>
      {description && (
        <p className="mb-3 text-sm text-foreground-muted">{description}</p>
      )}
      {hasNavLinks && (
        <nav aria-label={header ?? 'Sidebar navigation'}>
          <ul className="space-y-1">
            {navLinks.map((link, i) => {
              const active = isCurrentPath(link.href, pathname)
              const sep = separatorClass(itemSeparators, i === navLinks.length - 1)
              return (
                <li key={i} className={sep}>
                  {/* !whitespace-normal defeats <Button variant="tertiary"> default */}
                  {/* whitespace-nowrap so long blog post titles (recentPosts mode) and */}
                  {/* long FAQ links (faqPosts) and long custom labels wrap inside the  */}
                  {/* 320px sidebar column. Locked in WS7.7 Commit 7.                   */}
                  <Button
                    variant="tertiary"
                    context="light"
                    arrowPosition="leading"
                    arrowGlyph={arrowGlyph}
                    noArrow={noArrow}
                    href={link.href}
                    className={[
                      '!whitespace-normal',
                      extraClassName,
                      active ? ACTIVE_TERTIARY_CLASS : '',
                    ].filter(Boolean).join(' ')}
                    aria-current={active ? 'page' : undefined}
                  >
                    {link.label}
                  </Button>
                </li>
              )
            })}
          </ul>
        </nav>
      )}
    </SidebarPanel>
  )
}

// ─── Sidebar CTA Box ──────────────────────────────────────────────────────────

function SidebarCtaBox({component, napTokens}: {component: SidebarCtaBoxComponent; napTokens?: NapTokens | null}) {
  const {header, supportingText1, supportingText2, phoneNumber, button, layout} = component
  const settings = useSidebarDesignSettings()
  const centered = layout === 'centered'

  const href = button?.url ?? '/contact/'

  return (
    <SidebarPanel
      title={header ? resolveTokenString(header, napTokens) : undefined}
      showHeaderLine={settings.sidebarWidgetHeaderLine}
      className={centered ? 'text-center' : undefined}
    >
      {supportingText1 && (
        <p className="mb-1 text-sm text-foreground">{resolveTokenString(supportingText1, napTokens)}</p>
      )}
      {supportingText2 && (
        <p className="mb-1 text-sm text-foreground">{resolveTokenString(supportingText2, napTokens)}</p>
      )}
      {phoneNumber && (() => {
        const resolvedPhone = resolveTokenString(phoneNumber, napTokens)
        return (
          <a
            href={`tel:${resolvedPhone.replace(/\D/g, '')}`}
            className="mb-4 mt-2 block text-xl font-bold text-foreground transition-opacity duration-ui-fast hover:opacity-70"
          >
            {resolvedPhone}
          </a>
        )
      })()}
      {button?.title && (
        <Button
          href={href}
          fullWidth
          className="mt-4"
          target={href.startsWith('http') ? '_blank' : undefined}
        >
          {button.title}
        </Button>
      )}
    </SidebarPanel>
  )
}

// ─── Sidebar Form Embed ───────────────────────────────────────────────────────

function SidebarFormEmbed({component}: {component: SidebarFormEmbedComponent}) {
  const {header, description, formEmbed} = component
  const settings = useSidebarDesignSettings()
  return (
    <SidebarPanel title={header} showHeaderLine={settings.sidebarWidgetHeaderLine}>
      {description && (
        <p className="mb-4 text-sm text-foreground-muted">{description}</p>
      )}
      {formEmbed ? (
        <FormEmbed html={formEmbed} />
      ) : (
        <p className="text-sm text-foreground-muted">No form selected.</p>
      )}
    </SidebarPanel>
  )
}

// ─── Sidebar Attorney List ────────────────────────────────────────────────────

function SidebarAttorneyList({component}: {component: SidebarAttorneyListComponent}) {
  const {header, attorneys: rawAttorneys, mode, layout, orderedAttorneyIds} = component
  const pathname = usePathname()
  const settings = useSidebarDesignSettings()
  let attorneys: SidebarAttorney[] = (rawAttorneys ?? []).filter(
    (a): a is SidebarAttorney => a !== null && a !== undefined,
  )
  if (mode === 'practiceArea' && orderedAttorneyIds?.length) {
    const order = new Map(orderedAttorneyIds.map((id, i) => [id, i]))
    attorneys = [...attorneys].sort(
      (a, b) => (order.get(a._id) ?? Infinity) - (order.get(b._id) ?? Infinity),
    )
  }
  if (attorneys.length === 0) return null
  const label = header || 'Our Attorneys'
  const {noArrow, arrowGlyph, extraClassName} = iconStyleProps(settings.sidebarNavIconStyle)

  return (
    <SidebarPanel title={label} showHeaderLine={settings.sidebarWidgetHeaderLine}>
      <ul className={layout === 'avatar' ? 'space-y-3' : 'space-y-1'}>
        {attorneys.map(
          (attorney, i) => {
            const href = attorney.slug ? `/${attorney.slug}/` : null
            const active = isCurrentPath(href, pathname)
            const sep = separatorClass(
              settings.sidebarItemSeparators,
              i === attorneys.length - 1,
            )
            return (
              <li key={attorney._id ?? i} className={sep}>
                {href ? (
                  layout === 'avatar' ? (
                    <Link
                      href={href}
                      className="group flex items-center gap-3 py-1 transition-opacity duration-ui-fast hover:opacity-80"
                      aria-current={active ? 'page' : undefined}
                    >
                      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-muted border border-border">
                        {hasImage(attorney.photo) && (
                          <SanityImage
                            image={attorney.photo}
                            mode="fill"
                            alt={attorney.photo.alt ?? attorney.title ?? ''}
                            sizes="36px"
                          />
                        )}
                      </div>
                      <span className={`text-sm text-foreground ${active ? 'font-semibold' : 'font-medium'}`}>
                        {attorney.title ?? 'Attorney'}
                      </span>
                    </Link>
                  ) : (
                    <Button
                      variant="tertiary"
                      context="light"
                      arrowPosition="leading"
                      arrowGlyph={arrowGlyph}
                      noArrow={noArrow}
                      href={href}
                      className={[
                        // Match the practice-area nav rows (HierarchyNavRow): allow the
                        // label to wrap so the leading chevron aligns identically across
                        // attorney + practice-area rows (Button base is whitespace-nowrap).
                        '!whitespace-normal',
                        extraClassName,
                        active ? ACTIVE_TERTIARY_CLASS : '',
                      ].filter(Boolean).join(' ') || undefined}
                      aria-current={active ? 'page' : undefined}
                    >
                      {attorney.title ?? 'Attorney'}
                    </Button>
                  )
                ) : (
                  <span className="block py-1 text-sm font-medium text-foreground">
                    {attorney.title ?? 'Attorney'}
                  </span>
                )}
              </li>
            )
          },
        )}
      </ul>
    </SidebarPanel>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export function Sidebar({components, napTokens, body, showSearch}: Props) {
  const hasComponents = components && components.length > 0
  if (!showSearch && !hasComponents) return null

  return (
    <div className="space-y-6">
      {showSearch && <SidebarSearchWidget />}
      {hasComponents && components.map((component, i) => {
        switch (component._componentType) {
          case 'sidebarTableOfContents':
            return component.enabled !== false ? (
              <SidebarToc key={i} body={body} />
            ) : null
          case 'sidebarNav':
            return <SidebarNav key={i} component={component} />
          case 'sidebarCtaBox':
            return <SidebarCtaBox key={i} component={component} napTokens={napTokens} />
          case 'sidebarFormEmbed':
            return <SidebarFormEmbed key={i} component={component} />
          case 'sidebarAttorneyList':
            return <SidebarAttorneyList key={i} component={component} />
          default: {
            // Exhaustiveness check — if a new variant is added to the
            // SidebarComponent union without a case here, TS will widen
            // `component` to `never` and this assignment fails to compile.
            const _exhaustive: never = component
            void _exhaustive
            return null
          }
        }
      })}
    </div>
  )
}
