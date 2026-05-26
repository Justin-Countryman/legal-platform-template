import {describe, it, expect} from 'vitest'
import {deriveVariants, buildRoleMap, validateWcag, buildColorCSS, buildDesignTokenCSS, deriveNeutrals, deriveInverseNeutrals, hexToRgbTriplet} from '../designTokens'
import {converter, wcagContrast} from 'culori'

const toOklch = converter('oklch')

function oklchOf(hex: string) {
  const c = toOklch(hex)
  return {l: c?.l ?? 0, c: c?.c ?? 0, h: c?.h ?? 0}
}

// ─── Warm analogous-accent palette (example) ──────────────────────────────────────────────────────────────

describe('analogous-accent palette — warm/amber example (#821428, #E68F1A, #F5A623)', () => {
  const PRIMARY  = '#821428'
  const ACCENT1  = '#E68F1A'
  const ACCENT2  = '#F5A623'

  it('primary-tint reads as warm off-white with burgundy character', () => {
    const {tint} = deriveVariants(PRIMARY)
    const o = oklchOf(tint)
    expect(o.l).toBeGreaterThan(0.93)
    expect(o.c).toBeGreaterThanOrEqual(0.02)
    expect(o.c).toBeLessThanOrEqual(0.08)
  })

  it('primary-dark reads as deep burgundy', () => {
    const {dark} = deriveVariants(PRIMARY)
    const o = oklchOf(dark)
    expect(o.l).toBeLessThan(0.30)
    expect(o.c).toBeGreaterThan(0.08)
  })

  it('no variant has chroma below 0.02 (no gray drift)', () => {
    for (const hex of [PRIMARY, ACCENT1, ACCENT2]) {
      const v = deriveVariants(hex)
      expect(oklchOf(v.tint).c).toBeGreaterThanOrEqual(0.02)
      expect(oklchOf(v.dark).c).toBeGreaterThanOrEqual(0.02)
    }
  })

  it('role map is built correctly for analogous-accent', () => {
    const roles = buildRoleMap('analogous-accent', {
      primary: PRIMARY, accent1: ACCENT1, accent2: ACCENT2,
    })
    // Inputs are normalized to lowercase by normHex
    expect(roles['role-tagline'].toLowerCase()).toBe(ACCENT1.toLowerCase())
    expect(roles['role-action'].toLowerCase()).toBe(ACCENT2.toLowerCase())
    // brand-dark derived from primary
    expect(oklchOf(roles['role-brand-dark']).l).toBeLessThan(0.30)
    // bg-light derived from accent1 tint
    expect(oklchOf(roles['role-muted']).l).toBeGreaterThan(0.93)
  })

  it('WCAG blocking pairs all pass', () => {
    const roles = buildRoleMap('analogous-accent', {
      primary: PRIMARY, accent1: ACCENT1, accent2: ACCENT2,
    })
    const results = validateWcag(roles, PRIMARY)
    const blocking = results.filter(r => r.blocking)
    for (const r of blocking) {
      expect(r.passes, `FAIL: ${r.pair} — ratio ${r.ratio}`).toBe(true)
    }
  })
})

// ─── Blue monochromatic ───────────────────────────────────────────────────────

describe('Blue monochromatic (#1E3A8A)', () => {
  const PRIMARY = '#1E3A8A'

  it('tint is light blue family', () => {
    const {tint} = deriveVariants(PRIMARY)
    const o = oklchOf(tint)
    expect(o.l).toBeGreaterThan(0.93)
    // Threshold 0.015 — high-chroma blues hit sRGB gamut clamping at L=0.97
    // which slightly reduces post-round-trip chroma. Still visually blue, not gray.
    expect(o.c).toBeGreaterThanOrEqual(0.015)
  })

  it('dark is deep blue', () => {
    const {dark} = deriveVariants(PRIMARY)
    const o = oklchOf(dark)
    expect(o.l).toBeLessThan(0.30)
    expect(o.c).toBeGreaterThan(0.02)
  })

  it('no gray drift', () => {
    const v = deriveVariants(PRIMARY)
    // Tint: 0.015 floor accounts for sRGB gamut clamping on high-chroma hues at L=0.97
    expect(oklchOf(v.tint).c).toBeGreaterThanOrEqual(0.015)
    expect(oklchOf(v.dark).c).toBeGreaterThanOrEqual(0.02)
  })
})

// ─── Green monochromatic ──────────────────────────────────────────────────────

describe('Green monochromatic (#065F46)', () => {
  const PRIMARY = '#065F46'

  it('tint is light green family', () => {
    const {tint} = deriveVariants(PRIMARY)
    const o = oklchOf(tint)
    expect(o.l).toBeGreaterThan(0.93)
    expect(o.c).toBeGreaterThanOrEqual(0.02)
  })

  it('dark is deep green', () => {
    const {dark} = deriveVariants(PRIMARY)
    const o = oklchOf(dark)
    expect(o.l).toBeLessThan(0.30)
    expect(o.c).toBeGreaterThan(0.02)
  })

  it('no gray drift', () => {
    const v = deriveVariants(PRIMARY)
    expect(oklchOf(v.tint).c).toBeGreaterThanOrEqual(0.02)
    expect(oklchOf(v.dark).c).toBeGreaterThanOrEqual(0.02)
  })
})

// ─── WCAG fg computation ──────────────────────────────────────────────────────

describe('WCAG fg computation', () => {
  it('burgundy #821428 — white fg passes AA', () => {
    const {fg} = deriveVariants('#821428')
    const ratio = wcagContrast('#821428', '#ffffff') as number
    expect(ratio).toBeGreaterThanOrEqual(4.5)
    expect(fg).toBe('#ffffff')
  })

  it('amber #F5A623 — white fg fails AA, returns branded near-black instead', () => {
    const {fg} = deriveVariants('#F5A623')
    const whiteRatio = wcagContrast('#F5A623', '#ffffff') as number
    expect(whiteRatio).toBeLessThan(4.5)
    // fg is derived from amber's own hue — should be branded near-black, not white or pure black
    expect(fg).not.toBe('#ffffff')
    expect(fg).not.toBe('#000000')
    // Must pass AA on amber
    const fgRatio = wcagContrast(fg, '#F5A623') as number
    expect(fgRatio).toBeGreaterThanOrEqual(4.5)
  })

  it('deriveNeutrals text-dark is never pure black', () => {
    for (const hex of ['#821428', '#F5A623', '#1E3A8A', '#065F46']) {
      expect(deriveNeutrals(hex)['color-foreground-on-light']).not.toBe('#000000')
    }
  })
})

// ─── Inverse neutral scale ────────────────────────────────────────────────────

describe('deriveInverseNeutrals contrast against warm-palette brand-dark #4e0002', () => {
  // #4e0002 = primary.dark for #821428 (analogous-accent, warm-palette example)
  const PRIMARY    = '#821428'
  const BRAND_DARK = '#4e0002'
  const inv = deriveInverseNeutrals(PRIMARY)

  it('text-on-dark passes AA (4.5:1)', () => {
    const ratio = wcagContrast(inv['color-foreground-on-dark'], BRAND_DARK) as number
    expect(ratio).toBeGreaterThanOrEqual(4.5)
  })

  it('text-on-dark-muted passes AA (4.5:1)', () => {
    const ratio = wcagContrast(inv['color-foreground-muted-on-dark'], BRAND_DARK) as number
    expect(ratio).toBeGreaterThanOrEqual(4.5)
  })

  it('text-on-dark-subtle passes AA (4.5:1)', () => {
    const ratio = wcagContrast(inv['color-foreground-subtle-on-dark'], BRAND_DARK) as number
    expect(ratio).toBeGreaterThanOrEqual(4.5)
  })

  it('text-on-dark is brighter than text-on-dark-muted which is brighter than text-on-dark-subtle', () => {
    const bright = wcagContrast(inv['color-foreground-on-dark'],        BRAND_DARK) as number
    const muted  = wcagContrast(inv['color-foreground-muted-on-dark'],  BRAND_DARK) as number
    const subtle = wcagContrast(inv['color-foreground-subtle-on-dark'], BRAND_DARK) as number
    expect(bright).toBeGreaterThan(muted)
    expect(muted).toBeGreaterThan(subtle)
  })

  it('hue carries primary brand character (chroma > 0)', () => {
    for (const v of Object.values(inv)) {
      const o = toOklch(v)
      expect((o?.c ?? 0), `${v} should have branded chroma`).toBeGreaterThan(0)
    }
  })
})

// ─── border-on-dark perceptual-warmth regression (L 0.38 / C×0.50 / cap 0.08) ─
// Locks the derivation against accidental regression to gray-reading hairlines.
// Asserts a luminance-contrast floor on bg-brand-dark plus a ≥0.030 OKLCH chroma
// floor so dividers read as a warm hairline, not desaturated gray, across
// realistic primary palettes.
//
// Threshold note: the spec target was ≥1.30 contrast across all five palettes.
// Under the L 0.38 / C×0.50 / cap 0.08 derivation: warm 1.524, Navy 1.787,
// Forest 1.660, Amber 1.463, Purple 1.380. Lowest is Purple at 1.380 — the
// 1.30 floor catches regressions while accommodating Purple's geometry.
// Chroma floor 0.030 reflects the C×0.50 multiplier producing values from
// 0.037 (Navy, lowest-chroma primary) up to 0.081 (Purple, capped).

describe('border-on-dark perceptual-warmth across primary palettes', () => {
  const PALETTES: Array<{label: string; primary: string}> = [
    {label: 'warm burgundy',     primary: '#821428'},
    {label: 'Conservative navy', primary: '#1e3a5f'},
    {label: 'Forest green',      primary: '#2d5016'},
    {label: 'Amber',             primary: '#f5a623'},
    {label: 'Purple',            primary: '#6b46c1'},
  ]

  it('border-on-dark maintains ≥1.30 contrast on bg-brand-dark across primary palettes', () => {
    for (const {label, primary} of PALETTES) {
      const inv      = deriveInverseNeutrals(primary)
      const {dark}   = deriveVariants(primary)
      const ratio    = wcagContrast(inv['color-border-on-dark'], dark) as number
      expect(ratio, `${label} (${primary}): border-on-dark ${inv['color-border-on-dark']} on brand-dark ${dark} should be ≥1.30 (got ${ratio})`)
        .toBeGreaterThanOrEqual(1.30)
    }
  })

  it('border-on-dark OKLCH chroma ≥0.030 across primary palettes (warm-hairline floor)', () => {
    for (const {label, primary} of PALETTES) {
      const inv      = deriveInverseNeutrals(primary)
      const o        = toOklch(inv['color-border-on-dark'])
      const chroma   = o?.c ?? 0
      expect(chroma, `${label} (${primary}): border-on-dark ${inv['color-border-on-dark']} chroma should be ≥0.030 (got ${chroma})`)
        .toBeGreaterThanOrEqual(0.030)
    }
  })
})

describe('role-tagline-on-dark derivation', () => {
  const PRIMARY = '#821428'
  const ACCENT1 = '#E68F1A'
  const ACCENT2 = '#F5A623'

  it('passes AA (4.5:1) against warm-palette brand-dark', () => {
    const roles = buildRoleMap('analogous-accent', {primary: PRIMARY, accent1: ACCENT1, accent2: ACCENT2})
    const brandDark = roles['role-brand-dark']
    const taglineOnDark = roles['role-tagline-on-dark']
    const ratio = wcagContrast(taglineOnDark, brandDark) as number
    expect(ratio).toBeGreaterThanOrEqual(4.5)
  })

  it('is brighter than role-tagline', () => {
    const roles = buildRoleMap('analogous-accent', {primary: PRIMARY, accent1: ACCENT1, accent2: ACCENT2})
    const brandDark = roles['role-brand-dark']
    const taglineRatio     = wcagContrast(roles['role-tagline'],         brandDark) as number
    const taglineOnDarkRatio = wcagContrast(roles['role-tagline-on-dark'], brandDark) as number
    expect(taglineOnDarkRatio).toBeGreaterThan(taglineRatio)
  })

  it('all three approaches produce a tagline-on-dark', () => {
    for (const approach of ['monochromatic', 'complementary', 'analogous-accent'] as const) {
      const roles = buildRoleMap(approach, {primary: PRIMARY, accent1: ACCENT1, accent2: ACCENT2})
      expect(roles['role-tagline-on-dark']).toBeTruthy()
      expect(/^#[0-9a-f]{6}$/.test(roles['role-tagline-on-dark'])).toBe(true)
    }
  })
})

// ─── role-action-on-light derivation ─────────────────────────────────────────

describe('role-action-on-light: falls back to brand-dark when action fails white', () => {
  it('amber (#F5A623) fails white AA → returns brand-dark', () => {
    const roles = buildRoleMap('analogous-accent', {
      primary: '#821428', accent1: '#E68F1A', accent2: '#F5A623',
    })
    // Amber contrast on white is ~2.0:1 — must fall back
    const aol = roles['role-action-on-light']
    const ratio = wcagContrast(aol, '#ffffff') as number
    expect(ratio).toBeGreaterThanOrEqual(4.5)
    // Should NOT be amber itself
    expect(aol.toLowerCase()).not.toBe('#f5a623')
    // Should equal brand-dark
    expect(aol).toBe(roles['role-brand-dark'])
  })
})

describe('role-action-on-light: uses action directly when it passes AA on white', () => {
  it('Navy monochromatic (#1E3A8A) — action passes white AA → returns action', () => {
    const roles = buildRoleMap('monochromatic', {primary: '#1E3A8A'})
    const aol = roles['role-action-on-light']
    const ratio = wcagContrast(aol, '#ffffff') as number
    expect(ratio).toBeGreaterThanOrEqual(4.5)
    expect(aol.toLowerCase()).toBe(roles['role-action'].toLowerCase())
  })

  it('Green + coral analogous (#065F46, #D97706, #C2410C) — coral passes white AA → returns action', () => {
    const roles = buildRoleMap('analogous-accent', {
      primary: '#065F46', accent1: '#D97706', accent2: '#C2410C',
    })
    const aol = roles['role-action-on-light']
    const ratio = wcagContrast(aol, '#ffffff') as number
    expect(ratio).toBeGreaterThanOrEqual(4.5)
    expect(aol.toLowerCase()).toBe(roles['role-action'].toLowerCase())
  })

  it('Navy + amber analogous (#1E3A8A, #7C3AED, #B45309) — amber passes white but fails vivid purple tint → falls back to brand-dark', () => {
    const roles = buildRoleMap('analogous-accent', {
      primary: '#1E3A8A', accent1: '#7C3AED', accent2: '#B45309',
    })
    const aol = roles['role-action-on-light']
    // Amber barely passes white (~5.0:1) but fails the vivid purple tint bg-light
    // → actionOnLight falls back to brand-dark, which always passes
    const ratio = wcagContrast(aol, '#ffffff') as number
    expect(ratio).toBeGreaterThanOrEqual(4.5)
    expect(aol).toBe(roles['role-brand-dark'])
  })
})

describe('role-action-hover direction logic', () => {
  it('amber action (#F5A623, dark text fg) → hover LIGHTENS the fill', () => {
    // analogous-accent example: accent2 = #F5A623, fg = text-dark (low luminance)
    const roles = buildRoleMap('analogous-accent', {
      primary: '#821428', accent1: '#E68F1A', accent2: '#F5A623',
    })
    const actionL = oklchOf(roles['role-action']).l
    const hoverL  = oklchOf(roles['role-action-hover']).l
    expect(hoverL).toBeGreaterThan(actionL)
  })

  it('navy action (#1E3A8A, white fg) → hover DARKENS the fill', () => {
    // Monochromatic navy: primary = #1E3A8A, fg = white (high luminance)
    const roles = buildRoleMap('monochromatic', {primary: '#1E3A8A'})
    const actionL = oklchOf(roles['role-action']).l
    const hoverL  = oklchOf(roles['role-action-hover']).l
    expect(hoverL).toBeLessThan(actionL)
  })

  it('amber hover: action-fg still passes AA contrast on role-action-hover', () => {
    const roles = buildRoleMap('analogous-accent', {
      primary: '#821428', accent1: '#E68F1A', accent2: '#F5A623',
    })
    validateWcag(roles, '#821428')
    // No explicit pair for action-fg on action-hover in validateWcag — check directly
    const fgHex    = roles['role-action-fg']
    const hoverHex = roles['role-action-hover']
    const ratio = wcagContrast(fgHex, hoverHex) as number
    expect(ratio).toBeGreaterThanOrEqual(4.5)
  })

  it('navy hover: action-fg still passes AA contrast on role-action-hover', () => {
    const roles = buildRoleMap('monochromatic', {primary: '#1E3A8A'})
    const fgHex    = roles['role-action-fg']
    const hoverHex = roles['role-action-hover']
    const ratio = wcagContrast(fgHex, hoverHex) as number
    expect(ratio).toBeGreaterThanOrEqual(4.5)
  })
})

// ─── tagline-fg derivation ───────────────────────────────────────────────────

describe('role-tagline-fg auto-pairing', () => {
  it('light tagline (amber #E68F1A) pairs with dark fg', () => {
    const roles = buildRoleMap('analogous-accent', {
      primary: '#821428', accent1: '#E68F1A', accent2: '#F5A623',
    })
    const fg = roles['role-tagline-fg']
    // Light tagline → fg should be the branded near-black (L≈0.20), not white
    expect(fg).not.toBe('#ffffff')
    expect(oklchOf(fg).l).toBeLessThan(0.30)
    // And must pass AA on the tagline color
    const ratio = wcagContrast(fg, roles['role-tagline']) as number
    expect(ratio).toBeGreaterThanOrEqual(4.5)
  })

  it('dark tagline (burgundy #821428) pairs with light fg', () => {
    // Monochromatic burgundy: tagline = primary.base = #821428
    const roles = buildRoleMap('monochromatic', {primary: '#821428'})
    const fg = roles['role-tagline-fg']
    // Dark tagline → fg should be white
    expect(fg).toBe('#ffffff')
    const ratio = wcagContrast(fg, roles['role-tagline']) as number
    expect(ratio).toBeGreaterThanOrEqual(4.5)
  })

  it('buildColorCSS emits --color-accent-fg matching role-tagline-fg', () => {
    const css = buildColorCSS({
      colorApproach: 'analogous-accent',
      primaryColor: '#821428',
      accent1Color: '#E68F1A',
      accent2Color: '#F5A623',
    })
    const match = css.match(/--color-accent-fg:([^;}]+)/)
    expect(match).not.toBeNull()
    const emitted = match?.[1]?.trim() ?? ''
    const roles = buildRoleMap('analogous-accent', {
      primary: '#821428', accent1: '#E68F1A', accent2: '#F5A623',
    })
    expect(emitted.toLowerCase()).toBe(roles['role-tagline-fg'].toLowerCase())
  })

  it('buildColorCSS does NOT emit --color-tagline* (retired in WS5)', () => {
    const css = buildColorCSS({primaryColor: '#821428', accent1Color: '#E68F1A'})
    expect(css).not.toMatch(/--color-tagline:/)
    expect(css).not.toMatch(/--color-tagline-fg:/)
    expect(css).not.toMatch(/--color-tagline-on-dark:/)
  })
})

// ─── hexToRgbTriplet ─────────────────────────────────────────────────────────

describe('hexToRgbTriplet', () => {
  it('returns space-separated R G B integers', () => {
    const result = hexToRgbTriplet('#ffffff')
    expect(result).toBe('255 255 255')
  })

  it('returns "0 0 0" for pure black', () => {
    expect(hexToRgbTriplet('#000000')).toBe('0 0 0')
  })

  it('warm text-dark (#1c1314) returns warm near-black triplet', () => {
    // #1c1314 = rgb(28, 19, 20)
    expect(hexToRgbTriplet('#1c1314')).toBe('28 19 20')
  })

  it('result format matches /^\\d+ \\d+ \\d+$/', () => {
    const textDark = deriveNeutrals('#821428')['color-foreground-on-light']
    expect(hexToRgbTriplet(textDark)).toMatch(/^\d+ \d+ \d+$/)
  })

  it('returns "0 0 0" for invalid input', () => {
    expect(hexToRgbTriplet('not-a-color')).toBe('0 0 0')
  })
})

// ─── --shadow-rgb in buildColorCSS ───────────────────────────────────────────

describe('buildColorCSS --shadow-rgb', () => {
  it('includes --shadow-rgb as a space-separated triplet', () => {
    const css = buildColorCSS({
      colorApproach: 'analogous-accent',
      primaryColor:  '#821428',
      accent1Color:  '#E68F1A',
      accent2Color:  '#F5A623',
    })
    expect(css).toMatch(/--shadow-rgb:\d+ \d+ \d+/)
  })

  it('--shadow-rgb is NOT pure black for a warm palette', () => {
    const css = buildColorCSS({primaryColor: '#821428'})
    expect(css).not.toContain('--shadow-rgb:0 0 0')
  })

  it('cool palette (navy) produces a cool-tinted shadow-rgb', () => {
    // Navy text-dark has more blue than red
    const textDark = deriveNeutrals('#1E3A8A')['color-foreground-on-light']
    const [r, , b] = hexToRgbTriplet(textDark).split(' ').map(Number)
    expect(b).toBeGreaterThan(r)
  })
})

// ─── buildDesignTokenCSS elevation ───────────────────────────────────────────

describe('buildDesignTokenCSS elevation tokens', () => {
  it('level 0 (default) outputs --shadow-card-rest:none', () => {
    const css = buildDesignTokenCSS()
    expect(css).toContain('--shadow-card-rest:none')
    expect(css).toContain('--shadow-card-hover:none')
    expect(css).toContain('--transform-card-hover:0px')
  })

  it('elevationStyle "0" outputs none explicitly', () => {
    const css = buildDesignTokenCSS(undefined, undefined, undefined, '0')
    expect(css).toContain('--shadow-card-rest:none')
  })

  it('level 1 outputs 2-layer shadow for rest', () => {
    const css = buildDesignTokenCSS(undefined, undefined, undefined, '1')
    const match = css.match(/--shadow-card-rest:([^;}]+)/)
    const layers = (match?.[1] ?? '').split('rgb(').length - 1
    expect(layers).toBe(2)
  })

  it('level 4 outputs 3-layer shadow for rest', () => {
    const css = buildDesignTokenCSS(undefined, undefined, undefined, '4')
    const match = css.match(/--shadow-card-rest:([^;}]+)/)
    const layers = (match?.[1] ?? '').split('rgb(').length - 1
    expect(layers).toBe(3)
  })

  it('level 6 outputs 3-layer shadow with largest offsets', () => {
    const css = buildDesignTokenCSS(undefined, undefined, undefined, '6')
    expect(css).toContain('48px')
    expect(css).toContain('64px')
    expect(css).toContain('--transform-card-hover:-3px')
  })

  it('transform-card-hover values increase with intensity', () => {
    const level2 = buildDesignTokenCSS(undefined, undefined, undefined, '2')
    const level4 = buildDesignTokenCSS(undefined, undefined, undefined, '4')
    const level6 = buildDesignTokenCSS(undefined, undefined, undefined, '6')
    expect(level2).toContain('--transform-card-hover:-1px')
    expect(level4).toContain('--transform-card-hover:-2px')
    expect(level6).toContain('--transform-card-hover:-3px')
  })

  it('unknown elevationStyle falls back to flat', () => {
    const css = buildDesignTokenCSS(undefined, undefined, undefined, 'nonexistent')
    expect(css).toContain('--shadow-card-rest:none')
  })

  it('elevation tokens reference var(--shadow-rgb) (not hardcoded color)', () => {
    const css = buildDesignTokenCSS(undefined, undefined, undefined, '4')
    expect(css).toContain('var(--shadow-rgb)')
    expect(css).not.toMatch(/rgb\(\d+ \d+ \d+/)
  })
})

describe('accent-on-dark on white WCAG warning', () => {
  it('result exists in validateWcag output and is non-blocking (warning-only)', () => {
    const roles = buildRoleMap('analogous-accent', {
      primary: '#821428', accent1: '#E68F1A', accent2: '#F5A623',
    })
    const results = validateWcag(roles, '#821428')
    const pair = results.find(r => r.pair === 'accent-on-dark on white')
    expect(pair).toBeDefined()
    expect(pair?.blocking).toBe(false)
  })

  it('always fails 4.5:1 across realistic palettes (designed incompatibility)', () => {
    const palettes: Array<[Parameters<typeof buildRoleMap>[0], Parameters<typeof buildRoleMap>[1]]> = [
      ['analogous-accent', {primary: '#821428', accent1: '#E68F1A', accent2: '#F5A623'}],
      ['monochromatic',    {primary: '#1E3A8A'}],
      ['monochromatic',    {primary: '#065F46'}],
    ]
    for (const [approach, inputs] of palettes) {
      const roles = buildRoleMap(approach, inputs)
      const results = validateWcag(roles, inputs.primary as string)
      const pair = results.find(r => r.pair === 'accent-on-dark on white')
      expect(pair?.passes, `${inputs.primary}: accent-on-dark on white should fail 4.5:1`).toBe(false)
    }
  })
})

describe('role-action-on-light WCAG blocking checks', () => {
  it('passes on white and on bg-light for all four test palettes', () => {
    const palettes: Array<{label: string; approach: 'monochromatic' | 'analogous-accent'; inputs: Parameters<typeof buildRoleMap>[1]}> = [
      {label: 'warm',         approach: 'analogous-accent', inputs: {primary: '#821428', accent1: '#E68F1A', accent2: '#F5A623'}},
      {label: 'Navy mono',   approach: 'monochromatic',    inputs: {primary: '#1E3A8A'}},
      {label: 'Green+coral', approach: 'analogous-accent', inputs: {primary: '#065F46', accent1: '#D97706', accent2: '#C2410C'}},
      {label: 'Navy+amber',  approach: 'analogous-accent', inputs: {primary: '#1E3A8A', accent1: '#7C3AED', accent2: '#B45309'}},
    ]
    for (const {label, approach, inputs} of palettes) {
      const roles = buildRoleMap(approach, inputs)
      const wcagResults = validateWcag(roles, inputs.primary as string)
      const aolOnWhite    = wcagResults.find(r => r.pair === 'action-text on white')
      const aolOnMuted    = wcagResults.find(r => r.pair === 'action-text on muted')
      expect(aolOnWhite?.passes, `${label}: action-text on white should pass`).toBe(true)
      expect(aolOnMuted?.passes, `${label}: action-text on muted should pass`).toBe(true)
    }
  })
})

// ─── --color-ring-focus derivation ───────────────────────────────────────────

describe('--color-ring-focus: falls back to brand-dark when action fails 3:1 on white', () => {
  it('amber action (#F5A623) ~2:1 on white → falls back to brand-dark', () => {
    const css = buildColorCSS({
      colorApproach: 'analogous-accent',
      primaryColor:  '#821428',
      accent1Color:  '#E68F1A',
      accent2Color:  '#F5A623',
    })
    // Extract ring-focus value
    const match = css.match(/--color-ring-focus:([^;}]+)/)
    const ringFocus = match?.[1] ?? ''
    // Amber fails 3:1 → should be brand-dark, not amber
    expect(ringFocus.toLowerCase()).not.toBe('#f5a623')
    // Must pass 3:1 on white
    const ratio = wcagContrast(ringFocus, '#ffffff') as number
    expect(ratio).toBeGreaterThanOrEqual(3.0)
  })

  it('navy action (#1E3A8A) passes 3:1 on white → uses action directly', () => {
    const css = buildColorCSS({
      colorApproach: 'monochromatic',
      primaryColor:  '#1E3A8A',
    })
    const match = css.match(/--color-ring-focus:([^;}]+)/)
    const ringFocus = match?.[1] ?? ''
    const roles = buildRoleMap('monochromatic', {primary: '#1E3A8A'})
    expect(ringFocus.toLowerCase()).toBe(roles['role-action'].toLowerCase())
    // Must still pass 3:1
    const ratio = wcagContrast(ringFocus, '#ffffff') as number
    expect(ratio).toBeGreaterThanOrEqual(3.0)
  })

  it('ring-focus always passes 3:1 on white for all test palettes', () => {
    const palettes = [
      {approach: 'analogous-accent' as const, inputs: {primary: '#821428', accent1: '#E68F1A', accent2: '#F5A623'}},
      {approach: 'monochromatic'    as const, inputs: {primary: '#1E3A8A'}},
      {approach: 'analogous-accent' as const, inputs: {primary: '#065F46', accent1: '#D97706', accent2: '#C2410C'}},
    ]
    for (const {approach, inputs} of palettes) {
      const css = buildColorCSS({
        colorApproach: approach,
        primaryColor:  inputs.primary,
        accent1Color:  'accent1' in inputs ? inputs.accent1 : undefined,
        accent2Color:  'accent2' in inputs ? inputs.accent2 : undefined,
      })
      const match = css.match(/--color-ring-focus:([^;}]+)/)
      const ringFocus = match?.[1] ?? ''
      const ratio = wcagContrast(ringFocus, '#ffffff') as number
      expect(ratio, `ring-focus for ${inputs.primary} should pass 3:1 on white`).toBeGreaterThanOrEqual(3.0)
    }
  })

  it('buildColorCSS includes --color-ring-focus', () => {
    const css = buildColorCSS({primaryColor: '#821428'})
    expect(css).toContain('--color-ring-focus:')
  })
})

// ─── --color-ring-focus-on-dark derivation ────────────────────────────────────

describe('--color-ring-focus-on-dark: uses action when it passes 3:1 on brand-dark', () => {
  it('amber (#F5A623) ~7.6:1 on brand-dark → uses amber directly', () => {
    const css = buildColorCSS({
      colorApproach: 'analogous-accent',
      primaryColor:  '#821428',
      accent1Color:  '#E68F1A',
      accent2Color:  '#F5A623',
    })
    const match = css.match(/--color-ring-focus-on-dark:([^;}]+)/)
    const ringOnDark = match?.[1]?.trim() ?? ''
    // Amber passes 3:1 on brand-dark → should use amber directly
    expect(ringOnDark.toLowerCase()).toBe('#f5a623')
    // Must pass 3:1 on brand-dark
    const brandDarkMatch = css.match(/--color-brand-dark:([^;}]+)/)
    const brandDark = brandDarkMatch?.[1]?.trim() ?? '#4e0002'
    const ratio = wcagContrast(ringOnDark, brandDark) as number
    expect(ratio).toBeGreaterThanOrEqual(3.0)
  })

  it('dark action that fails 3:1 on brand-dark falls back to tagline-on-dark', () => {
    // Use a primary color whose derived action is dark enough to fail on brand-dark
    // but tagline-on-dark passes. Navy primary → action is dark navy, low contrast on dark bg.
    const css = buildColorCSS({
      colorApproach: 'monochromatic',
      primaryColor:  '#1E3A8A',
    })
    const match = css.match(/--color-ring-focus-on-dark:([^;}]+)/)
    const ringOnDark = match?.[1]?.trim() ?? ''
    const brandDarkMatch = css.match(/--color-brand-dark:([^;}]+)/)
    const brandDark = brandDarkMatch?.[1]?.trim() ?? '#4e0002'
    // Whatever value was chosen must pass 3:1 on brand-dark
    const ratio = wcagContrast(ringOnDark, brandDark) as number
    expect(ratio).toBeGreaterThanOrEqual(3.0)
  })

  it('ring-focus-on-dark always passes 3:1 on brand-dark for all test palettes', () => {
    const palettes = [
      {approach: 'analogous-accent' as const, inputs: {primary: '#821428', accent1: '#E68F1A', accent2: '#F5A623'}},
      {approach: 'monochromatic'    as const, inputs: {primary: '#1E3A8A'}},
      {approach: 'analogous-accent' as const, inputs: {primary: '#065F46', accent1: '#D97706', accent2: '#C2410C'}},
    ]
    for (const {approach, inputs} of palettes) {
      const css = buildColorCSS({
        colorApproach: approach,
        primaryColor:  inputs.primary,
        accent1Color:  'accent1' in inputs ? inputs.accent1 : undefined,
        accent2Color:  'accent2' in inputs ? inputs.accent2 : undefined,
      })
      const match = css.match(/--color-ring-focus-on-dark:([^;}]+)/)
      const ringOnDark = match?.[1]?.trim() ?? ''
      const brandDarkMatch = css.match(/--color-brand-dark:([^;}]+)/)
      const brandDark = brandDarkMatch?.[1]?.trim() ?? '#4e0002'
      const ratio = wcagContrast(ringOnDark, brandDark) as number
      expect(ratio, `ring-focus-on-dark for ${inputs.primary} should pass 3:1 on brand-dark`).toBeGreaterThanOrEqual(3.0)
    }
  })

  it('buildColorCSS includes --color-ring-focus-on-dark', () => {
    const css = buildColorCSS({primaryColor: '#821428'})
    expect(css).toContain('--color-ring-focus-on-dark:')
  })
})

// ─── --color-border (cascade-aware) ──────────────────────────────────────────

describe('--color-border cascade-aware token', () => {
  it('buildColorCSS emits both --color-border and --color-border-on-dark', () => {
    const css = buildColorCSS({primaryColor: '#821428'})
    expect(css).toContain('--color-border:')
    expect(css).toContain('--color-border-on-dark:')
  })

  it('buildColorCSS does NOT emit --color-border-light (retired in WS5)', () => {
    const css = buildColorCSS({primaryColor: '#821428'})
    expect(css).not.toMatch(/--color-border-light:/)
  })

  it('buildColorCSS does NOT emit --color-divider* (retired in WS5)', () => {
    const css = buildColorCSS({primaryColor: '#821428'})
    expect(css).not.toMatch(/--color-divider:/)
    expect(css).not.toMatch(/--color-divider-on-dark:/)
  })

  it('--color-border mirrors role-divider-on-light (light-surface default)', () => {
    const css = buildColorCSS({primaryColor: '#821428'})
    const roles = buildRoleMap('analogous-accent', {primary: '#821428'})
    const borderMatch = css.match(/--color-border:([^;}]+)/)
    expect(borderMatch?.[1]?.trim().toLowerCase())
      .toBe(roles['role-divider-on-light'].toLowerCase())
  })

  it('--color-border-on-dark mirrors role-divider-on-dark', () => {
    const css = buildColorCSS({primaryColor: '#821428'})
    const roles = buildRoleMap('analogous-accent', {primary: '#821428'})
    const borderOnDarkMatch = css.match(/--color-border-on-dark:([^;}]+)/)
    expect(borderOnDarkMatch?.[1]?.trim().toLowerCase())
      .toBe(roles['role-divider-on-dark'].toLowerCase())
  })

  it('role-divider tokens exist in all three approaches with identical values (primary-derived)', () => {
    for (const approach of ['monochromatic', 'complementary', 'analogous-accent'] as const) {
      const roles = buildRoleMap(approach, {
        primary: '#821428', action: '#F5A623', accent1: '#E68F1A', accent2: '#F5A623',
      })
      expect(roles['role-divider-on-light']).toBeTruthy()
      expect(roles['role-divider-on-dark']).toBeTruthy()
      expect(/^#[0-9a-f]{6}$/.test(roles['role-divider-on-light'])).toBe(true)
      expect(/^#[0-9a-f]{6}$/.test(roles['role-divider-on-dark'])).toBe(true)
    }
  })

  it('border-on-dark is darker than border-on-light (luminance check)', () => {
    const roles = buildRoleMap('analogous-accent', {
      primary: '#821428', accent1: '#E68F1A', accent2: '#F5A623',
    })
    const lightL = oklchOf(roles['role-divider-on-light']).l
    const darkL  = oklchOf(roles['role-divider-on-dark']).l
    expect(lightL).toBeGreaterThan(darkL)
  })
})

// ─── --color-hover-wash (cascade-aware) ──────────────────────────────────────

describe('--color-hover-wash cascade-aware token', () => {
  it('buildColorCSS emits both --color-hover-wash and --color-hover-wash-on-dark', () => {
    const css = buildColorCSS({primaryColor: '#821428'})
    expect(css).toContain('--color-hover-wash:')
    expect(css).toContain('--color-hover-wash-on-dark:')
  })

  it('--color-hover-wash uses shadow-rgb expression (auto-tunes per brand)', () => {
    const css = buildColorCSS({primaryColor: '#821428'})
    const match = css.match(/--color-hover-wash:([^;}]+)/)
    expect(match?.[1]?.trim()).toBe('rgb(var(--shadow-rgb) / 0.06)')
  })

  it('--color-hover-wash-on-dark uses color-mix on text-on-dark', () => {
    const css = buildColorCSS({primaryColor: '#821428'})
    const match = css.match(/--color-hover-wash-on-dark:([^;}]+)/)
    expect(match?.[1]?.trim()).toBe('color-mix(in oklch, var(--color-foreground-on-dark) 8%, transparent)')
  })

  it('role-hover-wash tokens identical across all three approaches (no input dependence)', () => {
    const palettes = [
      ['monochromatic',    {primary: '#821428'}] as const,
      ['complementary',    {primary: '#821428', action: '#F5A623'}] as const,
      ['analogous-accent', {primary: '#821428', accent1: '#E68F1A', accent2: '#F5A623'}] as const,
    ]
    const values = palettes.map(([approach, inputs]) => buildRoleMap(approach, inputs))
    for (const v of values) {
      expect(v['role-hover-wash-on-light']).toBe('rgb(var(--shadow-rgb) / 0.06)')
      expect(v['role-hover-wash-on-dark']).toBe('color-mix(in oklch, var(--color-foreground-on-dark) 8%, transparent)')
    }
  })
})

// ─── motionTempo tokens ───────────────────────────────────────────────────────

describe('buildDesignTokenCSS motionTempo', () => {
  it('snappy outputs fastest UI values', () => {
    const css = buildDesignTokenCSS(undefined, undefined, undefined, undefined, 'snappy')
    expect(css).toContain('--motion-ui-fast:150ms')
    expect(css).toContain('--motion-ui-base:250ms')
    expect(css).toContain('--motion-ui-slow:400ms')
  })

  it('balanced outputs mid-range UI values', () => {
    const css = buildDesignTokenCSS(undefined, undefined, undefined, undefined, 'balanced')
    expect(css).toContain('--motion-ui-fast:200ms')
    expect(css).toContain('--motion-ui-base:325ms')
    expect(css).toContain('--motion-ui-slow:500ms')
  })

  it('relaxed outputs slowest UI values', () => {
    const css = buildDesignTokenCSS(undefined, undefined, undefined, undefined, 'relaxed')
    expect(css).toContain('--motion-ui-fast:250ms')
    expect(css).toContain('--motion-ui-base:400ms')
    expect(css).toContain('--motion-ui-slow:600ms')
  })

  it('null/undefined motionTempo defaults to relaxed', () => {
    const cssNull    = buildDesignTokenCSS(undefined, undefined, undefined, undefined, null)
    const cssDefault = buildDesignTokenCSS()
    expect(cssNull).toContain('--motion-ui-fast:250ms')
    expect(cssDefault).toContain('--motion-ui-fast:250ms')
  })

  it('unknown motionTempo falls back to relaxed', () => {
    const css = buildDesignTokenCSS(undefined, undefined, undefined, undefined, 'turbo')
    expect(css).toContain('--motion-ui-fast:250ms')
  })

  it('structural tokens are always fixed regardless of motionTempo', () => {
    for (const tempo of ['snappy', 'balanced', 'relaxed', null]) {
      const css = buildDesignTokenCSS(undefined, undefined, undefined, undefined, tempo)
      expect(css).toContain('--motion-structural-fast:150ms')
      expect(css).toContain('--motion-structural-base:250ms')
      expect(css).toContain('--motion-structural-slow:400ms')
    }
  })

  it('snappy UI values are all faster than relaxed UI values', () => {
    const snappy  = buildDesignTokenCSS(undefined, undefined, undefined, undefined, 'snappy')
    const relaxed = buildDesignTokenCSS(undefined, undefined, undefined, undefined, 'relaxed')
    const extract = (css: string, token: string) =>
      parseInt(css.match(new RegExp(`${token}:(\\d+)ms`))?.[1] ?? '0', 10)

    expect(extract(snappy, '--motion-ui-fast')).toBeLessThan(extract(relaxed, '--motion-ui-fast'))
    expect(extract(snappy, '--motion-ui-base')).toBeLessThan(extract(relaxed, '--motion-ui-base'))
    expect(extract(snappy, '--motion-ui-slow')).toBeLessThan(extract(relaxed, '--motion-ui-slow'))
  })
})

// ─── marketingScale tokens ────────────────────────────────────────────────────

describe('buildDesignTokenCSS marketingScale', () => {
  it('default is opt-in: emits no --marketing-* vars when undefined', () => {
    const css = buildDesignTokenCSS()
    expect(css).not.toContain('--marketing-h1')
    expect(css).not.toContain('--marketing-h2')
    expect(css).not.toContain('--marketing-h3')
    expect(css).not.toContain('--marketing-h4')
  })

  it('"default" emits no --marketing-* vars (utilities fall back to standard)', () => {
    const css = buildDesignTokenCSS(undefined, undefined, undefined, undefined, undefined, 'default')
    expect(css).not.toContain('--marketing-h1')
  })

  it('null emits no --marketing-* vars', () => {
    const css = buildDesignTokenCSS(undefined, undefined, undefined, undefined, undefined, null)
    expect(css).not.toContain('--marketing-h1')
  })

  it('unknown value emits no --marketing-* vars (graceful fallback)', () => {
    const css = buildDesignTokenCSS(undefined, undefined, undefined, undefined, undefined, 'xl')
    expect(css).not.toContain('--marketing-h1')
  })

  it('sm — Perfect Fourth ratio values', () => {
    const css = buildDesignTokenCSS(undefined, undefined, undefined, undefined, undefined, 'sm')
    expect(css).toContain('--marketing-h1:4.214rem')
    expect(css).toContain('--marketing-h2:3.161rem')
    expect(css).toContain('--marketing-h3:2.371rem')
    expect(css).toContain('--marketing-h4:1.778rem')
  })

  it('md — Augmented Fourth ratio values', () => {
    const css = buildDesignTokenCSS(undefined, undefined, undefined, undefined, undefined, 'md')
    expect(css).toContain('--marketing-h1:5.657rem')
    expect(css).toContain('--marketing-h2:4rem')
    expect(css).toContain('--marketing-h3:2.828rem')
    expect(css).toContain('--marketing-h4:2rem')
  })

  it('lg — Golden Ratio values, H1 capped at 8rem', () => {
    const css = buildDesignTokenCSS(undefined, undefined, undefined, undefined, undefined, 'lg')
    expect(css).toContain('--marketing-h1:8rem')
    expect(css).toContain('--marketing-h2:6.854rem')
    expect(css).toContain('--marketing-h3:4.236rem')
    expect(css).toContain('--marketing-h4:2.618rem')
    // Sanity: capped value (8rem) is less than uncapped ratio⁵ × 16px = 11.09rem
    expect(css).not.toContain('--marketing-h1:11.09rem')
  })

  it('values increase with preset across all four levels', () => {
    const sm = buildDesignTokenCSS(undefined, undefined, undefined, undefined, undefined, 'sm')
    const md = buildDesignTokenCSS(undefined, undefined, undefined, undefined, undefined, 'md')
    const lg = buildDesignTokenCSS(undefined, undefined, undefined, undefined, undefined, 'lg')
    const extract = (css: string, level: string) => {
      const match = css.match(new RegExp(`--marketing-${level}:([\\d.]+)rem`))
      return parseFloat(match?.[1] ?? '0')
    }
    for (const level of ['h1', 'h2', 'h3', 'h4']) {
      expect(extract(md, level)).toBeGreaterThan(extract(sm, level))
      expect(extract(lg, level)).toBeGreaterThan(extract(md, level))
    }
  })
})

// ─── Fail-to-client-branded-fallback doctrine ────────────────────────────────
//
// Locked in WS-CSS-Fallback-Color-Philosophy (v0.22.0, 2026-05-12). Both
// runtime fallback sites in this file — buildColorCSS's primary fallback at
// the canonical site and validateWcag's primaryHex default parameter — fall
// back to the template-default neutral (#1a1a1a) rather than producing no
// derivation. The doctrine reverses the WS5-era fail-grey approach platform-
// wide; multi-client safety is preserved by per-client rewriting at
// provisioning time (the Client Provisioning Tool's templateSubstitutions
// map). See BI/skills/skill-color-system/SKILL.md → "Fallback values".

describe('Fail-to-client-branded-fallback (v0.22.0)', () => {
  it('buildColorCSS with null primaryColor produces identical output to explicit template default #1a1a1a', () => {
    const cssNull = buildColorCSS({primaryColor: null})
    const cssExplicit = buildColorCSS({primaryColor: '#1a1a1a'})
    expect(cssNull).toBe(cssExplicit)
  })

  it('buildColorCSS with undefined primaryColor produces identical output to explicit template default #1a1a1a', () => {
    const cssMissing = buildColorCSS({})
    const cssExplicit = buildColorCSS({primaryColor: '#1a1a1a'})
    expect(cssMissing).toBe(cssExplicit)
  })

  it('validateWcag default primaryHex parameter derives neutrals from template default #1a1a1a', () => {
    const roles = buildRoleMap('analogous-accent', {primary: '#1a1a1a'})
    const resultsDefault = validateWcag(roles)
    const resultsExplicit = validateWcag(roles, '#1a1a1a')
    expect(resultsDefault).toEqual(resultsExplicit)
  })
})
