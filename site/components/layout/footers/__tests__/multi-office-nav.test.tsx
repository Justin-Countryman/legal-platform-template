import {describe, it, expect, vi} from 'vitest'
import {render} from '@testing-library/react'

// Phase 17B session 4 (`[R-520]`): the multi-office footers, Districts and Switchboard, drew
// every office and no navigation at all, so a firm the build puts on them lost the ranked
// practice areas (`[R-202]`) and the site's pages from its footer. They now draw Anchor's two
// lists under one footer landmark, as a row of their own.

vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (p: {src: string; alt: string}) => <img src={p.src} alt={p.alt} />,
}))

import {Footer, type FooterData} from '../../Footer'

const OFFICE = (id: string, city: string) => ({_id: id, city, address1: '1 Main St', state: 'MN', zip: '55401', officePhone: '6125550100', pageSlug: `locations/${city.toLowerCase()}`})

const DATA: FooterData = {
  firmName: 'Test Firm',
  footerScheme: 'dark',
  address: {city: 'Minneapolis', state: 'MN', officePhone: '6125550100'},
  locations: [OFFICE('a', 'Minneapolis'), OFFICE('b', 'St Paul'), OFFICE('c', 'Duluth')],
  column1: [{label: 'Family Law', href: '/family-law/'}, {label: 'Estate Planning', href: '/estate-planning/'}],
  column2: [{label: 'About', href: '/about/'}, {label: 'Blog', href: '/blog/'}],
}

describe('the multi-office footers draw the footer navigation (Phase 17B session 4)', () => {
  for (const footerLayout of ['districts', 'switchboard', 'anchor'] as const) {
    it(`${footerLayout}: the practice areas and the site's pages, under the footer landmark`, () => {
      const {container} = render(<Footer data={{...DATA, footerLayout}} />)
      const nav = container.querySelector('nav[aria-label="Footer navigation"]')
      expect(nav).not.toBeNull()
      const hrefs = [...nav!.querySelectorAll('a')].map((a) => a.getAttribute('href'))
      expect(hrefs).toEqual(['/family-law', '/estate-planning', '/about', '/blog'])
      expect(nav!.querySelector('ul[aria-label="Practice areas"]')).not.toBeNull()
    })
  }

  for (const footerLayout of ['districts', 'switchboard'] as const) {
    it(`${footerLayout}: nothing to list draws no landmark`, () => {
      const {container} = render(<Footer data={{...DATA, footerLayout, column1: [], column2: null}} />)
      expect(container.querySelector('nav[aria-label="Footer navigation"]')).toBeNull()
    })

    it(`${footerLayout}: every office is still drawn`, () => {
      const {container} = render(<Footer data={{...DATA, footerLayout}} />)
      for (const city of ['Minneapolis', 'St Paul', 'Duluth']) expect(container.textContent).toContain(city)
    })
  }
})
