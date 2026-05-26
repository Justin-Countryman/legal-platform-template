import {describe, it, expect} from 'vitest'
import {createRef} from 'react'
import {render} from '@testing-library/react'
import {Select} from '../Select'

// ─── Render shape ─────────────────────────────────────────────────────────────

describe('Select — render shape', () => {
  it('wraps <select> in a relative <div> for chevron positioning', () => {
    const {container} = render(
      <Select>
        <option value="a">A</option>
      </Select>,
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.tagName).toBe('DIV')
    expect(wrapper.className).toContain('relative')
  })

  it('renders the underlying <select> element with options', () => {
    const {container} = render(
      <Select>
        <option value="a">A</option>
        <option value="b">B</option>
      </Select>,
    )
    const select = container.querySelector('select') as HTMLSelectElement
    expect(select).not.toBeNull()
    expect(select.querySelectorAll('option').length).toBe(2)
  })

  it('renders a decorative chevron <svg> next to the select', () => {
    const {container} = render(
      <Select>
        <option>x</option>
      </Select>,
    )
    const wrapper = container.firstChild as HTMLElement
    const chevron = wrapper.querySelector('svg')
    expect(chevron).not.toBeNull()
  })
})

// ─── A11y — chevron is decorative ─────────────────────────────────────────────
//
// The native <select> widget is the source of truth for assistive tech.
// The chevron span and svg are both aria-hidden so screen readers ignore
// them and report only the native widget's value.

describe('Select — chevron A11y', () => {
  it('chevron span is aria-hidden="true"', () => {
    const {container} = render(<Select><option>x</option></Select>)
    const wrapper = container.firstChild as HTMLElement
    const chevronSpan = wrapper.querySelector('span[aria-hidden="true"]')
    expect(chevronSpan).not.toBeNull()
  })

  it('chevron svg is aria-hidden="true"', () => {
    const {container} = render(<Select><option>x</option></Select>)
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('aria-hidden')).toBe('true')
  })
})

// ─── className composition ────────────────────────────────────────────────────

describe('Select — className composition', () => {
  it('emits base utility classes on the select', () => {
    const {container} = render(<Select><option>x</option></Select>)
    const select = container.querySelector('select') as HTMLSelectElement
    expect(select.className).toContain('block')
    expect(select.className).toContain('w-full')
    expect(select.className).toContain('appearance-none')
    expect(select.className).toContain('rounded-ui')
    expect(select.className).toContain('min-h-11')
    expect(select.className).toContain('transition-colors')
  })

  it('appends custom className after base', () => {
    const {container} = render(<Select className="my-class"><option>x</option></Select>)
    const select = container.querySelector('select') as HTMLSelectElement
    expect(select.className).toContain('my-class')
    expect(select.className).toContain('rounded-ui')  // base still present
  })
})

// ─── Focus-ring contract ──────────────────────────────────────────────────────

describe('Select — focus-ring contract', () => {
  it('emits focus-visible ring classes on the select', () => {
    const {container} = render(<Select><option>x</option></Select>)
    const select = container.querySelector('select') as HTMLSelectElement
    expect(select.className).toContain('focus-visible:outline-none')
    expect(select.className).toContain('focus-visible:ring-2')
    expect(select.className).toContain('focus-visible:ring-focus')
    expect(select.className).toContain('focus-visible:ring-offset-2')
    expect(select.className).toContain('focus-visible:border-action')
  })

  it('select receives focus and becomes document.activeElement', () => {
    const {container} = render(<Select><option>x</option></Select>)
    const select = container.querySelector('select') as HTMLSelectElement
    select.focus()
    expect(document.activeElement).toBe(select)
  })
})

// ─── Native attribute pass-through ────────────────────────────────────────────

describe('Select — native attribute pass-through', () => {
  it('forwards standard HTMLSelectElement attributes via rest spread', () => {
    const {container} = render(
      <Select id="country" name="country" disabled>
        <option value="us">US</option>
      </Select>,
    )
    const select = container.querySelector('select') as HTMLSelectElement
    expect(select.id).toBe('country')
    expect(select.name).toBe('country')
    expect(select.disabled).toBe(true)
  })
})

// ─── forwardRef ───────────────────────────────────────────────────────────────

describe('Select — forwardRef', () => {
  it('attaches the forwarded ref to the underlying <select> element', () => {
    const ref = createRef<HTMLSelectElement>()
    render(
      <Select ref={ref}>
        <option>x</option>
      </Select>,
    )
    expect(ref.current).not.toBeNull()
    expect(ref.current?.tagName).toBe('SELECT')
  })
})

// ─── Cascade-aware contract (direct-token primitive) ──────────────────────────

describe('Select — cascade-aware contract', () => {
  it('uses cascade-aware tokens; no anchored or hardcoded color tokens leak', () => {
    const {container} = render(<Select><option>x</option></Select>)
    const select = container.querySelector('select') as HTMLSelectElement
    // Cascade-aware tokens.
    expect(select.className).toContain('border-border')
    expect(select.className).toContain('bg-background')
    expect(select.className).toContain('text-foreground')
    expect(select.className).toContain('hover:border-foreground-muted')
    expect(select.className).toContain('focus-visible:ring-focus')
    // No anchored aliases.
    expect(select.className).not.toMatch(/\btext-foreground-on-light\b/)
    expect(select.className).not.toMatch(/\btext-foreground-on-dark\b/)
    expect(select.className).not.toMatch(/\bborder-border-light\b/)
    // No hex literals.
    expect(select.className).not.toMatch(/#[0-9a-fA-F]{3,8}/)
  })
})
