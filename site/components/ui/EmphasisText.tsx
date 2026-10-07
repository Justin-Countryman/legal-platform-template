import {splitEmphasis} from '@/lib/headingEmphasis'

/** A heading's words with its emphasis set in the site's emphasis style (`heading-emphasis`, `globals.css`), the way
 *  `HeadingUnit` draws a content section's: the first occurrence only, resolved strings in. With no emphasis, or one the
 *  heading lacks, the heading alone, so a caller's markup is unchanged where nothing is set (monorepo `[R-641]`). */
export function EmphasisText({text, emphasis}: {text: string; emphasis?: string | null}) {
  const parts = splitEmphasis(text, emphasis)
  if (!parts) return <>{text}</>
  return (
    <>
      {parts[0]}
      <em className="heading-emphasis">{parts[1]}</em>
      {parts[2]}
    </>
  )
}
