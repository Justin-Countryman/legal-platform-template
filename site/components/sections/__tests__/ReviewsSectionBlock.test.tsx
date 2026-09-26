import {describe, it, expect, vi} from 'vitest'
import {forwardRef} from 'react'
import {render} from '@testing-library/react'

vi.mock('next/link', () => ({
  // eslint-disable-next-line react/display-name
  default: forwardRef<HTMLAnchorElement, {href: string; children: React.ReactNode; className?: string}>(
    ({href, children, ...rest}, ref) => <a ref={ref} href={href} {...rest}>{children}</a>,
  ),
}))

import {ReviewsSectionBlock, type ReviewsSectionBlockData} from '../ReviewsSectionBlock'

// ─── The reviews section ──────────────────────────────────────────────────────
//
// 2026-09-14: the section gains buttons and a layout, and a homepage copy. With
// neither set it renders exactly as before (the SectionHeader golden pins the
// markup); stacked with buttons adds a centred row; split puts the heading and
// buttons left of the widget. The widget is the section: no embed, no band.

const EMBED = '<div class="widget">reviews widget</div>'
const tokens = {firmName: 'Acme Law'}
const three = [1, 2, 3].map((n) => ({title: `Button ${n} at {{firmName}}`, url: `/b${n}/`, variant: n === 1 ? 'primary' : 'secondary'}))

function renderSection(data: ReviewsSectionBlockData) {
  return render(<ReviewsSectionBlock data={data} napTokens={tokens} />)
}

describe('ReviewsSectionBlock', () => {
  it('renders nothing without an embed', () => {
    expect(renderSection({heading: 'Reviews', buttons: three}).container.innerHTML).toBe('')
  })

  it('with no layout and no buttons keeps its original markup', () => {
    const {container} = renderSection({tagline: 'Clients', heading: 'What clients say', description: 'd', reviewsEmbed: EMBED})
    const inner = container.querySelector('section > div.container')!
    expect(Array.from(inner.children).map((c) => c.className)).toEqual(['text-center mx-auto mb-12 max-w-2xl', ''])
    expect(container.querySelectorAll('a')).toHaveLength(0)
  })

  it('stacked with buttons: a centred row of two between the heading and the widget, labels resolved', () => {
    const {container} = renderSection({heading: 'What clients say', buttons: three, reviewsEmbed: EMBED})
    const inner = container.querySelector('section > div.container')!
    expect(inner.children[0].className).toBe('text-center mx-auto mb-6 max-w-2xl')
    const links = container.querySelectorAll('a')
    expect(links).toHaveLength(2)
    expect(links[0].textContent).toContain('Button 1 at Acme Law')
    expect(inner.children[1].className).toContain('justify-center')
    expect(inner.children[1].className).toContain('mb-12')
  })

  it('split: heading and buttons in the left column, the widget on the right with an accessible label', () => {
    const {container} = renderSection({layout: 'split', tagline: 'Clients', heading: 'What {{firmName}} clients say', buttons: three.slice(0, 1), reviewsEmbed: EMBED})
    const left = container.querySelector('.lg\\:col-span-5')!
    const right = container.querySelector('.lg\\:col-span-7')!
    expect(left.querySelector('h2')?.textContent).toBe('What Acme Law clients say')
    expect(left.firstElementChild!.className).not.toContain('text-center')
    expect(left.querySelectorAll('a')).toHaveLength(1)
    expect(right.firstElementChild!.getAttribute('aria-label')).toBe('What Acme Law clients say')
  })

  it('split with no heading still renders the widget', () => {
    const {container} = renderSection({layout: 'split', reviewsEmbed: EMBED})
    expect(container.querySelector('.lg\\:col-span-7')).not.toBeNull()
    expect(container.querySelector('h2')).toBeNull()
  })
})
