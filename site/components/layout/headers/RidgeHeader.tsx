// Layout: Ridge
// Single row — logo left / nav + CTA flush right.
// Compact and efficient. Phone lives in the optional top bar, not inline.
// Works best for firms with 4–6 short nav labels and a clean hero merge.

'use client'

import {useRef, useState} from 'react'
import {
  useScrolled, useHeaderFits, useHeaderHeight, useScrollLock,
  resolveScheme, schemeBg, solidScheme, headerPositionClass,
  HEADER_TEXT, HEADER_HOVER_TEXT,
  isDarkSurfaceScheme,
  HeaderLogo, TopBar, CtaButtons, NavLinks, MobileDrawer, MobileHeaderRow,
  type HeaderData,
} from './shared'

type Props = {data: HeaderData}

// Column 1 is the `1fr` nav column — fluid, never include in the fits measurement.
const SKIP_FLUID_COLS = [1] as const

export function RidgeHeader({data}: Props) {
  const {
    heroMerge, sticky, stickyHideSupplementary, compactStyle,
    defaultScheme, scrolledScheme,
    topBarDesktop, topBarMobile, topBarPinSide, topBarLeft, topBarRight, topBarStyle,
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

  const scheme             = resolveScheme(defaultScheme, scrolledScheme, scrolled)
  const bgClass            = schemeBg(scheme, scrolled, compactStyle === 'float')
  const textClass          = HEADER_TEXT
  const hoverTextClass     = HEADER_HOVER_TEXT
  const posClass           = headerPositionClass(!!heroMerge, !!sticky)
  const items              = navItems ?? []
  const hideSupplementary  = scrolled && !!stickyHideSupplementary
  const floatingActive     = compactStyle === 'float' && scrolled
  const mobileSolid        = solidScheme(defaultScheme)
  const mobileBg           = schemeBg(mobileSolid, false)
  const dataRingContext    = isDarkSurfaceScheme(scheme) ? 'dark' : undefined

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
            className={[
              'hidden md:grid md:grid-cols-[auto_1fr] md:items-center md:gap-x-12 transition-[padding] duration-structural-slow ease-balanced',
              hideSupplementary ? 'py-3' : 'py-5',
              !fits ? 'absolute top-0 left-0 right-0 opacity-0 pointer-events-none' : '',
            ].join(' ')}
          >
            <HeaderLogo data={data} scheme={scheme} useMark={hideSupplementary} className={hideSupplementary ? 'h-9' : 'h-20'} />
            <nav aria-label="Main navigation" className="min-w-0 flex items-center justify-end">
              <NavLinks items={items} textClass={textClass} hoverTextClass={hoverTextClass} isMobile={!fits} />
              <CtaButtons data={data} context={isDarkSurfaceScheme(scheme) ? 'dark' : 'light'} className="ml-8" />
            </nav>
          </div>

        </div>
        </div>
      </div>

      <MobileDrawer data={data} isOpen={menuOpen} items={items} onClose={closeMenu} triggerRef={menuBtnRef} />
    </header>
  )
}
