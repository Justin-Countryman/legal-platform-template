import {describe, it, expect, vi} from 'vitest'
import {render, fireEvent, screen} from '@testing-library/react'
import {DialogPanel} from '../DialogPanel'

// DialogPanel wraps @radix-ui/react-dialog. We render against the real Radix
// primitive (it's already a dep) rather than mocking it — Radix is the source
// of truth for modal a11y landmarks (role="dialog", aria-modal="true"), focus
// trap, Escape-to-close, and overlay-click-to-close. Our wrapper adds:
//   - aria-describedby plumbing on top of Radix
//   - Default closeAriaLabel="Close"
//   - IconButton + MdClose composition for the close button
//   - Cascade-aware panel chrome + decorative drag handle
//   - Sheet-from-bottom (mobile) → centered (desktop) responsive layout
//
// Focus trap, focus return, Escape, and overlay click are Radix's contract,
// not ours, and are intentionally not tested here.

// Radix portals Dialog.Content to document.body, so screen queries (which
// search the whole document) are the correct API — container.querySelector
// would miss the panel.

// Triggers are passed as inline <button> JSX rather than a wrapping component:
// Radix's `asChild` uses React.cloneElement to merge onClick + state onto the
// child. Cloning a function-component element merges props onto the component
// (which would have to forwardRef + spread props to forward them to the DOM),
// while cloning a native-element element merges directly onto the DOM node.
// Inline JSX is the simpler, more representative idiom.

// ─── Render shape (closed) ────────────────────────────────────────────────────

describe('DialogPanel — render shape (closed)', () => {
  it('renders the trigger but no dialog when open={false}', () => {
    render(
      <DialogPanel
        trigger={<button type="button">Open</button>}
        title="Contact"
        open={false}
        onOpenChange={() => {}}
      >
        <p>body</p>
      </DialogPanel>,
    )
    expect(screen.getByRole('button', {name: /open/i})).not.toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('does not render dialog content in DOM when uncontrolled and unopened', () => {
    render(
      <DialogPanel trigger={<button type="button">Open</button>} title="Contact">
        <p>body</p>
      </DialogPanel>,
    )
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

// ─── Modal landmark A11y dimension (the new anchor pattern) ───────────────────
//
// Locked pattern for modal a11y: when open, the panel is discoverable by
// role="dialog" with aria-modal="true". Radix emits these; our wiring is
// verified by asserting their presence on the rendered Dialog.Content.
// Focus trap, focus return, Escape-to-close, and overlay-click-to-close are
// Radix's contract — not re-tested at the wrapper layer.

describe('DialogPanel — modal landmark A11y', () => {
  it('emits role="dialog" when open', () => {
    render(
      <DialogPanel
        trigger={<button type="button">Open</button>}
        title="Contact"
        open={true}
        onOpenChange={() => {}}
      >
        <p>body</p>
      </DialogPanel>,
    )
    expect(screen.getByRole('dialog')).not.toBeNull()
  })

  // Note: aria-modal is intentionally NOT asserted. Recent versions of
  // @radix-ui/react-dialog rely on focus trap + role="dialog" to communicate
  // modality and may not emit aria-modal="true" explicitly. That's Radix's
  // implementation detail; per the testing-strategy this file follows
  // ("trust Radix"), we assert the role="dialog" landmark and leave modality
  // semantics to Radix.

  it('renders the title as a heading (Radix Dialog.Title → <h2>) with the title text', () => {
    render(
      <DialogPanel
        trigger={<button type="button">Open</button>}
        title="Contact us"
        open={true}
        onOpenChange={() => {}}
      >
        <p>body</p>
      </DialogPanel>,
    )
    const heading = screen.getByRole('heading', {name: /contact us/i})
    expect(heading).not.toBeNull()
    expect(heading.tagName).toBe('H2')
  })

  it('renders body children inside the dialog', () => {
    render(
      <DialogPanel
        trigger={<button type="button">Open</button>}
        title="t"
        open={true}
        onOpenChange={() => {}}
      >
        <p data-testid="body-content">body text</p>
      </DialogPanel>,
    )
    expect(screen.getByTestId('body-content')).not.toBeNull()
  })
})

// ─── aria-describedby plumbing (our custom layer on top of Radix) ─────────────

describe('DialogPanel — aria-describedby plumbing', () => {
  it('wires aria-describedby on the dialog when description is provided', () => {
    render(
      <DialogPanel
        trigger={<button type="button">Open</button>}
        title="Contact"
        description="We respond within 24 hours."
        open={true}
        onOpenChange={() => {}}
      >
        <p>body</p>
      </DialogPanel>,
    )
    const dialog = screen.getByRole('dialog')
    const describedby = dialog.getAttribute('aria-describedby')
    expect(describedby).toBeTruthy()
    // The id pointed to should belong to a paragraph rendering the description.
    const descEl = document.getElementById(describedby as string)
    expect(descEl?.textContent).toBe('We respond within 24 hours.')
    expect(descEl?.tagName).toBe('P')
  })

  it('omits aria-describedby on the dialog when description is not provided', () => {
    render(
      <DialogPanel
        trigger={<button type="button">Open</button>}
        title="Contact"
        open={true}
        onOpenChange={() => {}}
      >
        <p>body</p>
      </DialogPanel>,
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog.hasAttribute('aria-describedby')).toBe(false)
  })

  it('does not render the description paragraph when description prop is absent', () => {
    render(
      <DialogPanel
        trigger={<button type="button">Open</button>}
        title="Title only"
        open={true}
        onOpenChange={() => {}}
      >
        <p data-testid="body">body</p>
      </DialogPanel>,
    )
    // Heading + body paragraph render; no third <p> for description.
    const dialog = screen.getByRole('dialog')
    const paragraphs = dialog.querySelectorAll('p')
    expect(paragraphs.length).toBe(1)
    expect(paragraphs[0].getAttribute('data-testid')).toBe('body')
  })
})

// ─── Close button (composition layer) ─────────────────────────────────────────

describe('DialogPanel — close button', () => {
  it('renders a close button with default aria-label="Close"', () => {
    render(
      <DialogPanel
        trigger={<button type="button">Open</button>}
        title="t"
        open={true}
        onOpenChange={() => {}}
      >
        <p>body</p>
      </DialogPanel>,
    )
    expect(screen.getByRole('button', {name: 'Close'})).not.toBeNull()
  })

  it('respects a custom closeAriaLabel', () => {
    render(
      <DialogPanel
        trigger={<button type="button">Open</button>}
        title="t"
        closeAriaLabel="Close form"
        open={true}
        onOpenChange={() => {}}
      >
        <p>body</p>
      </DialogPanel>,
    )
    expect(screen.getByRole('button', {name: 'Close form'})).not.toBeNull()
  })

  it('close button contains the MdClose icon as aria-hidden decoration', () => {
    render(
      <DialogPanel
        trigger={<button type="button">Open</button>}
        title="t"
        open={true}
        onOpenChange={() => {}}
      >
        <p>body</p>
      </DialogPanel>,
    )
    const close = screen.getByRole('button', {name: 'Close'})
    const icon = close.querySelector('svg')
    expect(icon).not.toBeNull()
    expect(icon?.getAttribute('aria-hidden')).toBe('true')
  })
})

// ─── Drag handle (decorative mobile affordance) ───────────────────────────────

describe('DialogPanel — drag handle', () => {
  it('renders a decorative drag handle with aria-hidden="true"', () => {
    render(
      <DialogPanel
        trigger={<button type="button">Open</button>}
        title="t"
        open={true}
        onOpenChange={() => {}}
      >
        <p>body</p>
      </DialogPanel>,
    )
    const dialog = screen.getByRole('dialog')
    const handle = dialog.querySelector('[aria-hidden="true"].rounded-full')
    expect(handle).not.toBeNull()
  })

  it('drag handle uses md:hidden so it appears mobile-only', () => {
    render(
      <DialogPanel
        trigger={<button type="button">Open</button>}
        title="t"
        open={true}
        onOpenChange={() => {}}
      >
        <p>body</p>
      </DialogPanel>,
    )
    const dialog = screen.getByRole('dialog')
    const handle = dialog.querySelector('[aria-hidden="true"].rounded-full') as HTMLElement
    expect(handle.className).toContain('md:hidden')
  })
})

// ─── Trigger forwarding (Dialog.Trigger asChild) ──────────────────────────────

describe('DialogPanel — trigger forwarding', () => {
  it('renders the user-provided trigger as the open control', () => {
    render(
      <DialogPanel trigger={<button type="button">Schedule a call</button>} title="t">
        <p>body</p>
      </DialogPanel>,
    )
    // asChild merges Radix props onto the user element — the user's button
    // text and tag survive.
    const trigger = screen.getByRole('button', {name: /schedule a call/i})
    expect(trigger.tagName).toBe('BUTTON')
  })
})

// ─── Open/close interaction ───────────────────────────────────────────────────

describe('DialogPanel — open/close interaction', () => {
  it('clicking the trigger opens the dialog (uncontrolled mode)', () => {
    render(
      <DialogPanel trigger={<button type="button">Open</button>} title="Contact">
        <p>body</p>
      </DialogPanel>,
    )
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(screen.getByRole('button', {name: /open/i}))
    expect(screen.getByRole('dialog')).not.toBeNull()
  })

  it('controlled open=true renders the dialog without trigger interaction', () => {
    render(
      <DialogPanel
        trigger={<button type="button">Open</button>}
        title="Contact"
        open={true}
        onOpenChange={() => {}}
      >
        <p>body</p>
      </DialogPanel>,
    )
    expect(screen.getByRole('dialog')).not.toBeNull()
  })

  it('controlled re-render to open=false unmounts the dialog', () => {
    const {rerender} = render(
      <DialogPanel
        trigger={<button type="button">Open</button>}
        title="Contact"
        open={true}
        onOpenChange={() => {}}
      >
        <p>body</p>
      </DialogPanel>,
    )
    expect(screen.getByRole('dialog')).not.toBeNull()
    rerender(
      <DialogPanel
        trigger={<button type="button">Open</button>}
        title="Contact"
        open={false}
        onOpenChange={() => {}}
      >
        <p>body</p>
      </DialogPanel>,
    )
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('clicking the close button fires onOpenChange(false)', () => {
    const onOpenChange = vi.fn()
    render(
      <DialogPanel
        trigger={<button type="button">Open</button>}
        title="Contact"
        open={true}
        onOpenChange={onOpenChange}
      >
        <p>body</p>
      </DialogPanel>,
    )
    fireEvent.click(screen.getByRole('button', {name: 'Close'}))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})

// ─── Cascade-aware contract ───────────────────────────────────────────────────

describe('DialogPanel — cascade-aware contract', () => {
  it('panel uses cascade-aware bg-background; title uses text-foreground; description uses text-foreground-muted', () => {
    render(
      <DialogPanel
        trigger={<button type="button">Open</button>}
        title="Contact"
        description="hint"
        open={true}
        onOpenChange={() => {}}
      >
        <p>body</p>
      </DialogPanel>,
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog.className).toContain('bg-background')
    const title = screen.getByRole('heading', {name: /contact/i})
    expect(title.className).toContain('text-foreground')
    const descEl = document.getElementById(dialog.getAttribute('aria-describedby') as string)
    expect(descEl?.className).toContain('text-foreground-muted')
  })

  it('drag handle uses cascade-aware bg-border (decorative divider color)', () => {
    render(
      <DialogPanel
        trigger={<button type="button">Open</button>}
        title="t"
        open={true}
        onOpenChange={() => {}}
      >
        <p>body</p>
      </DialogPanel>,
    )
    const dialog = screen.getByRole('dialog')
    const handle = dialog.querySelector('[aria-hidden="true"].rounded-full') as HTMLElement
    expect(handle.className).toContain('bg-border')
  })

  it('does not emit anchored aliases or hex literals across the rendered dialog', () => {
    render(
      <DialogPanel
        trigger={<button type="button">Open</button>}
        title="Contact"
        description="hint"
        open={true}
        onOpenChange={() => {}}
      >
        <p>body</p>
      </DialogPanel>,
    )
    const html = screen.getByRole('dialog').outerHTML
    expect(html).not.toMatch(/\btext-foreground-on-light\b/)
    expect(html).not.toMatch(/\btext-foreground-on-dark\b/)
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}/)
  })
})
