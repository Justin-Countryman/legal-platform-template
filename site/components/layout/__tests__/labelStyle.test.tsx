import {describe, expect, it, vi} from 'vitest'
import {forwardRef} from 'react'
import {render} from '@testing-library/react'
import fs from 'node:fs'
import path from 'node:path'

vi.mock('next/link', () => ({
  // eslint-disable-next-line react/display-name
  default: forwardRef<HTMLAnchorElement, {href: string; children: React.ReactNode}>(({href, children, ...rest}, ref) => <a ref={ref} href={href} {...rest}>{children}</a>),
}))

import {NavLinks} from '../headers/shared'
import {Button} from '@/components/ui/Button'

// TRACKED LABELS (monorepo WS-PREMIUM-PACKAGE-DESIGN §7.2 amendment 13, `[R-641]`; all five premium references): one label
// style on buttons, text links, the main menu's top items and the footer's column headings, under the shell's
// `data-label-style`. The selectors reach the menu's top items and never its dropdown links.

const CSS = fs.readFileSync(path.resolve(__dirname, '../../../app/globals.css'), 'utf8')
const block = /(\[data-label-style="tracked"\] :is\(\[data-variant="primary"\][\s\S]*?)\{([^}]*)\}/.exec(CSS)!
const selector = block[1].split(',\n').map((s) => s.trim().replace(/^\[data-label-style="tracked"\] /, ''))

describe('tracked labels', () => {
  it('draw small spaced capitals and set the text links’ own variables', () => {
    expect(block[2]).toContain('text-transform: uppercase')
    expect(block[2]).toContain('letter-spacing: 0.1em')
    expect(CSS).toMatch(/\[data-label-style="tracked"\] \{\s*--tertiary-text-transform: uppercase;\s*--tertiary-letter-spacing: 0\.1em;/)
  })

  it('reach the menu’s top items, a submenu’s trigger and its parent link, and no dropdown link', () => {
    const items = [
      {label: 'About', href: '/about/'},
      {label: 'Practice areas', href: '/practice-areas/', children: [{label: 'Wills', href: '/wills/'}]},
      {label: 'Resources', children: [{label: 'Blog', href: '/blog/'}]},
    ]
    const {container} = render(<nav aria-label="Main navigation"><NavLinks items={items as never} textClass="" hoverTextClass="" isMobile={false} /></nav>)
    const hit = (el: Element) => selector.some((s) => el.matches(s))
    expect(hit([...container.querySelectorAll('a')].find((a) => a.textContent === 'About')!)).toBe(true)
    expect(hit([...container.querySelectorAll('a')].find((a) => a.textContent === 'Practice areas')!)).toBe(true)
    expect(hit([...container.querySelectorAll('button')].find((b) => b.textContent?.includes('Resources'))!)).toBe(true)
    for (const a of container.querySelectorAll('a')) if (['Wills', 'Blog'].includes(a.textContent!)) expect(hit(a), a.textContent!).toBe(false)
  })

  it('reach the primary and secondary buttons', () => {
    for (const variant of ['primary', 'secondary'] as const) {
      const el = render(<Button variant={variant}>Call</Button>).container.firstElementChild!
      expect(selector.some((s) => el.matches(s)), variant).toBe(true)
    }
  })
})
