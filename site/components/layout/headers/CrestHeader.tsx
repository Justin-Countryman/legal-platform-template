// Layout: Crest
// Single row: nav left | logo center | phone + CTA right.
// On scroll compact: same three-column grid, logo stays centered, CTA removed, phone only right.

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

// Columns 0 and 2 are `1fr` (nav and phone+CTA) — fluid, never include in the fits measurement.
// Only the center `auto` logo column (index 1) determines whether the layout overflows.
const SKIP_FLUID_COLS = [0, 2] as const

export function CrestHeader({data}: Props) {
  const {
    heroMerge, sticky, stickyHideSupplementary, compactStyle,
    defaultScheme, scrolledScheme,
    topBarEnabled, topBarPinSide, topBarLeft, topBarRight, topBarStyle,
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
  const fits       = useHeaderFits(desktopRef, SKIP_FLUID_COLS)
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

      {topBarEnabled && (
        <TopBar left={topBarLeft} right={topBarRight} style={topBarStyle} visible={!scrolled} pinSide={topBarPinSide} />
      )}

      {/* ── Mobile header row — outside padding container for full-bleed layouts ── */}
      <div className={`${fits ? 'md:hidden' : ''} ${mobileBg} ${textClass}`}>
        <MobileHeaderRow
          data={data}
          isOpen={menuOpen}
          onToggle={() => setMenuOpen((p) => !p)}
          scheme={scheme}
          hoverTextClass={hoverTextClass}
          triggerRef={menuBtnRef}
        />
      </div>

      {/* ── Desktop ────────────────────────────────────────────────────────────── */}
      <div className={`transition-[padding] duration-structural-slow ease-balanced ${floatingActive ? 'px-[5%] pt-3' : 'relative px-[5%]'}`}>
        <div className={`transition-[border-radius,box-shadow,padding,background-color,color] duration-structural-slow ease-balanced ${floatingActive ? `relative rounded-ui shadow-elevation-lg px-6 ${bgClass} ${textClass}` : ''}`}>
        <div className="container">

          <div
            ref={desktopRef}
            className={[
              'hidden md:grid md:grid-cols-[1fr_auto_1fr] md:items-center transition-[padding] duration-structural-slow ease-balanced',
              hideSupplementary ? 'py-3' : 'py-4',
              !fits ? 'absolute top-0 left-0 right-0 opacity-0 pointer-events-none' : '',
            ].join(' ')}
          >

            <nav aria-label="Main navigation" className="min-w-0">
              <NavLinks items={items} textClass={textClass} hoverTextClass={hoverTextClass} isMobile={!fits} className="flex-wrap gap-y-1" />
            </nav>

            <div className="mx-10 flex-shrink-0">
              <HeaderLogo
                data={data}
                scheme={scheme}
                useMark={hideSupplementary}
                className={hideSupplementary ? 'h-9' : 'h-20'}
              />
            </div>

            <div className="flex items-center justify-end gap-5">
              {displayPhone && (
                <div className="flex flex-col items-end gap-0.5">
                  {!hideSupplementary && headerPhoneTagline && (
                    <span className={`text-xs tracking-wide ${subtleTextClass}`}>
                      {headerPhoneTagline}
                    </span>
                  )}
                  <a
                    href={`tel:${displayPhone.replace(/\D/g, '')}`}
                    className={`text-base font-semibold tracking-wide transition-colors duration-ui-fast ${hoverTextClass} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-current`}
                  >
                    {displayPhone}
                  </a>
                  {displayPhone2 && (
                    <a
                      href={`tel:${displayPhone2.replace(/\D/g, '')}`}
                      className={`text-sm font-semibold tracking-wide ${mutedTextClass} transition-colors duration-ui-fast ${hoverTextClass} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-current`}
                    >
                      {displayPhone2}
                    </a>
                  )}
                </div>
              )}
              {!hideSupplementary && <CtaButtons data={data} context={isDarkSurfaceScheme(scheme) ? 'dark' : 'light'} />}
            </div>

          </div>

        </div>
        </div>
      </div>

      <MobileDrawer data={data} isOpen={menuOpen} items={items} onClose={closeMenu} triggerRef={menuBtnRef} />
    </header>
  )
}
