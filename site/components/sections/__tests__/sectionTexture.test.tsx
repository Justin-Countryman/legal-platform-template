import {__unstable__loadDesignSystem} from '@tailwindcss/node'
import fs from 'node:fs'
import path from 'node:path'
import {beforeAll, describe, expect, it} from 'vitest'
import {render} from '@testing-library/react'
import {findUnknown, readPlainCssClasses} from '../../../scripts/check-unknown-utility-classes.mjs'

import {SECTION_SURFACES} from '@/lib/sectionSurface'
import {SECTION_TEXTURES, SECTION_TEXTURE_MAP, SECTION_TEXTURE_OPACITY, buildDesignTokenCSS} from '@/lib/designTokens'
import {NO_SEAM} from '../sectionFrame'
import {SectionShell} from '../SectionShell'
import {PageSections, type PageSectionData} from '../PageSections'
import {HomepageCanvas, type HomepageBlock} from '@/components/layout/HomepageCanvas'

// ─── Item 338, [R-472]: no site-wide background ───────────────────────────────
//
// Phase 16A deleted the page background layer. A texture now appears in exactly
// one place: a HOMEPAGE band set to the Pattern surface, which paints it itself
// from the site's `patternTexture`. These tests hold the three halves of that:
// the token builder emits the choice, only a Pattern band paints it, and an
// interior page never does, even from a value stored before the Studio stopped
// offering it there.

const SITE_ROOT = path.resolve(__dirname, '../../..')
let designSystem: {candidatesToCss: (names: string[]) => (string | null)[]}
let plainCss: Set<string>
beforeAll(async () => {
  designSystem = await __unstable__loadDesignSystem(fs.readFileSync(path.join(SITE_ROOT, 'app/globals.css'), 'utf8'), {
    base: SITE_ROOT,
  })
  plainCss = readPlainCssClasses(SITE_ROOT)
})

const textures = (el: Element) => el.querySelectorAll('[data-section-texture]')

describe('item 338: the site texture reaches a band only through the token builder', () => {
  it.each(SECTION_TEXTURES)('%s emits its image and tile size', (texture) => {
    const css = buildDesignTokenCSS({patternTexture: texture})
    expect(css).toContain(`--section-texture-image:${SECTION_TEXTURE_MAP[texture].image};`)
    expect(css).toContain(`--section-texture-size:${SECTION_TEXTURE_MAP[texture].size};`)
    // The ink follows the palette: no literal color in any texture.
    expect(SECTION_TEXTURE_MAP[texture].image).not.toMatch(/#[0-9a-f]{3,6}\b/i)
  })

  it('scallop, the grid (one conic layer since Phase 17C session 3) and dots are the textures that need a tile size', () => {
    expect(SECTION_TEXTURES.filter((t) => SECTION_TEXTURE_MAP[t].size !== 'auto')).toEqual(['scallop', 'grid', 'dots'])
  })

  // Phase 17C session 3 (`[R-538]`): a strong step per tile at twice the ink and the same spacing, and a
  // render scale under the swept blend (0.8 for the lattice, the one tile drawn in two layers).
  it.each(SECTION_TEXTURES)('%s emits its strong step and its render scale', (texture) => {
    const t = SECTION_TEXTURE_MAP[texture]
    const css = buildDesignTokenCSS({patternTexture: texture})
    expect(css).toContain(`--section-texture-image-strong:${t.strong};`)
    expect(css).toContain(`--section-texture-render:${t.render};`)
    expect(t.strong).not.toBe(t.image)
    expect(t.strong).not.toMatch(/#[0-9a-f]{3,6}\b/i)
    // The same number of layers, so the strength never adds a crossing.
    expect(t.strong.split('gradient(').length).toBe(t.image.split('gradient(').length)
    expect(t.render).toBe(t.image.split('gradient(').length > 2 ? 0.8 : 0.9)
  })

  it('only the lattice is drawn in two layers', () => {
    expect(SECTION_TEXTURES.filter((t) => SECTION_TEXTURE_MAP[t].image.split('gradient(').length > 2)).toEqual(['diamondLattice'])
  })

  it('a band the theme gave the strong step draws the strong tile; a stored Pattern band stays quiet', () => {
    const strong = render(<SectionShell appearance={{surface: 'dark'}} seam={{...NO_SEAM, paint: {texture: 'strong'}}}><p>Body</p></SectionShell>).container
    const layer = textures(strong)[0] as HTMLElement
    expect(layer.getAttribute('data-section-texture')).toBe('strong')
    expect(layer.className.split(' ')).toEqual(expect.arrayContaining(['section-texture-strong', 'section-texture-on-dark']))
    expect(layer.className.split(' ')).not.toContain('section-texture')
    const stored = render(<SectionShell appearance={{surface: 'pattern'}}><p>Body</p></SectionShell>).container
    expect(textures(stored)[0].getAttribute('data-section-texture')).toBe('quiet')
  })

  it.each([[undefined], [null], ['photo'], ['gradient']])('%s emits no texture at all', (value) => {
    const css = buildDesignTokenCSS({patternTexture: value as never})
    expect(css).toContain('--section-texture-image:none;')
    expect(css).toContain('--section-texture-size:auto;')
  })

  it('renders at the tested ceiling, which validateWcag blends as its own light ground', () => {
    expect(SECTION_TEXTURE_OPACITY).toBe(0.04)
  })
})

describe('item 338: only a Pattern band paints the texture', () => {
  it.each(SECTION_SURFACES)('%s', (surface) => {
    const {container} = render(<SectionShell appearance={{surface}}><p>Body</p></SectionShell>)
    expect(textures(container).length, surface).toBe(surface === 'pattern' ? 1 : 0)
  })

  it('the texture is decorative, behind the content, and removable in forced colors and print', () => {
    const {container} = render(<SectionShell appearance={{surface: 'pattern'}}><p>Body</p></SectionShell>)
    const layer = textures(container)[0] as HTMLElement
    expect(layer.getAttribute('aria-hidden')).toBe('true')
    expect(layer.className.split(' ')).toEqual(expect.arrayContaining(['section-texture', 'pointer-events-none', 'absolute', 'inset-0', 'section-texture-on-light']))
    // It precedes the `relative` content container, which therefore paints over it.
    expect(layer.nextElementSibling?.className.split(' ')).toContain('relative')
    expect(findUnknown(layer.className.split(' '), designSystem, plainCss)).toEqual([])
  })

  it('an inset Pattern band paints the texture inside its panel, not across the page', () => {
    const {container} = render(<SectionShell appearance={{surface: 'pattern', inset: true}}><p>Body</p></SectionShell>)
    const layer = textures(container)[0]
    expect(layer.parentElement?.className.split(' ')).toContain('rounded-ui')
  })

  it('a Pattern band on the homepage paints it', () => {
    const block = {_type: 'contentSectionInline', _key: 'p', layout: 'statement', heading: 'On a texture', appearance: {surface: 'pattern'}} as unknown as HomepageBlock
    const {container} = render(<HomepageCanvas blocks={[block]} />)
    expect(textures(container).length).toBe(1)
  })

  it('an interior page never does, even from a Pattern stored on a section document', () => {
    const s = {_type: 'contentSection', _id: 'c', layout: 'statement', heading: 'Interior', appearance: {surface: 'pattern'}} as unknown as PageSectionData
    const {container} = render(<PageSections sections={[s]} />)
    expect(container.querySelector('h2')).not.toBeNull()
    expect(textures(container).length).toBe(0)
  })
})
