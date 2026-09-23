import {describe, expect, it, vi} from 'vitest'
import {forwardRef} from 'react'
import {render} from '@testing-library/react'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'

// ─── The reproduction gate (Phase 17B, monorepo WS-V1-PHASE17B-DESIGN §5) ─────
//
// CAPTURED AT a164ce0, BEFORE THE THEME ENGINE EXISTED, as the first commit of the
// Phase 17B branch. The engine moves the walk's inputs (the divider, the carry, the
// texture's ground, the ghost, the overlap, the gradient) from the style set's six
// stored fields to a theme, and keeps a compat bridge for one pin: a client that
// stores the six and no theme must render EXACTLY what it renders today, until
// Apply writes the theme. ADV-17B-A measured that a compat theme reproduces today's
// walk and HTML byte for byte (F1); this is the test that holds it, on three
// canvases:
//
//   - the planted canvas shaped like the fixture client's fifteen members (types,
//     layouts, stored surfaces, the inset band, the overlap, two empties), with
//     invented copy and no firm identity ([R-198]);
//   - the migrated canvas the parity golden renders;
//   - the CI stub's three members.
//
// Each under two stored documents: Graphite's six fields as a live client stores
// them (the bridge's case), and nothing at all (a fresh build's case, which renders
// the platform default; the canvas must be unchanged, because the default theme
// darkens no host on these canvases and the close is drawn outside it).
//
// What is pinned per case: the walk's every decision (the seam, the divider, the
// ghost, the raised photo, the adopted panel, the run) and the canvas's innerHTML.
// Regenerate ONLY with a reason in the commit: a difference here is the engine
// changing what a stored client receives, which the bridge exists to prevent.

vi.mock('next/link', () => ({
  // eslint-disable-next-line react/display-name
  default: forwardRef<HTMLAnchorElement, {href: string; children: React.ReactNode; className?: string}>(
    ({href, children, ...rest}, ref) => <a ref={ref} href={href} {...rest}>{children}</a>,
  ),
}))
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({src, alt, className}: {src: string; alt?: string; className?: string}) => <img src={src} alt={alt ?? ''} className={className} />,
}))
vi.mock('@/components/ui/ScrollReveal', () => ({
  ScrollReveal: ({children}: {children: React.ReactNode}) => <div data-testid="scroll-reveal">{children}</div>,
}))

import {HomepageCanvas, frameOf, type HomepageBlock} from '@/components/layout/HomepageCanvas'
import {walkFrame, siteLookOf, type SiteLook} from '../sectionFrame'
import {ghostSource} from '@/lib/brandMark'
import {type VisibleGround} from '@/lib/sectionSurface'
import planted from './fixtures/fixture-shaped-canvas.json'
import migrated from '@/components/layout/__tests__/fixtures/migrated-canvas.json'

const FIRM = 'Example Law Firm'
const tokens = {firmName: FIRM, firmNameShort: 'Example', primaryPhone: null, primaryTollFree: null}

/** Graphite's Design Settings as a client stores them after the style set was applied
 *  at a164ce0: the six page-level fields among the rest. */
const GRAPHITE_STORED: Record<string, unknown> = {
  fontPairingPreset: 4, marketingScale: 'md', taglineStyle: 'plain', uiRadius: 'sharp', buttonShape: 'square',
  buttonAnimation: 'none', tertiaryStyle: 'tracked', elevationStyle: '0', motionTempo: 'balanced',
  cardHover: 'accentBorder', attorneyCardStyle: 'minimal', headingEmphasisStyle: 'italic', headingWeight: 'bold',
  headingCase: 'normal', imageFrame: 'framed', patternTexture: 'diagonalHatch', patternGround: 'dark',
  brandGhost: 'none', dropCap: 'none', sectionOverlap: 'photo', sectionGradient: 'none',
  sectionJoin: 'angled', dividerCarry: ['cards'], headingRule: 'line',
}

/** The look the homepage builds from the projected settings: what `HomeBody` does. At
 *  a164ce0 the ghost read `brandGhost`; since the engine it reads the theme's answer,
 *  which the bridge takes from the same stored field. */
function lookOf(designTokens: Record<string, unknown>): SiteLook {
  const look = siteLookOf(designTokens)
  return {...look, ghost: ghostSource(FIRM, look.flow?.ghost === 'once')}
}

function stubCanvas(): HomepageBlock[] {
  const lines = readFileSync(resolve(__dirname, '../../../scripts/ci/fixture.ndjson'), 'utf8').split('\n').filter(Boolean)
  const home = lines.map((l) => JSON.parse(l)).find((d) => d._type === 'homePage')
  return home.canvas as HomepageBlock[]
}

const CANVASES: Array<[name: string, blocks: HomepageBlock[], hero: VisibleGround]> = [
  ['planted', planted as unknown as HomepageBlock[], 'dark'],
  ['migrated', migrated as unknown as HomepageBlock[], 'dark'],
  ['stub', stubCanvas(), 'light'],
]
const LOOKS: Array<[name: string, designTokens: Record<string, unknown>]> = [
  ['graphite', GRAPHITE_STORED],
  ['nothing', {}],
]

/** Every decision the walk makes, without the site look (whose shape the engine changes). */
function decisions(blocks: HomepageBlock[], site: SiteLook, hero: VisibleGround) {
  return walkFrame(blocks, frameOf, site, hero).map(({member, index, seam}) => ({
    key: member._key,
    index,
    seamTop: seam.seamTop,
    previousGround: seam.previousGround,
    nextOverlap: seam.nextOverlap,
    divider: seam.divider ?? null,
    ghost: !!seam.ghost,
    raisePhoto: !!seam.raisePhoto,
    insetGround: seam.insetGround ?? null,
    run: seam.run ?? null,
  }))
}

describe('the compat bridge reproduces the a164ce0 walk and canvas byte for byte', () => {
  for (const [canvasName, blocks, hero] of CANVASES) {
    for (const [lookName, designTokens] of LOOKS) {
      it(`${canvasName} canvas, ${lookName} stored: the walk`, async () => {
        const site = lookOf(designTokens)
        await expect(JSON.stringify(decisions(blocks, site, hero), null, 2) + '\n')
          .toMatchFileSnapshot(`./__snapshots__/flow-reproduction/${canvasName}-${lookName}.walk.json`)
      })
      it(`${canvasName} canvas, ${lookName} stored: the HTML`, async () => {
        const site = lookOf(designTokens)
        const {container} = render(
          <HomepageCanvas blocks={blocks} site={site} hero={hero} napTokens={tokens} resultsDisclaimer="Past results do not guarantee a future outcome." />,
        )
        await expect(container.innerHTML).toMatchFileSnapshot(`./__snapshots__/flow-reproduction/${canvasName}-${lookName}.html`)
      })
    }
  }

  it('the planted canvas renders thirteen of its fifteen members, as the fixture does', () => {
    const site = lookOf(GRAPHITE_STORED)
    const out = decisions(planted as unknown as HomepageBlock[], site, 'dark')
    expect(out).toHaveLength(13)
    // Today's fixture, read in the record's §0.4: one rise under the hero, one cut into band 5,
    // the raised photo on band 5, the inset band 6 adopting the dark run.
    expect(out[0].divider).toEqual({mode: 'rise', flip: false})
    expect(out.filter((d) => d.divider?.mode === 'cut').map((d) => d.key)).toEqual(['p11-t1-split'])
    expect(out.filter((d) => d.raisePhoto).map((d) => d.key)).toEqual(['p11-t1-split'])
    expect(out.find((d) => d.key === 'p11-t2-twocol')?.insetGround).toBe('dark')
  })
})
