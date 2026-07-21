// ESLint flat-config — consumes eslint-config-next 16's native flat exports
// directly. Migrated off `@eslint/eslintrc` FlatCompat in WS8 Commit 0
// because the FlatCompat shim path produced a circular-structure JSON error
// when validating eslint-plugin-react's plugin export under ESLint 9.
//
// WS8 platform rules (13 custom + 5 config-rule-families = 18 total active
// platform-shipped rules) are documented in
// `BI/skills/skill-eslint-platform-rules/SKILL.md`. Each rule below cites
// the BI / skill / OUTSTANDING source that locks the posture it enforces.
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
      // T7 — `BI-FOUNDATIONS.md → "Token-first, not value-first"` +
      // `skill-color-system → Anti-patterns`. Companion to T1
      // (no-arbitrary-color), which reads className ONLY. T7 catches raw
      // color values everywhere else: inline `style`, TS constants,
      // template CSS. OUTSTANDING item 46 named the gap, and it matters
      // more now that homepage block components exist: a block that
      // hardcodes a color renders correctly on the client it was written
      // for and silently opts out of per-client theming and WCAG
      // validation on every other one. Token-system boundary files are
      // scoped out structurally rather than carrying inline disables —
      // see eslint-rules/lib/token-boundary.js for each file and reason.
      "platform/no-raw-color-value": "error",
      // T8 — `BI-PRINCIPLES.md → Performance / Fonts` +
      // `skill-typography → CSS chain`. The existing font restrictions
      // block font FETCHING (Google CDN hosts, next/font/google); neither
      // catches a font VALUE typed into a component, which is the other
      // half of item 46. A hardcoded family keeps rendering after an
      // operator changes `fontPairingPreset`, so the design setting
      // appears to work and does nothing. Same boundary carve-out.
      "platform/no-hardcoded-font-family": "error",
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
      // T2 — `skill-color-system → Anti-patterns` ("Manually overriding
      // cascade-aware tokens per component for dark surfaces") +
      // `BI-FOUNDATIONS.md → "Surface-aware cascade: 8 tokens swap
      // together, don't override per-component"`. Flags 8 forbidden
      // *-on-dark utility tokens.
      "platform/no-manual-cascade-override": "error",
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
      "platform/no-text-accent-on-bg-muted": "error",
      // B1 — `BI-OVERVIEW.md → "2026-04-28 — Header hover migration +
      // color system canonicalization"` (transition-all retired across
      // the platform during Phase 2A; WS7 Commit 4 verified zero
      // production sites). Use explicit transition property lists
      // (transition-[a,b,c]) so layout-affecting properties don't animate.
      "platform/no-transition-all": "error",
      // B2 — `skill-color-system → Anti-patterns` ("Raw text-white /
      // bg-white instead of role tokens"). The `ring-white` /
      // `ring-offset-brand-dark` Button-focus exception is a different
      // Tailwind prefix and passes through naturally.
      "platform/no-raw-white-black": "error",

      // ─── Component patterns / cascade ──────────────────────────────────
      // C1 — `skill-component-patterns → Tagline anti-patterns` +
      // `OUTSTANDING.md → "Workstream 7.7 → Commit 5"`. Spacing on
      // <Tagline> belongs to the typed `mb` prop ('mb-0' | 'mb-2' |
      // 'mb-3' | 'mb-4'), never className.
      "platform/no-tagline-classname-mb": "error",
      // C2 — `BI-PRINCIPLES.md → "Heading hierarchy"` +
      // `skill-component-patterns → Tagline / Anti-patterns`. Footer
      // column titles must be plain h3 with role-token styling, never
      // the `tagline` decorative utility. Rule scope: <h3
      // className="tagline ..."> inside JSX <footer> ancestor (via
      // findAncestorJSXElement). The two attorney-layout
      // <h3 className="tagline"> sites are NOT inside <footer> JSX
      // and pass through naturally — those are tracked separately in
      // OUTSTANDING.md → "WS7 lower-priority Biography heading semantics".
      "platform/no-footer-h3-tagline": "error",
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
  // T4 — File-scoped: hero band components must use bg-background for the
  // light fallback, never bg-muted.
  // ───────────────────────────────────────────────────────────────────────
  // `BI-FOUNDATIONS.md → "Light fallback band uses bg-background, NOT
  // bg-muted"` locks the posture for hero band components. The two
  // canonical hero band files in the platform today: InternalHero.tsx
  // (the editor-data-driven hero) and InternalPageHeader.tsx (the
  // h1 fallback band when InternalHero data is unset).
  // Lock provenance: WS7.7 Commit 1 + Commit 2 + WS8 Commit 1.
  {
    files: [
      "components/layout/InternalHero.tsx",
      "components/layout/InternalPageHeader.tsx",
    ],
    plugins: {platform},
    rules: {
      "platform/no-bg-muted": "error",
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
    ],
  },
];

export default eslintConfig;
