import {describe, it, expect, vi} from 'vitest'
import {render, screen, fireEvent} from '@testing-library/react'
import {ButtonGroup, toCtaItems} from '../ButtonGroup'

// next/link is jsdom-friendly in recent Next versions, but mocking it to a
// passthrough <a> sidesteps router context the tests don't need.
vi.mock('next/link', () => ({
  default: ({href, children, ...rest}: {href: string; children: React.ReactNode}) => (
    <a href={href} {...rest}>{children}</a>
  ),
}))

// ─── Render counts ────────────────────────────────────────────────────────────

describe('ButtonGroup — render counts', () => {
  it('renders null when items is empty', () => {
    const {container} = render(<ButtonGroup items={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders exactly 1 Button for 1 item', () => {
    render(<ButtonGroup items={[{label: 'Schedule', url: '/contact'}]} />)
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(1)
    expect(links[0].textContent).toBe('Schedule')
  })

  it('renders exactly 2 Buttons for 2 items', () => {
    render(
      <ButtonGroup
        items={[
          {label: 'Schedule', url: '/contact'},
          {label: 'Learn more', url: '/about'},
        ]}
      />,
    )
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(2)
    expect(links[0].textContent).toBe('Schedule')
    expect(links[1].textContent).toBe('Learn more')
  })
})

// ─── Variant dispatch ─────────────────────────────────────────────────────────

describe('ButtonGroup — variant dispatch', () => {
  it('item with variant="primary" renders primary Button', () => {
    render(
      <ButtonGroup items={[{label: 'Go', url: '/x', variant: 'primary'}]} />,
    )
    const link = screen.getByRole('link')
    expect(link.getAttribute('data-variant')).toBe('primary')
    expect(link.className).toContain('bg-action')
  })

  it('item with variant="secondary" renders secondary Button', () => {
    render(
      <ButtonGroup items={[{label: 'Go', url: '/x', variant: 'secondary'}]} />,
    )
    const link = screen.getByRole('link')
    expect(link.getAttribute('data-variant')).toBe('secondary')
    expect(link.className).toContain('border-action')
  })

  it('item with variant="tertiary" renders tertiary Button (no data-variant attr)', () => {
    render(
      <ButtonGroup items={[{label: 'Read more', url: '/x', variant: 'tertiary'}]} />,
    )
    const link = screen.getByRole('link')
    // Tertiary intentionally lacks data-button-animatable / data-variant
    // (verified in Button.test.tsx). Confirm via tertiary-only class signature.
    expect(link.getAttribute('data-variant')).toBeNull()
    // Tertiary uses cascade-aware text-action-text (post WS5 contrast revert
    // — vivid-accent palettes like a warm-accent failed 4.5:1 against light
    // surfaces with raw text-accent; text-action-text falls back to the
    // AA-safe action-on-light value on light surfaces and the raw action
    // color on dark).
    expect(link.className).toContain('text-action-text')
    expect(link.className).not.toContain('text-accent')
  })

  it('item with no variant defaults to primary', () => {
    render(<ButtonGroup items={[{label: 'Go', url: '/x'}]} />)
    const link = screen.getByRole('link')
    expect(link.getAttribute('data-variant')).toBe('primary')
    expect(link.className).toContain('bg-action')
  })

  it('respectVariantField={false} forces every item to primary', () => {
    render(
      <ButtonGroup
        respectVariantField={false}
        items={[
          {label: 'A', url: '/a', variant: 'secondary'},
          {label: 'B', url: '/b', variant: 'tertiary'},
        ]}
      />,
    )
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(2)
    links.forEach((l) => {
      expect(l.getAttribute('data-variant')).toBe('primary')
      expect(l.className).toContain('bg-action')
    })
  })
})

// ─── Context propagation ─────────────────────────────────────────────────────

describe('ButtonGroup — context propagation', () => {
  it('context="dark" propagates to each Button (primary.dark white-fill flip)', () => {
    render(
      <ButtonGroup
        context="dark"
        items={[
          {label: 'A', url: '/a'},
          {label: 'B', url: '/b'},
        ]}
      />,
    )
    const links = screen.getAllByRole('link')
    links.forEach((l) => {
      expect(l.className).toContain('bg-background')
      expect(l.className).toContain('text-foreground')
      expect(l.className).toContain('[--color-foreground:var(--color-foreground-on-light)]')
      expect(l.className).not.toContain('bg-action')
    })
  })

  it('context="light" (default) renders primary with bg-action', () => {
    render(<ButtonGroup items={[{label: 'A', url: '/a'}]} />)
    const link = screen.getByRole('link')
    expect(link.className).toContain('bg-action')
    expect(link.className).toContain('text-action-fg')
  })
})

// ─── Size propagation ────────────────────────────────────────────────────────

describe('ButtonGroup — size propagation', () => {
  it('size="small" propagates to each Button', () => {
    render(
      <ButtonGroup
        size="small"
        items={[
          {label: 'A', url: '/a'},
          {label: 'B', url: '/b'},
        ]}
      />,
    )
    const links = screen.getAllByRole('link')
    links.forEach((l) => {
      expect(l.className).toContain('px-4')
      expect(l.className).toContain('py-1.5')
      expect(l.className).toContain('text-xs')
    })
  })

  it('size="compact" propagates to each Button', () => {
    render(
      <ButtonGroup
        size="compact"
        items={[
          {label: 'A', url: '/a'},
          {label: 'B', url: '/b'},
        ]}
      />,
    )
    const links = screen.getAllByRole('link')
    links.forEach((l) => {
      expect(l.className).toContain('px-5')
      expect(l.className).toContain('py-2.5')
      expect(l.className).toContain('text-sm')
    })
  })

  it('size="normal" (default) propagates to each Button', () => {
    render(<ButtonGroup items={[{label: 'A', url: '/a'}]} />)
    const link = screen.getByRole('link')
    expect(link.className).toContain('px-6')
    expect(link.className).toContain('py-3')
    expect(link.className).toContain('text-sm')
  })
})

// ─── Container layout ────────────────────────────────────────────────────────

describe('ButtonGroup — container layout', () => {
  it('container has flex flex-wrap gap-4 base classes', () => {
    const {container} = render(<ButtonGroup items={[{label: 'A', url: '/a'}]} />)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain('flex')
    expect(wrapper.className).toContain('flex-wrap')
    expect(wrapper.className).toContain('gap-4')
  })

  it('align="center" adds justify-center', () => {
    const {container} = render(
      <ButtonGroup align="center" items={[{label: 'A', url: '/a'}]} />,
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain('justify-center')
  })

  it('align="start" (default) does not add justify-center', () => {
    const {container} = render(<ButtonGroup items={[{label: 'A', url: '/a'}]} />)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).not.toContain('justify-center')
  })

  it('className prop appends to container last (consumer wins)', () => {
    const {container} = render(
      <ButtonGroup
        className="mt-6 md:mt-8"
        items={[{label: 'A', url: '/a'}]}
      />,
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain('mt-6')
    expect(wrapper.className).toContain('md:mt-8')
    // Consumer className appears AFTER the base classes per the join order.
    expect(wrapper.className.indexOf('mt-6')).toBeGreaterThan(
      wrapper.className.indexOf('flex-wrap'),
    )
  })
})

// ─── External URL handling ───────────────────────────────────────────────────

describe('ButtonGroup — external URL handling', () => {
  it('external https URL passes through to Button (target/rel injected by Button)', () => {
    render(
      <ButtonGroup
        items={[{label: 'Visit', url: 'https://example.com'}]}
      />,
    )
    const link = screen.getByRole('link')
    expect(link.tagName).toBe('A')
    expect(link.getAttribute('href')).toBe('https://example.com')
    // Button.tsx defaults rel to 'noopener noreferrer' on http(s) hrefs.
    expect(link.getAttribute('rel')).toBe('noopener noreferrer')
  })
})

// ─── onClick / button rendering ──────────────────────────────────────────────

describe('ButtonGroup — onClick items', () => {
  it('item with onClick and no url renders <button> and fires onClick', () => {
    const handler = vi.fn()
    render(<ButtonGroup items={[{label: 'Tap', onClick: handler}]} />)
    const btn = screen.getByRole('button')
    expect(btn.tagName).toBe('BUTTON')
    fireEvent.click(btn)
    expect(handler).toHaveBeenCalledTimes(1)
  })
})

// ─── Filtering ───────────────────────────────────────────────────────────────

describe('ButtonGroup — invalid item filtering', () => {
  it('filters items missing both url and onClick', () => {
    render(
      <ButtonGroup
        items={[
          {label: 'Valid', url: '/a'},
          {label: 'Invalid — no destination'},
        ]}
      />,
    )
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(1)
    expect(links[0].textContent).toBe('Valid')
    expect(screen.queryByText('Invalid — no destination')).toBeNull()
  })

  it('renders null when every item is missing label or destination', () => {
    const {container} = render(
      <ButtonGroup
        items={[
          {label: '', url: '/a'},
          {label: 'No-dest'},
        ]}
      />,
    )
    expect(container.firstChild).toBeNull()
  })
})

// ─── fullWidth propagation ───────────────────────────────────────────────────

describe('ButtonGroup — fullWidth propagation', () => {
  it('fullWidth propagates to each Button (w-full class on each)', () => {
    render(
      <ButtonGroup
        fullWidth
        items={[
          {label: 'A', url: '/a'},
          {label: 'B', url: '/b'},
        ]}
      />,
    )
    const links = screen.getAllByRole('link')
    links.forEach((l) => {
      expect(l.className).toContain('w-full')
    })
  })
})

// ─── toCtaItems mapper ───────────────────────────────────────────────────────

describe('toCtaItems — Sanity ctaButton → CtaItem mapping', () => {
  it('maps Sanity variant="link" to ButtonGroup variant="tertiary"', () => {
    const out = toCtaItems([{title: 'Read more', url: '/blog', variant: 'link'}])
    expect(out).toEqual([{label: 'Read more', url: '/blog', variant: 'tertiary'}])
  })

  it('passes Sanity variant="secondary" through unchanged', () => {
    const out = toCtaItems([{title: 'Learn more', url: '/about', variant: 'secondary'}])
    expect(out).toEqual([{label: 'Learn more', url: '/about', variant: 'secondary'}])
  })

  it('passes Sanity variant="primary" through unchanged', () => {
    const out = toCtaItems([{title: 'Schedule', url: '/contact', variant: 'primary'}])
    expect(out).toEqual([{label: 'Schedule', url: '/contact', variant: 'primary'}])
  })

  it('falls back to primary for null / undefined / unknown variant values', () => {
    const items = toCtaItems([
      {title: 'A', url: '/a', variant: null},
      {title: 'B', url: '/b', variant: undefined},
      {title: 'C', url: '/c'},
      {title: 'D', url: '/d', variant: 'gibberish' as unknown as 'primary'},
    ])
    expect(items).toHaveLength(4)
    items.forEach((i) => expect(i.variant).toBe('primary'))
  })

  it('renames title → label (no other transforms applied)', () => {
    const out = toCtaItems([{title: 'Click me', url: '/x'}])
    expect(out[0].label).toBe('Click me')
    expect((out[0] as unknown as {title?: string}).title).toBeUndefined()
  })

  it('filters items missing title or url, plus null/undefined entries', () => {
    const out = toCtaItems([
      {title: 'Valid', url: '/v'},
      {title: '', url: '/empty-title'},
      {title: 'No url'},
      null,
      undefined,
      {url: '/no-title'},
    ])
    expect(out).toHaveLength(1)
    expect(out[0].label).toBe('Valid')
  })

  it('returns [] for null / undefined / empty input', () => {
    expect(toCtaItems(null)).toEqual([])
    expect(toCtaItems(undefined)).toEqual([])
    expect(toCtaItems([])).toEqual([])
  })
})
