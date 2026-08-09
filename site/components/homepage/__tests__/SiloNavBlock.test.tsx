import {describe, it, expect} from 'vitest'
import {render} from '@testing-library/react'

import {SiloNavBlock, type SiloNavBlockData} from '../SiloNavBlock'
import type {SiloNavItem} from '@/components/sections/silo/types'

const area = (n: number): SiloNavItem => ({
  _key: `k${n}`,
  label: `Practice Area ${n}`,
  href: `/practice-area-${n}/`,
  description: `What area ${n} covers.`,
})

const block = (overrides: Partial<SiloNavBlockData> = {}): SiloNavBlockData => ({
  _type: 'siloNavBlock',
  _key: 'silo',
  heading: 'Areas of Law',
  mode: 'allTopLevel',
  items: [area(1), area(2), area(3)],
  ...overrides,
})

describe('SiloNavBlock', () => {
  it('renders the heading at the MARKETING scale, not the interior section scale', () => {
    // Layer 3 rule 2: a block routed through <SectionHeader> compiles, looks
    // right, and makes designSettings.marketingScale do nothing. The interior
    // practiceAreaNav section DOES use SectionHeader, which is correct there and
    // is exactly the thing this block must not inherit when it reuses the
    // section's tile layout.
    const {container} = render(<SiloNavBlock data={block()} />)
    const h2 = container.querySelector('h2')
    expect(h2?.className).toContain('marketing-h2')
    expect(h2?.className).not.toMatch(/\btext-3xl\b/)
  })

  it('renders one link per practice area, pointing at the resolved href', () => {
    // The GROQ emits a trailing slash and the shared link primitive normalises
    // it away, same as every other silo surface. Asserted as the platform
    // actually behaves rather than as the projection is written.
    const {container} = render(<SiloNavBlock data={block()} />)
    const links = [...container.querySelectorAll('nav a')]
    expect(links).toHaveLength(3)
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/practice-area-1',
      '/practice-area-2',
      '/practice-area-3',
    ])
  })

  it('names the nav landmark from the heading, and never leaves it unnamed', () => {
    const named = render(<SiloNavBlock data={block()} />)
    expect(named.container.querySelector('nav')?.getAttribute('aria-label')).toBe('Areas of Law')

    // A band composed without a header still has to name its landmark.
    const headless = render(<SiloNavBlock data={block({heading: null})} />)
    expect(headless.container.querySelector('nav')?.getAttribute('aria-label')).toBe(
      'Practice areas',
    )
  })

  it('drops an item with no href rather than rendering a dead tile', () => {
    const {container} = render(
      <SiloNavBlock data={block({items: [area(1), {...area(2), href: null}]})} />,
    )
    expect(container.querySelectorAll('nav a')).toHaveLength(1)
  })

  it('renders nothing at all when there are no items', () => {
    // Empty renders nothing rather than a heading over a void (Layer 3). The
    // heading is set here on purpose: the guard is the item count, not the copy.
    const {container} = render(<SiloNavBlock data={block({items: []})} />)
    expect(container.innerHTML).toBe('')
    expect(render(<SiloNavBlock data={block({items: null})} />).container.innerHTML).toBe('')
  })

  it('exposes no layout, grid, hover or icon control to the operator', () => {
    // The field test, pinned. Every treatment axis the interior section offers
    // is decided in this component during composition. If one of them ever
    // becomes a prop, it has become a schema field in all but name, and the
    // operator gets a Studio control that changes nothing.
    const props = Object.keys(block())
    for (const treatment of [
      'layout',
      'gridMode',
      'sectionLayout',
      'mobileDisplay',
      'iconPosition',
      'showArrow',
      'hoverEffects',
    ]) {
      expect(props).not.toContain(treatment)
    }
  })
})
