import {describe, it, expect} from 'vitest'
import {render} from '@testing-library/react'

import {
  DifferentiatorBlock,
  gridColumnsForCount,
  type DifferentiatorBlockData,
} from '../DifferentiatorBlock'

const item = (n: number) => ({_key: `k${n}`, title: `Title ${n}`, body: `Body ${n}`})

const block = (
  differentiators: DifferentiatorBlockData['differentiators'] = [item(1), item(2), item(3)],
  rest: Partial<DifferentiatorBlockData> = {},
): DifferentiatorBlockData => ({
  _type: 'differentiatorBlock',
  _key: 'a',
  heading: 'Why clients choose us',
  intro: 'A short pain acknowledgment.',
  differentiators,
  ...rest,
})

describe('DifferentiatorBlock', () => {
  it('renders the heading at the MARKETING scale, not the interior section scale', () => {
    // Same regression guard as BadgesBlock: SectionHeader maps to the interior
    // three-tier scale and would make designSettings.marketingScale do nothing.
    const {container} = render(<DifferentiatorBlock data={block()} />)
    const h2 = container.querySelector('h2')
    expect(h2?.className).toContain('marketing-h2')
    expect(h2?.className).not.toMatch(/\btext-3xl\b/)
  })

  it('renders one entry per differentiator, as a semantic list', () => {
    const {container, getAllByRole} = render(<DifferentiatorBlock data={block()} />)
    expect(container.querySelector('ul')?.getAttribute('role')).toBe('list')
    expect(getAllByRole('listitem')).toHaveLength(3)
  })

  it('renders sub-object titles as h3, below the block h2', () => {
    // The block owns the only h2 in the section. Sub-object titles must not
    // compete with it, which is also why `body` is plain text rather than
    // Portable Text: blockContent would let an operator put a second h2 inside
    // a card.
    const {container} = render(<DifferentiatorBlock data={block()} />)
    expect(container.querySelectorAll('h2')).toHaveLength(1)
    expect(container.querySelectorAll('h3')).toHaveLength(3)
  })
})

describe('DifferentiatorBlock — the count is content, the grid is a consequence', () => {
  // BI-Library's field test holds for a repeating sub-object because the
  // operator chooses CONTENT and the rendering absorbs the LAYOUT consequence.
  // These pin that the consequence is actually absorbed rather than asserted.
  it('renders three across at three', () => {
    expect(gridColumnsForCount(3)).toBe('sm:grid-cols-2 lg:grid-cols-3')
  })

  it('renders 2x2 at four, because four across is cramped for a title plus a sentence', () => {
    expect(gridColumnsForCount(4)).toBe('sm:grid-cols-2')
  })

  it('degrades rather than breaking outside the advisory 3-to-4 bound', () => {
    // The schema bound is a WARNING per platform convention, so the renderer
    // cannot assume it. Nothing here may throw or return a broken grid.
    for (const n of [0, 1, 2, 5, 9]) {
      expect(typeof gridColumnsForCount(n)).toBe('string')
      expect(gridColumnsForCount(n).length).toBeGreaterThan(0)
    }
    const {getAllByRole} = render(<DifferentiatorBlock data={block([item(1), item(2), item(3), item(4), item(5)])} />)
    expect(getAllByRole('listitem')).toHaveLength(5)
  })
})

describe('DifferentiatorBlock — empty renders nothing', () => {
  it('drops an entry with neither title nor body rather than rendering an empty card', () => {
    const {getAllByRole} = render(
      <DifferentiatorBlock data={block([item(1), {_key: 'x', title: null, body: null}])} />,
    )
    expect(getAllByRole('listitem')).toHaveLength(1)
  })

  it('renders nothing at all when there is no heading, no intro and no items', () => {
    const {container} = render(
      <DifferentiatorBlock data={block([], {heading: null, intro: null})} />,
    )
    expect(container.innerHTML).toBe('')
  })

  it('still renders the header when items are empty but copy exists', () => {
    // A half-authored block shows the operator what is missing without hiding
    // the copy they already wrote.
    const {container} = render(<DifferentiatorBlock data={block([])} />)
    expect(container.querySelector('h2')).not.toBeNull()
    expect(container.querySelector('ul')).toBeNull()
  })
})
