/**
 * The site never claims a free consultation on its own (monorepo item 362, [R-522]).
 *
 * The claim is a fact of the firm's record, so only stored copy may make it: the build
 * writes it for a firm whose record says Yes. The header button used to fall back to
 * "Free Consultation" when its label was empty, in `CtaButtons`, Mesa and Spire; the
 * fallback is now the Call-to-Outcome the build writes for every other firm.
 */
import fs from 'node:fs'
import path from 'node:path'
import {describe, it, expect, vi} from 'vitest'
import {render} from '@testing-library/react'

vi.mock('next/navigation', () => ({usePathname: () => '/'}))

import {CtaButtons, type HeaderData} from '../shared'

const SITE = path.resolve(__dirname, '../../../..')
const CLAIM = /\b(?:free|complimentary|no[\s-]cost)\s+(?:initial\s+)?(?:consult\w*|case\s+(?:evaluation|review))/i

function sources(dir: string): string[] {
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap((e) => {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) return e.name === '__tests__' || e.name === 'node_modules' ? [] : sources(p)
    return /\.(tsx?|mjs)$/.test(e.name) && !/\.test\./.test(e.name) ? [p] : []
  })
}

describe('free consultation fallback', () => {
  it('an empty button label renders the Call-to-Outcome, not the claim', () => {
    const data: HeaderData = {firmName: 'Test Firm', headerCtaUrl: '/contact/'}
    const {container} = render(<CtaButtons data={data} />)
    expect(container.textContent).toContain('Speak With an Attorney')
    expect(container.textContent ?? '').not.toMatch(CLAIM)
  })

  it('no site source hard-codes the claim', () => {
    const files = ['app', 'components', 'lib'].flatMap((d) => sources(path.join(SITE, d)))
    expect(files.length).toBeGreaterThan(50)
    const found = files.filter((f) => CLAIM.test(fs.readFileSync(f, 'utf8'))).map((f) => path.relative(SITE, f))
    expect(found).toEqual([])
  })
})
