import {describe, expect, it, vi} from 'vitest'
import {forwardRef} from 'react'
import {render, screen, within} from '@testing-library/react'
import {axeViolations} from '@/lib/__tests__/axe'

vi.mock('next/link', () => ({
  // eslint-disable-next-line react/display-name
  default: forwardRef<HTMLAnchorElement, {href: string; children: React.ReactNode; className?: string}>(
    ({href, children, ...rest}, ref) => <a ref={ref} href={href} {...rest}>{children}</a>,
  ),
}))

import {AttorneySlider} from '../AttorneySlider'

const ATTORNEYS = [
  {_id: 'a', title: 'Alex Rivera', slug: 'attorneys/alex-rivera', jobTitle: 'Partner'},
  {_id: 'b', title: 'Jordan Lee', slug: 'attorneys/jordan-lee', jobTitle: 'Associate'},
  {_id: 'c', title: 'Sam Patel', slug: 'attorneys/sam-patel'},
]

// Backlog 329 (WCAG 1.3.1, level A): each attorney was `<li role="group">` inside `<ul role="list">` (aria-required-
// children, critical, on every homepage with the slider). The region already names the carousel "Attorneys", so the
// list carries no second label, and a slide is a plain list item whose position the list announces.
describe('the attorney slider', () => {
  it('passes axe, its slides plain list items under the one named region', async () => {
    const {container} = render(<AttorneySlider attorneys={ATTORNEYS} />)
    expect(await axeViolations(container)).toEqual([])
    const region = screen.getByRole('region', {name: 'Attorneys'})
    const list = within(region).getByRole('list')
    expect(list.getAttribute('aria-label')).toBeNull()
    const slides = within(list).getAllByRole('listitem')
    expect(slides).toHaveLength(3)
    for (const slide of slides) {
      expect([slide.getAttribute('role'), slide.getAttribute('aria-roledescription'), slide.getAttribute('aria-label')])
        .toEqual([null, null, null])
    }
  })
})
