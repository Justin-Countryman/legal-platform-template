import {describe, it, expect, vi} from 'vitest'
import {render, fireEvent, screen, within} from '@testing-library/react'
import {FaqAccordion} from '../FaqAccordion'

// PortableText is mocked to a passthrough that captures its `value` prop, so
// FaqAccordion's own contract (disclosure, heading, panel association) is
// isolated from PortableText rendering. Same vi.mock pattern established by
// MotionRoot (Commit 2) and FormModal (Commit 3).
vi.mock('@/components/ui/PortableText', () => ({
  PortableTextRenderer: vi.fn(({value}) => (
    <div data-testid="ptr">portable-text-rendered:{Array.isArray(value) ? value.length : 0}</div>
  )),
}))

const ITEMS_2 = [
  {question: 'What is family law?', answer: [{_type: 'block', children: []}]},
  {question: 'How long does divorce take?', answer: [{_type: 'block', children: []}]},
]

const ITEMS_3 = [
  {question: 'Q1', answer: [{_type: 'block', children: []}]},
  {question: 'Q2', answer: [{_type: 'block', children: []}]},
  {question: 'Q3', answer: [{_type: 'block', children: []}]},
]

// ─── Render shape ─────────────────────────────────────────────────────────────

describe('FaqAccordion — render shape', () => {
  it('renders nothing when items is an empty array', () => {
    const {container} = render(<FaqAccordion items={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders one button + one panel per item', () => {
    render(<FaqAccordion items={ITEMS_2} />)
    expect(screen.getAllByRole('button').length).toBe(2)
  })

  it('starts with all items collapsed (no aria-expanded="true")', () => {
    render(<FaqAccordion items={ITEMS_2} />)
    const buttons = screen.getAllByRole('button')
    buttons.forEach((b) => expect(b.getAttribute('aria-expanded')).toBe('false'))
  })
})

// ─── Disclosure A11y dimension (the new anchor pattern) ───────────────────────
//
// Locked pattern for disclosure widgets: a native <button> wrapped in a
// heading announces aria-expanded + aria-controls referencing a panel id.
// The panel uses aria-labelledby (back-pointer to the trigger), aria-hidden
// when collapsed, and `inert` on the inner wrapper to prevent focus leakage
// into hidden content (WCAG 2.1.1). Decorative chevron is aria-hidden.
// Transferable to any expand/collapse widget.

describe('FaqAccordion — disclosure A11y', () => {
  it('each trigger has aria-expanded ("false" by default)', () => {
    render(<FaqAccordion items={ITEMS_2} />)
    screen.getAllByRole('button').forEach((b) =>
      expect(b.hasAttribute('aria-expanded')).toBe(true),
    )
  })

  it('each trigger has aria-controls pointing to its panel id', () => {
    const {container} = render(<FaqAccordion items={ITEMS_2} />)
    const buttons = screen.getAllByRole('button')
    buttons.forEach((b) => {
      const panelId = b.getAttribute('aria-controls')
      expect(panelId).toBeTruthy()
      const panel = container.querySelector(`#${panelId}`)
      expect(panel).not.toBeNull()
    })
  })

  it('each panel has aria-labelledby pointing back to its trigger id (bidirectional association)', () => {
    const {container} = render(<FaqAccordion items={ITEMS_2} />)
    const buttons = screen.getAllByRole('button')
    buttons.forEach((b) => {
      const panelId = b.getAttribute('aria-controls') as string
      const panel = container.querySelector(`#${panelId}`)
      expect(panel?.getAttribute('aria-labelledby')).toBe(b.id)
    })
  })

  it('panel is aria-hidden="true" when collapsed', () => {
    const {container} = render(<FaqAccordion items={ITEMS_2} />)
    const button = screen.getAllByRole('button')[0]
    const panelId = button.getAttribute('aria-controls') as string
    const panel = container.querySelector(`#${panelId}`) as HTMLElement
    expect(panel.getAttribute('aria-hidden')).toBe('true')
  })

  it('panel inner wrapper carries inert when collapsed (prevents focus leakage to hidden links)', () => {
    const {container} = render(<FaqAccordion items={ITEMS_2} />)
    const button = screen.getAllByRole('button')[0]
    const panelId = button.getAttribute('aria-controls') as string
    const panel = container.querySelector(`#${panelId}`) as HTMLElement
    // Inner wrapper holds the `inert` attribute (separate from aria-hidden).
    const innerInert = panel.querySelector('[inert]')
    expect(innerInert).not.toBeNull()
  })

  it('decorative chevron span and svg are aria-hidden="true"', () => {
    render(<FaqAccordion items={ITEMS_2} />)
    const button = screen.getAllByRole('button')[0]
    const chevronSpan = button.querySelector('span[aria-hidden="true"]')
    expect(chevronSpan).not.toBeNull()
    const chevronSvg = chevronSpan?.querySelector('svg')
    expect(chevronSvg?.getAttribute('aria-hidden')).toBe('true')
  })
})

// ─── Heading wrapper (ARIA APG accordion pattern) ─────────────────────────────
//
// Triggers must live inside a heading so SR users can navigate via heading
// shortcut keys (H in JAWS/NVDA).

describe('FaqAccordion — heading wrapper', () => {
  it('defaults to h3 wrapping each trigger', () => {
    const {container} = render(<FaqAccordion items={ITEMS_2} />)
    const headings = container.querySelectorAll('h3')
    expect(headings.length).toBe(2)
    headings.forEach((h) => expect(within(h as HTMLElement).getByRole('button')).not.toBeNull())
  })

  it('respects headingLevel="h2"', () => {
    const {container} = render(<FaqAccordion items={ITEMS_2} headingLevel="h2" />)
    expect(container.querySelectorAll('h2').length).toBe(2)
    expect(container.querySelectorAll('h3').length).toBe(0)
  })

  it('respects headingLevel="h4"', () => {
    const {container} = render(<FaqAccordion items={ITEMS_2} headingLevel="h4" />)
    expect(container.querySelectorAll('h4').length).toBe(2)
  })
})

// ─── Click interaction (single-open accordion) ────────────────────────────────
//
// fireEvent.click on a native <button> is sufficient — no user-event needed.
// The browser handles Space/Enter natively on real buttons. Tests assert the
// observable state change (aria-expanded toggle), not the keyboard plumbing
// itself.

describe('FaqAccordion — click interaction', () => {
  it('clicking a collapsed trigger sets aria-expanded="true" on it', () => {
    render(<FaqAccordion items={ITEMS_2} />)
    const first = screen.getAllByRole('button')[0]
    fireEvent.click(first)
    expect(first.getAttribute('aria-expanded')).toBe('true')
  })

  it('clicking an open trigger again collapses it (toggle)', () => {
    render(<FaqAccordion items={ITEMS_2} />)
    const first = screen.getAllByRole('button')[0]
    fireEvent.click(first)
    fireEvent.click(first)
    expect(first.getAttribute('aria-expanded')).toBe('false')
  })

  it('clicking a different trigger closes the previously open one (single-open behavior)', () => {
    render(<FaqAccordion items={ITEMS_3} />)
    const [b1, b2] = screen.getAllByRole('button')
    fireEvent.click(b1)
    expect(b1.getAttribute('aria-expanded')).toBe('true')
    fireEvent.click(b2)
    expect(b1.getAttribute('aria-expanded')).toBe('false')
    expect(b2.getAttribute('aria-expanded')).toBe('true')
  })

  it('opening a panel removes its aria-hidden and inert states', () => {
    const {container} = render(<FaqAccordion items={ITEMS_2} />)
    const first = screen.getAllByRole('button')[0]
    fireEvent.click(first)
    const panelId = first.getAttribute('aria-controls') as string
    const panel = container.querySelector(`#${panelId}`) as HTMLElement
    expect(panel.getAttribute('aria-hidden')).toBe('false')
    expect(panel.querySelector('[inert]')).toBeNull()
  })
})

// ─── Composition (renders PortableTextRenderer with answer payload) ───────────

describe('FaqAccordion — composition', () => {
  it('renders PortableTextRenderer once per item and forwards the answer array', () => {
    render(<FaqAccordion items={ITEMS_2} />)
    const renders = screen.getAllByTestId('ptr')
    expect(renders.length).toBe(2)
    // Mock encodes the value array length in textContent.
    renders.forEach((r) => expect(r.textContent).toBe('portable-text-rendered:1'))
  })
})

// ─── Cascade-aware contract ───────────────────────────────────────────────────

describe('FaqAccordion — cascade-aware contract', () => {
  it('uses cascade-aware tokens for trigger text and divider', () => {
    const {container} = render(<FaqAccordion items={ITEMS_2} />)
    const button = screen.getAllByRole('button')[0]
    expect(button.className).toContain('text-foreground')
    expect(button.className).toContain('hover:text-action-text')
    expect(button.className).toContain('focus-visible:ring-focus')
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain('divide-border')
    expect(wrapper.className).toContain('border-border')
  })

  it('does not emit anchored aliases or hex literals', () => {
    const {container} = render(<FaqAccordion items={ITEMS_2} />)
    const html = (container.firstChild as HTMLElement).innerHTML
    expect(html).not.toMatch(/\btext-foreground-on-light\b/)
    expect(html).not.toMatch(/\btext-foreground-on-dark\b/)
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}/)
  })
})

// ─── Reference-resolved data shape (WS-FAQ-Migration) ────────────────────────
// Post-migration, faqItem is a Sanity doc type and GROQ projects extra fields
// (category, slug, tags) alongside question + answer. The accordion only
// reads question + answer; the extras are tolerated and ignored.

describe('FaqAccordion — reference-resolved data shape', () => {
  it('renders correctly when items include category / slug / tags fields', () => {
    const REFERENCE_RESOLVED_ITEMS = [
      {
        question: 'What is your fee structure?',
        answer: [{_type: 'block', children: []}],
        category: 'general',
        slug: 'what-is-your-fee-structure',
        tags: ['fees', 'pricing'],
      },
      {
        question: 'Do you offer free consultations?',
        answer: [{_type: 'block', children: []}],
        category: 'general',
        slug: 'do-you-offer-free-consultations',
        tags: null,
      },
    ]
    render(<FaqAccordion items={REFERENCE_RESOLVED_ITEMS} />)
    expect(screen.getAllByRole('button').length).toBe(2)
    // getByText throws if not found; reaching .textContent confirms render.
    expect(screen.getByText('What is your fee structure?').textContent).toBe(
      'What is your fee structure?',
    )
    expect(screen.getByText('Do you offer free consultations?').textContent).toBe(
      'Do you offer free consultations?',
    )
  })

  it('still renders nothing on empty array post-migration (dangling refs filtered upstream)', () => {
    // The canonical [defined(@->_id)]-> filter at query time guarantees a
    // null-free array reaches this component. The empty-state behavior
    // (return null) remains the safety net for "no items" cases.
    const {container} = render(<FaqAccordion items={[]} />)
    expect(container.firstChild).toBeNull()
  })
})
