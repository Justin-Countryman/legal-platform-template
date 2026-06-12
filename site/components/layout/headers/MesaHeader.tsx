// Layout: Mesa
// Logo left column spanning full height.
// Right column: tagline + phone + CTA all inline on one row top | nav secondary below.
// On scroll: top row compresses, phone and CTA migrate inline into nav row.
// Differs from Spire only in that tagline, phone, and CTA share one horizontal row.

'use client'

import {useRef, useState} from 'react'
import {
  useScrolled, useHeaderFits, useHeaderHeight, useScrollLock,
  resolveScheme, schemeBg, solidScheme, headerPositionClass,
  isDarkSurfaceScheme,
  HEADER_TEXT, HEADER_HOVER_TEXT, HEADER_MUTED_TEXT, HEADER_SUBTLE_TEXT,
  HeaderLogo, TopBar, NavLinks, MobileDrawer, MobileHeaderRow,
  type HeaderData,
} from './shared'
import {Button} from '@/components/ui/Button'

type Props = {data: HeaderData}

// Column 1 is the `1fr` right column — fluid, never include in the fits measurement.
const SKIP_FLUID_COLS = [1] as const

export function MesaHeader({data}: Props) {
  const {
    heroMerge, sticky, stickyHideSupplementary, compactStyle,
    defaultScheme, scrolledScheme,
    topBarDesktop, topBarMobile, topBarPinSide, topBarLeft, topBarRight, topBarStyle,
    headerPhone, headerPhone2, phone, tollFreePhone,
    headerPhoneTagline,
    headerCtaLabel, headerCtaUrl, headerCtaLabel2, headerCtaUrl2,
    navItems,
  } = data

  const threshold  = 40
  const _scrolled  = useScrolled(threshold)
  const scrolled   = _scrolled && (!!heroMerge || !!sticky)
  const [menuOpen, setMenuOpen] = useState(false)
  const headerRef  = useRef<HTMLElement>(null)
  const desktopRef = useRef<HTMLDivElement>(null)
  const menuBtnRef = useRef<HTMLButtonElement>(null)
  const fits       = useHeaderFits(desktopRef, SKIP_FLUID_COLS)
  useHeaderHeight(headerRef, !!heroMerge, scrolled)
  useScrollLock(menuOpen)

  const scheme    = resolveScheme(defaultScheme, scrolledScheme, scrolled)
  const bgClass   = schemeBg(scheme, scrolled, compactStyle === 'float')
  const textClass       = HEADER_TEXT
  const hoverTextClass  = HEADER_HOVER_TEXT
  const mutedTextClass  = HEADER_MUTED_TEXT
  const subtleTextClass = HEADER_SUBTLE_TEXT
  const posClass        = headerPositionClass(!!heroMerge, !!sticky)
  const items     = navItems ?? []

  const displayPhone      = headerPhone || tollFreePhone || phone
  const displayPhone2     = headerPhone2 || null
  const hideSupplementary = scrolled && !!stickyHideSupplementary
  const floatingActive    = compactStyle === 'float' && scrolled
  const mobileSolid       = solidScheme(defaultScheme)
  const mobileBg          = schemeBg(mobileSolid, false)
  const dataRingContext   = isDarkSurfaceScheme(scheme) ? 'dark' : undefined
  const buttonContext     = isDarkSurfaceScheme(scheme) ? 'dark' as const : 'light' as const

  function closeMenu() { setMenuOpen(false) }

  return (
    <header ref={headerRef} data-ring-context={dataRingContext} className={`${posClass} transition-colors duration-structural-slow ease-balanced ${floatingActive ? 'bg-transparent' : `${bgClass} ${textClass}`}`}>

      {(topBarDesktop || topBarMobile) && (
        <TopBar desktop={topBarDesktop} mobile={topBarMobile} left={topBarLeft} right={topBarRight} style={topBarStyle} visible={!scrolled} pinSide={topBarPinSide} />
      )}

      {/* ── Mobile header row — outside padding container for full-bleed layouts ── */}
      <div className={`${fits ? 'md:hidden' : ''} ${mobileBg} ${textClass}`}>
        <MobileHeaderRow
          data={data}
          isOpen={menuOpen}
          onToggle={() => setMenuOpen((p) => !p)}
          scheme={scheme}
          hoverTextClass={hoverTextClass}
          compact={hideSupplementary}
          triggerRef={menuBtnRef}
        />
      </div>

      {/* ── Desktop ────────────────────────────────────────────────────────────── */}
      <div className={`transition-[padding] duration-structural-slow ease-balanced ${floatingActive ? 'px-[5%] pt-3' : 'relative px-[5%]'}`}>
        <div className={`transition-[border-radius,box-shadow,padding,background-color,color] duration-structural-slow ease-balanced ${floatingActive ? `relative rounded-ui shadow-elevation-lg px-6 ${bgClass} ${textClass}` : ''}`}>
        <div className="container">

          <div
            ref={desktopRef}
            inert={!fits}
            className={`hidden md:grid md:grid-cols-[auto_1fr] md:items-stretch${!fits ? ' absolute top-0 left-0 right-0 opacity-0 pointer-events-none' : ''}`}
          >

            <div className={`flex items-center pr-10 transition-[padding] duration-structural-slow ease-balanced ${hideSupplementary ? 'py-1.5' : 'py-4'}`}>
              <HeaderLogo
                data={data}
                scheme={scheme}
                useMark={hideSupplementary}
                className={hideSupplementary ? 'h-9' : 'h-20'}
              />
            </div>

            <div className="min-w-0 flex flex-col">

              {/* ── Top row: tagline + phone + CTA all inline ── */}
              <div
                aria-hidden={hideSupplementary}
                className={`flex items-center justify-end gap-5 overflow-hidden pr-1 transition-[max-height,opacity,padding] duration-structural-slow ease-balanced ${
                  hideSupplementary
                    ? 'max-h-0 opacity-0 py-0'
                    : 'max-h-28 opacity-100 py-4'
                }`}
              >
                {displayPhone && (
                  <div className="flex flex-col items-end gap-0.5">
                    <div className="flex items-center gap-2">
                      {headerPhoneTagline && (
                        <span className={`text-sm tracking-wide ${subtleTextClass}`} tabIndex={-1}>
                          {headerPhoneTagline}
                        </span>
                      )}
                      <a
                        href={`tel:${displayPhone.replace(/\D/g, '')}`}
                        className={`text-base font-semibold tracking-wide transition-colors duration-ui-fast ${hoverTextClass} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-current`}
                        tabIndex={hideSupplementary ? -1 : undefined}
                      >
                        {displayPhone}
                      </a>
                    </div>
                    {displayPhone2 && (
                      <a
                        href={`tel:${displayPhone2.replace(/\D/g, '')}`}
                        className={`text-sm font-semibold tracking-wide ${mutedTextClass} transition-colors duration-ui-fast ${hoverTextClass} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-current`}
                        tabIndex={hideSupplementary ? -1 : undefined}
                      >
                        {displayPhone2}
                      </a>
                    )}
                  </div>
                )}
                {(headerCtaUrl || headerCtaUrl2) && (
                  // `inert` removes the entire CTA cluster from tab order when
                  // the supplementary row collapses — preserves the original
                  // per-button `tabIndex={hideSupplementary ? -1 : undefined}`
                  // semantics through a parent-level mechanism (Button props
                  // are sealed and don't accept tabIndex directly).
                  <div className="mb-0.5 flex items-center gap-2" inert={hideSupplementary}>
                    {headerCtaUrl && (
                      <Button
                        variant="primary"
                        context={buttonContext}
                        size="compact"
                        href={headerCtaUrl}
                      >
                        {headerCtaLabel ?? 'Free Consultation'}
                      </Button>
                    )}
                    {headerCtaUrl2 && (
                      <Button
                        variant="secondary"
                        context={buttonContext}
                        size="compact"
                        href={headerCtaUrl2}
                      >
                        {headerCtaLabel2 ?? 'Learn More'}
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* ── Bottom row: nav + compact phone + CTA ── */}
              <div className={`flex items-center justify-end transition-[padding] duration-structural-slow ease-balanced ${hideSupplementary ? 'py-3' : 'py-2'}`}>
                <nav aria-label="Main navigation">
                  <NavLinks items={items} textClass={textClass} hoverTextClass={hoverTextClass} isMobile={!fits} />
                </nav>

                {displayPhone && (
                  <div className={`overflow-hidden pr-1 transition-[max-width,opacity] duration-structural-slow ease-balanced ${hideSupplementary ? 'ml-6 max-w-xs opacity-100' : 'max-w-0 opacity-0 pointer-events-none'}`}>
                    <a
                      href={`tel:${displayPhone.replace(/\D/g, '')}`}
                      className={`whitespace-nowrap text-sm font-semibold tracking-wide transition-colors duration-ui-fast ${hoverTextClass} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-current`}
                      tabIndex={hideSupplementary ? undefined : -1}
                    >
                      {displayPhone}
                    </a>
                  </div>
                )}

                {headerCtaUrl && (
                  // `inert` mirrors the original `tabIndex={hideSupplementary ? undefined : -1}`
                  // (inverse polarity to top-row — bottom-row appears WHEN
                  // hideSupplementary is true).
                  <div
                    className={`overflow-hidden pr-1 transition-[max-width,opacity] duration-structural-slow ease-balanced ${hideSupplementary ? 'ml-4 max-w-xs opacity-100' : 'max-w-0 opacity-0 pointer-events-none'}`}
                    inert={!hideSupplementary}
                  >
                    <Button
                      variant="primary"
                      context={buttonContext}
                      size="compact"
                      href={headerCtaUrl}
                    >
                      {headerCtaLabel ?? 'Free Consultation'}
                    </Button>
                  </div>
                )}
              </div>

            </div>
          </div>

        </div>
        </div>
      </div>

      <MobileDrawer data={data} isOpen={menuOpen} items={items} onClose={closeMenu} triggerRef={menuBtnRef} />
    </header>
  )
}
