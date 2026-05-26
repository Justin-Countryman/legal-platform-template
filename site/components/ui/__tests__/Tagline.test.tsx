import {describe, it, expect} from 'vitest'
import {render} from '@testing-library/react'
import {Tagline} from '../Tagline'

// ─── Render shape ─────────────────────────────────────────────────────────────

describe('Tagline — render shape', () => {
  it('renders a <span> by default', () => {
    const {container} = render(<Tagline>Practice areas</Tagline>)
    const el = container.firstChild as HTMLElement
    expect(el.tagName).toBe('SPAN')
  })

  it('renders <div> when as="div"', () => {
    const {container} = render(<Tagline as="div">Practice areas</Tagline>)
    const el = container.firstChild as HTMLElement
    expect(el.tagName).toBe('DIV')
  })

  it('renders <p> when as="p"', () => {
    const {container} = render(<Tagline as="p">Practice areas</Tagline>)
    const el = container.firstChild as HTMLElement
    expect(el.tagName).toBe('P')
  })

  it('renders children verbatim', () => {
    const {container} = render(<Tagline>Practice areas</Tagline>)
    expect(container.firstChild?.textContent).toBe('Practice areas')
  })
})

// ─── mb prop (typed contract) ─────────────────────────────────────────────────

describe('Tagline — mb prop', () => {
  it('defaults to mb-3 when no prop passed', () => {
    const {container} = render(<Tagline>x</Tagline>)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('mb-3')
  })

  it('applies mb-0 when explicitly passed', () => {
    const {container} = render(<Tagline mb="mb-0">x</Tagline>)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('mb-0')
    // default mb-3 should not leak through when an explicit mb is passed
    expect(el.className).not.toMatch(/\bmb-3\b/)
  })

  it('applies mb-2 when explicitly passed', () => {
    const {container} = render(<Tagline mb="mb-2">x</Tagline>)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('mb-2')
  })

  it('applies mb-3 when explicitly passed', () => {
    const {container} = render(<Tagline mb="mb-3">x</Tagline>)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('mb-3')
  })

  it('applies mb-4 when explicitly passed', () => {
    const {container} = render(<Tagline mb="mb-4">x</Tagline>)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('mb-4')
  })
})

// ─── className composition ────────────────────────────────────────────────────

describe('Tagline — className composition', () => {
  it('emits `tagline` + mb + custom className joined with single spaces', () => {
    const {container} = render(<Tagline mb="mb-2" className="text-center">x</Tagline>)
    const el = container.firstChild as HTMLElement
    expect(el.className).toBe('tagline mb-2 text-center')
  })

  it('places `tagline` first, mb second, custom className last', () => {
    const {container} = render(<Tagline mb="mb-4" className="text-center uppercase">x</Tagline>)
    const el = container.firstChild as HTMLElement
    const classes = el.className.split(' ')
    expect(classes[0]).toBe('tagline')
    expect(classes[1]).toBe('mb-4')
    expect(classes.slice(2).join(' ')).toBe('text-center uppercase')
  })

  it('omits custom className when undefined', () => {
    const {container} = render(<Tagline mb="mb-3">x</Tagline>)
    const el = container.firstChild as HTMLElement
    expect(el.className).toBe('tagline mb-3')
  })

  it('omits custom className when empty string', () => {
    const {container} = render(<Tagline mb="mb-3" className="">x</Tagline>)
    const el = container.firstChild as HTMLElement
    expect(el.className).toBe('tagline mb-3')
  })

  it('emits exactly `tagline` + mb when only required props are passed', () => {
    const {container} = render(<Tagline>x</Tagline>)
    const el = container.firstChild as HTMLElement
    expect(el.className).toBe('tagline mb-3')
  })
})

// ─── Cascade-aware contract (intent assertion) ────────────────────────────────
//
// Tagline is cascade-aware via the `tagline` utility class — `globals.css`
// drives `--color-accent` resolution per surface. The primitive itself must
// NOT add raw color tokens via className; that would bypass the cascade rule
// and produce wrong colors on dark surfaces. These tests assert the platform
// contract: cascade-awareness lives in the utility, not the primitive.

describe('Tagline — cascade-aware contract', () => {
  it('does not add raw color tokens via className (cascade lives in `tagline` utility)', () => {
    const {container} = render(<Tagline>x</Tagline>)
    const el = container.firstChild as HTMLElement
    // None of these should appear — cascade-aware color is owned by the
    // `tagline` utility class, not the primitive.
    expect(el.className).not.toMatch(/\btext-accent\b/)
    expect(el.className).not.toMatch(/\btext-foreground\b/)
    expect(el.className).not.toMatch(/\btext-action\b/)
    expect(el.className).not.toMatch(/\btext-action-text\b/)
  })

  it('always emits the `tagline` utility class regardless of prop combination', () => {
    const cases = [
      <Tagline key="a">x</Tagline>,
      <Tagline key="b" as="div">x</Tagline>,
      <Tagline key="c" as="p" mb="mb-0">x</Tagline>,
      <Tagline key="d" mb="mb-4" className="text-center">x</Tagline>,
    ]
    for (const node of cases) {
      const {container, unmount} = render(node)
      const el = container.firstChild as HTMLElement
      expect(el.className).toMatch(/\btagline\b/)
      unmount()
    }
  })
})
