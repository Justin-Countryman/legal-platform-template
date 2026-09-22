// ESLint flat-config — consumes eslint-config-next 16's native flat exports
// directly. Migrated off `@eslint/eslintrc` FlatCompat in WS8 Commit 0
// because the FlatCompat shim path produced a circular-structure JSON error
// when validating eslint-plugin-react's plugin export under ESLint 9.
//
// WS8 platform rules (9 custom + 5 config-rule-families = 14 total active
// platform-shipped rules) are documented in
// `BI/skills/skill-eslint-platform-rules/SKILL.md`. Each rule below cites
// the BI / skill / OUTSTANDING source that locks the posture it enforces.
// Eight design-token rules were cut 2026-09-13 (monorepo WS-V1-PLAN Phase 8,
// WS-V1-PHASE8-DESIGN §2.4 and §7.10); the skills carry those postures.
//
// Both `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
// export ready-to-spread flat-config arrays.

import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import platform from "./eslint-rules/index.js";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,

  // ───────────────────────────────────────────────────────────────────────
  // Platform rule overrides (WS8). Categories follow the WS8 audit grouping:
  //   A11y · Token discipline · Component patterns / cascade ·
  //   no-restricted-syntax (retired tokens, font CDN, retired components) ·
  //   no-restricted-imports (next/font/google block).
  // Per-rule comments cite the canonical BI / skill / OUTSTANDING source.
  // ───────────────────────────────────────────────────────────────────────
  {
    plugins: {platform},
    rules: {
      // ─── A11y ──────────────────────────────────────────────────────────
      // A1 — `BI-PRINCIPLES.md → Performance` ("Always use Next.js Image
      // component — never HTML img tag"). next/core-web-vitals ships this
      // rule at 'warn'; the platform's locked posture is non-negotiable
      // (perf budget targets 100 Lighthouse).
      "@next/next/no-img-element": "error",
      // A7 — `BI-PRINCIPLES.md → A11y` ("ARIA labels on all interactive
      // elements without visible text — hamburger menu, icon buttons,
      // sliders"). next/core-web-vitals's curated jsx-a11y subset does NOT
      // include this rule; the platform plugin (eslint-plugin-jsx-a11y) IS
      // loaded, so we activate the rule directly.
      "jsx-a11y/control-has-associated-label": "error",
      // A2 — `BI-FOUNDATIONS.md → Heading-cascade discipline` +
      // `skill-color-system → Cascade reassignment vs. computed-color
      // inheritance`. Every <h1>–<h6> must explicitly carry a
      // cascade-aware text token; bare headings rely on inherited
      // computed-color from <body>, which bypasses the dark-context
      // cascade rule. Granular messageIds: noClassName +
      // missingCascadeToken. Acceptable allowlist: text-foreground,
      // text-foreground-muted, text-foreground-subtle, text-accent,
      // text-action-text, text-current, text-inherit, text-brand-dark,
      // tagline, sr-only. Skips opaque tokenizations per false-negatives-
      // over-false-positives. The WS8 anchor rule.
      "platform/heading-cascade-discipline": "error",
      // A3 — `BI-PRINCIPLES.md → Landmarks` ("Every <footer> carries
      // aria-labelledby='footer-heading' and contains <h2 id='footer-
      // heading' className='sr-only'>...</h2> as its first child").
      // HTML-spec scoping: only top-level <footer> elements are
      // landmarks; <footer> nested inside <article>/<aside>/<section>/
      // <main>/<nav> is sectioning content, not a landmark — rule skips
      // those. Granular messageIds for each missing piece (aria-
      // labelledby, h2 first child, h2 id, sr-only className).
      "platform/footer-landmark-naming": "error",
      // A4 — `BI-PRINCIPLES.md → Collections and lists`. Card grids of
      // collections must use <ul role="list"> + <li>, not <div
      // className="grid">. Two granular messageIds: divToUl (rename +
      // <li>-wrap children) and ulMissingRole (add role attribute).
      // Heuristic: substantive child is a JSXExpressionContainer
      // wrapping a non-array-literal .map(); structural [0,1,2].map()
      // patterns skip naturally per WS8 Decision 2C.
      "platform/collection-grid-list-semantics": "error",
      // A6 — `BI-PRINCIPLES.md → "Image / SVG accessibility"`
      // ("Meaningful SVGs use aria-label / Decorative SVGs use
      // aria-hidden=\"true\""). Forces every <svg> to carry one of
      // aria-hidden, aria-label, aria-labelledby, or role. Spread
      // attributes (typical of the icon-registry SVG_PROPS pattern)
      // bail out — the decision is made inside the spread.
      "platform/no-svg-without-aria-decision": "error",
      // A8 — `BI-PRINCIPLES.md → "Mobile-first / Mobile best practices"`
      // ("H1 maximum text-3xl on mobile — never larger") +
      // `BI-FOUNDATIONS.md → "Mobile-first always"` ("The mobile H1 cap
      // (text-3xl / 30px) is locked ... and is non-negotiable"). Flags
      // <h1> with text-Nxl (N >= 4) at the mobile floor (no responsive
      // prefix). Utility-class h1s (marketing-h1, text-page-h1) clamp
      // internally and pass through.
      "platform/h1-mobile-cap": "error",

      // ─── Token discipline ──────────────────────────────────────────────
      // T1 — `BI-FOUNDATIONS.md → "Token-first, not value-first"` +
      // `skill-color-system → Anti-patterns`. Disallow arbitrary color
      // values in className utilities — `bg-[#hex]`, `text-[rgb(...)]`,
      // etc. — use design tokens instead.
      "platform/no-arbitrary-color": "error",
      // T5a — `skill-color-system → "Surface-aware tokens (cascade-driven)"`
      // + Foundation Colors tab → "Forbidden / warning combinations"
      // (DesignStudioClient.tsx FoundationPanel). Raw `text-action` is
      // anchored amber and fails AA on every light surface (~2.27:1 on
      // bg-background, ~1.82:1 on bg-muted). Use cascade-aware
      // `text-action-text` which carries an AA-safe brand-dark fallback
      // on light and resolves to raw action on dark via the 8-token
      // cascade. StarRating's semantic-gold filled stars are the single
      // legitimate raw-amber-on-light site — tracked via per-site
      // eslint-disable + OUTSTANDING entry.
      // Lock provenance: `OUTSTANDING.md → "Token-surface contrast
      // prevention enforcement"` (Level 1 — WS-Token-Surface-Contrast-
      // Enforcement Commit 1).
      "platform/no-text-action-raw": "error",
      // T5b — `skill-color-system → "WCAG validation"` (warning pair
      // "accent on muted" at ~2.27:1) + Foundation Colors tab →
      // "Forbidden / warning combinations". Same-className pair
      // detection: fires when both `text-accent` and `bg-muted`
      // appear in the same className attribute (or same code-path
      // branch). Replacement: move text to bg-background (where
      // text-accent resolves to tagline color, AA-passing) or use
      // text-foreground-muted on bg-muted.
      "platform/no-text-accent-on-text": "error",
      // Phase 16A, [R-473]: a site's corners are one family. Surfaces read
      // rounded-ui and controls rounded-btn; a fixed radius stays behind when the
      // family changes. See skill-radius-system.
      "platform/no-fixed-radius": "error",
      // Phase 16A, [R-471]: the color role map. States take cue, decorations
      // decor, and the button color stays on Button (exempt below).
      "platform/color-roles": "error",

      // ─── Component patterns / cascade ──────────────────────────────────
      // C4 — `skill-sanity-schema → "Reading design settings in async
      // server components"` + WS7.7 Commit 2 lock. Async server
      // components have no React render scope; calling useHeroScheme()
      // there fails at runtime. Heuristic detection: file qualifies as
      // "async server component" when it has NO 'use client' directive
      // AND exports an async default function. Platform-wide scope —
      // not path-restricted to app/** (per WS8 direction).
      "platform/no-use-hero-scheme-in-server": "error",

      // ─── Retired identifiers / Google Fonts CDN (config-only) ──────────
      // T3 — `OUTSTANDING.md → 2026-04-30 WS4 closure` +
      // `BI-OVERVIEW.md → 2026-04-30 Workstream 4` ("3 orphan tokens
      // retired: --color-brand-dark-hover, --role-bg-section,
      // --role-decorative; brandDarkHover() helper deleted").
      //
      // T6 — `BI-PRINCIPLES.md → Performance / Fonts` ("Self-host all
      // fonts — no external font calls (no Google Fonts CDN, no
      // third-party requests)"). Catches CDN URLs in literal +
      // template-element strings. The next/font/google import path is
      // covered by `no-restricted-imports` below.
      //
      // C5 — `OUTSTANDING.md → "Workstream 7.7 → Commit 4 — GroupedArrayInput
      // entirely removed"` (17 schema documents stripped + 120-line custom
      // component file deleted). Guards against re-introduction of the
      // retired component identifier and its two exported constants.
      "no-restricted-syntax": [
        "error",
        // T3 — Retired CSS variables + helper function
        {
          selector: "Identifier[name='brandDarkHover']",
          message:
            "Retired helper 'brandDarkHover()' — removed in WS4. See OUTSTANDING.md and BI-OVERVIEW.md → '2026-04-30 Workstream 4'.",
        },
        {
          selector:
            "Literal[value=/--color-brand-dark-hover|--role-bg-section|--role-decorative/]",
          message:
            "Retired CSS variable reference — removed in WS4. See OUTSTANDING.md and BI-OVERVIEW.md → '2026-04-30 Workstream 4'. Use a current cascade-aware or anchored token instead.",
        },
        {
          selector:
            "TemplateElement[value.cooked=/--color-brand-dark-hover|--role-bg-section|--role-decorative/]",
          message:
            "Retired CSS variable reference in template literal — removed in WS4. See OUTSTANDING.md and BI-OVERVIEW.md → '2026-04-30 Workstream 4'.",
        },
        // T6 — Google Fonts CDN URLs (literal-string surface)
        {
          selector:
            "Literal[value=/fonts\\.googleapis\\.com|fonts\\.gstatic\\.com/]",
          message:
            "Google Fonts CDN reference — the platform self-hosts all fonts via fontPairingPreset / customFonts. See BI-PRINCIPLES.md → Performance / Fonts and skill-typography.",
        },
        {
          selector:
            "TemplateElement[value.cooked=/fonts\\.googleapis\\.com|fonts\\.gstatic\\.com/]",
          message:
            "Google Fonts CDN reference in template literal — the platform self-hosts all fonts. See BI-PRINCIPLES.md → Performance / Fonts.",
        },
        // C5 — Retired GroupedArrayInput component + constants
        {
          selector: "Identifier[name='GroupedArrayInput']",
          message:
            "Retired Sanity Studio component 'GroupedArrayInput' — removed in WS7.7 Commit 4 (editors now use Sanity's native add UI). See OUTSTANDING.md → 'Workstream 7.7 → Commit 4 — GroupedArrayInput entirely removed' and skill-sanity-schema → 'When to add a custom input'.",
        },
        {
          selector: "Identifier[name=/^(SIDEBAR_INPUT|SECTIONS_INPUT)$/]",
          message:
            "Retired Sanity input constant from the deleted GroupedArrayInput module. See OUTSTANDING.md → 'Workstream 7.7 → Commit 4'.",
        },
        // WS-Sidebar Phase 1 (2026-05-16) — banned escape hatch.
        // `[key: string]: any` (or any index signature with `any` value type)
        // was the WS8 Decision-2 deferral mechanism on `SidebarComponent`.
        // Phase 1 resolved that deferral by introducing a discriminated union
        // (see components/layout/Sidebar.tsx). Re-introducing the index
        // signature would re-open the escape hatch and undo the lock. This
        // selector is platform-wide because the posture ("no [key: string]:
        // any escape hatches in canonical code") applies generally — the
        // pattern had exactly one prior site in the runtime, and that site
        // is now typed. New widget variants must extend the discriminated
        // union explicitly. See BI-Sidebar.md → 'What this file does not
        // contain' (typed variants pointer) and OUTSTANDING.md → 'WS-Sidebar
        // — Sidebar System workstream' Phase 1.
        // The companion rule `@typescript-eslint/no-explicit-any` (active via
        // eslint-config-next/typescript) catches bare `any`; this selector
        // catches the index-signature-with-any shape specifically so the
        // error message points at the doctrine.
        {
          selector: "TSIndexSignature > TSTypeAnnotation > TSAnyKeyword",
          message:
            "`[key: string]: any` (or any index signature with an `any` value type) re-opens the WS8 Decision-2 escape hatch resolved in WS-Sidebar Phase 1. Extend the discriminated union explicitly. See BI/BI-Sidebar.md and OUTSTANDING.md → 'WS-Sidebar — Sidebar System workstream'.",
        },
      ],

      // ─── Self-hosted fonts only (T6 — config-only) ─────────────────────
      // `BI-PRINCIPLES.md → Performance / Fonts`. The
      // `next/font/google` package fetches Google Fonts at build time and
      // re-hosts them; that's a runtime-OK pattern in many Next.js apps,
      // but the platform's productization model uses Sanity-driven
      // `fontPairingPreset` + committed WOFF2 files, never `next/font/google`.
      // `skill-typography → CSS chain` notes "There is no longer a
      // next/font/google import in app/layout.tsx — that was removed
      // during the typography reconciliation."
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "next/font/google",
              message:
                "next/font/google not allowed — the platform uses Sanity-driven fontPairingPreset (committed WOFF2 files in public/fonts/files/). See BI-PRINCIPLES.md → Performance / Fonts and skill-typography → CSS chain.",
            },
          ],
        },
      ],
    },
  },

  // ───────────────────────────────────────────────────────────────────────
  // Meta-file carve-outs. These files implement / configure platform rules;
  // they must mention retired tokens (T3 documentation), use CommonJS
  // `require()` (ESLint plugin loading convention), and would otherwise
  // self-match the rules they enforce.
  // ───────────────────────────────────────────────────────────────────────
  {
    files: [
      "eslint.config.mjs",
      "eslint-rules/**/*.js",
    ],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "no-restricted-syntax": "off",
    },
  },

  // Phase 16A, [R-471]: the button color lives on Button, and the dev-only design
  // surfaces ([R-214]) draw swatches of every role by name.
  {
    files: [
      "components/ui/Button.tsx",
      "app/(site)/design-studio/**",
      "app/(site)/design-preview/**",
    ],
    rules: {
      "platform/color-roles": "off",
    },
  },

  // Phase 17A (monorepo WS-V1-PHASE17A-DESIGN §2.2): the preview address is the only
  // importer of preview code. A live route that imported it could read the preview's
  // cookie or sign its links; the build's check (`scripts/ci/check-preview-not-
  // shipped.mjs`) proves nothing of it reaches a visitor, and this keeps the import
  // from being written at all. A later block REPLACES a rule's options, so the fonts
  // rule above is restated here.
  {
    files: ["**/*.{ts,tsx}"],
    ignores: ["app/(preview)/**", "components/preview/**", "lib/preview/**", "**/__tests__/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "next/font/google",
              message:
                "next/font/google not allowed — the platform uses Sanity-driven fontPairingPreset (committed WOFF2 files in public/fonts/files/). See BI-PRINCIPLES.md → Performance / Fonts and skill-typography → CSS chain.",
            },
          ],
          patterns: [
            {
              group: ["@/lib/preview", "@/lib/preview/*", "@/components/preview", "@/components/preview/*", "../preview/*", "./preview/*"],
              message:
                "Preview code is imported only by the preview address, app/(preview)/ (Phase 17A). A live route must never read the preview's cookie or sign its links.",
            },
          ],
        },
      ],
    },
  },

  // ───────────────────────────────────────────────────────────────────────
  // Global ignores
  // ───────────────────────────────────────────────────────────────────────
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      // Generated by `sanity typegen generate` (studio/sanity.cli.ts `typegen`).
      // Since the Sanity v6 upgrade (2026-09-11) the generator emits an empty
      // `SanityQueries` interface extension by design; lint has no say over a
      // file nobody hand-edits, and the freshness CI job is its check.
      "types/sanity.types.ts",
    ],
  },
];

export default eslintConfig;
