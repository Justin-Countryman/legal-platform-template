// @vitest-environment node
import fs from 'node:fs'
import path from 'node:path'
import {renderToStaticMarkup} from 'react-dom/server'
import {describe, expect, it} from 'vitest'
import {heroWeightOf} from '../SiteShell'
import {HeroHeading} from '../homeHero/shared'

// THE HOMEPAGE HEADLINE BOLD OVER REGULAR SECTION HEADINGS (monorepo WS-PREMIUM-PACKAGE-DESIGN §7.3, `[R-641]`; brandilaw
// draws its hero line bold over regular headings). One heading weight drew both. The shell sets `data-hero-weight` only
// where Design Settings asks and the heading face draws a bold (ADV-PP-B: pairings 2, 13 and 19 have none), and one
// rule, after the weight rules and as specific as the strongest of them, draws the homepage hero's headline at 700.

const CSS = fs.readFileSync(path.resolve(__dirname, '../../../app/globals.css'), 'utf8')
const RULE = '[data-hero-weight="bold"] h1[data-hero-heading] { font-weight: 700; }'

describe('the homepage headline weight', () => {
  it('is bold only where asked for and drawable', () => {
    expect(heroWeightOf({heroHeadingWeight: 'bold', fontPairingPreset: 1})).toBe('bold')
    expect(heroWeightOf({heroHeadingWeight: 'bold'})).toBe('bold')
    // DM Serif Display draws one weight: the headline follows the heading weight there.
    expect(heroWeightOf({heroHeadingWeight: 'bold', fontPairingPreset: 2})).toBeUndefined()
    expect(heroWeightOf({fontPairingPreset: 1})).toBeUndefined()
    expect(heroWeightOf({heroHeadingWeight: 'heavy', fontPairingPreset: 1})).toBeUndefined()
    expect(heroWeightOf(null)).toBeUndefined()
  })

  it('reaches the homepage hero’s headline, after every heading-weight rule', () => {
    expect(renderToStaticMarkup(<HeroHeading>Serious counsel</HeroHeading>)).toContain('data-hero-heading=""')
    const at = CSS.indexOf(RULE)
    expect(at).toBeGreaterThan(-1)
    expect(at).toBeGreaterThan(CSS.lastIndexOf('[data-heading-weight="light"] :is(h1.marketing-h1'))
    expect(at).toBeGreaterThan(CSS.lastIndexOf('[data-heading-weight="regular"] :is(h1'))
  })
})
