import {describe, it, expect, vi} from 'vitest'
import {forwardRef} from 'react'
import {render, screen, within} from '@testing-library/react'

vi.mock('next/link', () => ({
  // eslint-disable-next-line react/display-name
  default: forwardRef<HTMLAnchorElement, {href: string; children: React.ReactNode; className?: string}>(
    ({href, children, ...rest}, ref) => <a ref={ref} href={href} {...rest}>{children}</a>,
  ),
}))
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({src, alt}: {src: string; alt: string}) => <img src={src} alt={alt} />,
}))

import {PracticeAreaNavBlock, type PracticeAreaNavBlockData} from '../PracticeAreaNavBlock'

const ITEMS = [
  {_key: 'a', label: 'Family Law', href: '/family-law/', description: 'Divorce and custody.'},
  {_key: 'b', label: 'Estate Planning', href: '/estate-planning/', description: 'Wills and trusts.'},
]

function data(over: Partial<PracticeAreaNavBlockData> = {}): PracticeAreaNavBlockData {
  return {
    _type: 'practiceAreaNav',
    tagline: 'Practice areas',
    heading: 'How we can help',
    description: 'Counsel across the matters that matter most.',
    layout: 'feature',
    items: ITEMS,
    ...over,
  }
}

const LAYOUTS = ['centered', 'left', 'aside', 'banner'] as const

describe('PracticeAreaNavBlock — section layouts', () => {
  it.each(LAYOUTS)('renders the %s arrangement with the nav landmark + header intact', (sectionLayout) => {
    const {container} = render(<PracticeAreaNavBlock data={data({sectionLayout})} />)
    // the section-layout frame is tagged for the chosen arrangement
    expect(container.querySelector(`[data-section-layout="${sectionLayout}"]`)).not.toBeNull()
    // header survives every arrangement
    expect(screen.getByRole('heading', {name: 'How we can help'})).toBeTruthy()
    // the silo nav landmark is always named + present
    const nav = screen.getByRole('navigation', {name: 'How we can help'})
    expect(within(nav).getAllByRole('listitem')).toHaveLength(2)
  })

  it('defaults to centered when no section layout is set', () => {
    const {container} = render(<PracticeAreaNavBlock data={data({sectionLayout: null})} />)
    expect(container.querySelector('[data-section-layout="centered"]')).not.toBeNull()
  })

  it('aside builds the two-column (sticky header) structure', () => {
    const {container} = render(<PracticeAreaNavBlock data={data({sectionLayout: 'aside'})} />)
    const frame = container.querySelector('[data-section-layout="aside"]')
    expect(frame?.className).toContain('lg:grid-cols-[18rem_1fr]')
    expect(frame?.querySelector('.lg\\:sticky')).not.toBeNull()
  })

  it('the grid is a container-query context so it adapts to its column', () => {
    const {container} = render(<PracticeAreaNavBlock data={data({sectionLayout: 'aside'})} />)
    // SiloNav wraps the list in an @container; the grid uses container-query columns
    const nav = container.querySelector('nav.\\@container')
    expect(nav).not.toBeNull()
    expect(nav?.querySelector('ul')?.className).toContain('@4xl:grid-cols-3')
  })

  it('renders nothing when there are no linkable items', () => {
    const {container} = render(<PracticeAreaNavBlock data={data({items: []})} />)
    expect(container.firstChild).toBeNull()
  })

  it('Bento grid mode overrides the button layout and leads with the Primary item', () => {
    const items = [
      {_key: 'a', label: 'Family Law', href: '/family-law/', description: null},
      {_key: 'b', label: 'Estate Planning', href: '/estate-planning/', description: null, featured: true},
    ]
    render(<PracticeAreaNavBlock data={data({gridMode: 'bentoLeft', layout: 'inline', items})} />)
    const nav = screen.getByRole('navigation', {name: 'How we can help'})
    const lis = within(nav).getAllByRole('listitem')
    // hero (featured) first, regardless of source order
    expect(within(lis[0]).getByText('Estate Planning')).toBeTruthy()
  })
})
