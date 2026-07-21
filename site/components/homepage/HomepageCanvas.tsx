import {ScrollReveal} from '@/components/ui/ScrollReveal'
import {BadgesBlock, type BadgesBlockData} from './BadgesBlock'

// ─── Homepage canvas ──────────────────────────────────────────────────────────
//
// Renders the composed mid-page: the ordered blocks between the hero primitive
// and the footer primitive.
//
// THIS IS NOT PageSections. PageSections renders the interior-page section
// system, which produces fixed stacked bands and forbids crossing between them.
// That is correct for interior pages and is exactly what stops a homepage
// flowing, so the homepage gets its own renderer.
//
// ─── Where the first-block rule is enforced ───────────────────────────────────
//
// Scroll reveal is default for mid-page blocks, and NEVER for the hero or the
// first block after it. Nothing there should be arriving: motion on content
// already on screen at load reads as a glitch.
//
// ScrollReveal cannot enforce the first-block half itself. It only touches
// content below the fold, which handles the hero, but a short viewport can push
// the first block below the fold where the primitive would happily animate it.
// The rule is therefore applied HERE, by index, which is the only place that
// knows a block's position. A block cannot know whether it is first, which is
// also why blocks do not wrap themselves.
export type HomepageBlock = BadgesBlockData

function renderBlock(block: HomepageBlock) {
  switch (block._type) {
    case 'badgesBlock':
      return <BadgesBlock data={block} />
    // No default case that renders something generic. An unknown block type
    // renders nothing rather than a placeholder: a block added to the schema
    // and not to this switch should be invisible, not half-drawn.
    default:
      return null
  }
}

export function HomepageCanvas({blocks}: {blocks?: HomepageBlock[] | null}) {
  if (!blocks || blocks.length === 0) return null

  return (
    <>
      {blocks.map((block, i) => {
        const rendered = renderBlock(block)
        if (!rendered) return null
        // Index 0 is the first block after the hero: no motion, ever.
        return i === 0 ? (
          <div key={block._key}>{rendered}</div>
        ) : (
          <ScrollReveal key={block._key}>{rendered}</ScrollReveal>
        )
      })}
    </>
  )
}
