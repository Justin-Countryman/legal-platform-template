import {PortableTextRenderer} from '@/components/ui/PortableText'

type Props = {
  title: string
  content: unknown[] | null | undefined
  /** Override the default heading style — useful per-layout */
  headingClassName?: string
  className?: string
}

export function CredentialSection({
  title,
  content,
  headingClassName = 'mb-3 text-xs font-semibold uppercase tracking-widest text-foreground-muted',
  className = '',
}: Props) {
  if (!content || content.length === 0) return null
  return (
    <div className={className}>
      <h2 className={headingClassName}>{title}</h2>
      <PortableTextRenderer value={content} />
    </div>
  )
}
