// ─── Font Pairing Presets ─────────────────────────────────────────────────────
// 19 curated heading + body pairs, all self-hostable via Google Fonts.
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
//   19-21 — Phase 17C session 2b: the condensed, the light and the plain sans voices
//
// Usage: getPresetById(id) → FontPreset | undefined

export const HEADING_VOICES = [
  'display serif', 'old-style serif', 'transitional serif', 'text serif', 'soft serif', 'geometric sans', 'humanist sans',
  'condensed sans',
] as const
export type HeadingVoice = (typeof HEADING_VOICES)[number]

/** The four `@font-face` overrides that make a system face take the real face's width and
 *  line box (percent, two decimals, Next's own arithmetic over the capsize metrics it bundles,
 *  `next/dist/server/capsize-font-metrics.json`; `fonts/__tests__/presets.test.ts` recomputes
 *  every number from that table). */
export interface FallbackMetrics {
  sizeAdjust: string
  ascent: string
  descent: string
  lineGap: string
}

/** The heading's fallback while its file loads (Phase 17C session 2b; monorepo
 *  WS-V1-PHASE17C2B-DESIGN §2.4). One adjusted face per weight the heading may draw, in two
 *  families: the desktop one (Arial or Times New Roman by PostScript name, so WebKit draws the
 *  named member and not the family's bold) and the Android one (Roboto or Noto Serif). The
 *  numbers are the face's variant at that weight over the fallback's Regular (under 600) or
 *  Bold (600 and up). `metricsKey` names the capsize entry the numbers come from. */
export interface HeadingFallback {
  family: 'sans' | 'serif'
  metricsKey: string
  at: Record<string, {desktop: FallbackMetrics; android: FallbackMetrics}>
}

export interface FontPreset {
  id: number
  name: string
  heading: {
    family: string
    slug: string
    /** What a visitor sees before reading a word, used to measure how far apart two style sets
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
    /** How much smaller a section heading in capitals is set in this face, so the words take
     *  about the width they take in mixed case (`[R-536]`): the mixed-case width of the three
     *  record headings over their width in capitals with 0.06em tracking, measured at 100 px in
     *  Chromium on the committed file (Phase 17C session 2b). Reaches the page as
     *  `--heading-caps-scale` where the site sets capitals (`lib/designTokens.ts`). */
    capsScale: number
    fallback: HeadingFallback
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
      capsScale: 0.71,
      fallback: {family: 'serif', metricsKey: 'playfairDisplay', at: {
        '400': {desktop: {sizeAdjust: '111.26', ascent: '97.25', descent: '22.56', lineGap: '0.00'}, android: {sizeAdjust: '93.97', ascent: '115.14', descent: '26.71', lineGap: '0.00'}},
        '700': {desktop: {sizeAdjust: '107.02', ascent: '101.10', descent: '23.45', lineGap: '0.00'}, android: {sizeAdjust: '90.43', ascent: '119.65', descent: '27.76', lineGap: '0.00'}},
      }},
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
      capsScale: 0.75,
      fallback: {family: 'serif', metricsKey: 'dMSerifDisplay', at: {
        '400': {desktop: {sizeAdjust: '109.78', ascent: '94.37', descent: '30.51', lineGap: '0.00'}, android: {sizeAdjust: '92.72', ascent: '111.73', descent: '36.13', lineGap: '0.00'}},
      }},
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
      capsScale: 0.71,
      fallback: {family: 'serif', metricsKey: 'fraunces', at: {
        '400': {desktop: {sizeAdjust: '115.45', ascent: '84.71', descent: '22.09', lineGap: '0.00'}, android: {sizeAdjust: '97.51', ascent: '100.30', descent: '26.15', lineGap: '0.00'}},
        '700': {desktop: {sizeAdjust: '115.58', ascent: '84.62', descent: '22.06', lineGap: '0.00'}, android: {sizeAdjust: '97.66', ascent: '100.15', descent: '26.11', lineGap: '0.00'}},
      }},
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
      capsScale: 0.68,
      fallback: {family: 'serif', metricsKey: 'libreBaskerville', at: {
        '400': {desktop: {sizeAdjust: '127.26', ascent: '76.22', descent: '21.22', lineGap: '0.00'}, android: {sizeAdjust: '107.48', ascent: '90.25', descent: '25.12', lineGap: '0.00'}},
        '700': {desktop: {sizeAdjust: '122.51', ascent: '79.18', descent: '22.04', lineGap: '0.00'}, android: {sizeAdjust: '103.52', ascent: '93.71', descent: '26.08', lineGap: '0.00'}},
      }},
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
      capsScale: 0.72,
      fallback: {family: 'serif', metricsKey: 'lora', at: {
        '400': {desktop: {sizeAdjust: '115.20', ascent: '87.33', descent: '23.78', lineGap: '0.00'}, android: {sizeAdjust: '97.30', ascent: '103.39', descent: '28.16', lineGap: '0.00'}},
        '700': {desktop: {sizeAdjust: '111.41', ascent: '90.29', descent: '24.59', lineGap: '0.00'}, android: {sizeAdjust: '94.14', ascent: '106.86', descent: '29.11', lineGap: '0.00'}},
      }},
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
      // Measured 0.75; set 0.72, the largest that holds the long record heading to 3 lines at
      // 1440 (46 px; at 0.75 it is 4), the phone floor keeping 390 at 20 px.
      capsScale: 0.72,
      fallback: {family: 'sans', metricsKey: 'montserrat', at: {
        '400': {desktop: {sizeAdjust: '112.83', ascent: '85.79', descent: '22.25', lineGap: '0.00'}, android: {sizeAdjust: '113.08', ascent: '85.60', descent: '22.20', lineGap: '0.00'}},
        '700': {desktop: {sizeAdjust: '110.42', ascent: '87.66', descent: '22.73', lineGap: '0.00'}, android: {sizeAdjust: '117.22', ascent: '82.58', descent: '21.41', lineGap: '0.00'}},
      }},
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
      capsScale: 0.73,
      fallback: {family: 'serif', metricsKey: 'merriweather', at: {
        '400': {desktop: {sizeAdjust: '122.09', ascent: '80.59', descent: '22.36', lineGap: '0.00'}, android: {sizeAdjust: '103.12', ascent: '95.42', descent: '26.47', lineGap: '0.00'}},
        '700': {desktop: {sizeAdjust: '116.73', ascent: '84.30', descent: '23.39', lineGap: '0.00'}, android: {sizeAdjust: '98.63', ascent: '99.76', descent: '27.68', lineGap: '0.00'}},
      }},
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
      capsScale: 0.76,
      fallback: {family: 'sans', metricsKey: 'workSans', at: {
        '400': {desktop: {sizeAdjust: '111.93', ascent: '83.09', descent: '21.71', lineGap: '0.00'}, android: {sizeAdjust: '112.18', ascent: '82.90', descent: '21.66', lineGap: '0.00'}},
        '600': {desktop: {sizeAdjust: '104.38', ascent: '89.10', descent: '23.28', lineGap: '0.00'}, android: {sizeAdjust: '110.80', ascent: '83.93', descent: '21.93', lineGap: '0.00'}},
        '700': {desktop: {sizeAdjust: '104.59', ascent: '88.92', descent: '23.23', lineGap: '0.00'}, android: {sizeAdjust: '111.03', ascent: '83.76', descent: '21.89', lineGap: '0.00'}},
      }},
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
      capsScale: 0.71,
      fallback: {family: 'serif', metricsKey: 'fraunces', at: {
        '700': {desktop: {sizeAdjust: '115.58', ascent: '84.62', descent: '22.06', lineGap: '0.00'}, android: {sizeAdjust: '97.66', ascent: '100.15', descent: '26.11', lineGap: '0.00'}},
      }},
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
      capsScale: 0.68,
      fallback: {family: 'serif', metricsKey: 'libreBaskerville', at: {
        '400': {desktop: {sizeAdjust: '127.26', ascent: '76.22', descent: '21.22', lineGap: '0.00'}, android: {sizeAdjust: '107.48', ascent: '90.25', descent: '25.12', lineGap: '0.00'}},
        '700': {desktop: {sizeAdjust: '122.51', ascent: '79.18', descent: '22.04', lineGap: '0.00'}, android: {sizeAdjust: '103.52', ascent: '93.71', descent: '26.08', lineGap: '0.00'}},
      }},
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
      capsScale: 0.62,
      fallback: {family: 'serif', metricsKey: 'sortsMillGoudy', at: {
        '400': {desktop: {sizeAdjust: '105.85', ascent: '90.70', descent: '45.16', lineGap: '0.00'}, android: {sizeAdjust: '89.40', ascent: '107.39', descent: '53.47', lineGap: '0.00'}},
      }},
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
      capsScale: 0.80,
      fallback: {family: 'sans', metricsKey: 'poppins', at: {
        '400': {desktop: {sizeAdjust: '112.16', ascent: '93.62', descent: '31.21', lineGap: '8.92'}, android: {sizeAdjust: '112.40', ascent: '93.41', descent: '31.14', lineGap: '8.90'}},
        '600': {desktop: {sizeAdjust: '106.25', ascent: '98.82', descent: '32.94', lineGap: '9.41'}, android: {sizeAdjust: '112.79', ascent: '93.09', descent: '31.03', lineGap: '8.87'}},
        '700': {desktop: {sizeAdjust: '107.30', ascent: '97.86', descent: '32.62', lineGap: '9.32'}, android: {sizeAdjust: '113.90', ascent: '92.19', descent: '30.73', lineGap: '8.78'}},
      }},
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
      capsScale: 0.66,
      fallback: {family: 'serif', metricsKey: 'spectral', at: {
        '400': {desktop: {sizeAdjust: '109.78', ascent: '96.46', descent: '42.17', lineGap: '0.00'}, android: {sizeAdjust: '92.72', ascent: '114.21', descent: '49.93', lineGap: '0.00'}},
        '700': {desktop: {sizeAdjust: '107.25', ascent: '98.74', descent: '43.17', lineGap: '0.00'}, android: {sizeAdjust: '90.63', ascent: '116.86', descent: '51.09', lineGap: '0.00'}},
      }},
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
      capsScale: 0.72,
      fallback: {family: 'serif', metricsKey: 'petrona', at: {
        '400': {desktop: {sizeAdjust: '106.83', ascent: '80.31', descent: '25.27', lineGap: '0.00'}, android: {sizeAdjust: '90.23', ascent: '95.09', descent: '29.92', lineGap: '0.00'}},
        '700': {desktop: {sizeAdjust: '106.10', ascent: '80.87', descent: '25.45', lineGap: '0.00'}, android: {sizeAdjust: '89.65', ascent: '95.71', descent: '30.12', lineGap: '0.00'}},
      }},
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
      capsScale: 0.71,
      fallback: {family: 'serif', metricsKey: 'fraunces', at: {
        '400': {desktop: {sizeAdjust: '115.45', ascent: '84.71', descent: '22.09', lineGap: '0.00'}, android: {sizeAdjust: '97.51', ascent: '100.30', descent: '26.15', lineGap: '0.00'}},
        '700': {desktop: {sizeAdjust: '115.58', ascent: '84.62', descent: '22.06', lineGap: '0.00'}, android: {sizeAdjust: '97.66', ascent: '100.15', descent: '26.11', lineGap: '0.00'}},
      }},
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
      capsScale: 0.74,
      fallback: {family: 'serif', metricsKey: 'sourceSerif4', at: {
        '400': {desktop: {sizeAdjust: '117.91', ascent: '87.87', descent: '28.41', lineGap: '0.00'}, android: {sizeAdjust: '99.58', ascent: '104.03', descent: '33.64', lineGap: '0.00'}},
        '600': {desktop: {sizeAdjust: '112.34', ascent: '92.22', descent: '29.82', lineGap: '0.00'}, android: {sizeAdjust: '94.92', ascent: '109.14', descent: '35.29', lineGap: '0.00'}},
      }},
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
  // ─── Phase 17C session 2b: the three voices the roster lacked ([R-534]) ─────
  // 19 the condensed capitals (Iron): one static weight of the condensed face chosen by eye
  // from Oswald and Barlow Condensed on real pages ([R-539]); 20 one light geometric family
  // (Birch), drawn at 300 on the hero and large headings; 21 one bold humanist family in
  // mixed case (Clay). 20 and 21 add no file: DM Sans and Source Sans 3 were committed.
  {
    id: 19,
    name: 'Industrial Capitals',
    heading: {
      family: 'Oswald',
      voice: 'condensed sans',
      slug: 'oswald',
      weights: ['500'],
      italic: false,
      variable: false,
      capsScale: 0.75,
      fallback: {family: 'sans', metricsKey: 'oswald', at: {
        '500': {desktop: {sizeAdjust: '87.03', ascent: '137.07', descent: '33.21', lineGap: '0.00'}, android: {sizeAdjust: '87.23', ascent: '136.77', descent: '33.13', lineGap: '0.00'}},
      }},
      files: {
        regular: '/fonts/files/oswald/Oswald-Medium.woff2',
      },
    },
    body: {
      family: 'Source Sans 3',
      slug: 'source-sans-3',
      weights: ['400', '600', '700'],
      italic: true,
      variable: true,
      files: {
        regular:  '/fonts/files/source-sans-3/SourceSans3-Regular.woff2',
        italic:   '/fonts/files/source-sans-3/SourceSans3-Italic.woff2',
      },
    },
    tone: 'Industrial, direct, condensed capitals',
    bestFor: 'Criminal defense, DUI, trial-forward firms',
  },
  {
    id: 20,
    name: 'Light Geometric',
    heading: {
      family: 'DM Sans',
      voice: 'geometric sans',
      slug: 'dm-sans',
      weights: ['300', '400', '700'],
      italic: true,
      variable: true,
      capsScale: 0.75,
      fallback: {family: 'sans', metricsKey: 'dMSans', at: {
        '300': {desktop: {sizeAdjust: '103.19', ascent: '96.14', descent: '30.04', lineGap: '0.00'}, android: {sizeAdjust: '103.41', ascent: '95.93', descent: '29.98', lineGap: '0.00'}},
        '400': {desktop: {sizeAdjust: '104.53', ascent: '94.90', descent: '29.66', lineGap: '0.00'}, android: {sizeAdjust: '104.76', ascent: '94.69', descent: '29.59', lineGap: '0.00'}},
        '500': {desktop: {sizeAdjust: '106.33', ascent: '93.30', descent: '29.16', lineGap: '0.00'}, android: {sizeAdjust: '106.56', ascent: '93.09', descent: '29.09', lineGap: '0.00'}},
        '700': {desktop: {sizeAdjust: '102.71', ascent: '96.58', descent: '30.18', lineGap: '0.00'}, android: {sizeAdjust: '109.03', ascent: '90.98', descent: '28.43', lineGap: '0.00'}},
      }},
      files: {
        regular: '/fonts/files/dm-sans/DMSans-Regular.woff2',
        italic:  '/fonts/files/dm-sans/DMSans-Italic.woff2',
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
    tone: 'Light, open, one geometric family (mono-pair)',
    bestFor: 'Family law, mediation, estate planning, approachable practices',
  },
  {
    id: 21,
    name: 'Plain Humanist',
    heading: {
      family: 'Source Sans 3',
      voice: 'humanist sans',
      slug: 'source-sans-3',
      weights: ['700'],
      italic: true,
      variable: true,
      capsScale: 0.76,
      fallback: {family: 'sans', metricsKey: 'sourceSans3', at: {
        '400': {desktop: {sizeAdjust: '93.76', ascent: '109.21', descent: '42.66', lineGap: '0.00'}, android: {sizeAdjust: '93.97', ascent: '108.97', descent: '42.57', lineGap: '0.00'}},
        '600': {desktop: {sizeAdjust: '89.80', ascent: '114.04', descent: '44.55', lineGap: '0.00'}, android: {sizeAdjust: '95.32', ascent: '107.42', descent: '41.96', lineGap: '0.00'}},
        '700': {desktop: {sizeAdjust: '92.30', ascent: '110.95', descent: '43.34', lineGap: '0.00'}, android: {sizeAdjust: '97.98', ascent: '104.51', descent: '40.83', lineGap: '0.00'}},
      }},
      files: {
        regular: '/fonts/files/source-sans-3/SourceSans3-Regular.woff2',
        italic:  '/fonts/files/source-sans-3/SourceSans3-Italic.woff2',
      },
    },
    body: {
      family: 'Source Sans 3',
      slug: 'source-sans-3',
      weights: ['400', '600', '700'],
      italic: true,
      variable: true,
      files: {
        regular:  '/fonts/files/source-sans-3/SourceSans3-Regular.woff2',
        italic:   '/fonts/files/source-sans-3/SourceSans3-Italic.woff2',
      },
    },
    tone: 'Plain and direct, one humanist family in bold mixed case (mono-pair)',
    bestFor: 'Business law, employment, plaintiff firms that want plain speech',
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

/** The weight a pairing's heading face can actually draw (`[R-487]`, amendment 24; Phase 17C
 *  session 2b adds `light`). A face with no 700 renders regular whatever is asked for
 *  (`font-synthesis-weight: none`), a face with only a bold renders bold, and `light` needs a
 *  weight of 300 or under, else it reads as regular where the face has one. Read by the style
 *  set match (`lib/styleSets.ts`), the shell (`data-heading-weight`) and, mirrored, by
 *  `BE/_shared/presets.py`. */
export function drawableWeight(pairing: number | null, wanted: string): string {
  const preset = getPresetById(Number(pairing))
  if (!preset) return wanted
  const weights = headingWeights(preset).map(Number)
  const hasBold = weights.some((w) => w >= 600)
  const hasRegular = weights.some((w) => w < 600 && w > 300)
  const hasLight = weights.some((w) => w <= 300)
  if (wanted === 'light') return hasLight ? 'light' : hasRegular ? 'regular' : 'bold'
  if (wanted === 'bold' && !hasBold) return 'regular'
  if (wanted === 'regular' && !hasRegular) return hasBold ? 'bold' : 'regular'
  return wanted
}
