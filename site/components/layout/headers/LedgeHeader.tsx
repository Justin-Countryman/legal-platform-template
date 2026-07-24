// Layout: Ledge
// Two-column desktop structure: logo left (spans full height) / right column stacked.
// Right column row 1: tagline + phone inline — right-aligned on one line.
// Right column row 2: nav links + optional primary CTA — right-aligned.
// On scroll: phone row collapses, logo shrinks, nav row stays.
// Differs from Apex only in that the phone tagline and number share one line.

'use client'

import {useRef, useState} from 'react'
import {
  useScrolled, useHeaderFits, useHeaderHeight, useScrollLock,
  resolveScheme, schemeBg, solidScheme, headerPositionClass,
  HEADER_TEXT, HEADER_HOVER_TEXT, HEADER_MUTED_TEXT, HEADER_SUBTLE_TEXT,
  isDarkSurfaceScheme,
  HeaderLogo, TopBar, CtaButtons, NavLinks, MobileDrawer, MobileHeaderRow,
  type HeaderData,
} from './shared'

type Props = {data: HeaderData}

export function LedgeHeader({data}: Props) {
  const {
    heroMerge, sticky, stickyHideSupplementary, compactStyle,
    defaultScheme, scrolledScheme,
    topBarDesktop, topBarMobile, topBarPinSide, topBarLeft, topBarRight, topBarStyle,
    headerPhone, headerPhone2, phone, tollFreePhone,
    headerPhoneTagline,
    navItems,
  } = data

  const threshold  = 40
  const _scrolled  = useScrolled(threshold)
  const scrolled   = _scrolled && (!!heroMerge || !!sticky)
  const [menuOpen, setMenuOpen] = useState(false)
  const headerRef  = useRef<HTMLElement>(null)
  const desktopRef = useRef<HTMLDivElement>(null)
  const menuBtnRef = useRef<HTMLButtonElement>(null)
  const fits       = useHeaderFits(desktopRef)
  useHeaderHeight(headerRef, !!heroMerge, scrolled)
  useScrollLock(menuOpen)

  const scheme    = resolveScheme(defaultScheme, scrolledScheme, scrolled)
  const bgClass   = schemeBg(scheme, scrolled, compactStyle === 'float')
  const textClass       = HEADER_TEXT
  const hoverTextClass  = HEADER_HOVER_TEXT
  const mutedTextClass  = HEADER_MUTED_TEXT
  const subtleTextClass = HEADER_SUBTLE_TEXT
  const posClass       = headerPositionClass(!!heroMerge, !!sticky)
  const items     = navItems ?? []

  const displayPhone      = headerPhone || tollFreePhone || phone
  const displayPhone2     = headerPhone2 || null
  const hideSupplementary = scrolled && !!stickyHideSupplementary
  const floatingActive    = compactStyle === 'float' && scrolled
  const mobileSolid       = solidScheme(defaultScheme)
  const mobileBg          = schemeBg(mobileSolid, false)
  const dataRingContext   = isDarkSurfaceScheme(scheme) ? 'dark' : undefined

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

              {/* ── Top row: tagline + phone inline ── */}
              <div
                aria-hidden={hideSupplementary}
                className={`flex flex-col items-end justify-center overflow-hidden pr-1 transition-[max-height,opacity,padding] duration-structural-slow ease-balanced ${
                  hideSupplementary
                    ? 'max-h-0 opacity-0 py-0'
                    : 'max-h-28 opacity-100 pt-3 pb-1'
                }`}
              >
                {displayPhone && (
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
                )}
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

              {/* ── Bottom row: nav + compact phone + CTA ── */}
              <div className="flex items-center justify-end py-3">
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

                <CtaButtons data={data} context={isDarkSurfaceScheme(scheme) ? 'dark' : 'light'} className="ml-4" />
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
