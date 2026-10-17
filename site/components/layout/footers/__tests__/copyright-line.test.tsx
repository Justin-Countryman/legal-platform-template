import {describe, it, expect, vi} from 'vitest'
import {render} from '@testing-library/react'

// Monorepo backlog 519: every footer printed "© {year} {firmName}. All rights reserved.", so a firm whose name ends in
// a period ("Marlow & Finch, P.A.") read "P.A.." The firm's name, address and phone are stated correctly everywhere
// (Justin, 2026-10-15, the QA check-list review: local.firm-name.pages).

vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (p: {src: string; alt: string}) => <img src={p.src} alt={p.alt} />,
}))

import {Footer, type FooterData} from '../../Footer'
import {copyrightLine} from '../shared'

const DATA: FooterData = {
  firmName: 'Marlow & Finch, P.A.',
  footerScheme: 'dark',
  address: {city: 'Minneapolis', state: 'MN', officePhone: '6125550100'},
  locations: [{_id: 'a', city: 'Minneapolis', address1: '1 Main St', state: 'MN', zip: '55401', officePhone: '6125550100'}],
  column1: [{label: 'Family Law', href: '/family-law/'}],
  column2: [{label: 'About', href: '/about/'}],
}

describe('the copyright line', () => {
  it('ends the firm name with one period', () => {
    expect(copyrightLine(2026, 'Marlow & Finch, P.A.')).toBe('© 2026 Marlow & Finch, P.A. All rights reserved.')
    expect(copyrightLine(2026, 'Marlow & Finch')).toBe('© 2026 Marlow & Finch. All rights reserved.')
    expect(copyrightLine(2026, '')).toBe('© 2026. All rights reserved.')
  })

  for (const footerLayout of ['anchor', 'crest', 'beacon', 'districts', 'pillar', 'meridian', 'switchboard'] as const) {
    it(`${footerLayout}: a name ending in a period gets no second one`, () => {
      const {container} = render(<Footer data={{...DATA, footerLayout}} />)
      expect(container.textContent).toContain('Marlow & Finch, P.A. All rights reserved.')
      expect(container.textContent).not.toContain('P.A..')
    })
  }
})
