import type {CSSProperties} from 'react'

// ── Internal-hero foreground tuning knobs ─────────────────────────────────────
// Fine-tune the hero band height and the right-side foreground figure here.
//
// True two-column layout (lg+): when a foreground is present the hero content
// container becomes [ heading column | foreground column ]. Both live in the same
// container, so the columns share ONE reference frame and can never overlap:
//   • the foreground box is anchored to the container's right edge, sized
//     HERO_FOREGROUND_MAX_WIDTH wide × HERO_FOREGROUND_HEIGHT tall (inset
//     HERO_FOREGROUND_RIGHT_INSET), with the image object-contain + bottom-right
//     aligned inside it (aspect-robust: tall cut-out → height wins + bleeds off
//     the bottom; wide cut-out → width-capped, sits shorter);
//   • the heading column max-width is RESERVED to end before the foreground zone:
//       min(42rem, 100% − fg-col − gap − inset)
//     (the CSS rule lives in globals.css, keyed off `data-hero-heading-reserve`
//     and the same CSS vars), so even a long heading wraps in its column and
//     never slides under the figure.
//
// All lengths below are percentages of the content container (the shared frame),
// except the band height which is a breakpoint-gated Tailwind class.

// Band height at lg+ when a foreground is present. The +var(--header-height)
// term gives MERGED heroes extra height equal to the overlaid header, so the
// figure sits BELOW the header and bleeds off the bottom by the same amount as a
// non-merged hero (where --header-height resolves to 0px → identical 25rem band —
// the non-merged path is left exactly as it was). SSR falls back to 0px.
export const HERO_BAND_MIN_H_LG = 'lg:min-h-[calc(var(--header-height,0px)+25rem)]'

// Base band height (lg+) for a bare h1 hero (no description / buttons, no
// foreground figure): a modest banner that gives the h1 room to be vertically
// centered. Foreground heroes use the taller HERO_BAND_MIN_H_LG instead. Same
// +var(--header-height) treatment so merged heroes center BELOW the header.
export const HERO_BAND_BASE_MIN_H_LG = 'lg:min-h-[calc(var(--header-height,0px)+16rem)]'
export const HERO_FOREGROUND_HEIGHT = '28rem'        // figure box height; > band height so the feet bleed off the bottom
export const HERO_FOREGROUND_MAX_WIDTH = '40%'       // figure column width (of the content container) — heading can never enter this zone
export const HERO_FOREGROUND_GAP = '6%'              // gap between the heading column and the foreground column
export const HERO_FOREGROUND_RIGHT_INSET = '0%'       // extra inset from the content container's right edge (the px-[5%] gutter already insets it)

// CSS variables shared by the foreground box (its size/inset) and the heading
// column reservation rule, so the two stay in sync from one source. Applied to
// the hero content container when a foreground is present.
export function heroForegroundVars(): CSSProperties {
  return {
    '--hero-fg-col': HERO_FOREGROUND_MAX_WIDTH,
    '--hero-fg-h': HERO_FOREGROUND_HEIGHT,
    '--hero-fg-gap': HERO_FOREGROUND_GAP,
    '--hero-fg-inset': HERO_FOREGROUND_RIGHT_INSET,
  } as CSSProperties
}
