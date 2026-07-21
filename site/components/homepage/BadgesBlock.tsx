import Image from 'next/image'

// ─── Badges / Awards block ────────────────────────────────────────────────────
//
// The bespoke half of the first homepage block. The schema
// (studio/schemas/objects/blocks/badgesBlock.ts) is standard and identical on
// every client; THIS FILE IS NOT. It is the reference rendering, and a client
// whose homepage wants a different badge treatment rewrites it here rather than
// adding a `layout` field to the schema.
//
// TOKENS ONLY. No hex, no font family, no raw radius, no raw shadow. Every
// value below resolves through the design-token vocabulary, which is what keeps
// per-client theming and WCAG validation working across bespoke builds:
//   surface + text     role tokens (bg-surface-muted, text-brand-dark)
//   radius             --radius-ui, via rounded-ui
//   elevation          --shadow-card-rest, via shadow-card
//   type scale         marketing-h* utilities, driven by the marketing scale
// Hardcoding any one of them silently opts that element out of both systems.
//
// NO SCROLLREVEAL HERE, DELIBERATELY. Motion is applied by the canvas that
// places the block, not by the block itself, because whether a block may
// animate depends on WHERE it sits: never the hero, never the first block after
// it. A block that wraps itself cannot know if it is first. See HomepageCanvas.

export type BadgeImage = {
  src?: string | null
  alt?: string | null
  width?: number | null
  height?: number | null
}

export type BadgesBlockData = {
  _type: 'badgesBlock'
  _key: string
  heading?: string | null
  description?: string | null
  badges?: BadgeImage[] | null
}

export function BadgesBlock({data}: {data: BadgesBlockData}) {
  // A badge whose asset resolved to nothing renders nothing. The GROQ already
  // drops dangling references; this covers a badge item that exists but has no
  // image, which validation warns about rather than prevents.
  const badges = (data.badges ?? []).filter((b) => b.src)

  // An empty block renders nothing at all rather than a heading over a void.
  // The operator sees the gap in Studio, not the visitor on the live site.
  if (badges.length === 0) return null

  return (
    <section className="px-[5%] py-16 md:py-24">
      {/* Heading markup is written here rather than routed through
          <SectionHeader>, and that is a decision, not an oversight.
          SectionHeader maps to the interior 3-tier rhythm system (text-3xl /
          text-4xl / text-5xl) and never emits the marketing scale. A homepage
          block rendered through it would ignore `designSettings.marketingScale`
          entirely, so an operator could set the marketing scale and see the
          homepage not change: the same "control that appears to work and does
          not" failure the thin schema exists to avoid. `marketing-h2` is the
          utility built for this and had no consumer until now. */}
      {data.heading ? (
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="marketing-h2 font-heading font-bold text-foreground">{data.heading}</h2>
          {data.description ? (
            <p className="mt-4 text-foreground-muted">{data.description}</p>
          ) : null}
        </div>
      ) : null}

      {/* Soft/rounded treatment: badges sit on a tinted panel with the global
          radius and the global card elevation, so the block inherits whatever
          spatial language the client's design settings establish. */}
      <div className="container mx-auto mt-12 max-w-5xl">
        <ul className="flex flex-wrap items-center justify-center gap-8 rounded-ui bg-surface-muted px-8 py-10 shadow-card md:gap-12">
          {badges.map((badge, i) => (
            <li key={i} className="flex items-center justify-center">
              <Image
                src={badge.src as string}
                alt={badge.alt ?? ''}
                width={badge.width ?? 160}
                height={badge.height ?? 160}
                // Mid-page and below the fold on every realistic layout, so
                // lazy is correct. The hero owns `priority`, not this block.
                loading="lazy"
                sizes="(min-width: 768px) 160px, 120px"
                className="h-auto w-[7.5rem] object-contain md:w-40"
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
