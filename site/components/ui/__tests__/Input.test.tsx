import {describe, it, expect} from 'vitest'
import {createRef} from 'react'
import {render} from '@testing-library/react'
import {Input} from '../Input'

// ─── Render shape ─────────────────────────────────────────────────────────────

describe('Input — render shape', () => {
  it('renders <input> directly when no leadingIcon or trailingSlot is provided', () => {
    const {container} = render(<Input placeholder="Search" />)
    const el = container.firstChild as HTMLElement
    expect(el.tagName).toBe('INPUT')
  })

  it('wraps <input> in a relative <div> when leadingIcon is provided', () => {
    const {container} = render(
      <Input leadingIcon={<svg data-testid="leading-svg" aria-hidden="true" />} placeholder="Search" />,
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.tagName).toBe('DIV')
    expect(wrapper.className).toContain('relative')
    expect(wrapper.querySelector('input')).not.toBeNull()
    expect(wrapper.querySelector('[data-testid="leading-svg"]')).not.toBeNull()
  })

  it('wraps <input> in a relative <div> when trailingSlot is provided', () => {
    const {container} = render(
      <Input trailingSlot={<button data-testid="submit-btn">Go</button>} />,
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.tagName).toBe('DIV')
    expect(wrapper.querySelector('input')).not.toBeNull()
    expect(wrapper.querySelector('[data-testid="submit-btn"]')).not.toBeNull()
  })
})

// ─── type prop ────────────────────────────────────────────────────────────────

describe('Input — type prop', () => {
  it('defaults to type="text" when no type prop is passed', () => {
    const {container} = render(<Input />)
    const input = container.querySelector('input') as HTMLInputElement
    expect(input.type).toBe('text')
  })

  it('respects explicit type values (email, search, password, etc.)', () => {
    const {container} = render(<Input type="email" />)
    const input = container.querySelector('input') as HTMLInputElement
    expect(input.type).toBe('email')
  })
})

// ─── className composition ────────────────────────────────────────────────────

describe('Input — className composition', () => {
  it('emits base utility classes on the input', () => {
    const {container} = render(<Input />)
    const input = container.querySelector('input') as HTMLInputElement
    expect(input.className).toContain('block')
    expect(input.className).toContain('w-full')
    expect(input.className).toContain('rounded-ui')
    expect(input.className).toContain('min-h-11')
    expect(input.className).toContain('transition-colors')
  })

  it('uses pl-10 when leadingIcon is present, pl-4 otherwise', () => {
    const {container: bare} = render(<Input />)
    const bareInput = bare.querySelector('input') as HTMLInputElement
    expect(bareInput.className).toContain('pl-4')
    expect(bareInput.className).not.toContain('pl-10')

    const {container: withIcon} = render(<Input leadingIcon={<span />} />)
    const iconInput = withIcon.querySelector('input') as HTMLInputElement
    expect(iconInput.className).toContain('pl-10')
    expect(iconInput.className).not.toMatch(/\bpl-4\b/)
  })

  it('uses pr-10 when trailingSlot is present, pr-4 otherwise', () => {
    const {container: bare} = render(<Input />)
    const bareInput = bare.querySelector('input') as HTMLInputElement
    expect(bareInput.className).toContain('pr-4')

    const {container: withSlot} = render(<Input trailingSlot={<button aria-label="submit" />} />)
    const slotInput = withSlot.querySelector('input') as HTMLInputElement
    expect(slotInput.className).toContain('pr-10')
    expect(slotInput.className).not.toMatch(/\bpr-4\b/)
  })

  it('appends custom className after base + padX', () => {
    const {container} = render(<Input className="my-custom-class" />)
    const input = container.querySelector('input') as HTMLInputElement
    expect(input.className).toContain('my-custom-class')
    // Base classes still present.
    expect(input.className).toContain('rounded-ui')
  })
})

// ─── Focus-ring contract (NEW dimension; pattern anchor) ──────────────────────
//
// The platform's cascade-aware focus-ring contract:
// - focus-visible:ring-* classes are present in the input's className (intent,
//   not output — jsdom can't render the focus pseudo-class to a real ring).
// - The element CAN receive focus (no tabIndex=-1 interference).
// - The cascade-aware ring-focus token is used (not an anchored variant).
//
// This pattern replicates across all focus-ring-bearing primitives.

describe('Input — focus-ring contract', () => {
  it('emits focus-visible ring + offset + border-swap classes', () => {
    const {container} = render(<Input />)
    const input = container.querySelector('input') as HTMLInputElement
    expect(input.className).toContain('focus-visible:outline-none')
    expect(input.className).toContain('focus-visible:ring-2')
    expect(input.className).toContain('focus-visible:ring-focus')
    expect(input.className).toContain('focus-visible:ring-offset-2')
    expect(input.className).toContain('focus-visible:border-action')
  })

  it('receives focus and becomes document.activeElement', () => {
    const {container} = render(<Input />)
    const input = container.querySelector('input') as HTMLInputElement
    input.focus()
    expect(document.activeElement).toBe(input)
  })
})

// ─── Native attribute pass-through ────────────────────────────────────────────

describe('Input — native attribute pass-through', () => {
  it('forwards standard HTMLInputElement attributes via rest spread', () => {
    const {container} = render(
      <Input id="email-input" name="email" placeholder="you@example.com" disabled />,
    )
    const input = container.querySelector('input') as HTMLInputElement
    expect(input.id).toBe('email-input')
    expect(input.name).toBe('email')
    expect(input.placeholder).toBe('you@example.com')
    expect(input.disabled).toBe(true)
  })
})

// ─── forwardRef ───────────────────────────────────────────────────────────────

describe('Input — forwardRef', () => {
  it('attaches the forwarded ref to the underlying <input> element', () => {
    const ref = createRef<HTMLInputElement>()
    render(<Input ref={ref} />)
    expect(ref.current).not.toBeNull()
    expect(ref.current?.tagName).toBe('INPUT')
  })
})

// ─── Cascade-aware contract (direct-token primitive) ──────────────────────────

describe('Input — cascade-aware contract', () => {
  it('uses cascade-aware tokens; no anchored or hardcoded color tokens leak', () => {
    const {container} = render(<Input />)
    const input = container.querySelector('input') as HTMLInputElement
    // Cascade-aware: resolve correctly on dark surfaces via globals.css cascade rule.
    expect(input.className).toContain('border-border')
    expect(input.className).toContain('bg-background')
    expect(input.className).toContain('text-foreground')
    expect(input.className).toContain('placeholder:text-foreground-subtle')
    expect(input.className).toContain('hover:border-foreground-muted')
    expect(input.className).toContain('focus-visible:ring-focus')
    // No anchored aliases (would resolve wrong on dark surfaces).
    expect(input.className).not.toMatch(/\btext-foreground-on-light\b/)
    expect(input.className).not.toMatch(/\btext-foreground-on-dark\b/)
    expect(input.className).not.toMatch(/\bborder-border-light\b/)
    expect(input.className).not.toMatch(/\bborder-on-dark\b/)
    // No hex literals.
    expect(input.className).not.toMatch(/#[0-9a-fA-F]{3,8}/)
  })
})
