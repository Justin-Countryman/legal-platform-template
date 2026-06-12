import {describe, it, expect, vi, beforeEach} from 'vitest'
import {render} from '@testing-library/react'

// usePathname is a client hook with no router context in jsdom — mock it so we
// can drive the current path and simulate navigation between renders.
const mockUsePathname = vi.fn<() => string | null>(() => '/')
vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}))

import {MobileDrawer, type NavItem, type HeaderData} from '../shared'

const DATA: HeaderData = {
  firmName: 'Test Firm',
  headerCtaLabel: 'Free Consultation',
  headerCtaUrl: '/contact/',
  headerPhone: '763-555-0100',
}

const ITEMS: NavItem[] = [
  {label: 'Home', href: '/'},
  {label: 'About', href: '/about/'},
  {
    label: 'Practice Areas',
    href: '/practice-areas/',
    children: [
      {label: 'Family Law', href: '/family-law/'},
      {label: 'Estate Planning', href: '/estate-planning/'},
    ],
  },
  {
    label: 'Our Attorneys',
    href: '/attorneys/',
    children: [{label: 'Jane A. Attorney', href: '/attorneys/jane-attorney/'}],
  },
  {label: 'Contact', href: '/contact/'},
]

function renderDrawer(onClose = vi.fn()) {
  const utils = render(
    <MobileDrawer data={DATA} isOpen items={ITEMS} onClose={onClose} />,
  )
  return {onClose, ...utils}
}

beforeEach(() => {
  mockUsePathname.mockReset()
  mockUsePathname.mockReturnValue('/')
})

describe('MobileDrawer — active-page indicator', () => {
  it('marks the current top-level link with aria-current="page"', () => {
    mockUsePathname.mockReturnValue('/about')
    const {getByRole} = renderDrawer()
    expect(getByRole('link', {name: 'About'}).getAttribute('aria-current')).toBe('page')
    // A non-active link must NOT carry aria-current.
    expect(getByRole('link', {name: 'Contact'}).getAttribute('aria-current')).toBeNull()
  })

  it('normalizes trailing slashes (href /about/ matches path /about)', () => {
    mockUsePathname.mockReturnValue('/about') // canonical trailingSlash:false URL
    const {getByRole} = renderDrawer()
    expect(getByRole('link', {name: 'About'}).getAttribute('aria-current')).toBe('page')
  })

  it('marks an active child link inside a submenu', () => {
    mockUsePathname.mockReturnValue('/family-law')
    const {getByRole} = renderDrawer()
    expect(getByRole('link', {name: 'Family Law'}).getAttribute('aria-current')).toBe('page')
  })

  it('applies the accent rail class to the active link (not color alone)', () => {
    mockUsePathname.mockReturnValue('/about')
    const {getByRole} = renderDrawer()
    expect(getByRole('link', {name: 'About'}).className).toContain('border-accent')
  })
})

describe('MobileDrawer — parent accordion (mobile)', () => {
  it('renders the parent as a toggle button, not a navigating link', () => {
    mockUsePathname.mockReturnValue('/')
    const {getByRole, queryByRole} = renderDrawer()
    // The row is a disclosure button…
    expect(getByRole('button', {name: 'Practice Areas'})).toBeTruthy()
    // …never a link (no accidental navigation on tap).
    expect(queryByRole('link', {name: 'Practice Areas'})).toBeNull()
  })

  it('surfaces an "All {label}" overview link to the index when the parent has an href', () => {
    mockUsePathname.mockReturnValue('/practice-areas') // expands the group
    const {getByRole} = renderDrawer()
    const overview = getByRole('link', {name: 'All Practice Areas'})
    // Next normalizes the trailing slash per trailingSlash:false — accept either.
    expect(overview.getAttribute('href')).toMatch(/^\/practice-areas\/?$/)
    expect(overview.getAttribute('aria-current')).toBe('page')
  })

  it('strips a leading "Our " for the overview label ("Our Attorneys" → "All Attorneys")', () => {
    mockUsePathname.mockReturnValue('/attorneys') // expands the Our Attorneys group
    const {getByRole, queryByRole} = renderDrawer()
    expect(getByRole('link', {name: 'All Attorneys'})).toBeTruthy()
    expect(queryByRole('link', {name: 'All Our Attorneys'})).toBeNull()
  })

  it('uses a disclosure pattern (aria-expanded + aria-controls, no aria-haspopup)', () => {
    const {getByRole} = renderDrawer()
    const toggle = getByRole('button', {name: 'Practice Areas'})
    expect(toggle.getAttribute('aria-controls')).toBeTruthy()
    expect(toggle.getAttribute('aria-haspopup')).toBeNull()
  })
})

describe('MobileDrawer — auto-close on navigation', () => {
  it('does not close on initial mount', () => {
    mockUsePathname.mockReturnValue('/about')
    const {onClose} = renderDrawer()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('closes when the pathname changes (a link was followed)', () => {
    mockUsePathname.mockReturnValue('/about')
    const onClose = vi.fn()
    const {rerender} = render(
      <MobileDrawer data={DATA} isOpen items={ITEMS} onClose={onClose} />,
    )
    expect(onClose).not.toHaveBeenCalled()

    mockUsePathname.mockReturnValue('/contact')
    rerender(<MobileDrawer data={DATA} isOpen items={ITEMS} onClose={onClose} />)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
