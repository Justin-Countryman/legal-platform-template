import {describe, it, expect} from 'vitest'
import {
  resolveSidebarDesignSettings,
  SIDEBAR_NAV_ICON_STYLES,
  DEFAULT_SIDEBAR_NAV_ICON_STYLE,
  DEFAULT_SIDEBAR_WIDGET_HEADER_LINE,
  DEFAULT_SIDEBAR_ITEM_SEPARATORS,
  type SidebarDesignSettings,
} from '../designTokens'

// WS-Sidebar Phase 2.1 — sidebar design-settings resolver.
//
// Three site-level settings (BI/BI-Sidebar.md §4–5) projected via
// DESIGN_TOKENS_QUERY and consumed by Phase 2.5's Sidebar rendering. The
// resolver applies defaults and clamps unrecognized enum values to the
// default rather than letting unknown strings flow into the render path.

describe('SIDEBAR_NAV_ICON_STYLES — catalog ordering', () => {
  it('includes exactly the three documented values', () => {
    expect([...SIDEBAR_NAV_ICON_STYLES]).toEqual(['chevrons', 'arrows', 'none'])
  })

  it('places the default first (DesignStudio enumeration ordering)', () => {
    expect(SIDEBAR_NAV_ICON_STYLES[0]).toBe(DEFAULT_SIDEBAR_NAV_ICON_STYLE)
  })
})

describe('Defaults — locked per BI-Sidebar.md §4–5', () => {
  it('icon style default is chevrons', () => {
    expect(DEFAULT_SIDEBAR_NAV_ICON_STYLE).toBe('chevrons')
  })

  it('widget header line default is true', () => {
    expect(DEFAULT_SIDEBAR_WIDGET_HEADER_LINE).toBe(true)
  })

  it('item separators default is true', () => {
    expect(DEFAULT_SIDEBAR_ITEM_SEPARATORS).toBe(true)
  })
})

describe('resolveSidebarDesignSettings — input handling', () => {
  it('returns all defaults when input is undefined', () => {
    const out = resolveSidebarDesignSettings(undefined)
    expect(out).toEqual<SidebarDesignSettings>({
      sidebarNavIconStyle: 'chevrons',
      sidebarWidgetHeaderLine: true,
      sidebarItemSeparators: true,
    })
  })

  it('returns all defaults when input is null', () => {
    const out = resolveSidebarDesignSettings(null)
    expect(out).toEqual<SidebarDesignSettings>({
      sidebarNavIconStyle: 'chevrons',
      sidebarWidgetHeaderLine: true,
      sidebarItemSeparators: true,
    })
  })

  it('returns all defaults when input is an empty object', () => {
    const out = resolveSidebarDesignSettings({})
    expect(out).toEqual<SidebarDesignSettings>({
      sidebarNavIconStyle: 'chevrons',
      sidebarWidgetHeaderLine: true,
      sidebarItemSeparators: true,
    })
  })

  it('preserves a valid icon style enum value', () => {
    expect(resolveSidebarDesignSettings({sidebarNavIconStyle: 'arrows'}).sidebarNavIconStyle).toBe(
      'arrows',
    )
    expect(resolveSidebarDesignSettings({sidebarNavIconStyle: 'none'}).sidebarNavIconStyle).toBe(
      'none',
    )
    expect(resolveSidebarDesignSettings({sidebarNavIconStyle: 'chevrons'}).sidebarNavIconStyle).toBe(
      'chevrons',
    )
  })

  it('clamps an unrecognized icon style string to the default', () => {
    expect(
      resolveSidebarDesignSettings({sidebarNavIconStyle: 'sparkles'}).sidebarNavIconStyle,
    ).toBe('chevrons')
  })

  it('clamps an empty-string icon style to the default', () => {
    expect(
      resolveSidebarDesignSettings({sidebarNavIconStyle: ''}).sidebarNavIconStyle,
    ).toBe('chevrons')
  })

  it('clamps a null icon style to the default', () => {
    expect(
      resolveSidebarDesignSettings({sidebarNavIconStyle: null}).sidebarNavIconStyle,
    ).toBe('chevrons')
  })

  it('preserves explicit false for boolean settings', () => {
    const out = resolveSidebarDesignSettings({
      sidebarWidgetHeaderLine: false,
      sidebarItemSeparators: false,
    })
    expect(out.sidebarWidgetHeaderLine).toBe(false)
    expect(out.sidebarItemSeparators).toBe(false)
  })

  it('preserves explicit true for boolean settings', () => {
    const out = resolveSidebarDesignSettings({
      sidebarWidgetHeaderLine: true,
      sidebarItemSeparators: true,
    })
    expect(out.sidebarWidgetHeaderLine).toBe(true)
    expect(out.sidebarItemSeparators).toBe(true)
  })

  it('uses default when boolean setting is undefined (partial input)', () => {
    const out = resolveSidebarDesignSettings({sidebarNavIconStyle: 'arrows'})
    expect(out.sidebarWidgetHeaderLine).toBe(DEFAULT_SIDEBAR_WIDGET_HEADER_LINE)
    expect(out.sidebarItemSeparators).toBe(DEFAULT_SIDEBAR_ITEM_SEPARATORS)
  })

  it('uses default when boolean setting is null', () => {
    const out = resolveSidebarDesignSettings({
      sidebarWidgetHeaderLine: null,
      sidebarItemSeparators: null,
    })
    expect(out.sidebarWidgetHeaderLine).toBe(DEFAULT_SIDEBAR_WIDGET_HEADER_LINE)
    expect(out.sidebarItemSeparators).toBe(DEFAULT_SIDEBAR_ITEM_SEPARATORS)
  })

  it('resolves all three settings together with mixed valid input', () => {
    const out = resolveSidebarDesignSettings({
      sidebarNavIconStyle: 'arrows',
      sidebarWidgetHeaderLine: false,
      sidebarItemSeparators: true,
    })
    expect(out).toEqual<SidebarDesignSettings>({
      sidebarNavIconStyle: 'arrows',
      sidebarWidgetHeaderLine: false,
      sidebarItemSeparators: true,
    })
  })
})
