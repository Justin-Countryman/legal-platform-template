import {useId, type ReactElement, type ReactNode} from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  /** Visible label text. */
  label:      string
  /** Optional helper text rendered below the field. */
  helpText?:  string
  /** Optional error text. When set, takes precedence over helpText. */
  error?:     string
  /** Field control — must accept `id` and `aria-describedby` props. */
  children:   ReactElement<{id?: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean | 'true' | 'false'}>
  /** Optional id override (otherwise auto-generated). */
  id?:        string
  /** When true, label is visually hidden but available to assistive tech. */
  hideLabel?: boolean
  className?: string
}

// ─── Component ────────────────────────────────────────────────────────────────
//
// Vertical wrapper: label → control → help/error.
// For horizontal/sibling-label layouts, use <Input>/<Select> directly with a
// sibling <label htmlFor>.

export function FormField({
  label,
  helpText,
  error,
  children,
  id,
  hideLabel,
  className,
}: Props) {
  const reactId   = useId()
  const fieldId   = id ?? `field-${reactId}`
  const helpId    = `${fieldId}-help`
  const errorId   = `${fieldId}-error`
  const describedBy = error ? errorId : helpText ? helpId : undefined

  // Inject id and aria-describedby into the child control.
  const child = children as ReactElement<{
    id?: string
    'aria-describedby'?: string
    'aria-invalid'?: boolean | 'true' | 'false'
  }>
  const enhanced = {
    ...child,
    props: {
      ...child.props,
      id: child.props.id ?? fieldId,
      'aria-describedby': describedBy,
      'aria-invalid': error ? true : undefined,
    },
  } as ReactNode

  return (
    <div className={['flex flex-col gap-1.5', className ?? ''].filter(Boolean).join(' ')}>
      <label
        htmlFor={fieldId}
        className={[
          'text-sm font-medium text-foreground',
          hideLabel ? 'sr-only' : '',
        ].filter(Boolean).join(' ')}
      >
        {label}
      </label>
      {enhanced}
      {error ? (
        <p id={errorId} className="text-xs text-foreground-muted" role="alert">
          {error}
        </p>
      ) : helpText ? (
        <p id={helpId} className="text-xs text-foreground-muted">
          {helpText}
        </p>
      ) : null}
    </div>
  )
}
