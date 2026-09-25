// ─── Font Pairing Presets ─────────────────────────────────────────────────────
// 16 curated heading + body pairs, all self-hostable via Google Fonts.
// Files are committed to site/public/fonts/files/<slug>/ — see README in each
// folder. Google Fonts OFL license applies to all presets.
//
// A VARIABLE family is committed as ONE file, its `-Regular.woff2`, which carries every
// weight; a variable role names only that file (and a static italic), and the page
// declares it once across the role's `weights` (lib/designTokens.ts `buildFontFaces`).
// Phase 17C (`[R-540]`, `[R-541]`): each family used to be committed as byte-identical
// copies under Bold and SemiBold names, a page fetched every copy it used, and a weight
// between two copies snapped to one of them. `fonts/__tests__/presets.test.ts` reads the
// files and refuses two identical ones, a flag that disagrees with its file, and a
// variable role naming more than one upright file.
//
// Id allocation history (see BI/OUTSTANDING.md → "Font preset library audit"):
//   1-13  — original library (id 13 = Heritage Old-Style, the canonical preset)
//   3, 8  — culled in WS-Polish (Refined Practice, Space Age Authority);
//           ids intentionally left vacant rather than reused — backwards-compatible
//           for any future client whose designSettings was set to those numbers
//   7, 12 — body swapped Lato → Open Sans (no id change; visible diff for any
//           client on those presets)
//   14-18 — added in WS-Polish (1 exact-match validation play +
//           4 deliberately distinct pairings; see audit close entry)
//
// Usage: getPresetById(id) → FontPreset | undefined

export const HEADING_VOICES = [
  'display serif', 'old-style serif', 'transitional serif', 'text serif', 'soft serif', 'geometric sans', 'humanist sans',
] as const
export type HeadingVoice = (typeof HEADING_VOICES)[number]

export interface FontPreset {
  id: number
  name: string
  heading: {
    family: string
    slug: string
    /** What a visitor sees before reading a word, used to measure how far apart two themes
     *  are (Phase 16C, `[R-487]`): two pairings in one voice are not a difference a visitor
     *  can name. */
    voice: HeadingVoice
    /** The weights the pairing draws in this role. A variable role is declared once across
     *  them (lowest to highest), so a weight between draws as itself and one outside clamps
     *  to the nearer end; a static role declares one face per file. */
    weights: string[]
    italic: boolean
    /** True when `files.regular` is a variable font (read from the file by the test). */
    variable: boolean
    files: {
      regular: string
      /** A static family's separate bold file; a variable role has none. */
      bold?: string
      italic?: string
    }
  }
  body: {
    family: string
    slug: string
    weights: string[]
    italic: boolean
    variable: boolean
    files: {
      regular: string
      medium?: string
      semibold?: string
      bold?: string
      italic?: string
      boldItalic?: string
    }
  }
  tone: string
  bestFor: string
}

export const FONT_PRESETS: FontPreset[] = [
  {
    id: 1,
    name: 'Classical Authority',
    heading: {
      family: 'Playfair Display',
      voice: 'display serif',
      slug: 'playfair-display',
      weights: ['400', '700'],
      italic: true,
      variable: true,
      files: {
        regular: '/fonts/files/playfair-display/PlayfairDisplay-Regular.woff2',
        italic:  '/fonts/files/playfair-display/PlayfairDisplay-Italic.woff2',
      },
    },
    body: {
      family: 'Source Sans 3',
      slug: 'source-sans-3',
      weights: ['400', '600', '700'],
      italic: true,
      variable: true,
      files: {
        regular:   '/fonts/files/source-sans-3/SourceSans3-Regular.woff2',
        italic:    '/fonts/files/source-sans-3/SourceSans3-Italic.woff2',
      },
    },
    tone: 'Prestigious, editorial, timeless',
    bestFor: 'Litigation, estate planning, family law',
  },
  {
    id: 2,
    name: 'Modern Counsel',
    heading: {
      family: 'DM Serif Display',
      voice: 'display serif',
      slug: 'dm-serif-display',
      weights: ['400'],
      italic: true,
      variable: false,
      files: {
        regular: '/fonts/files/dm-serif-display/DMSerifDisplay-Regular.woff2',
        italic:  '/fonts/files/dm-serif-display/DMSerifDisplay-Italic.woff2',
      },
    },
    body: {
      family: 'DM Sans',
      slug: 'dm-sans',
      weights: ['400', '500', '700'],
      italic: true,
      variable: true,
      files: {
        regular: '/fonts/files/dm-sans/DMSans-Regular.woff2',
        italic:  '/fonts/files/dm-sans/DMSans-Italic.woff2',
      },
    },
    tone: 'Contemporary, approachable, clean',
    bestFor: 'Business law, tech sector, startup-facing practices',
  },
  // id 3 — vacant (Refined Practice culled in WS-Polish; not reused)
  {
    id: 4,
    name: 'Editorial Authority',
    heading: {
      family: 'Fraunces',
      voice: 'soft serif',
      slug: 'fraunces',
      weights: ['400', '700'],
      italic: true,
      variable: true,
      files: {
        regular: '/fonts/files/fraunces/Fraunces-Regular.woff2',
        italic:  '/fonts/files/fraunces/Fraunces-Italic.woff2',
      },
    },
    body: {
      family: 'Inter',
      slug: 'inter',
      weights: ['400', '500', '600', '700'],
      italic: false,
      variable: true,
      files: {
        regular:  '/fonts/files/inter/Inter-Regular.woff2',
      },
    },
    tone: 'Bold, distinctive, editorial',
    bestFor: 'Personal injury, consumer rights, advocacy-forward firms',
  },
  {
    id: 5,
    name: 'Corporate Clarity',
    heading: {
      family: 'Libre Baskerville',
      voice: 'transitional serif',
      slug: 'libre-baskerville',
      weights: ['400', '700'],
      italic: true,
      variable: true,
      files: {
        regular: '/fonts/files/libre-baskerville/LibreBaskerville-Regular.woff2',
        italic:  '/fonts/files/libre-baskerville/LibreBaskerville-Italic.woff2',
      },
    },
    body: {
      family: 'Montserrat',
      slug: 'montserrat',
      weights: ['400', '500', '600', '700'],
      italic: true,
      variable: true,
      files: {
        regular:   '/fonts/files/montserrat/Montserrat-Regular.woff2',
        italic:    '/fonts/files/montserrat/Montserrat-Italic.woff2',
      },
    },
    tone: 'Structured, professional, corporate-grade',
    bestFor: 'Corporate law, M&A, compliance, multi-practice firms',
  },
  {
    id: 6,
    name: 'Humanist Trust',
    heading: {
      family: 'Lora',
      voice: 'text serif',
      slug: 'lora',
      weights: ['400', '700'],
      italic: true,
      variable: true,
      files: {
        regular: '/fonts/files/lora/Lora-Regular.woff2',
        italic:  '/fonts/files/lora/Lora-Italic.woff2',
      },
    },
    body: {
      family: 'Work Sans',
      slug: 'work-sans',
      weights: ['400', '500', '600', '700'],
      italic: false,
      variable: true,
      files: {
        regular:  '/fonts/files/work-sans/WorkSans-Regular.woff2',
      },
    },
    tone: 'Warm, trustworthy, community-oriented',
    bestFor: 'Family law, elder law, immigration, community-focused practices',
  },
  {
    id: 7,
    // Body swapped Lato → Open Sans in WS-Polish — Montserrat + Open Sans is the
    // #6 real-world legal pairing (3 audit matches). Refines an existing preset
    // rather than replacing it; clients on this id will see a visible body diff.
    name: 'Geometric Precision',
    heading: {
      family: 'Montserrat',
      voice: 'geometric sans',
      slug: 'montserrat',
      weights: ['400', '700'],
      italic: false,
      variable: true,
      files: {
        regular: '/fonts/files/montserrat/Montserrat-Regular.woff2',
      },
    },
    body: {
      family: 'Open Sans',
      slug: 'open-sans',
      weights: ['400', '600', '700'],
      italic: true,
      variable: true,
      files: {
        regular:   '/fonts/files/open-sans/OpenSans-Regular.woff2',
        italic:    '/fonts/files/open-sans/OpenSans-Italic.woff2',
      },
    },
    tone: 'Precise, structured, modern-corporate',
    bestFor: 'IP law, patent, technology litigation',
  },
  // id 8 — vacant (Space Age Authority culled in WS-Polish; not reused)
  {
    id: 9,
    name: 'Neutral Professional',
    heading: {
      family: 'Merriweather',
      voice: 'text serif',
      slug: 'merriweather',
      weights: ['400', '700'],
      italic: true,
      variable: true,
      files: {
        regular: '/fonts/files/merriweather/Merriweather-Regular.woff2',
        italic:  '/fonts/files/merriweather/Merriweather-Italic.woff2',
      },
    },
    body: {
      family: 'Open Sans',
      slug: 'open-sans',
      weights: ['400', '600', '700'],
      italic: true,
      variable: true,
      files: {
        regular:   '/fonts/files/open-sans/OpenSans-Regular.woff2',
        italic:    '/fonts/files/open-sans/OpenSans-Italic.woff2',
      },
    },
    tone: 'Dependable, neutral, broadly accessible',
    bestFor: 'General practice, municipal, government-adjacent work',
  },
  {
    id: 10,
    name: 'Accessible Modern',
    heading: {
      family: 'Work Sans',
      voice: 'humanist sans',
      slug: 'work-sans',
      weights: ['400', '600', '700'],
      italic: false,
      variable: true,
      files: {
        regular: '/fonts/files/work-sans/WorkSans-Regular.woff2',
      },
    },
    body: {
      family: 'Roboto',
      slug: 'roboto',
      weights: ['400', '500', '700'],
      italic: true,
      variable: true,
      files: {
        regular: '/fonts/files/roboto/Roboto-Regular.woff2',
        italic:  '/fonts/files/roboto/Roboto-Italic.woff2',
      },
    },
    tone: 'Clean, neutral, maximum legibility',
    bestFor: 'Workers comp, disability, social services law',
  },
  {
    id: 11,
    name: 'Bold Advocate',
    heading: {
      family: 'Fraunces',
      voice: 'soft serif',
      slug: 'fraunces',
      weights: ['700'],
      italic: false,
      variable: true,
      files: {
        regular: '/fonts/files/fraunces/Fraunces-Regular.woff2',
      },
    },
    body: {
      family: 'Source Sans 3',
      slug: 'source-sans-3',
      weights: ['400', '600'],
      italic: true,
      variable: true,
      files: {
        regular:  '/fonts/files/source-sans-3/SourceSans3-Regular.woff2',
        italic:   '/fonts/files/source-sans-3/SourceSans3-Italic.woff2',
      },
    },
    tone: 'Assertive, results-driven, high-impact',
    bestFor: 'Criminal defense, DUI, aggressive litigation',
  },
  {
    id: 12,
    // Body swapped Lato → Open Sans in WS-Polish — Open Sans has broader legal-
    // market presence than Lato (7 vs 1-2 audit uses). Conservative preset stays
    // conservative; just a more widely-used body family.
    name: 'Traditional Fallback',
    heading: {
      family: 'Libre Baskerville',
      voice: 'transitional serif',
      slug: 'libre-baskerville',
      weights: ['400', '700'],
      italic: true,
      variable: true,
      files: {
        regular: '/fonts/files/libre-baskerville/LibreBaskerville-Regular.woff2',
        italic:  '/fonts/files/libre-baskerville/LibreBaskerville-Italic.woff2',
      },
    },
    body: {
      family: 'Open Sans',
      slug: 'open-sans',
      weights: ['400', '600', '700'],
      italic: true,
      variable: true,
      files: {
        regular:   '/fonts/files/open-sans/OpenSans-Regular.woff2',
        italic:    '/fonts/files/open-sans/OpenSans-Italic.woff2',
      },
    },
    tone: 'Conservative, established, tried-and-true',
    bestFor: 'Solo practitioners, small firms, conservative markets',
  },
  {
    id: 13,
    name: 'Heritage Old-Style',
    heading: {
      family: 'Sorts Mill Goudy',
      voice: 'old-style serif',
      slug: 'sorts-mill-goudy',
      // Sorts Mill Goudy ships with Regular and Italic only on Google Fonts —
      // there is no native Bold weight. Headings render bold via faux-bold or
      // tighter weight choices in body copy.
      weights: ['400'],
      italic: true,
      variable: false,
      files: {
        regular: '/fonts/files/sorts-mill-goudy/SortsMillGoudy-Regular.woff2',
        italic:  '/fonts/files/sorts-mill-goudy/SortsMillGoudy-Italic.woff2',
      },
    },
    body: {
      family: 'Open Sans',
      slug: 'open-sans',
      weights: ['400', '600', '700'],
      italic: true,
      variable: true,
      files: {
        regular:   '/fonts/files/open-sans/OpenSans-Regular.woff2',
        italic:    '/fonts/files/open-sans/OpenSans-Italic.woff2',
      },
    },
    tone: 'Heritage, established, classical-American',
    bestFor: 'Established firms with deep regional history',
  },
  // ─── WS-Polish additions (14-18) ────────────────────────────────────────────
  // The "1 exact + 4 distinct" resolution from the OUTSTANDING.md audit close.
  // Modern Practice (14) is the validated-familiarity play — exact match to the
  // #3 real-world legal pairing, introduces Poppins (absent family) + fills the
  // mono-pair architectural gap with one new font. The other four fill the same
  // gaps via deliberately distinct combinations not in the top-20 real-world
  // pairings (Heritage Voice's Spectral + Open Sans, Stately Modern's Petrona +
  // Inter, Editorial Statement's Fraunces mono, Sovereign Mono's Source Serif 4
  // mono).
  {
    id: 14,
    name: 'Modern Practice',
    heading: {
      family: 'Poppins',
      voice: 'geometric sans',
      slug: 'poppins',
      weights: ['700'],
      italic: false,
      variable: false,
      files: {
        regular: '/fonts/files/poppins/Poppins-Bold.woff2',
      },
    },
    body: {
      family: 'Poppins',
      slug: 'poppins',
      weights: ['400', '600'],
      italic: false,
      variable: false,
      files: {
        regular:  '/fonts/files/poppins/Poppins-Regular.woff2',
        semibold: '/fonts/files/poppins/Poppins-SemiBold.woff2',
        bold:     '/fonts/files/poppins/Poppins-Bold.woff2',
      },
    },
    tone: 'Confident, modern, single-voice (mono-pair)',
    bestFor: 'Modern practices, plaintiff firms, advocacy-forward branding',
  },
  {
    id: 15,
    name: 'Heritage Voice',
    heading: {
      family: 'Spectral',
      voice: 'text serif',
      slug: 'spectral',
      weights: ['400', '700'],
      italic: true,
      variable: false,
      files: {
        regular: '/fonts/files/spectral/Spectral-Regular.woff2',
        bold:    '/fonts/files/spectral/Spectral-Bold.woff2',
        italic:  '/fonts/files/spectral/Spectral-Italic.woff2',
      },
    },
    body: {
      family: 'Open Sans',
      slug: 'open-sans',
      weights: ['400', '600', '700'],
      italic: true,
      variable: true,
      files: {
        regular:   '/fonts/files/open-sans/OpenSans-Regular.woff2',
        italic:    '/fonts/files/open-sans/OpenSans-Italic.woff2',
      },
    },
    tone: 'Editorial, transitional-serif gravitas, modern-readable body',
    bestFor: 'Trusts & estates, appellate practice, long-form advocacy',
  },
  {
    id: 16,
    name: 'Stately Modern',
    heading: {
      family: 'Petrona',
      voice: 'text serif',
      slug: 'petrona',
      weights: ['400', '700'],
      italic: false,
      variable: true,
      files: {
        regular: '/fonts/files/petrona/Petrona-Regular.woff2',
      },
    },
    body: {
      family: 'Inter',
      slug: 'inter',
      weights: ['400', '500', '600', '700'],
      italic: false,
      variable: true,
      files: {
        regular:  '/fonts/files/inter/Inter-Regular.woff2',
      },
    },
    tone: 'Editorial-serif contemporary, UI-clean body — distinguished but distinct',
    bestFor: 'Mid-market firms wanting editorial weight without retreading Playfair',
  },
  {
    id: 17,
    name: 'Editorial Statement',
    heading: {
      family: 'Fraunces',
      voice: 'soft serif',
      slug: 'fraunces',
      weights: ['700'],
      italic: false,
      variable: true,
      files: {
        regular: '/fonts/files/fraunces/Fraunces-Regular.woff2',
      },
    },
    body: {
      family: 'Fraunces',
      slug: 'fraunces',
      weights: ['400'],
      italic: true,
      variable: true,
      files: {
        regular: '/fonts/files/fraunces/Fraunces-Regular.woff2',
        italic:  '/fonts/files/fraunces/Fraunces-Italic.woff2',
      },
    },
    tone: 'Editorial single-voice mono-pair with strong weight contrast',
    bestFor: 'Boutique firms, niche advocacy, editorial-leaning brand voices',
  },
  {
    id: 18,
    name: 'Sovereign Mono',
    heading: {
      family: 'Source Serif 4',
      voice: 'transitional serif',
      slug: 'source-serif-4',
      weights: ['600'],
      italic: false,
      variable: true,
      files: {
        regular: '/fonts/files/source-serif-4/SourceSerif4-Regular.woff2',
      },
    },
    body: {
      family: 'Source Serif 4',
      slug: 'source-serif-4',
      weights: ['400', '600'],
      italic: false,
      variable: true,
      files: {
        regular:  '/fonts/files/source-serif-4/SourceSerif4-Regular.woff2',
      },
    },
    tone: 'Reserved editorial mono-pair, Adobe-modernized classical serif',
    bestFor: 'Wealth management, fiduciary, white-shoe sensibilities',
  },
]

export function getPresetById(id: number): FontPreset | undefined {
  return FONT_PRESETS.find((p) => p.id === id)
}

/** The weights a pairing's HEADING can draw. The page matches faces by family name, not by
 *  role, so where heading and body share a family (pairings 14, 17, 18) the body's weights
 *  are the heading's too: 17's heading, listed bold only, draws its regular through the
 *  body's face. `drawableWeight` and `studio/presets.json` read this (ADV-17C2A-2). */
export function headingWeights(p: FontPreset): string[] {
  const all = p.heading.family === p.body.family ? [...p.heading.weights, ...p.body.weights] : p.heading.weights
  return [...new Set(all)].sort((a, b) => Number(a) - Number(b))
}
