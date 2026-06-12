// Shared horizontal-carousel scroller styling so every section carousel (the
// silo nav, the attorney slider, any future one) bleeds, snaps, and — most
// importantly — ALIGNS identically.
//
// The alignment fix: a scroll container's `padding-left` becomes scroll space
// *before* the first card, so with `snap-mandatory` the browser snaps the first
// card left by that padding on load — landing it `padding` closer to the
// viewport edge than the section's content (headings, body). `scroll-pl-4`
// (scroll-padding-left) matching `p-4` cancels that, so the first card snaps to
// the section content edge — uniform with every other element on the page.
//
// `p-4` gives the scrollport room so `overflow-x` doesn't clip card shadows /
// hover lift / focus rings; the matching `-m-4` offsets it so the track itself
// still starts at the container edge.
export const CAROUSEL_SCROLLER =
  'flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-pl-4 p-4 -m-4 ' +
  '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden'

// Shared slide width: ~1 card with a peek on phones, 2-up from sm. Carousels
// that also run on desktop (the attorney slider) append their own `lg:` basis.
export const CAROUSEL_SLIDE_BASIS = 'basis-[82%] sm:basis-[46%]'
