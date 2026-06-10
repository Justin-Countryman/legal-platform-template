'use client'

import {useId, type ReactNode} from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import {MdClose} from 'react-icons/md'
import {IconButton} from '@/components/ui/IconButton'

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  /** Element that opens the modal — wrapped in Dialog.Trigger asChild. */
  trigger:           ReactNode
  /** Modal heading (rendered as Dialog.Title with heading typography). */
  title:             string
  /** Optional description rendered below the title and wired as aria-describedby. */
  description?:      string
  /** Modal body content (form embed, message, etc.). */
  children:          ReactNode
  /** aria-label for the close button. Defaults to 'Close'. */
  closeAriaLabel?:   string
  /** Controlled-open state. Omit for uncontrolled. */
  open?:             boolean
  onOpenChange?:     (open: boolean) => void
  /** Desktop panel max-width. Defaults to 'default' (max-w-lg, unchanged). */
  size?:             'default' | 'lg' | 'xl'
}

// Desktop panel max-width by size. 'default' preserves the original max-w-lg.
const PANEL_MAX_W: Record<NonNullable<Props['size']>, string> = {
  default: 'md:max-w-lg',
  lg:      'md:max-w-2xl',
  xl:      'md:max-w-4xl',
}

// ─── Component ────────────────────────────────────────────────────────────────
//
// Platform modal scaffold — Radix Dialog wrapped with the canonical platform
// surface, animation, and chrome:
//   - bg-brand-dark/40 overlay scrim with structural-fast fade
//   - bg-background panel with shadow-elevation-lg
//   - Mobile sheet-from-bottom (rounded-t-ui) → desktop centered (rounded-ui)
//   - Drag handle (mobile only)
//   - IconButton close (top-right)
//   - font-heading title with optional description

export function DialogPanel({
  trigger,
  title,
  description,
  children,
  closeAriaLabel = 'Close',
  open,
  onOpenChange,
  size = 'default',
}: Props) {
  const reactId = useId()
  const descId  = `dialog-${reactId}-description`

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>

      <Dialog.Portal>
        {/* Overlay */}
        <Dialog.Overlay
          className="fixed inset-0 z-[1100] bg-brand-dark/40
            data-[state=open]:animate-in data-[state=open]:fade-in-0
            data-[state=closed]:animate-out data-[state=closed]:fade-out-0
            duration-structural-fast ease-smooth"
        />

        {/* Panel */}
        <Dialog.Content
          className={`fixed z-[1100] bg-background shadow-elevation-lg focus-visible:outline-none
            data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-6
            data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-bottom-6
            md:data-[state=open]:slide-in-from-bottom-0 md:data-[state=open]:zoom-in-95
            md:data-[state=closed]:slide-out-to-bottom-0 md:data-[state=closed]:zoom-out-95
            duration-structural-slow ease-smooth
            bottom-0 left-0 right-0 max-h-[90dvh] overflow-y-auto rounded-t-ui px-6 pb-10 pt-6
            md:bottom-auto md:left-1/2 md:right-auto md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[90%] ${PANEL_MAX_W[size]} md:rounded-ui md:px-10 md:py-10`}
          aria-describedby={description ? descId : undefined}
        >
          {/* Drag handle — mobile only */}
          <div className="mx-auto mb-6 h-1 w-10 rounded-full bg-border md:hidden" aria-hidden="true" />

          {/* Close button */}
          <Dialog.Close asChild>
            <IconButton
              aria-label={closeAriaLabel}
              surface="light"
              icon={<MdClose className="size-5" aria-hidden="true" />}
              className="absolute right-4 top-4"
            />
          </Dialog.Close>

          {/* Header */}
          <div className="mb-6 pr-8 text-center">
            <Dialog.Title className="font-heading text-2xl font-bold text-foreground">
              {title}
            </Dialog.Title>
            {description && (
              <p id={descId} className="mt-2 text-sm leading-relaxed text-foreground-muted">
                {description}
              </p>
            )}
          </div>

          {/* Body */}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
