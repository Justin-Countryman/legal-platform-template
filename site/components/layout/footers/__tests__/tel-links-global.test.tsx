import {describe, it, expect, vi} from 'vitest'
import {render} from '@testing-library/react'

// Monorepo backlog 528: every footer, header, sidebar and profile wrote `tel:` and the phone's digits run together, so
// "612-555-0100 ext. 12" dialled 612555010012. RFC 3966 §5.1 (read 2026-10-16): "All phone numbers MUST use the global
// form unless they cannot be represented as such." Every tel: link now goes through `telHref` (lib/tokens.ts, template
// PR #94), as the platform's call button writes it; a number it cannot dial for certain is shown as text, not a link.

vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (p: {src: string; alt: string}) => <img src={p.src} alt={p.alt} />,
}))

import {Footer, type FooterData} from '../../Footer'

const LAYOUTS = ['anchor', 'crest', 'beacon', 'districts', 'pillar', 'meridian', 'switchboard'] as const
const office = '612-555-0100 ext. 12'
const tollFree = '1-800-555-0199'
const DATA: FooterData = {
  firmName: 'Marlow & Finch',
  footerScheme: 'dark',
  address: {city: 'Minneapolis', state: 'MN', officePhone: office, tollFreePhone: tollFree},
  locations: [{_id: 'a', city: 'Minneapolis', address1: '1 Main St', state: 'MN', zip: '55401', officePhone: office,
    tollFreePhone: tollFree}],
  column1: [{label: 'Family Law', href: '/family-law/'}],
  column2: [{label: 'About', href: '/about/'}],
}

const telHrefs = (container: HTMLElement) =>
  [...container.querySelectorAll('a[href^="tel:"]')].map((a) => a.getAttribute('href') as string)

describe("the footers' tel: links", () => {
  for (const footerLayout of LAYOUTS) {
    it(`${footerLayout}: each is the global form, an extension left off`, () => {
      const {container} = render(<Footer data={{...DATA, footerLayout}} />)
      const hrefs = telHrefs(container)
      expect(hrefs.length).toBeGreaterThan(0)
      for (const href of hrefs) expect(href).toMatch(/^tel:\+\d{8,15}$/)
      expect(hrefs).toContain('tel:+16125550100')
      expect(hrefs).not.toContain('tel:612555010012')
    })
  }

  it('a phone that cannot be dialled for certain is text, never a link', () => {
    const words = 'Call our front desk'
    const {container} = render(<Footer data={{...DATA, footerLayout: 'anchor', address: {city: 'Minneapolis', state: 'MN',
      officePhone: words}, locations: [{...DATA.locations![0], officePhone: words, tollFreePhone: undefined}]}} />)
    expect(telHrefs(container)).toEqual([])
    expect(container.textContent).toContain(words)
  })
})
