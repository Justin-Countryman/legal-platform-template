'use client'

import {useEffect, useLayoutEffect, useRef, useState, forwardRef} from 'react'
import {motion} from 'framer-motion'
import {motionConfig} from '@/lib/motionConfig'
import {RxChevronDown} from 'react-icons/rx'
import {MdPhone, MdLocationPin, MdEmail, MdClose} from 'react-icons/md'
import Link from 'next/link'
import Image from 'next/image'
import {IconButton} from '@/components/ui/IconButton'
import {ButtonGroup, type CtaItem} from '@/components/ui/ButtonGroup'

// ─── Types ────────────────────────────────────────────────────────────────────

export type NavChild = {
  label: string
  href: string
  children?: {label: string; href: string}[] | null
}

export type NavItem = {
  label: string
  href?: string | null
  displayMode?: string | null
  children?: NavChild[] | null
}

type LogoAsset = {src: string; alt: string; width: number; height: number}

export type HeaderData = {
  firmName?: string | null
  logoOnLight?: LogoAsset | null
  logoOnDark?: LogoAsset | null
  logoMarkOnLight?: LogoAsset | null
  logoMarkOnDark?: LogoAsset | null
  phone?: string | null
  tollFreePhone?: string | null
  headerLayout?: string | null
  mobileLayout?: string | null
  heroMerge?: boolean | null
  sticky?: boolean | null
  stickyHideSupplementary?: boolean | null
  compactStyle?: string | null
  defaultScheme?: string | null
  scrolledScheme?: string | null
  topBarEnabled?: boolean | null
  topBarPinSide?: string | null
  topBarLeft?: string | null
  topBarRight?: string | null
  topBarStyle?: string | null
  headerPhone?: string | null
  headerPhone2?: string | null
  headerPhoneTagline?: string | null
  headerCtaLabel?: string | null
  headerCtaUrl?: string | null
  headerCtaLabel2?: string | null
  headerCtaUrl2?: string | null
  navItems?: NavItem[] | null
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useScrolled(threshold = 80): boolean {
  const [scrolled, setScrolled] = useState(false)
  const stateRef = useRef(false)
  useEffect(() => {
    const enter = threshold
    const exit  = Math.max(0, threshold - 40)
    function check() {
      const y = window.scrollY
      if (!stateRef.current && y > enter) {
        stateRef.current = true
        setScrolled(true)
      } else if (stateRef.current && y <= exit) {
        stateRef.current = false
        setScrolled(false)
      }
    }
    window.addEventListener('scroll', check, {passive: true})
    check()
    return () => window.removeEventListener('scroll', check)
  }, [threshold])
  return scrolled
}

// Measures whether the desktop header row fits without overflow.
// Temporarily expands the row to max-content width to get its natural size,
// then compares against the parent container's available width.
// Uses useLayoutEffect so the initial correction happens before first paint.
// skipColumns: indices of grid tracks that are `fr` (fluid) and should be
// excluded from the needed-width sum. fr tracks absorb remaining space in normal
// layout, so including them at max-content produces false negatives.
export function useHeaderFits(rowRef: React.RefObject<HTMLElement | null>, skipColumns?: readonly number[]): boolean {
  const [fits, setFits] = useState(true)

  useLayoutEffect(() => {
    const el = rowRef.current
    if (!el) return

    function measure() {
      const node = rowRef.current
      if (!node) return
      const available = node.parentElement?.clientWidth ?? 0
      let needed: number

      if (getComputedStyle(node).display === 'grid') {
        // fr columns absorb free space without container overflow, so scrollWidth
        // alone can't detect when content is too wide. We also can't rely on
        // scrollWidth after setting max-content tracks because when !fits the ghost
        // element is absolutely positioned (left-0 right-0 on the outer wrapper),
        // inflating scrollWidth to the full viewport width and permanently latching
        // fits=false. Instead: set all tracks to max-content, read the computed
        // pixel track sizes via getComputedStyle, and sum them — this gives the
        // true content width regardless of the ghost's positioning context.
        // skipColumns indices (fr tracks) are excluded from the sum — they will
        // take whatever space remains so they never cause a false overflow.
        const prev = node.style.gridTemplateColumns
        node.style.gridTemplateColumns = Array.from({length: node.children.length}, () => 'max-content').join(' ')
        const computedCols = getComputedStyle(node).gridTemplateColumns
        const gap = parseFloat(getComputedStyle(node).columnGap) || 0
        const trackWidths = computedCols.split(' ').map(v => parseFloat(v) || 0)
        node.style.gridTemplateColumns = prev
        const fixedWidths = trackWidths.filter((_, i) => !skipColumns?.includes(i))
        // Keep full gap count — gaps exist between all tracks including fluid ones.
        needed = fixedWidths.reduce((a, b) => a + b, 0) + gap * Math.max(0, trackWidths.length - 1)
      } else {
        // Flex: temporarily expand to max-content. For an absolute flex ghost the
        // explicit width overrides right-0, so scrollWidth reflects content width.
        const prev = node.style.width
        node.style.width = 'max-content'
        needed = node.scrollWidth
        node.style.width = prev
      }

      setFits(needed <= available)
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el.parentElement ?? el)
    return () => ro.disconnect()
  }, [rowRef, skipColumns])

  return fits
}

// Writes --header-height to the document root so internal banner/hero components
// can apply padding-top equal to the header height without any prop drilling.
// When heroMerge is off the header is in normal flow, so the variable is set to 0
// and internal banners add no extra padding (the sticky header already pushes content down).
export function useHeaderHeight(
  ref: React.RefObject<HTMLElement | null>,
  heroMerge: boolean,
  scrolled: boolean,
) {
  useEffect(() => {
    const update = () => {
      const height = heroMerge && ref.current ? ref.current.offsetHeight : 0
      document.documentElement.style.setProperty('--header-height', `${height}px`)
    }
    update()
    if (!heroMerge) return
    const ro = new ResizeObserver(update)
    if (ref.current) ro.observe(ref.current)
    return () => ro.disconnect()
  }, [heroMerge, scrolled, ref])
}

// Locks body scroll while the mobile drawer is open.
// overscroll-contain on the drawer itself prevents scroll from bubbling to the page.
export function useScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (isLocked) document.body.classList.add('overflow-hidden')
    else document.body.classList.remove('overflow-hidden')
    return () => document.body.classList.remove('overflow-hidden')
  }, [isLocked])
}

// ─── Scheme helpers ───────────────────────────────────────────────────────────

const BG: Record<string, string> = {
  light:               'bg-background',
  dark:                'bg-brand-dark',
  glass:               'bg-background/15 backdrop-blur-md',
  'glass-dark':        'bg-brand-dark/40 backdrop-blur-md',
  'transparent-dark':  'bg-transparent',
  'transparent-light': 'bg-transparent',
}

// Cascade-aware text-color constants — replace per-scheme lookup maps that
// pre-WS5 returned different paired-token utilities by scheme. Post-WS5,
// `text-foreground`, `text-foreground-muted`, `text-foreground-subtle`, and
// `hover:text-accent` all auto-resolve via the global cascade rule
// (.bg-brand-dark / [data-ring-context="dark"]) — so a single utility per role
// renders correctly on every header scheme. BG / TOP_BAR_BG / TOP_BAR_FG stay
// scheme-keyed because background fills and the tagline-fg auto-pair are
// genuinely surface-specific.
export const HEADER_TEXT          = 'text-foreground'
export const HEADER_HOVER_TEXT    = 'hover:text-accent'
export const HEADER_MUTED_TEXT    = 'text-foreground-muted'
export const HEADER_SUBTLE_TEXT   = 'text-foreground-subtle'

export function resolveScheme(
  defaultScheme: string | null | undefined,
  scrolledScheme: string | null | undefined,
  scrolled: boolean,
): string {
  return scrolled ? (scrolledScheme ?? 'light') : (defaultScheme ?? 'light')
}

export function schemeBg(scheme: string, scrolled: boolean, floating = false): string {
  const bg = BG[scheme] ?? BG.light
  if (!scrolled) return bg
  return floating ? bg : `${bg} shadow-elevation-md`
}

export function isDarkSurface(scheme: string): boolean {
  return scheme === 'dark' || scheme === 'glass' || scheme === 'glass-dark' || scheme === 'transparent-dark'
  // transparent-light intentionally excluded — light surface, dark text and dark logo
}

// Same set of schemes considered dark for ring-color cascade purposes.
// Returns 'dark' when the scheme is dark/glass/glass-dark/transparent-dark, else undefined
// so the attribute can be omitted on light schemes (the cascade only triggers when present).
export function isDarkSurfaceScheme(scheme: string): boolean {
  return isDarkSurface(scheme)
}

// Maps transparent schemes to their solid equivalents for use on mobile, where there
// is no hero image behind the header to show through.
export function solidScheme(scheme: string | null | undefined): string {
  const s = scheme ?? 'light'
  if (s === 'transparent-dark')  return 'dark'
  if (s === 'transparent-light') return 'light'
  return s
}

// ─── Header positioning ───────────────────────────────────────────────────────

export function headerPositionClass(heroMerge: boolean, sticky: boolean): string {
  if (heroMerge) return 'fixed top-0 left-0 right-0 z-50 w-full'
  if (sticky)    return 'sticky top-0 z-50 w-full'
  return 'relative z-50 w-full'
}

// ─── Merge suppression for custom-hero page types ───────────────────────────────
// heroMerge's contract — a transparent header floating over a full-bleed hero band
// that extends up behind it — is only fulfilled by pages that render the standard
// InternalHero / InternalPageHeader (they reserve --header-height and carry a
// scheme that matches the merged header's text polarity). Attorney + staff PROFILE
// pages instead use bespoke per-template hero layouts that are contained/editorial
// cards (not full-bleed bands), don't reserve --header-height, and have light top
// edges — so a fixed transparent header overlaps their name/contact block and can
// land white text on a white surface. On those routes the header falls back to a
// solid, in-flow bar (the same solid look it takes when scrolled), which needs no
// --header-height reservation (the hook writes 0 when heroMerge is off).
//
// Only the nested profile routes are suppressed (trailing slash) — the INDEX routes
// /attorneys and /staff render the standard internal hero and merge correctly. The
// homepage will join this list once it renders its own custom hero.
export const CUSTOM_HERO_ROUTE_PREFIXES = ['/attorneys/', '/staff/'] as const

export function suppressMergeForRoute(data: HeaderData, pathname: string): HeaderData {
  if (!data.heroMerge) return data
  const isCustomHeroRoute = CUSTOM_HERO_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  if (!isCustomHeroRoute) return data
  // Drop the fixed overlay (→ sticky/in-flow; useHeaderHeight writes --header-height:0)
  // and swap the transparent at-top default for the operator's solid scrolled scheme,
  // so the header keeps a background + readable text over the bespoke profile layout.
  return {...data, heroMerge: false, defaultScheme: data.scrolledScheme ?? 'light'}
}

// ─── Logo ─────────────────────────────────────────────────────────────────────

type LogoProps = {
  data: HeaderData
  scheme: string
  useMark?: boolean
  className?: string
  ringClass?: string
}

export function HeaderLogo({data, scheme, useMark = false, className = 'h-10 lg:h-12', ringClass = 'focus-visible:ring-focus'}: LogoProps) {
  const darkSurface = isDarkSurface(scheme)
  let asset: LogoAsset | null | undefined

  if (useMark && (data.logoMarkOnLight || data.logoMarkOnDark)) {
    asset = darkSurface ? (data.logoMarkOnDark ?? data.logoOnDark) : (data.logoMarkOnLight ?? data.logoOnLight)
  } else {
    asset = darkSurface ? data.logoOnDark : data.logoOnLight
  }

  return (
    <Link
      href="/"
      aria-label={`${data.firmName ?? 'Home'} — go to homepage`}
      className={`min-w-max flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${ringClass}`}
    >
      {asset?.src ? (
        <Image
          src={asset.src}
          alt={asset.alt ?? ''}
          width={asset.width}
          height={asset.height}
          className={`w-auto transition-[height] duration-structural-slow ease-balanced ${className}`}
          priority
        />
      ) : data.firmName ? (
        <span className="font-heading text-lg font-semibold">{data.firmName}</span>
      ) : null}
    </Link>
  )
}

// ─── Top bar ──────────────────────────────────────────────────────────────────

const TOP_BAR_BG: Record<string, string> = {
  primary:   'bg-brand-dark',
  secondary: 'bg-accent',
  dark:      'bg-brand-dark',
}

const TOP_BAR_FG: Record<string, string> = {
  primary:   'text-foreground',
  secondary: 'text-accent-fg',
  dark:      'text-foreground',
}

type TopBarProps = {
  left?: string | null
  right?: string | null
  style?: string | null
  visible: boolean
  pinSide?: string | null
}

export function TopBar({left, right, style, visible, pinSide}: TopBarProps) {
  if (!left && !right) return null
  const bg = TOP_BAR_BG[style ?? 'primary'] ?? TOP_BAR_BG.primary
  const fg = TOP_BAR_FG[style ?? 'primary'] ?? TOP_BAR_FG.primary
  const pin = pinSide && pinSide !== 'none'
    ? <MdLocationPin className="shrink-0 text-sm" aria-hidden="true" />
    : null
  return (
    <div
      aria-hidden={!visible}
      className={`overflow-hidden transition-[max-height,opacity] duration-structural-slow ease-balanced ${
        visible ? 'max-h-10 opacity-100' : 'max-h-0 opacity-0'
      }`}
    >
      <div className={`${bg} px-[5%]`}>
        <div className={`container flex h-10 items-center gap-4 text-xs ${fg}`}>
          {left && (
            <span className="flex items-center gap-1.5">
              {pinSide === 'left' && pin}
              {left}
            </span>
          )}
          {/* Right content hidden on mobile — only the left message shows */}
          {right && (
            <span className="ml-auto hidden md:flex items-center gap-1.5">
              {pinSide === 'right' && pin}
              {right}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── CTA buttons ──────────────────────────────────────────────────────────────

type CtaProps = {
  data: HeaderData
  className?: string
  /** Surface context for buttons — `dark` flips primary to white-fill and swaps focus ring. Defaults to `light`. */
  context?: 'light' | 'dark'
}

export function CtaButtons({data, className = '', context = 'light'}: CtaProps) {
  const {headerCtaLabel, headerCtaUrl, headerCtaLabel2, headerCtaUrl2} = data
  if (!headerCtaUrl && !headerCtaUrl2) return null

  // Build the CTA items array shared by both responsive instances. Focus rings
  // are owned by Button via the dark-context cascade — no ringClass plumbing.
  const items: CtaItem[] = []
  if (headerCtaUrl) {
    items.push({label: headerCtaLabel ?? 'Free Consultation', url: headerCtaUrl, variant: 'primary'})
  }
  if (headerCtaUrl2) {
    items.push({label: headerCtaLabel2 ?? 'Learn More', url: headerCtaUrl2, variant: 'secondary'})
  }

  // Wrapper-div pattern: parent handles responsive show/hide so it never
  // collides with ButtonGroup's internal `flex` baseline. Mobile wrapper is
  // block at base + hidden at md+; desktop wrapper is the inverse. Each owns
  // a ButtonGroup with the layout it needs (mobile: column + fullWidth; desktop:
  // row, content-sized).
  return (
    <>
      <div className={`md:hidden ${className}`.trim()}>
        <ButtonGroup
          items={items}
          context={context}
          size="compact"
          fullWidth
          className="flex-col"
        />
      </div>
      <div className={`hidden md:block ${className}`.trim()}>
        <ButtonGroup items={items} context={context} size="compact" className="!flex-nowrap !gap-2" />
      </div>
    </>
  )
}

// ─── Desktop nav links ────────────────────────────────────────────────────────

type NavLinksProps = {
  items: NavItem[]
  textClass: string
  hoverTextClass: string
  isMobile: boolean
  className?: string
  ringClass?: string
}

export function NavLinks({items, textClass, hoverTextClass, isMobile, className = '', ringClass = 'focus-visible:ring-focus'}: NavLinksProps) {
  return (
    <ul role="list" className={`md:flex md:flex-wrap md:items-center ${className}`}>
      {items.map((item, i) => {
        const hasChildren = (item.children ?? []).length > 0
        return (
          <li key={i}>
            {hasChildren ? (
              <SubMenu navItem={item} isMobile={isMobile} textClass={textClass} hoverTextClass={hoverTextClass} ringClass={ringClass} />
            ) : item.href ? (
              <Link
                href={item.href}
                className={`block rounded-ui py-3 text-sm font-medium tracking-wide transition-colors duration-ui-fast ${hoverTextClass} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${ringClass} md:px-4 md:py-2 ${textClass}`}
              >
                {item.label}
              </Link>
            ) : (
              <span className={`block py-3 text-sm font-medium tracking-wide md:px-4 md:py-2 ${textClass}`}>
                {item.label}
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

// ─── Dropdown submenu ─────────────────────────────────────────────────────────

type FlatItem = {label: string; href: string}

function flattenChildren(navItem: NavItem): FlatItem[] {
  const children = navItem.children ?? []
  if (navItem.displayMode === 'hierarchy') {
    return children.flatMap((parent) => [
      {label: parent.label, href: parent.href},
      ...(parent.children ?? []).map((child) => ({label: child.label, href: child.href})),
    ])
  }
  return children.map((c) => ({label: c.label, href: c.href}))
}

function colClass(total: number): string {
  const mobile   = total > 6   ? 'columns-2'    : ''
  const desktop  = total >= 20 ? 'lg:columns-4' :
                   total >= 15 ? 'lg:columns-3' :
                   total > 10  ? 'lg:columns-2' : 'lg:columns-1'
  return [mobile, desktop].filter(Boolean).join(' ')
}

export function SubMenu({navItem, isMobile, textClass, hoverTextClass, ringClass = 'focus-visible:ring-focus'}: {navItem: NavItem; isMobile: boolean; textClass: string; hoverTextClass: string; ringClass?: string}) {
  const [isOpen, setIsOpen]       = useState(false)
  const [alignRight, setAlignRight] = useState(false)
  const menuId      = `nav-submenu-${navItem.label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`
  const buttonRef   = useRef<HTMLButtonElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const menuRef     = useRef<HTMLUListElement>(null)
  const flatItems   = flattenChildren(navItem)

  useEffect(() => {
    if (isOpen && menuRef.current) {
      const {right} = menuRef.current.getBoundingClientRect()
      setAlignRight(right > window.innerWidth - 8)
    }
    if (!isOpen) setAlignRight(false)
  }, [isOpen])

  function open()  { setIsOpen(true) }
  function close() { setIsOpen(false) }
  function toggle() { setIsOpen((p) => !p) }

  function getFocusableItems(): HTMLAnchorElement[] {
    return Array.from(menuRef.current?.querySelectorAll<HTMLAnchorElement>('a[href]') ?? [])
  }

  function handleBlur(e: React.FocusEvent) {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) close()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    const items = getFocusableItems()
    const focused = document.activeElement
    const idx = items.indexOf(focused as HTMLAnchorElement)

    if (e.key === 'Escape') {
      if (isOpen) { e.preventDefault(); close(); buttonRef.current?.focus() }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!isOpen) { open(); return }
      if (idx === -1) items[0]?.focus()
      else items[Math.min(idx + 1, items.length - 1)]?.focus()
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (!isOpen) return
      if (idx <= 0) { close(); buttonRef.current?.focus() }
      else items[idx - 1]?.focus()
      return
    }
    if (e.key === 'Home' && isOpen) {
      e.preventDefault(); items[0]?.focus(); return
    }
    if (e.key === 'End' && isOpen) {
      e.preventDefault(); items[items.length - 1]?.focus(); return
    }
  }

  // Crawler-discoverable rendering: the dropdown `<ul>` is always mounted so
  // its anchor children land in SSR HTML. Visibility is controlled by the
  // `animate` opacity transition + `aria-hidden` + `pointer-events-none` when
  // closed. Conditional `{isOpen && (...)}` would hide the links from
  // non-JS crawlers (Screaming Frog, Bing, robots that don't execute JS).
  //
  // Parent-with-href split: when `navItem.href` is set (e.g. navItemAttorneys
  // pointing at the /attorneys index), the label renders as a real `<a>` and
  // a sibling chevron-button toggles the dropdown. Without the split the
  // parent URL is unreachable except via the dropdown — invisible to
  // crawlers and unhelpful for keyboard users wanting to land on the index.
  const parentHref = navItem.href ?? null
  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={() => !isMobile && open()}
      onMouseLeave={() => !isMobile && close()}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    >
      {parentHref ? (
        <div className="flex w-full items-center md:flex-none">
          <Link
            href={parentHref}
            className={`block flex-1 rounded-ui py-3 text-left text-sm font-medium tracking-wide transition-colors duration-ui-fast ${hoverTextClass} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${ringClass} md:flex-none md:px-4 md:py-2 ${textClass}`}
          >
            {navItem.label}
          </Link>
          <button
            ref={buttonRef}
            type="button"
            className={`flex items-center justify-center rounded-ui px-3 py-3 transition-colors duration-ui-fast ${hoverTextClass} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${ringClass} md:py-2 ${textClass}`}
            aria-expanded={isOpen}
            aria-haspopup="true"
            aria-controls={menuId}
            aria-label={`Toggle ${navItem.label} submenu`}
            onClick={toggle}
          >
            <motion.span
              aria-hidden="true"
              animate={isOpen ? {rotate: 180} : {rotate: 0}}
              transition={motionConfig.chevron}
              className="flex-shrink-0"
            >
              <RxChevronDown />
            </motion.span>
          </button>
        </div>
      ) : (
        <button
          ref={buttonRef}
          type="button"
          className={`flex w-full items-center justify-between gap-2 rounded-ui py-3 text-left text-sm font-medium tracking-wide transition-colors duration-ui-fast ${hoverTextClass} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${ringClass} md:flex-none md:justify-start md:px-4 md:py-2 ${textClass}`}
          aria-expanded={isOpen}
          aria-haspopup="true"
          aria-controls={menuId}
          onClick={toggle}
        >
          <span>{navItem.label}</span>
          <motion.span
            aria-hidden="true"
            animate={isOpen ? {rotate: 180} : {rotate: 0}}
            transition={motionConfig.chevron}
            className="flex-shrink-0"
          >
            <RxChevronDown />
          </motion.span>
        </button>
      )}

      <motion.ul
        ref={menuRef}
        id={menuId}
        role="list"
        aria-hidden={!isOpen}
        data-ring-context="light"
        initial={false}
        animate={{opacity: isOpen ? 1 : 0, y: isOpen ? 0 : -6}}
        transition={motionConfig.dropdown}
        className={[
          'bg-muted text-foreground rounded-ui',
          colClass(flatItems.length),
          'md:absolute md:top-full md:z-50',
          alignRight ? 'md:right-0' : 'md:left-0',
          'md:min-w-48 md:shadow-elevation-md',
          'p-2',
          isOpen ? '' : 'pointer-events-none',
        ].filter(Boolean).join(' ')}
      >
        {flatItems.map((item, i) => (
          <li key={i}>
            <Link
              href={item.href}
              className="block rounded-ui px-4 py-2 pl-[5%] text-sm font-medium transition-colors duration-ui-fast hover:bg-hover-wash focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus lg:whitespace-nowrap lg:px-4"
              onClick={close}
              tabIndex={isOpen ? 0 : -1}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </motion.ul>
    </div>
  )
}

// ─── Hamburger icon lines (animated, shared across all mobile row variants) ────

function HamburgerLines({isOpen}: {isOpen: boolean}) {
  return (
    <>
      <motion.span aria-hidden="true" className="my-[3px] h-0.5 w-6 bg-current" animate={isOpen ? ['open', 'rotatePhase'] : 'closed'} variants={topLineVariants} />
      <motion.span aria-hidden="true" className="my-[3px] h-0.5 w-6 bg-current" animate={isOpen ? 'open' : 'closed'} variants={middleLineVariants} />
      <motion.span aria-hidden="true" className="my-[3px] h-0.5 w-6 bg-current" animate={isOpen ? ['open', 'rotatePhase'] : 'closed'} variants={bottomLineVariants} />
    </>
  )
}

// Hamburger morph durations: the 'closed' transitions and the rotatePhase use the canonical
// structural-fast (motionConfig.chevron.duration === 0.15s). The middle-line width-collapse
// duration (0.1s) is a faster orchestration step with no canonical motion token — left
// inline with this note.
const topLineVariants    = {open: {translateY: 8,  transition: {delay: 0.1}}, rotatePhase: {rotate: -45, transition: {delay: 0.2}}, closed: {translateY: 0, rotate: 0, transition: {duration: motionConfig.chevron.duration}}}
const middleLineVariants = {open: {width: 0,       transition: {duration: 0.1}},                                                    closed: {width: '1.5rem',           transition: {delay: 0.3, duration: motionConfig.chevron.duration}}}
const bottomLineVariants = {open: {translateY: -8, transition: {delay: 0.1}}, rotatePhase: {rotate: 45,  transition: {delay: 0.2}}, closed: {translateY: 0, rotate: 0, transition: {duration: motionConfig.chevron.duration}}}

// ─── Hamburger button (standard, with forwardRef for focus management) ─────────

type HamburgerProps = {
  isOpen: boolean
  onToggle: () => void
  ringClass?: string
}

export const Hamburger = forwardRef<HTMLButtonElement, HamburgerProps>(
  function Hamburger({isOpen, onToggle, ringClass = 'focus-visible:ring-focus'}, ref) {
    return (
      <button
        ref={ref}
        className={`-mr-2 flex size-12 flex-col items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${ringClass}`}
        aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={isOpen}
        aria-controls={NAV_PANEL_ID}
        onClick={onToggle}
      >
        <HamburgerLines isOpen={isOpen} />
      </button>
    )
  }
)

// ─── Mobile header row ────────────────────────────────────────────────────────
// Renders the mobile-only header bar. Lives outside the desktop padding container
// so action-bar variants can extend edge-to-edge. Desktop header is a sibling.

type MobileRowVariantProps = {
  data: HeaderData
  isOpen: boolean
  onToggle: () => void
  scheme: string
  hoverTextClass: string
  triggerRef: React.RefObject<HTMLButtonElement | null>
}

export function MobileHeaderRow(props: MobileRowVariantProps) {
  switch (props.data.mobileLayout) {
    case 'bar-top':     return <MobileBarTop     {...props} />
    case 'bar-bottom':  return <MobileBarBottom  {...props} />
    case 'phone-split': return <MobilePhoneSplit {...props} />
    case 'logo-split':  return <MobileLogoSplit  {...props} />
    default:            return <MobileStandard   {...props} />
  }
}

// ─── Standard — logo left, hamburger right (single row) ───────────────────────

function MobileStandard({data, isOpen, onToggle, scheme, triggerRef}: MobileRowVariantProps) {
  return (
    <div className="flex min-h-16 items-center justify-between px-[5%]">
      <div className="min-w-0 overflow-hidden">
        <HeaderLogo data={data} scheme={scheme} className="h-10 w-auto" />
      </div>
      <Hamburger ref={triggerRef} isOpen={isOpen} onToggle={onToggle} />
    </div>
  )
}

// ─── Action bar (shared between bar-top and bar-bottom) ───────────────────────
// Three equal columns: Menu | CTA/Email | Call. Degrades gracefully if phone or
// CTA are not configured.

type ActionBarProps = {
  data: HeaderData
  isOpen: boolean
  onToggle: () => void
  hoverTextClass: string
  triggerRef: React.RefObject<HTMLButtonElement | null>
}

function MobileActionBar({data, isOpen, onToggle, hoverTextClass, triggerRef}: ActionBarProps) {
  const phone    = data.headerPhone || data.tollFreePhone || data.phone
  const hasCta   = !!data.headerCtaUrl
  const hasPhone = !!phone
  const cols     = 1 + (hasCta ? 1 : 0) + (hasPhone ? 1 : 0)
  const gridCols = cols === 3 ? 'grid-cols-3' : cols === 2 ? 'grid-cols-2' : 'grid-cols-1'

  // flex-col stacks icon above label — handles any label length without centering issues
  const cellClass = `w-full flex flex-col items-center justify-center gap-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors duration-ui-fast ${hoverTextClass} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-current`

  return (
    <div className={`grid ${gridCols} divide-x divide-current/10`}>
      <button
        ref={triggerRef}
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={NAV_PANEL_ID}
        aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
        className={cellClass}
      >
        <span className="flex flex-col items-center justify-center" aria-hidden="true">
          <HamburgerLines isOpen={isOpen} />
        </span>
        <span>{isOpen ? 'Close' : 'Menu'}</span>
      </button>

      {hasCta && (
        <a href={data.headerCtaUrl!} className={cellClass}>
          <MdEmail className="text-base" aria-hidden="true" />
          <span className="text-center leading-tight">{data.headerCtaLabel ?? 'Email'}</span>
        </a>
      )}

      {hasPhone && phone && (
        <a
          href={`tel:${phone.replace(/\D/g, '')}`}
          className={cellClass}
          aria-label={`Call us at ${phone}`}
        >
          <MdPhone className="text-base" aria-hidden="true" />
          <span>Call</span>
        </a>
      )}
    </div>
  )
}

// ─── Bar-Top — action bar on top, logo centered below ─────────────────────────

function MobileBarTop({data, isOpen, onToggle, scheme, hoverTextClass, triggerRef}: MobileRowVariantProps) {
  return (
    <div>
      <MobileActionBar data={data} isOpen={isOpen} onToggle={onToggle} hoverTextClass={hoverTextClass} triggerRef={triggerRef} />
      <div className="flex justify-center px-[5%] py-3">
        <HeaderLogo data={data} scheme={scheme} className="h-10 w-auto" />
      </div>
    </div>
  )
}

// ─── Bar-Bottom — logo centered on top, action bar below ──────────────────────

function MobileBarBottom({data, isOpen, onToggle, scheme, hoverTextClass, triggerRef}: MobileRowVariantProps) {
  return (
    <div>
      <div className="flex justify-center px-[5%] py-3">
        <HeaderLogo data={data} scheme={scheme} className="h-10 w-auto" />
      </div>
      <MobileActionBar data={data} isOpen={isOpen} onToggle={onToggle} hoverTextClass={hoverTextClass} triggerRef={triggerRef} />
    </div>
  )
}

// ─── Phone-Split — logo row, then phone left + hamburger block right ───────────

function MobilePhoneSplit({data, isOpen, onToggle, scheme, hoverTextClass, triggerRef}: MobileRowVariantProps) {
  const phone = data.headerPhone || data.tollFreePhone || data.phone
  return (
    <div>
      <div className="flex min-h-12 items-center px-[5%] py-2 overflow-hidden">
        <HeaderLogo data={data} scheme={scheme} className="h-9 w-auto" />
      </div>
      <div className="flex items-stretch border-t border-current/10">
        {phone ? (
          <a
            href={`tel:${phone.replace(/\D/g, '')}`}
            className={`flex flex-1 items-center justify-center gap-3 py-3 text-sm font-semibold tracking-wide transition-colors duration-ui-fast ${hoverTextClass} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-current`}
            aria-label={`Call us at ${phone}`}
          >
            <MdPhone className="shrink-0 text-lg" aria-hidden="true" />
            <span>{phone}</span>
          </a>
        ) : (
          <div className="flex-1" />
        )}
        <button
          ref={triggerRef}
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={NAV_PANEL_ID}
          aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
          className={`flex w-16 shrink-0 flex-col items-center justify-center border-l border-current/10 bg-current/10 transition-colors duration-ui-fast ${hoverTextClass} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-current`}
        >
          <HamburgerLines isOpen={isOpen} />
        </button>
      </div>
    </div>
  )
}

// ─── Logo-Split — logo + hamburger block top row, phone centered below ─────────

function MobileLogoSplit({data, isOpen, onToggle, scheme, hoverTextClass, triggerRef}: MobileRowVariantProps) {
  const phone = data.headerPhone || data.tollFreePhone || data.phone
  return (
    <div>
      <div className="flex min-h-14 items-stretch">
        <div className="flex flex-1 min-w-0 items-center px-[5%] overflow-hidden">
          <div className="min-w-0 overflow-hidden">
            <HeaderLogo data={data} scheme={scheme} className="h-9 w-auto" />
          </div>
        </div>
        <button
          ref={triggerRef}
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={NAV_PANEL_ID}
          aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
          className={`flex w-16 shrink-0 flex-col items-center justify-center bg-current/10 transition-colors duration-ui-fast ${hoverTextClass} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-current`}
        >
          <HamburgerLines isOpen={isOpen} />
        </button>
      </div>
      {phone && (
        <div className="border-t border-current/10">
          <a
            href={`tel:${phone.replace(/\D/g, '')}`}
            className={`flex items-center justify-center gap-3 py-2.5 text-sm font-semibold tracking-wide transition-colors duration-ui-fast ${hoverTextClass} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-current`}
            aria-label={`Call us at ${phone}`}
          >
            <MdPhone className="shrink-0 text-lg" aria-hidden="true" />
            <span>{phone}</span>
          </a>
        </div>
      )}
    </div>
  )
}

// ─── Mobile drawer ────────────────────────────────────────────────────────────

export const NAV_PANEL_ID = 'main-nav-panel'

type MobileDrawerProps = {
  data: HeaderData
  isOpen: boolean
  items: NavItem[]
  onClose: () => void
  triggerRef?: React.RefObject<HTMLButtonElement | null>
}

export function MobileDrawer({data, isOpen, items, onClose, triggerRef}: MobileDrawerProps) {
  const phone    = data.headerPhone || data.tollFreePhone || data.phone
  const phone2   = data.headerPhone2 || null
  const drawerRef    = useRef<HTMLDivElement>(null)
  const hasMountedRef = useRef(false)

  // Focus management: first item on open, trigger button on close.
  // Skip on initial mount — triggerRef may be display:none on desktop,
  // which would cause the browser to scroll to the first focusable element
  // in the DOM (a drawer link positioned off-screen).
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true
      return
    }
    if (isOpen) {
      const el = drawerRef.current
      if (!el) return
      const focusable = el.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      ;(focusable[0] as HTMLElement | undefined)?.focus()
    } else {
      triggerRef?.current?.focus()
    }
  }, [isOpen, triggerRef])

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
      return
    }
    if (e.key !== 'Tab') return
    const el = drawerRef.current
    if (!el) return
    const focusable = Array.from(
      el.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    )
    if (focusable.length === 0) return
    const first = focusable[0]
    const last  = focusable[focusable.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return (
    <motion.div
      ref={drawerRef}
      id={NAV_PANEL_ID}
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
      data-ring-context="dark"
      inert={!isOpen}
      onKeyDown={handleKeyDown}
      variants={{
        open:  {opacity: 1, y: 0,      pointerEvents: 'auto'  as const},
        close: {opacity: 0, y: '-2%',  pointerEvents: 'none'  as const},
      }}
      initial="close"
      animate={isOpen ? 'open' : 'close'}
      transition={motionConfig.drawer}
      className={[
        // absolute takes the drawer out of normal flow so the sticky header
        // keeps its natural height — content never shifts when the nav opens.
        'absolute left-0 right-0 top-full',
        'h-[100dvh]',
        'px-[5%]',
        'overflow-x-hidden',
        'overscroll-contain',
        isOpen ? 'overflow-y-auto' : 'overflow-y-hidden',
        'bg-brand-dark text-foreground',
      ].join(' ')}
    >
      <nav aria-label="Main navigation" className="pb-8 pt-4">
        {/* Close button — required inside the dialog for keyboard/AT users */}
        <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-foreground-subtle">Navigation</span>
          <IconButton
            onClick={onClose}
            aria-label="Close navigation menu"
            surface="dark"
            icon={<MdClose className="text-base" aria-hidden="true" />}
            className="-mr-1"
          >
            Close
          </IconButton>
        </div>
        <ul role="list">
          {items.map((item, i) => {
            const hasChildren = (item.children ?? []).length > 0
            return (
              <li key={i} className="border-b border-border">
                {hasChildren ? (
                  <MobileSubMenu navItem={item} />
                ) : item.href ? (
                  <Link href={item.href} className="block py-4 text-sm font-medium text-foreground">
                    {item.label}
                  </Link>
                ) : (
                  <span className="block py-4 text-sm font-medium text-foreground">{item.label}</span>
                )}
              </li>
            )
          })}
        </ul>

        {phone && (
          <div className="mt-6 flex flex-col items-center gap-1 text-center">
            <a href={`tel:${phone.replace(/\D/g, '')}`} className="text-sm font-semibold text-foreground">
              {data.headerPhoneTagline ? `${data.headerPhoneTagline}: ` : ''}{phone}
            </a>
            {phone2 && (
              <a href={`tel:${phone2.replace(/\D/g, '')}`} className="text-sm font-semibold text-foreground">
                {phone2}
              </a>
            )}
          </div>
        )}

        {/* Drawer surface is always dark (bg-brand-dark + data-ring-context="dark") regardless of header scheme. */}
        <CtaButtons data={data} context="dark" className="mt-6 pb-2" />
      </nav>
    </motion.div>
  )
}

function MobileSubMenu({navItem}: {navItem: NavItem}) {
  const [isOpen, setIsOpen] = useState(false)
  const flatItems = flattenChildren(navItem)
  const submenuId = `mobile-submenu-${navItem.label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`
  // Same crawler-discoverability fix as the desktop SubMenu — always render
  // the dropdown `<ul>` so its anchor children are in SSR HTML, hide via
  // height/opacity when closed. See the desktop SubMenu comment for why.
  // Parent-with-href split mirrors the desktop pattern: when navItem.href is
  // set, render the label as a real `<a>` + a sibling chevron disclosure
  // button so the parent index URL is crawlable + keyboard-reachable
  // independent of toggling the dropdown.
  const parentHref = navItem.href ?? null
  return (
    <div>
      {parentHref ? (
        <div className="flex w-full items-center">
          <Link
            href={parentHref}
            className="flex-1 py-4 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus"
          >
            {navItem.label}
          </Link>
          <button
            className="flex items-center justify-center px-3 py-4 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus"
            aria-expanded={isOpen}
            aria-haspopup="true"
            aria-controls={submenuId}
            aria-label={`Toggle ${navItem.label} submenu`}
            onClick={() => setIsOpen((p) => !p)}
          >
            <motion.span
              aria-hidden="true"
              animate={isOpen ? {rotate: 180} : {rotate: 0}}
              transition={motionConfig.chevron}
            >
              <RxChevronDown />
            </motion.span>
          </button>
        </div>
      ) : (
        <button
          className="flex w-full items-center justify-between py-4 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus"
          aria-expanded={isOpen}
          aria-haspopup="true"
          aria-controls={submenuId}
          onClick={() => setIsOpen((p) => !p)}
        >
          <span>{navItem.label}</span>
          <motion.span
            aria-hidden="true"
            animate={isOpen ? {rotate: 180} : {rotate: 0}}
            transition={motionConfig.chevron}
          >
            <RxChevronDown />
          </motion.span>
        </button>
      )}
      <motion.ul
        id={submenuId}
        role="list"
        aria-hidden={!isOpen}
        initial={false}
        animate={{height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0}}
        transition={motionConfig.subnav}
        className="overflow-hidden pb-2"
      >
        {flatItems.map((item, i) => (
          <li key={i}>
            <Link
              href={item.href}
              className="block py-3 pl-4 text-sm text-foreground transition-colors duration-ui-fast hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus"
              tabIndex={isOpen ? 0 : -1}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </motion.ul>
    </div>
  )
}
