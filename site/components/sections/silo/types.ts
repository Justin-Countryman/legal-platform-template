// Shared shape for one practice-area "silo" navigation item — already resolved in
// GROQ (page reference → href + auto-pulled label/description, with overrides).
import type {SanityImage} from '@/lib/sanity/image'

export type SiloNavItem = {
  _key: string
  label?: string | null
  href?: string | null
  description?: string | null
  icon?: SanityImage | null
  image?: SanityImage | null
  /** Marks the firm's priority practice area — becomes the hero tile in Bento mode. */
  featured?: boolean | null
}

export type SiloLayout = 'spotlight' | 'feature' | 'tile' | 'inline' | 'split' | 'indexCards'

// Where the icon sits relative to the label. 'auto' lets each layout pick its
// natural position; 'none' hides icons section-wide. Layouts clamp positions that
// don't fit their shape (a row layout treats 'top' as 'left').
export type SiloIconPosition = 'auto' | 'top' | 'left' | 'right' | 'none'

// Section layout — where the tagline/heading/description sit relative to the button
// grid (an axis independent of the button layout). 'aside' is the sticky-header
// split; 'banner' is the heading-left / description-right header row.
export type SiloSectionLayout = 'centered' | 'left' | 'aside' | 'banner'

// Grid mode — 'equal' renders the chosen button layout in an even grid. The bento
// modes all lead with the Primary as a hero block top-left (importance == reading
// order): 'bentoLeft' is a 2×2 hero in an even field; 'bentoMosaic' varies the
// remaining tiles for editorial rhythm; 'bentoList' pairs the hero with a scannable
// list of the rest.
export type SiloGridMode = 'equal' | 'bentoLeft' | 'bentoMosaic' | 'bentoList'

// Mobile display — how the section presents on phones (< md). Desktop always uses
// the chosen button layout. 'carousel' = horizontal swipe; 'stacked' = the desktop
// grid shown at all widths (full cards, vertical); 'list' = compact icon+label rows.
export type SiloMobileDisplay = 'carousel' | 'stacked' | 'list'
