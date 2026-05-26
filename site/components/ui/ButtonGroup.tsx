import {Button} from '@/components/ui/Button'

// ─── Types ────────────────────────────────────────────────────────────────────

export type CtaItem = {
  label: string
  url?: string
  variant?: 'primary' | 'secondary' | 'tertiary'
  onClick?: React.MouseEventHandler
}

/**
 * Sanity `ctaButton` shape — `title`/`url` plus an editor-facing `variant`
 * radio (`primary | secondary | link`). Mirrors the shared `ctaButton` object
 * in `studio/schemas/objects/ctaButton.ts`.
 */
export type SanityCtaButton = {
  title?: string | null
  url?: string | null
  variant?: 'primary' | 'secondary' | 'link' | string | null
}

export type ButtonGroupProps = {
  items: CtaItem[]
  context?: 'light' | 'dark'
  size?: 'small' | 'compact' | 'normal'
  align?: 'start' | 'center'
  fullWidth?: boolean
  /** When false, every item renders as primary regardless of its variant field. Default true. */
  respectVariantField?: boolean
  className?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveVariant(
  itemVariant: CtaItem['variant'],
  respect: boolean,
): 'primary' | 'secondary' | 'tertiary' {
  if (!respect) return 'primary'
  if (itemVariant === 'secondary') return 'secondary'
  if (itemVariant === 'tertiary') return 'tertiary'
  return 'primary'
}

function isRenderable(item: CtaItem): boolean {
  if (!item.label) return false
  return Boolean(item.url) || Boolean(item.onClick)
}

// Sanity `variant` → ButtonGroup `variant`. `link` is the Sanity term for the
// tertiary text-link style; everything else (including null/unknown) renders
// primary so editor typos can never break a CTA.
function mapVariant(v: SanityCtaButton['variant']): CtaItem['variant'] {
  if (v === 'secondary') return 'secondary'
  if (v === 'link') return 'tertiary'
  return 'primary'
}

/**
 * Translates an array of Sanity `ctaButton` objects into the ButtonGroup
 * `CtaItem` shape. Drops items missing either a label or a destination —
 * Sanity ctaButton has no `onClick` field, so a missing url means the item
 * cannot render. Used by every section component that maps Sanity CTA arrays
 * to <ButtonGroup>.
 */
export function toCtaItems(
  buttons: ReadonlyArray<SanityCtaButton | null | undefined> | null | undefined,
): CtaItem[] {
  if (!buttons) return []
  const out: CtaItem[] = []
  for (const btn of buttons) {
    if (!btn) continue
    if (!btn.title || !btn.url) continue
    out.push({
      label: btn.title,
      url: btn.url,
      variant: mapVariant(btn.variant),
    })
  }
  return out
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ButtonGroup({
  items,
  context = 'light',
  size = 'normal',
  align = 'start',
  fullWidth = false,
  respectVariantField = true,
  className,
}: ButtonGroupProps) {
  if (items.length === 0) return null

  const renderable = items.filter(isRenderable)
  if (renderable.length === 0) return null

  const cls = [
    'flex flex-wrap gap-4',
    align === 'center' ? 'justify-center' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={cls}>
      {renderable.map((item, i) => (
        <Button
          key={i}
          variant={resolveVariant(item.variant, respectVariantField)}
          context={context}
          size={size}
          fullWidth={fullWidth}
          href={item.url}
          onClick={item.onClick}
        >
          {item.label}
        </Button>
      ))}
    </div>
  )
}
