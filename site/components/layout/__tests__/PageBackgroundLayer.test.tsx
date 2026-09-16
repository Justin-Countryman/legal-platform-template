import {__unstable__loadDesignSystem} from '@tailwindcss/node'
import fs from 'node:fs'
import path from 'node:path'
import {beforeAll, describe, expect, it, vi} from 'vitest'
import {render} from '@testing-library/react'

import {findUnknown, readPlainCssClasses} from '../../../scripts/check-unknown-utility-classes.mjs'

vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({src, alt, className}: {src: string; alt?: string; className?: string}) => <img src={src} alt={alt ?? ''} className={className} />,
}))

import {
  ALL_PAGE_BACKGROUND_CLASSES,
  DEFAULT_PAGE_BACKGROUND_OPACITY,
  MAX_TEXT_SAFE_LAYER_OPACITY,
  PAGE_BACKGROUND_KINDS,
  PAGE_TEXTURES,
  PageBackgroundLayer,
} from '../PageBackgroundLayer'

// ─── The page background layer ────────────────────────────────────────────────
//
// Phase 13 (WS-V1-PHASE13-DESIGN §7 amendments 4, 17 to 21). The record asked for
// a `layout.test.tsx`; that cannot exist, because `app/(site)/layout.tsx` is an
// async server component and RTL cannot render one. The layer is a separate
// component for exactly that reason, and this is its test.
//
// The two facts that decide whether the feature works at all are the z-index and
// the position, and both were measured wrong in the record: `z-0` paints over
// eleven of the fifteen bands and the footer, because a static opaque band paints
// before a positioned `z-index: 0` element; and `fixed` covers the viewport
// rather than the document, so the texture would not scroll. Both are asserted
// here so a later edit cannot quietly undo them.

const SITE_ROOT = path.resolve(__dirname, '../../..')

let designSystem: {candidatesToCss: (names: string[]) => (string | null)[]}
let plainCss: Set<string>

beforeAll(async () => {
  designSystem = await __unstable__loadDesignSystem(fs.readFileSync(path.join(SITE_ROOT, 'app/globals.css'), 'utf8'), {
    base: SITE_ROOT,
  })
  plainCss = readPlainCssClasses(SITE_ROOT)
})

const image = {
  _type: 'image' as const,
  asset: {_ref: 'image-abc123def456789012345678901234567890abcd-1600x900-jpg', _type: 'reference' as const},
}

const layer = (html: HTMLElement) => html.querySelector('[data-page-background]')

describe('kind', () => {
  it('none renders no element, which is every existing client', () => {
    const {container} = render(<PageBackgroundLayer data={{kind: 'none'}} />)
    expect(container.innerHTML).toBe('')
  })

  it.each([[null], [undefined], [{}], [{kind: 'not-a-kind'}]])('%s renders no element', (data) => {
    const {container} = render(<PageBackgroundLayer data={data as never} />)
    expect(container.innerHTML).toBe('')
  })

  it('texture with no texture chosen renders no element rather than an empty layer', () => {
    const {container} = render(<PageBackgroundLayer data={{kind: 'texture'}} />)
    expect(container.innerHTML).toBe('')
  })

  it('photo with no image renders no element', () => {
    const {container} = render(<PageBackgroundLayer data={{kind: 'photo'}} />)
    expect(container.innerHTML).toBe('')
  })

  it.each(PAGE_TEXTURES)('texture %s renders its own utility class', (texture) => {
    const {container} = render(<PageBackgroundLayer data={{kind: 'texture', texture}} />)
    const el = layer(container)
    expect(el).not.toBeNull()
    expect(el!.className).toMatch(/page-texture-/)
  })

  it('gradient renders the wash', () => {
    const {container} = render(<PageBackgroundLayer data={{kind: 'gradient'}} />)
    expect(layer(container)!.className).toContain('page-wash-gradient')
  })

  it('photo renders a decorative image with an empty alt, not in the a11y tree', () => {
    const {container} = render(<PageBackgroundLayer data={{kind: 'photo', image}} />)
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img!.getAttribute('alt')).toBe('')
  })

  it('the four textures are the evidence-backed ones: no fineGrid, no dotLattice', () => {
    expect(PAGE_TEXTURES).toEqual(['pinstripe', 'diagonalHatch', 'diamondLattice', 'scallop'])
    expect(PAGE_TEXTURES).not.toContain('fineGrid')
    expect(PAGE_TEXTURES).not.toContain('dotLattice')
    // Cut on evidence, not on taste: topograph/contour/map occur zero times in
    // the 65 study records, and damask cannot be a gradient (§7 amendments 18, 19).
    expect(PAGE_TEXTURES).not.toContain('topographic')
    expect(PAGE_TEXTURES).not.toContain('damask')
    expect(PAGE_BACKGROUND_KINDS).toEqual(['none', 'texture', 'photo', 'gradient'])
  })
})

describe('the stacking and the position, both measured wrong in the record', () => {
  const classesFor = (kind: 'texture' | 'gradient' | 'photo') => {
    const {container} = render(<PageBackgroundLayer data={{kind, texture: 'pinstripe', image}} />)
    return layer(container)!.className
  }

  it.each(['texture', 'gradient', 'photo'] as const)('%s sits at -z-10, never z-0', (kind) => {
    // At z-0 the layer paints OVER the eleven bands and the footer that are
    // static and opaque, because in-flow painting precedes a positioned
    // z-index: 0. This is also what decouples requirement 4 from requirement 5.
    expect(classesFor(kind)).toContain('-z-10')
    expect(classesFor(kind)).not.toMatch(/(^|\s)z-0(\s|$)/)
  })

  it.each(['texture', 'gradient', 'photo'] as const)('%s is absolute, not fixed, so the texture scrolls with the document', (kind) => {
    expect(classesFor(kind)).toContain('absolute')
    expect(classesFor(kind)).not.toContain('fixed')
  })

  it.each(['texture', 'gradient', 'photo'] as const)('%s never swallows a click', (kind) => {
    expect(classesFor(kind)).toContain('pointer-events-none')
  })
})

describe('opacity', () => {
  it('takes the operator value', () => {
    const {container} = render(<PageBackgroundLayer data={{kind: 'gradient', opacity: 0.2}} />)
    expect((layer(container) as HTMLElement).style.opacity).toBe('0.2')
  })

  it('falls back to a low code default, because the layer sits under body text', () => {
    const {container} = render(<PageBackgroundLayer data={{kind: 'gradient'}} />)
    expect((layer(container) as HTMLElement).style.opacity).toBe(String(DEFAULT_PAGE_BACKGROUND_OPACITY))
    expect(DEFAULT_PAGE_BACKGROUND_OPACITY).toBeLessThanOrEqual(0.08)
  })

  it('a texture never renders stronger than the text-safe 0.04, whatever is stored (Phase 14)', () => {
    // At the schema's old 0.25 warning bound label text measured 1.85:1 over the ink.
    const {container} = render(<PageBackgroundLayer data={{kind: 'texture', texture: 'diagonalHatch', opacity: 0.25}} />)
    expect((layer(container) as HTMLElement).style.opacity).toBe(String(MAX_TEXT_SAFE_LAYER_OPACITY))
    expect(MAX_TEXT_SAFE_LAYER_OPACITY).toBe(0.04)
    const faint = render(<PageBackgroundLayer data={{kind: 'texture', texture: 'diagonalHatch', opacity: 0.02}} />)
    expect((layer(faint.container) as HTMLElement).style.opacity).toBe('0.02')
  })

  it('a zero the operator chose is honoured, not replaced by the default', () => {
    const {container} = render(<PageBackgroundLayer data={{kind: 'gradient', opacity: 0}} />)
    expect((layer(container) as HTMLElement).style.opacity).toBe('0')
  })
})

describe('the classes and the CSS', () => {
  it('every class resolves through Tailwind (the checker cannot see a TS map)', () => {
    expect(findUnknown([...ALL_PAGE_BACKGROUND_CLASSES], designSystem, plainCss)).toEqual([])
  })

  it('the oracle is live', () => {
    expect(findUnknown(['page-texture-nope', 'page-wash-nope'], designSystem, plainCss)).toHaveLength(2)
  })

  it('carries no literal colour: provisioning rewrites hexes in globals.css silently', () => {
    // Measured in the challenge: a hex planted in a new globals.css block was
    // rewritten to a client's brand colour, 41 replacements, no warning. Every
    // gradient therefore reads var(--color-...).
    const css = fs.readFileSync(path.join(SITE_ROOT, 'app/globals.css'), 'utf8')
    const block = css.slice(css.indexOf('@utility page-texture-pinstripe'), css.indexOf('[data-page-background] { display: none; }'))
    expect(block).not.toMatch(/#[0-9A-Fa-f]{3,8}\b/)
    expect(block).toMatch(/var\(--color-brand-dark\)/)
  })

  it('is removed in forced-colors and in print, which the file had neither of before', () => {
    const css = fs.readFileSync(path.join(SITE_ROOT, 'app/globals.css'), 'utf8')
    expect(css).toMatch(/@media \(forced-colors: active\) \{\s*\[data-page-background\] \{ display: none; \}/)
    expect(css).toMatch(/@media print \{\s*\[data-page-background\] \{ display: none; \}/)
  })
})
