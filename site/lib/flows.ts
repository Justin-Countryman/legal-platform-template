import {differenceCiede2000} from 'culori'
import {DIVIDERS, type Divider, type CarryPiece, dividerShape, readCarry} from './dividers'
import {readOverlap, type SectionOverlap} from './overlaps'
import {parseHexInput, resolvePalette, saturatedGate, type ColorInputs} from './designTokens'
import type {VisibleGround} from './sectionSurface'

// ─── Themes: the flow of the page (Phase 17B) ─────────────────────────────────
//
// Justin, 2026-09-22 (`[R-505]`, `[R-506]`, `[R-509]`): the design layer is three
// named things. A STYLE SET (`lib/styleSets.ts`, named in code for the style set since
// Phase 17C, `[R-535]`) owns what repeats inside every section; a PALETTE owns color; a THEME owns
// the flow down the page: how dark it is and which sections go dark, where the
// backgrounds merge and break, the shape of the breaks, what sits on the
// backgrounds, and where the one repeated device lands.
//
// A THEME IS RULES OVER ANY CANVAS, NEVER A LAYOUT. Every client's homepage has a
// different number of sections, so a theme cannot say "band four is navy"; it says
// "a third of the bands go dark, the ribbon and the testimonials first, never three
// in a row". The rules are DATA in a closed vocabulary, interpreted by one engine:
// the ground pass in `components/sections/sectionFrame.ts`, which runs on the server
// before the walk's adoption pass and fills every band that stores no surface. A
// stored per-band value always wins on its own band, and the theme reacts to it
// downstream (`[R-501]`'s adoption stays a law). Nothing runs in the visitor's
// browser: the engine's output is the classes and custom properties the shell
// already emits, plus one hairline rule.
//
// ONE STORED ID, `designSettings.flow`, of the form `<family>.<step>`. A style set
// and a palette write values and are matched back by value (`[R-469]`, `[R-477]`); a
// theme writes no value, so there is nothing to match it against, and it is the one
// stored design choice the site reads by name. Absent renders `DEFAULT_FLOW` on every
// client, built or propagated, which is item 308's one meaning of "nobody chose".
//
// FAMILIES AND STEPS. The darkness dial (mostly light, balanced, mostly dark, all
// dark) is a property of a theme FAMILY, and a family ships only the steps the eye
// has passed on real canvases through the switcher (`[R-509]`); it is never a fourth
// click. The roster below is generated from the families, so nothing is duplicated
// by hand and the step is never buried in a label. Eleven families ship here (Gradient bloom since Phase 17D
// session 2, `[R-557]`); Tiles became a card photo per practice area under every theme (`[R-556]`).
//
// THE VOCABULARY IS CLOSED. A rule it cannot say is a new word plus one engine clause,
// never a special case in a theme: that is the discipline the divider library set.
// `flows.test.ts` holds every generated theme to every word.
//
// Since Phase 17C (`[R-535]`) the word `theme` in code means this layer, and the style set
// says `styleSet`; this layer keeps its code name `flow`, and reads "Theme" in the Studio
// (`[R-514]`).

export const DARKNESS = ['mostlyLight', 'balanced', 'mostlyDark', 'allDark'] as const
export type Darkness = (typeof DARKNESS)[number]
export const DARKNESS_LABELS: Record<Darkness, string> = {
  mostlyLight: 'Mostly light', balanced: 'Balanced', mostlyDark: 'Mostly dark', allDark: 'All dark',
}

/** Which bands may go dark, named by the composer's role where the band carries one
 *  (its stable `_key`, `hp-<role>Block`) and otherwise by the member type and the content
 *  section's layout. The differentiators and the narrative are both a two-column content
 *  section, so only the key can tell them apart (ADV-17B-A F4, -B F4). */
export const HOSTS = [
  'ribbon', 'testimonials', 'attorneys', 'caseResults', 'areas', 'split', 'narrative',
  'differentiators', 'statement', 'statRow', 'badges', 'video', 'reviews',
] as const
export type Host = (typeof HOSTS)[number]

export const DARK_BUDGETS = ['none', 'quarter', 'third', 'threeQuarters', 'all'] as const
export const DARK_RHYTHMS = ['alternate', 'pairs', 'runs', 'bookends', 'spread'] as const
// THE THREE FIELDS A PAINT WAS (the Background theme, monorepo WS-V1-BACKGROUND-THEME-DESIGN §1, `[R-632]`). Until
// 2026-10-05 one word per ground, `paint`, held three layers' decisions. It is three fields now, one per layer:
// which GROUND a band takes is this layer's, the Flow theme's (`ground`); what sits ON the ground is the Background
// theme's (`on`, below); how the band SITS on the page, as a band or as a panel, is the Layout theme's (`sit`), which
// this layer carries unchanged until that layer is built. No rule moved with the split: every roster theme renders
// byte for byte what it rendered before, which the reproduction goldens and the metrics golden hold unregenerated.
export const DARK_GROUNDS = ['plain', 'saturated'] as const
export const DARK_SITS = ['band', 'floating'] as const
export const LIGHT_GROUNDS = ['plain', 'washes'] as const
export const LIGHT_SITS = ['band', 'panel', 'floating'] as const
/** What sits on a dark band (the Background theme's): nothing; the style set's texture; the ramp (one per run, sliced);
 *  the ramp restarted on every band; a photo where the band has one of its own; the theme's set of photographs behind
 *  runs, else windows of the hero's photograph (`span`, Photo scrims' mechanism, Phase 17B session 6 and 17E); windows
 *  of the hero's photograph alone (`windows`); Gradient bloom's glow (`glow`, Phase 17D session 2); a photograph of the
 *  set faded into the dark ground behind every run (`fade`). */
export const DARK_ONS = ['plain', 'pattern', 'gradient', 'gradientPerBand', 'photo', 'span', 'windows', 'glow', 'fade'] as const
/** What sits on a light band: nothing; the texture; a photograph of the set ghosted into the band (`fade`). */
export const LIGHT_ONS = ['plain', 'pattern', 'fade'] as const
/** How many of the light bands a light `on` draws on: every one, or a few (one in three, two at most). */
export const LIGHT_EVERY = ['all', 'few'] as const
/** What the background puts on the closing call to action: nothing, a photograph (where one is approved and the
 *  footer is light, `closeOf`), or the texture (on a dark close). */
export const ON_CLOSES = ['none', 'photo', 'pattern'] as const
/** The grounds a theme may name for its close. */
export const FLOW_CLOSES = ['dark', 'saturated', 'muted', 'wash'] as const
/** The grounds a close resolves to (`closeOf`): a theme's, or the background's photograph. */
export const CLOSES = ['dark', 'saturated', 'muted', 'photo', 'wash'] as const
/** The texture's strength where a paint is `pattern` (Phase 17C session 3, `[R-538]`): the style set's
 *  one tile as it shipped, the same motif at twice the ink, or the two in turn down the page (the bands
 *  the paint textures, in order: quiet, strong, quiet). Every other paint names `quiet`. */
export const TEXTURE_STRENGTHS = ['quiet', 'strong', 'alternate'] as const
export type TextureStrength = (typeof TEXTURE_STRENGTHS)[number]
export const DIVIDER_ATS = ['intoDark', 'everyChange', 'none'] as const
export const HAIRLINES = ['none', 'atChange', 'everyBand'] as const
/** The hairline's ink (Phase 17B session 5, `[R-524]`): the border token, or the accent. The
 *  border measured 4 to 7 levels in 255 against a dark ground, a line nobody sees at arm's
 *  length; the accent is what the study's dark pages draw at a seam. Decorative either way. */
export const HAIRLINE_INKS = ['border', 'accent'] as const
/** The room around a band the theme fills (Phase 17B session 5, `[R-525]`): the normal preset,
 *  or the spacious one. A stored spacing and a section's own default (the ribbon's compact)
 *  win; interior pages never take it. */
export const SPACINGS = ['normal', 'spacious'] as const
export const GHOSTS = ['none', 'once'] as const
/** The header's and the footer's ground (Phase 17B session 4, `[R-518]`): light or dark, never
 *  transparent or glass. A transparent header needs `heroMerge` and a hero behind it, and its
 *  polarity follows the internal hero, not the homepage's (measured unreadable at 1.02:1 when they
 *  differ, ADV-17B4-A); glass pairs with the floating compact style. Both stay the operator's. */
export const CHROME_SCHEMES = ['light', 'dark'] as const
/** The homepage hero's ground where the hero stores none of its own (Inherit; Phase 18 session E, monorepo `[R-619]`):
 *  the site's internal default as before (`site`), or light (`light`), which a theme that paints washes draws as its
 *  wash, or dark (`dark`; the roster eye of 2026-10-03, `[R-631]`), for a theme whose device starts in the hero. Only
 *  Soft wash says light, so a warm firm opens on its warm hero and the hero follows the theme the meeting picks; only
 *  Gradient bloom says dark, so its glow starts in the hero; a stored dark or light wins, and a photograph forces dark
 *  (`themedHero`, `lib/heroGround.ts`). */
export const HERO_GROUNDS = ['site', 'light', 'dark'] as const
export type ChromeScheme = (typeof CHROME_SCHEMES)[number]
/** `ribbons`: the theme fills two ribbons on this page (read from the pass, so two adjacent or a
 *  stored one do not count); `darkHero`: the hero is dark or a photo (Phase 17B session 5);
 *  `heroPhoto`: the hero's backdrop is a photograph a page can be made of, approved with this theme
 *  (Phase 17B session 6, `heroPhotoOf`, `[R-532]`); `glow`: the palette's dark ground has room to glow
 *  (Phase 17D session 2, `glowOk`, `[R-557]`), a need of the palette rather than of the page. */
export const NEEDS = ['photos', 'texture', 'initials', 'ribbons', 'darkHero', 'heroPhoto', 'photoSet', 'glow', ...HOSTS] as const
export type Need = (typeof NEEDS)[number]

export type FlowRules = {
  /** `<family>.<step>`; the stored value. */
  id: string
  name: string
  sentence: string
  family: string
  step: Darkness
  /** The eye has passed this step on the three canvases at 1440 and 390 through the
   *  switcher (`[R-517]`, Phase 17B session 3). The build's practice table writes only a
   *  passed step; the switcher lists every step, because the eye pass runs through it. */
  passed: boolean
  dark: {
    /** The mid-page dark budget: none; a few (`quarter`, one band in four, Phase 18 session E); a third of the
     *  survivors; three quarters; all. */
    budget: (typeof DARK_BUDGETS)[number]
    /** The bands that may go dark, in this theme's order of preference. Absent hosts stay light. */
    hosts: readonly Host[]
    /** How the dark bands sit: never two in a row; runs of at most two; gathered into runs;
     *  none mid-page; or spread down the page, one in each equal stretch (`spread`, Phase 18 session E). The hero is
     *  never a neighbour, so a band directly under a dark hero may join it under the first four rhythms (25 of 45 dark
     *  heroes are followed by a dark band); `spread` leaves that band light, since the dark it recurs is the page's. */
    rhythm: (typeof DARK_RHYTHMS)[number]
    /** The ground a dark band takes: the dark ground; or the accent fill where the palette and the band allow
     *  it, else the dark ground (`saturated`). */
    ground: (typeof DARK_GROUNDS)[number]
    /** How a dark band sits (the Layout theme's, carried here until that layer is built): a full band; or the dark
     *  ground as a panel on the page's light ground, a gutter around it (`floating`, Phase 17D). */
    sit: (typeof DARK_SITS)[number]
    /** The closing call to action's ground; `wash` is Soft wash's ground. A photograph behind the close is the
     *  background's (`on.close`). */
    close: (typeof FLOW_CLOSES)[number]
    /** The grounds the close takes, in order, where its own would meet the footer's color or melt into
     *  the band above it (`closeOf`, `[R-597]`, `[R-603]`). */
    closeElse: readonly (typeof FLOW_CLOSES)[number][]
  }
  light: {
    /** The ground a light band takes: one ground; or the light ground and the wash in turn, counted from the foot of
     *  each light stretch (`washes`, Phase 17D, `[R-551]`). */
    ground: (typeof LIGHT_GROUNDS)[number]
    /** How a light band sits (the Layout theme's): a full band; inside a dark run, an inset panel that adopts the
     *  run (`panel`); or, wherever it sits, a panel on the dark ground (`floating`). */
    sit: (typeof LIGHT_SITS)[number]
  }
  /** What sits on the grounds: the Background theme's (`lib/backgrounds.ts`). On a roster theme this is THE THEME'S
   *  OWN background, what it shipped with, and what an absent `designSettings.background` renders; a stored background
   *  replaces it whole (`effectiveFlow`). */
  on: BackgroundRules
  /** The needs that are the flow's own (a dark hero, two ribbons, a host), apart from what its background implies
   *  (`impliedNeeds`): `needs` is the two together, recomputed when a background replaces the theme's own. */
  ownNeeds: readonly Need[]
  divider: {
    /** `lib/dividers.ts`; `straight` draws none. */
    shape: Divider
    /** `intoDark` is `[R-481]`'s rule: under the hero and at every entry into a strong ground. */
    at: (typeof DIVIDER_ATS)[number]
    /** Site-wide, interior pages included (`[R-483]`; 16C amendment 18). */
    carry: readonly CarryPiece[]
    /** A decorative 1px line at a join: never; at every change of ground; at every join. */
    hairline: (typeof HAIRLINES)[number]
    /** The line's ink: the border token or the accent. */
    hairlineInk: (typeof HAIRLINE_INKS)[number]
  }
  /** The room around each band the theme fills: the normal preset or the spacious one. */
  spacing: (typeof SPACINGS)[number]
  /** The homepage hero's ground where it stores none (`HERO_GROUNDS`). */
  hero: (typeof HERO_GROUNDS)[number]
  /** Placement as before: once, the first dark band, else the first eligible (`[R-492]`). */
  ghost: (typeof GHOSTS)[number]
  /** Placement as before: once, nearest the middle, at a change of visible ground (`[R-499]`). */
  overlap: SectionOverlap
  /** What the canvas and the site must hold for the theme to look like itself. The switcher
   *  names an unmet need; the build's picker never picks a theme whose needs are unmet. */
  needs: readonly Need[]
  /** The header (at the top and when scrolled: one polarity, so the logo never swaps on scroll)
   *  and the footer, site-wide, every page. A scheme stored on Header Settings or Footer
   *  Settings wins, per field (`chromeSchemes`, `[R-518]`). */
  chrome: {header: ChromeScheme; footer: ChromeScheme}
}

/** What sits on the grounds under a theme: the Background theme's rules (monorepo WS-V1-BACKGROUND-THEME-DESIGN §2). */
export type BackgroundRules = {
  dark: (typeof DARK_ONS)[number]
  light: (typeof LIGHT_ONS)[number]
  /** The texture's strength on the bands a `pattern` textures (`TEXTURE_STRENGTHS`); every other word names `quiet`. */
  darkTexture: TextureStrength
  lightTexture: TextureStrength
  /** How many light bands the light word draws on. */
  lightEvery: (typeof LIGHT_EVERY)[number]
  /** The texture in the homepage hero, where the hero paints its own ground. */
  hero: boolean
  /** A dark hero and a dark close join the ramp's first and last runs. The glow's always do. */
  ends: boolean
  close: (typeof ON_CLOSES)[number]
  /** The glow as a light (monorepo WS-PREMIUM-PACKAGE-DESIGN §9.3, `[R-646]`): one light in the accent's hue per group of
   *  dark sections, at most three a page, from a bottom corner or centered, over a deeper surround, where the palette has
   *  room (`glowLightOk`). Absent: the run's soft glow, as before. */
  glowShape?: 'corner' | 'center'
}

/** A background's rules, every word it does not name at its plain value. */
export function own(on: Partial<BackgroundRules>): BackgroundRules {
  return {dark: 'plain', light: 'plain', darkTexture: 'quiet', lightTexture: 'quiet', lightEvery: 'all', hero: false, ends: false, close: 'none', ...on}
}

export type FlowFamily = {
  id: string
  name: string
  sentence: string
  /** The steps the family ships; one for Quiet, Type on black, Soft wash, Editorial. */
  steps: readonly Darkness[]
  defaultStep: Darkness
  /** The steps among them the eye has passed (`[R-517]`): set only by an eye pass recorded
   *  in the phase record with its captures, never when a step is added. */
  passed: readonly Darkness[]
  /** One rule family, parameterised by the step. */
  rules: (step: Darkness) => Omit<FlowRules, 'id' | 'name' | 'sentence' | 'family' | 'step' | 'passed' | 'needs' | 'ownNeeds'> & {needs: readonly Need[]}
}

// ─── The darkness dial's rule, from the evidence (record §2.5) ────────────────
//
// Per step: the budget, the hosts in the evidence order and the rhythm, computed by
// ADV-17B-B over the 65-site study by what the walk can see. The table is the
// starting order a family may reorder, not a law: Photo scrims will rank the bands
// that carry photos first, Ribbon rhythm the ribbon and the statement only.

export const STEP_BUDGET: Record<Darkness, FlowRules['dark']['budget']> = {
  mostlyLight: 'none', balanced: 'third', mostlyDark: 'threeQuarters', allDark: 'all',
}
export const STEP_RHYTHM: Record<Darkness, FlowRules['dark']['rhythm']> = {
  mostlyLight: 'bookends', balanced: 'pairs', mostlyDark: 'runs', allDark: 'runs',
}
export const STEP_HOSTS: Record<Darkness, readonly Host[]> = {
  mostlyLight: [],
  // balanced pages: ribbon 64%, testimonials 55%, attorneys 50%, areas 32%, split 25%,
  // narrative 20%; statement 6% and outside the list.
  balanced: ['ribbon', 'testimonials', 'attorneys', 'caseResults', 'areas', 'split', 'narrative'],
  // mostly-dark pages: areas 73%; what stays light is a split or a contained panel.
  mostlyDark: ['ribbon', 'narrative', 'areas', 'testimonials', 'statement', 'attorneys', 'caseResults', 'split', 'badges'],
  allDark: HOSTS,
}
/** The header and footer per step (Phase 17B session 4, record §2.2): the lighter steps keep the
 *  white bar and a dark footer; the darker steps darken the bar, which
 *  reads as one block with a dark hero. The study coded the footer (a dark one on 20 of 20
 *  mostly-dark pages, light-leaning on mostly-light ones) and never the header, so the header's
 *  values rest on the rule and the eye pass; a family may name its own. */
export const STEP_CHROME: Record<Darkness, FlowRules['chrome']> = {
  mostlyLight: {header: 'light', footer: 'dark'},
  balanced: {header: 'light', footer: 'dark'},
  mostlyDark: {header: 'dark', footer: 'dark'},
  allDark: {header: 'dark', footer: 'dark'},
}

/** The dark budget as a count of the survivors: `third` is `ceil(n/3)`, which sits on
 *  the balanced median (0.33 with the close excluded); `threeQuarters` is `n - ceil(n/4)`,
 *  against the mostly-dark median of 0.71 to 0.78 ("every host" simulated to 0.89). */
export function darkBudget(budget: FlowRules['dark']['budget'], n: number): number {
  switch (budget) {
    case 'none': return 0
    // A few (Phase 18 session E, `[R-598]`): one band at five or six, two at seven to ten, three at eleven to fourteen,
    // so a light page with the dark close lands near a third dark, where `third` puts four of nine dark on eight bands.
    case 'quarter': return Math.floor((n + 1) / 4)
    case 'third': return Math.ceil(n / 3)
    // Never below the balanced budget: on a one-band page `n - ceil(n/4)` is 0 while a
    // third is 1, and a darker step must not darken less (ADV-17B-2 F10).
    case 'threeQuarters': return Math.max(Math.ceil(n / 3), n - Math.ceil(n / 4))
    case 'all': return n
  }
}

const NO_DIVIDER: FlowRules['divider'] = {shape: 'straight', at: 'none', carry: [], hairline: 'none', hairlineInk: 'border'}

// ─── The families ─────────────────────────────────────────────────────────────
//
// Values are provisional until each step passes the arm's-length test through the
// switcher on three canvases at 1440 and 390 (`[R-506]`, `[R-517]`; Phase 17B session
// 3 and after). A step that fails is not marked passed, and the build's table cannot
// write it; `passed` moves only with a verdict in the phase record.
//
// THE EYE PASS OF 2026-09-23 (Phase 17B session 3, record §9.2, captures beside it):
// Quiet, Alternating at balanced, and Cut blocks at both steps passed on the three
// record canvases at 1440 and 390. Alternating at mostly dark did NOT pass: on the
// adversarial canvas `pairs` stops at four of seven bands (0.57, a balanced curve, not
// the step's 0.71 to 0.78) and the step differs from balanced by one band; on the
// planning and multi-practice canvases it read as mostly dark. Session 5 found no rule
// that keeps the alternation reaches the step, and retired it (`[R-523]`, below).
//
// THE EYE PASS OF SESSION 5 (record WS-V1-PHASE17B5-DESIGN §9, captures beside it): Type
// on black, Editorial and Ribbon rhythm passed on the three record canvases and the
// ribbon evidence canvas at 1440 and 390. Type on black and Ribbon rhythm are itself where
// their need is met (a dark or photo hero; two ribbons the pass fills) and the switcher
// names the need where it is not.
//
// THE EYE PASS OF SESSION 6 (record WS-V1-PHASE17B6-DESIGN §9, captures beside it): Photo scrims at
// mostly dark passed on the three record canvases given a photograph of a place behind the hero, at
// 1440 and 390: told from Cut blocks at mostly dark by the photograph behind two sections and the close,
// each a different quarter of the hero's photograph; weakest on a dark landscape, whose lower quarters
// sit near the scrim's own tone. With no approved photograph it renders a plain mostly-dark page and
// says so. Thinner than the study's photo pages, which show a different photograph behind most dark
// bands: that is the photo set's (backlog 365).
//
// THE EYE PASS OF PHASE 17D SESSION 1 (record WS-V1-PHASE17D-DESIGN §9, captures beside it): Wedges at
// balanced, Floating panels at both steps and Soft wash passed on the three record canvases at 1440 and
// 390, beside their neighbours: Wedges' steep slant in and out of every dark block against Cut blocks'
// peaks; Floating panels' dark boxes on a light page against Alternating (0.20 to 0.27 of the height dark
// by pixels, Alternating 0.23 to 0.48) and its cream cards on navy against Cut blocks at mostly dark,
// square under Graphite and rounded under Dune; Soft wash's warm bands and soft close against Quiet and
// Editorial, under all fifteen palettes and the placeholder.

export const FAMILIES: readonly FlowFamily[] = [
  {
    id: 'quiet', name: 'Quiet',
    sentence: 'A dark hero, the ribbon on the accent, then light all the way down, and one dark band to close.',
    // THE ROSTER EYE OF 2026-10-03 (monorepo WS-V1-ROSTER-EYE-2026-10-03/verdicts.txt; `[R-631]`): judged live on
    // Stone Arch beside bdgfirm, "change": "that band is fine but maybe it can have more design to it to make it
    // pop". bdgfirm paints its ribbon solid gold; Quiet drew gold lines above and below a light ribbon (`[R-576]`). So
    // its ribbons take the accent fill, the device Ribbon rhythm has had since Phase 15: the ribbon host alone, every
    // ribbon the budget allows, `alternate` so two together take one fill, the fill where the palette passes its gate
    // and the dark ground where it does not (as Ribbon rhythm falls). Every other band stays light and the close dark,
    // which is the sentence. No need: a page without a ribbon is still Quiet, where Ribbon rhythm asks for two. Not
    // passed until he sees it again (`[R-517]`); his verdict named the headings, the hero's backdrop and a texture on
    // one or two light bands too, which are the palette's and the background layer's (`[R-631]`), not this family's.
    steps: ['mostlyLight'], defaultStep: 'mostlyLight', passed: [],
    rules: (step) => ({
      dark: {budget: 'all', hosts: ['ribbon'], rhythm: 'alternate', ground: 'saturated', sit: 'band', close: 'dark', closeElse: ['saturated', 'muted']},
      light: {ground: 'plain', sit: 'band'},
      on: own({dark: 'plain', light: 'plain', darkTexture: 'quiet', lightTexture: 'quiet'}),
      // Phase 18 session B (`[R-597]`, `[R-603]`): its dark close over a light footer, as the study's mostly light
      // pages end (a light footer on 14 of 19), so the one dark band to close never meets a dark footer.
      divider: NO_DIVIDER, spacing: 'normal',
      hero: 'site', ghost: 'none', overlap: 'none', needs: [], chrome: {header: STEP_CHROME[step].header, footer: 'light'},
    }),
  },
  {
    id: 'alternating', name: 'Alternating',
    sentence: 'Dark, light, dark, light, with hard edges: the classic law site.',
    // The study shows it at three steps (light 7, balanced 4, dark 2 sites); at mostly
    // light it would be Quiet. It ships balanced only, and its rhythm is `pairs`.
    //
    // DARK-LED PAGES ARE RUNS, NOT ALTERNATION (Phase 17B session 5, `[R-523]`). The
    // mostly-dark step shipped in session 2 and failed the eye in session 3; session 5
    // retired it: an alternation darkens at most two bands in three where the step asks
    // for three in four; bands the step never darkens cut the page into shorter
    // stretches; on the fixture's thirteen bands no rule that forbids three dark in a row
    // gets past 7 of 13 (exhaustive); and on the planning canvas at 390 the step measured
    // lighter by page height than this family's balanced step. Dark-led pages gather
    // their dark bands into runs, which is Cut blocks' rhythm.
    steps: ['balanced'], defaultStep: 'balanced', passed: ['balanced'],
    rules: (step) => ({
      dark: {budget: STEP_BUDGET[step], hosts: STEP_HOSTS[step], rhythm: 'pairs', ground: 'plain', sit: 'band', close: 'dark', closeElse: ['muted', 'saturated']},
      light: {ground: 'plain', sit: 'band'},
      on: own({dark: 'plain', light: 'plain', darkTexture: 'quiet', lightTexture: 'quiet'}),
      divider: NO_DIVIDER, spacing: 'normal',
      hero: 'site', ghost: 'none', overlap: 'none', needs: [], chrome: STEP_CHROME[step],
    }),
  },
  {
    id: 'cutBlocks', name: 'Cut blocks',
    sentence: 'Navy blocks cut into the page with a peak, each carrying the texture.',
    // The study: dark 5, balanced 2.
    steps: ['balanced', 'mostlyDark'], defaultStep: 'balanced', passed: ['balanced', 'mostlyDark'],
    rules: (step) => ({
      // Phase 17C session 3 (`[R-538]`): its textured bands alternate quiet and strong.
      dark: {budget: STEP_BUDGET[step], hosts: STEP_HOSTS[step], rhythm: STEP_RHYTHM[step], ground: 'plain', sit: 'band', close: 'dark', closeElse: ['muted', 'saturated']},
      light: {ground: 'plain', sit: 'band'},
      on: own({dark: 'pattern', light: 'plain', darkTexture: 'alternate', lightTexture: 'quiet'}),
      divider: {shape: 'peak', at: 'intoDark', carry: ['cards'], hairline: 'none', hairlineInk: 'border'}, spacing: 'normal',
      hero: 'site', ghost: 'none', overlap: 'photo', needs: [], chrome: STEP_CHROME[step],
    }),
  },
  // ─── Phase 17B session 5 (record WS-V1-PHASE17B5-DESIGN §2) ─────────────────
  {
    id: 'typeOnBlack', name: 'Type on black',
    sentence: 'All dark and no photographs: one unbroken dark ground, and a close on the accent.',
    // The study: elbazelbazlaw, seven dark bands and a red line at each seam; dustincompton's
    // sand bars at every seam. The all-dark step's rhythm devices are photos, per-band ramps
    // and lines, never a second flat shade (17B §0.5); this family was the lines. Its line is
    // the accent (`[R-524]`): the border token cannot be seen on a dark ground. It wants a
    // dark or photo hero, which the composer writes and a theme cannot reach.
    //
    // THE ROSTER EYE OF 2026-10-03 (monorepo WS-V1-ROSTER-EYE-2026-10-03/verdicts.txt; `[R-631]`): judged live on
    // Stone Arch beside lewinlawfirm, "change": "mostly dark theme is so you do not see all the bands but we have
    // gold lines which breaks everything up anyways"; "get rid of the lines". So its hairline draws at a change of
    // ground only (`atChange`), which on an all-dark page is nowhere: a stored light band inside the run still gets its
    // two, and the close meets the run on its own ground. The ribbons' accent lines are the ribbon's, not the seam's
    // (`[R-576]`, the content section's ribbon layout), and stay. His verdict also asked for faint photographs across
    // the run, which is the background layer's (`[R-631]`), not this family's. Not passed until he sees it again
    // (`[R-517]`).
    steps: ['allDark'], defaultStep: 'allDark', passed: [],
    rules: (step) => ({
      dark: {budget: STEP_BUDGET[step], hosts: STEP_HOSTS[step], rhythm: STEP_RHYTHM[step], ground: 'plain', sit: 'band', close: 'dark', closeElse: ['saturated', 'muted']},
      light: {ground: 'plain', sit: 'band'},
      on: own({dark: 'plain', light: 'plain', darkTexture: 'quiet', lightTexture: 'quiet'}),
      divider: {shape: 'straight', at: 'none', carry: [], hairline: 'atChange', hairlineInk: 'accent'}, spacing: 'normal',
      hero: 'site', ghost: 'none', overlap: 'none', needs: ['darkHero'], chrome: STEP_CHROME[step],
    }),
  },
  {
    id: 'editorial', name: 'Editorial',
    sentence: 'Light and airy down to a dark close: room around every section, a faint texture, a rule at every join.',
    // The study: duparlaw, connieyilaw and eternalaw, light with a texture on their light
    // bands, rules between sections, coded airy, a light close and footer. Space is what
    // tells it from Quiet (`[R-525]`); the initials ghost is not drawn (no light page in the
    // study draws initials; the evidenced large mark is the logo, backlog 350).
    steps: ['mostlyLight'], defaultStep: 'mostlyLight', passed: ['mostlyLight'],
    rules: (step) => ({
      dark: {budget: STEP_BUDGET[step], hosts: STEP_HOSTS[step], rhythm: STEP_RHYTHM[step], ground: 'plain', sit: 'band', close: 'muted', closeElse: ['dark']},
      // Phase 17C session 3 (`[R-538]`): its light bands at the quiet strength.
      light: {ground: 'plain', sit: 'band'},
      on: own({dark: 'plain', light: 'pattern', darkTexture: 'quiet', lightTexture: 'quiet'}),
      divider: {shape: 'straight', at: 'none', carry: [], hairline: 'everyBand', hairlineInk: 'border'}, spacing: 'spacious',
      hero: 'site', ghost: 'none', overlap: 'none', needs: [], chrome: {header: 'light', footer: 'light'},
    }),
  },
  {
    id: 'ribbonRhythm', name: 'Ribbon rhythm',
    sentence: 'A light page punctuated by strips of the accent color.',
    // The study: bdgfirm, alecharsheyattorney and emilytylerlaw band for band, a saturated
    // ribbon after the hero and one before the close on a light page; deliamillerattorney and
    // fahlawgroup too. It needs two ribbons the pass can fill; the composer writes none yet,
    // which is the story's to fix (backlog 364), not this family's.
    steps: ['mostlyLight'], defaultStep: 'mostlyLight', passed: ['mostlyLight'],
    rules: (step) => ({
      dark: {budget: 'all', hosts: ['ribbon'], rhythm: 'alternate', ground: 'saturated', sit: 'band', close: 'dark', closeElse: ['saturated', 'muted']},
      light: {ground: 'plain', sit: 'band'},
      on: own({dark: 'plain', light: 'plain', darkTexture: 'quiet', lightTexture: 'quiet'}),
      divider: NO_DIVIDER, spacing: 'normal',
      // Phase 18 session B: a light footer under its dark close, as Quiet's.
      hero: 'site', ghost: 'none', overlap: 'none', needs: ['ribbons'], chrome: {header: STEP_CHROME[step].header, footer: 'light'},
    }),
  },
  // ─── Phase 17B session 6 (record WS-V1-PHASE17B6-DESIGN §2) ─────────────────
  {
    id: 'photoScrims', name: 'Photo scrims',
    sentence: 'Dark-led: photographs of one place behind groups of dark sections and the close, or pieces of the hero\u2019s own photograph.',
    // The study: delllawfirm, capflaw, abdellasise, cleghornjones and aswllp, all mostly dark, photos 57
    // to 78% of their dark bands, the close a place. `[R-526]`, `[R-530]`: the hero's own photograph
    // first, a quarter of it at a time, at most three windows a page (a fourth shows the hero again);
    // the theme's set of photographs takes their place once uploaded and approved (Phase 17E, `[R-573]`). Its sections work as an Image section built
    // by hand, the same scrim and colors (`[R-531]`); a photograph changed after Apply shows none until
    // it is approved (`[R-532]`). Mostly dark only: no balanced study page with a photo hero carries two
    // photo bands, and the family's sites are all mostly dark.
    steps: ['mostlyDark'], defaultStep: 'mostlyDark', passed: ['mostlyDark'],
    rules: (step) => ({
      dark: {budget: STEP_BUDGET[step], hosts: STEP_HOSTS[step], rhythm: STEP_RHYTHM[step], ground: 'plain', sit: 'band', close: 'dark', closeElse: ['muted']},
      light: {ground: 'plain', sit: 'band'},
      on: own({dark: 'span', light: 'plain', darkTexture: 'quiet', lightTexture: 'quiet', close: 'photo'}),
      divider: NO_DIVIDER, spacing: 'normal',
      // Phase 18 session B: a light footer, so its photograph close stands apart from it; under the scrim a photograph
      // measures 0.7 to 18.4 from the dark ground (`closeOf`). The photograph over a dark footer is shown to Justin.
      hero: 'site', ghost: 'none', overlap: 'none', needs: [], chrome: {header: STEP_CHROME[step].header, footer: 'light'},
    }),
  },
  // ─── Phase 17D session 1 (record WS-V1-PHASE17D-DESIGN §2) ──────────────────
  {
    id: 'floatingPanels', name: 'Floating panels',
    sentence: 'One calm ground down the page, and the other floating on it as panels.',
    // The study: breenandperson, curleylawfirm, hdimmigrationlaw and deliamillerattorney float dark
    // panels on a light page; thelitbot ("documents on a desk"), lewinlawfirm and calesariclaw run one
    // dark ground with panels on it. The step is named for what the page reads as: dark panels on the
    // light page measure Alternating's dark share by pixels, so that step is balanced (ADV-17D-A). Its
    // panels are the operator's own inset (`SectionShell`), placed by the theme; their corners are the
    // style set's. `alternate` keeps a floating dark band off every dark neighbour.
    steps: ['balanced', 'mostlyDark'], defaultStep: 'balanced', passed: ['balanced', 'mostlyDark'],
    rules: (step) => (step === 'mostlyDark'
      ? {
          dark: {budget: STEP_BUDGET.mostlyDark, hosts: STEP_HOSTS.mostlyDark, rhythm: 'runs', ground: 'plain', sit: 'band', close: 'dark', closeElse: ['muted', 'saturated']},
          light: {ground: 'plain', sit: 'floating'},
          on: own({dark: 'plain', light: 'plain', darkTexture: 'quiet', lightTexture: 'quiet'}),
          divider: NO_DIVIDER, spacing: 'normal',
          hero: 'site', ghost: 'none', overlap: 'none', needs: [], chrome: STEP_CHROME.mostlyDark,
        }
      : {
          dark: {budget: STEP_BUDGET.balanced, hosts: STEP_HOSTS.balanced, rhythm: 'alternate', ground: 'plain', sit: 'floating', close: 'dark', closeElse: ['muted', 'saturated']},
          light: {ground: 'plain', sit: 'band'},
          on: own({dark: 'plain', light: 'plain', darkTexture: 'quiet', lightTexture: 'quiet'}),
          divider: NO_DIVIDER, spacing: 'normal',
          hero: 'site', ghost: 'none', overlap: 'none', needs: [], chrome: STEP_CHROME.balanced,
        }),
  },
  {
    id: 'softWash', name: 'Soft wash',
    sentence: 'The page and a warm wash of its own background in turn; at balanced, the dark color returns on a few sections down the page.',
    // The study: eternalaw and bdgfirm (both premium) run white bands and cream ones in turn;
    // veronicagarzalaw (premium) is cream all the way; duparlaw and connieyilaw are light with texture.
    // Their second ground is cream, never an accent pastel (ADV-17D-A), so the wash is a warm step of
    // the page's own background (`washOf`, `[R-551]`). At mostly light no band goes dark. A light footer, as the
    // study's light pages have.
    //
    // THE SECOND STEP (Phase 18 session E, monorepo `[R-598]`, WS-V1-PHASE18E-DESIGN §9.3). Justin, of a warm firm's
    // page: "design is all about continuity so we can't just use it in one spot". The white and cream bands keep their
    // turn, and the palette's dark ground goes on a few by rule: the positioning line under a light hero, then a
    // quarter of the bands below it, one in each equal stretch, the host nearest the stretch's middle, never two dark
    // together, the dark close counted after the last band. It stands on his ruling, as the close apart from the footer
    // does: on his rated pages the dark color seldom recurs on a light page (the record's §8.1 item 5); their light-
    // leaning pages give the range, about a third of the bands strong with the close. The attorneys come last among
    // the hosts, since a tall card grid on a phone makes a dark band heavy.
    // THE EYE PASS OF THE SECOND STEP (Phase 18 session E, monorepo `[R-623]`): shown live in the in-app browser on the
    // composer's canvas with a warm hero, under Dune and Forest & Brass, beside the first step; Justin, 2026-10-02:
    // "1, ship as shown".
    steps: ['mostlyLight', 'balanced'], defaultStep: 'mostlyLight', passed: ['mostlyLight', 'balanced'],
    rules: (step) => (step === 'balanced'
      ? {
          dark: {budget: 'quarter', hosts: ['ribbon', 'differentiators', 'narrative', 'testimonials', 'statement', 'caseResults', 'attorneys'], rhythm: 'spread', ground: 'plain', sit: 'band', close: 'dark', closeElse: ['wash']},
          light: {ground: 'washes', sit: 'band'},
          on: own({dark: 'plain', light: 'plain', darkTexture: 'quiet', lightTexture: 'quiet'}),
          divider: NO_DIVIDER, spacing: 'normal',
          hero: 'light', ghost: 'none', overlap: 'none', needs: [], chrome: {header: 'light', footer: 'light'},
        }
      : {
          dark: {budget: 'none', hosts: [], rhythm: 'bookends', ground: 'plain', sit: 'band', close: 'wash', closeElse: ['dark']},
          light: {ground: 'washes', sit: 'band'},
          on: own({dark: 'plain', light: 'plain', darkTexture: 'quiet', lightTexture: 'quiet'}),
          divider: NO_DIVIDER, spacing: 'normal',
          hero: 'light', ghost: 'none', overlap: 'none', needs: [], chrome: {header: 'light', footer: 'light'},
        }),
  },
  // ─── Phase 17D session 2 (record WS-V1-PHASE17D2-DESIGN §2) ─────────────────
  {
    id: 'gradientBloom', name: 'Gradient bloom',
    sentence: 'A soft glow from the hero down through every dark run to the close, behind the attorney where a section has a cutout.',
    // The study: calesariclaw and lewinlawfirm (premium), bowlesverna and bardinelawfirm, all mostly dark, glow lighter
    // than their ground, and so do the nine other dark-ground gradients checked live; none fades deeper (`[R-557]`,
    // amending `[R-502]`). The glow is the accent's color on a near-neutral ground and the ground's own, lighter, on a
    // colored one (`glowOf`); one per run, in and out, its peak on the band carrying a cutout figure (the glow behind
    // the figure, as calesariclaw, bardine and lewin draw it) else the run's middle band; a glowing band takes the photo
    // band's colors. Mostly dark only, on Cut blocks' hosts and runs, with no divider, texture or ghost: the glow is the
    // one device, and where the palette has no room the page is Photo scrims' fallback, which the need names.
    //
    // THE ROSTER EYE OF 2026-10-03 (monorepo WS-V1-ROSTER-EYE-2026-10-03/verdicts.txt; `[R-631]`): judged live on Stone
    // Arch, "change": "I like this one but there is no gradient in the hero to create that continuity after a few
    // sections the gradient stuff just stops". One glow per run peaked once, so a long run went flat after its middle,
    // and the hero stood outside it. Now the hero is dark where it stores no ground (`hero: 'dark'`, `themedHero`), so
    // the glow starts in it: a dark hero joins the first run as its first band, and every dark run, the close
    // included, is lit in stretches of at most `GLOW_RUN_CAP` bands, each with its own peak (the band carrying a
    // cutout figure, the hero's included, lit from its side, else the stretch's middle band), the light coming from the
    // right, then the left, in turn down the page (`sectionFrame.ts`, the run pass; `HeroBand` draws the hero's). The
    // glow's color and room are as they were (`glowOf`, `glowOk`). Not passed until he sees it again (`[R-517]`).
    // A LIGHT FOOTER, so the close is dark and lit: since the close never takes the footer's color (`[R-597]`,
    // `[R-603]`) a dark footer put its close on the accent, where no glow draws, and the run stopped a band short of
    // the end he looked at. Photo scrims ends the same way, its photograph close over a light footer.
    steps: ['mostlyDark'], defaultStep: 'mostlyDark', passed: [],
    rules: (step) => ({
      dark: {budget: STEP_BUDGET[step], hosts: STEP_HOSTS[step], rhythm: STEP_RHYTHM[step], ground: 'plain', sit: 'band', close: 'dark', closeElse: ['saturated', 'muted']},
      light: {ground: 'plain', sit: 'band'},
      on: own({dark: 'glow', light: 'plain', darkTexture: 'quiet', lightTexture: 'quiet'}),
      divider: NO_DIVIDER, spacing: 'normal',
      hero: 'dark', ghost: 'none', overlap: 'photo', needs: [], chrome: {header: STEP_CHROME[step].header, footer: 'light'},
    }),
  },
  {
    id: 'wedges', name: 'Wedges',
    sentence: 'Steep diagonal edges wherever the ground changes.',
    // The study: aswllp ("every band seam is a steep diagonal cut"), kashfianlaw and dbnimmigration
    // (premium), familylawlakecounty, carterlaw, clintonparish, defend-texas; 8 of the 12 angled-seam
    // sites are balanced. The slant is steep (`[R-552]`): at the shared 2.5-degree angle Wedges was Cut
    // blocks with the peak turned (ADV-17D-A). It carries into card corners and a photo's corner, not
    // buttons (a button's slant drops under half the style sets and notches the header's call button);
    // a photograph crosses a cut as on the evidence. Balanced only: at mostly dark its grounds equal Cut
    // blocks' on every canvas.
    steps: ['balanced'], defaultStep: 'balanced', passed: ['balanced'],
    rules: (step) => ({
      dark: {budget: STEP_BUDGET[step], hosts: STEP_HOSTS[step], rhythm: STEP_RHYTHM[step], ground: 'plain', sit: 'band', close: 'dark', closeElse: ['muted', 'saturated']},
      light: {ground: 'plain', sit: 'band'},
      on: own({dark: 'plain', light: 'plain', darkTexture: 'quiet', lightTexture: 'quiet'}),
      divider: {shape: 'steep', at: 'everyChange', carry: ['cards', 'photo'], hairline: 'none', hairlineInk: 'border'}, spacing: 'normal',
      hero: 'site', ghost: 'none', overlap: 'photo', needs: [], chrome: STEP_CHROME[step],
    }),
  },
]

export function flowId(family: string, step: Darkness): string {
  return `${family}.${step}`
}

/** The roster: one theme per family per shipped step. `presets.json` carries it into Python. */
export const FLOWS: readonly FlowRules[] = FAMILIES.flatMap((f) =>
  f.steps.map((step) => {
    const {needs: ownNeeds, ...rules} = f.rules(step)
    return {
    ...rules,
    ownNeeds,
    needs: [...ownNeeds, ...impliedNeeds({...rules, on: rules.on})],
    id: flowId(f.id, step),
    name: f.steps.length > 1 ? `${f.name}, ${DARKNESS_LABELS[step].toLowerCase()}` : f.name,
    sentence: f.sentence,
    family: f.id,
    step,
    passed: f.passed.includes(step),
    }
  }),
)

/** The family a roster theme belongs to. */
export function familyOf(flow: Pick<FlowRules, 'family'> | null | undefined): FlowFamily | null {
  return flow ? FAMILIES.find((f) => f.id === flow.family) ?? null : null
}

/** Steps that shipped and left the roster, with the entry that retired them. A client grant
 *  that names one enters the preview as the site is (`lib/preview/plan.ts`, `grantFlow`); a
 *  stored one is an unknown id and renders the default. */
export const RETIRED_FLOWS: Readonly<Record<string, string>> = {
  'alternating.mostlyDark': '[R-523]',
}

/** What an absent `flow` renders, on every client. Pinned equal to `presets.json`'s
 *  `defaultFlow` by both suites. */
export const DEFAULT_FLOW = flowId('quiet', 'mostlyLight')

export function flowById(id: unknown): FlowRules | null {
  return typeof id === 'string' ? FLOWS.find((f) => f.id === id) ?? null : null
}

// ─── The compat bridge, for one pin (record §2.3, amendment 10) ───────────────
//
// The six fields a style set used to write are hidden in the schema and read by
// nothing but this. A client that stores no `flow` and still stores any of them (every
// client built before this pin does) renders a theme synthesized from them, which
// reproduces its page byte for byte until Apply writes `flow` and clears them: that
// is what "propagation changes nothing" means, and `flowReproduction.test.tsx` holds
// it. The bridge dies with the fields at the deletion pin.
//
// It fires on the fields being PRESENT, not on their naming a device: a document
// written by a style set at an earlier pin carries `brandGhost: 'none'` and the like,
// and a fresh build never writes them, so presence is the mark of a stored client.
//
// `patternGround` maps to the plain dark paint, not the textured one. Today the field
// affects a stored `pattern` band only (it flipped it onto the dark ground), and never
// a stored `dark` band; a theme's `pattern` paint textures every dark band, which would
// change a stored client's page. A stored `pattern` band keeps its one meaning (the
// light ground with the texture) under every theme (amendment 5).
//
// THREE STORED SHAPES THE BRIDGE DOES NOT REPRODUCE, named so nobody reads them as a
// regression (ADV-17B-2 F2). None is on a live client; the reproduction goldens cover
// the live client's shape. (a) A stored `pattern` band under `patternGround: 'dark'`
// with a texture rendered on the dark ground at a164ce0 and renders on the light
// ground now, which is amendment 5. (b) Nine or more bands on one ground under
// `sectionGradient: 'deep'` repeated the last slice from the ninth band on; the ninth
// starts a new run now (record §2.3). (c) An unknown `sectionJoin` value emitted the
// divider classes with empty geometry at a164ce0 and draws nothing now, which is what
// it always looked like.

export const HIDDEN_FIELDS = ['sectionJoin', 'dividerCarry', 'patternGround', 'brandGhost', 'sectionOverlap', 'sectionGradient'] as const

export function storesHiddenFields(d: Record<string, unknown> | null | undefined): boolean {
  return !!d && HIDDEN_FIELDS.some((f) => d[f] !== undefined && d[f] !== null)
}

export function bridgeOf(d: Record<string, unknown>): FlowRules {
  const shape = dividerShape(d.sectionJoin as string) ? (d.sectionJoin as Divider) : 'straight'
  return {
    id: 'stored.bridge', name: 'As stored', family: 'stored', step: 'mostlyLight', passed: false,
    sentence: 'The page as the six retired fields stored it, until Apply writes a theme.',
    dark: {budget: 'none', hosts: [], rhythm: 'bookends', ground: 'plain', sit: 'band', close: 'muted', closeElse: []},
    light: {ground: 'plain', sit: 'band'},
    on: own({dark: d.sectionGradient === 'deep' ? 'gradient' : 'plain'}),
    ownNeeds: [],
    divider: {shape, at: 'intoDark', carry: readCarry(d.dividerCarry), hairline: 'none', hairlineInk: 'border'},
    spacing: 'normal',
    hero: 'site',
    ghost: d.brandGhost === 'on' ? 'once' : 'none',
    overlap: readOverlap(d.sectionOverlap),
    needs: [],
    chrome: STEP_CHROME.mostlyLight,
  }
}

/** The theme a stored Design Settings document renders: the stored `flow`; else the
 *  bridge where the six hidden fields are stored; else the platform default. */
export function flowOf(d: Record<string, unknown> | null | undefined): FlowRules {
  const stored = flowById(d?.flow)
  if (stored) return stored
  if (storesHiddenFields(d)) return bridgeOf(d as Record<string, unknown>)
  return flowById(DEFAULT_FLOW)!
}

// ─── Hosts ────────────────────────────────────────────────────────────────────

const ROLE_HOSTS: Record<string, Host> = {
  differentiator: 'differentiators', caseResults: 'caseResults', siloNav: 'areas',
  narrative: 'narrative', attorneyHighlight: 'attorneys', badges: 'badges',
}
const TYPE_HOSTS: Record<string, Host> = {
  practiceAreaNavInline: 'areas', practiceAreaNav: 'areas',
  attorneySectionInline: 'attorneys', attorneySection: 'attorneys',
  badgesSectionInline: 'badges', badgesSection: 'badges',
  testimonialsGridInline: 'testimonials', testimonialsGrid: 'testimonials',
  featuredTestimonialInline: 'testimonials', featuredTestimonial: 'testimonials',
  videoSectionInline: 'video', videoSection: 'video',
  caseResultsSectionInline: 'caseResults', caseResultsSection: 'caseResults',
  reviewsSectionInline: 'reviews', reviewsSection: 'reviews',
}
const LAYOUT_HOSTS: Record<string, Host> = {
  split: 'split', twoColumnText: 'narrative', statement: 'statement', ribbon: 'ribbon', statRow: 'statRow',
}

/** A band's host: the composer's role from its stable key, else its type, else, for a
 *  content section, its layout (`split` when none is stored, as the component reads it). */
export function hostOf(member: {_type?: string; _key?: string; layout?: string | null} | null | undefined): Host | null {
  if (!member) return null
  const role = /^hp-(\w+)Block$/.exec(member._key ?? '')?.[1]
  if (role && ROLE_HOSTS[role]) return ROLE_HOSTS[role]
  const byType = TYPE_HOSTS[member._type ?? '']
  if (byType) return byType
  if (member._type === 'contentSectionInline' || member._type === 'contentSection') {
    return LAYOUT_HOSTS[member.layout ?? ''] ?? 'split'
  }
  return null
}

// ─── Needs ────────────────────────────────────────────────────────────────────

export type CanvasFacts = {
  /** The hosts the canvas carries. */
  hosts: readonly Host[]
  /** The hero's ground as the walk meets it (`heroGround`); absent reads as not dark. */
  hero?: VisibleGround | null
  /** The ribbons this theme's pass fills on the canvas (`canvasFacts` runs the pass). */
  ribbonsFilled?: number
  /** Bands that carry their own background photo. */
  photos: number
  /** The style set names a texture. */
  texture: boolean
  /** The firm's name yields initials for the ghost. */
  initials: boolean
  /** The hero's backdrop is a photograph the `heroPhoto` paint can use (`heroPhotoOf`), approved
   *  with the theme on a live page (`[R-532]`). */
  heroPhoto?: boolean
  /** The palette's dark ground has room to glow (`glowOk`, Phase 17D session 2). */
  glow?: boolean
  /** The site has an approved photograph in the theme's set (`photoSetOf`), which the faint photographs are drawn from. */
  photoSet?: boolean
}

/** The needs a theme's own rules imply, for the test that holds `needs` to them. */
export function impliedNeeds(rules: Pick<FlowRules, 'on' | 'ghost'>): Need[] {
  const out: Need[] = []
  const {on} = rules
  if (on.dark === 'pattern' || on.light === 'pattern' || on.hero || on.close === 'pattern') out.push('texture')
  if (on.dark === 'photo') out.push('photos')
  if (drawsHeroPhoto(rules)) out.push('heroPhoto')
  if (on.dark === 'fade' || on.light === 'fade') out.push('photoSet')
  if (rules.ghost === 'once') out.push('initials')
  if (on.dark === 'glow') out.push('glow')
  return out
}

/** What a need asks for, in the words the switcher prints. */
export function needLabel(need: Need): string {
  switch (need) {
    case 'photos': return 'two sections with their own photo'
    case 'texture': return 'a style set with a texture'
    case 'initials': return 'initials from the firm\u2019s name'
    case 'ribbons': return 'two ribbon sections the theme can fill'
    case 'darkHero': return 'a dark or photo hero'
    case 'heroPhoto': return 'a landscape hero photograph of a place, approved with this theme'
    case 'photoSet': return 'theme photographs uploaded in Design Settings'
    case 'glow': return 'a palette whose dark sections have room to glow'
    default: return `a ${need} section`
  }
}

/** The needs a canvas and site leave unmet. A photo theme needs two photo bands to be
 *  itself; a host need is one band of that host. */
export function unmetNeeds(flow: FlowRules, facts: CanvasFacts): Need[] {
  return flow.needs.filter((need) => {
    if (need === 'photos') return facts.photos < 2
    if (need === 'texture') return !facts.texture
    if (need === 'initials') return !facts.initials
    if (need === 'ribbons') return (facts.ribbonsFilled ?? 0) < 2
    if (need === 'darkHero') return !(facts.hero === 'dark' || facts.hero === 'image')
    if (need === 'heroPhoto') return !facts.heroPhoto
    if (need === 'photoSet') return !facts.photoSet
    if (need === 'glow') return !facts.glow
    return !facts.hosts.includes(need)
  })
}

// ─── The paints' gates ────────────────────────────────────────────────────────

/** The theme draws the hero's photograph (Phase 17B session 6): its sections or its close, so Apply
 *  records which photograph it was approved with (`[R-532]`). */
export function drawsHeroPhoto(flow: Pick<FlowRules, 'on'> | null | undefined): boolean {
  const on = flow?.on
  return !!on && (on.dark === 'span' || on.dark === 'windows' || on.dark === 'fade' || on.light === 'fade' || on.close === 'photo')
}

/** A dark band's ground fades under this theme: the bridge's ramp (`gradient`, `gradientPerBand`). */
export function fadesUnder(flow: FlowRules | null | undefined): boolean {
  return flow?.on.dark === 'gradient' || flow?.on.dark === 'gradientPerBand'
}

/** What a dark band this theme paints draws over its ground (Phase 17D session 2): the bridge's ramp, Gradient bloom's
 *  glow where the palette has room (`glow`, from `glowFillOk`), or nothing. The shell draws it only where the band paints
 *  the dark ground; the walk carries it on every band's seam (`seam.fade`). */
export function fadeOf(flow: FlowRules | null | undefined, glow: boolean | undefined): 'gradient' | 'glow' | null {
  if (fadesUnder(flow)) return 'gradient'
  return flow?.on.dark === 'glow' && glow ? 'glow' : null
}

const deltaE = differenceCiede2000()

/** The saturated fill reads as a fill on this palette: the accent has chroma of at least
 *  0.05 and stands at least dE2000 20 from both grounds (ADV-P15's measured rule; every
 *  shipped preset passes, the grey placeholder does not). Read on the RESOLVED palette,
 *  because acceptance may re-tone the accent. */
/** The palette the four stored roles resolve to, memoized: the site look asks both gates of the same palette on every
 *  page, and each would resolve it again (ADV-17D2-B). */
const resolved = new Map<string, ReturnType<typeof resolvePalette>>()
function paletteOf(inputs: ColorInputs | Record<string, unknown> | null | undefined) {
  const raw = (inputs ?? {}) as Record<string, unknown>
  const roles = {darkGround: parseHexInput(raw.darkGround), lightGround: parseHexInput(raw.lightGround), accent: parseHexInput(raw.accent), action: parseHexInput(raw.action)}
  // The color details the gates read (monorepo `[R-641]`): the band in the button color moves what a color band is filled
  // with, so the walk asks its gates of the palette the page renders.
  const options = {headingInk: raw.headingInk, saturatedFrom: raw.saturatedFrom, accentOnDark: raw.accentOnDark, buttonOnDark: raw.buttonOnDark}
  const key = JSON.stringify([roles, options])
  let p = resolved.get(key)
  if (!p) {
    p = resolvePalette(roles, options)
    if (resolved.size >= 64) resolved.delete(resolved.keys().next().value!)
    resolved.set(key, p)
  }
  return p
}

/** The palette has room for the glow's light (`glowLightOf`, `[R-646]`): the Background theme's corner and centered glow. */
export function glowLightFillOk(inputs: ColorInputs | Record<string, unknown> | null | undefined): boolean {
  return paletteOf(inputs).glowLightOk
}

/** The room a theme's glow needs on this palette: the light's where the background positions it, else the glow's. */
export function glowGateOf(flow: Pick<FlowRules, 'on'> | null | undefined, inputs: ColorInputs | Record<string, unknown> | null | undefined): boolean {
  return flow?.on.glowShape ? glowLightFillOk(inputs) : glowFillOk(inputs)
}

/** The palette's dark ground has room for Gradient bloom's glow (`glowOf`, Phase 17D session 2, `[R-557]`): it lifts at
 *  least OKLab L 0.05 and ΔE2000 6 under every pair a glowing band draws. Nine presets and the placeholder do; the six
 *  whose dark ground is already as light as white text allows do not. */
export function glowFillOk(inputs: ColorInputs | Record<string, unknown> | null | undefined): boolean {
  return paletteOf(inputs).glowOk
}

export function saturatedFillOk(inputs: ColorInputs | Record<string, unknown> | null | undefined): boolean {
  const t = paletteOf(inputs).tokens
  return saturatedGate(fillOf(t), t['--color-brand-dark'], t['--color-background'])
}

/** What a color band is filled with: the button color where the engine re-pointed the fill at it (`saturatedFrom`,
 *  `[R-641]`), else the accent. */
function fillOf(t: Record<string, string>): string {
  return t['--color-accent-fill'] ?? t['--color-accent']
}

// ─── The close apart from the footer (Phase 18 session B, `[R-597]`, `[R-603]`) ──────────────────────
//
// Justin: "the final CTA should alwasy be a different color than the footer. Needs to be a rule". The close takes the
// first ground in its theme's order (`close`, then `closeElse`) that the site can draw (a photograph only where one is
// approved, the fill only where the palette passes its gate), that stands at least `CLOSE_APART_DE` from the footer as
// the site renders it (the ruling, always held), and that stands at least `CLOSE_ABOVE_DE` from the band above it (a
// preference: the light step under a light band melts into it, ΔE 2.0 on every preset). Where no ground meets both, the
// first that meets the footer; the light step over a dark footer and the dark ground over a light one always do.
//
// THE MEASURE IS WHAT IS DRAWN, on the resolved palette: the dark footer is the dark ground and the light one the tint
// (`footers/shared.tsx`). 20 is the gate the platform already uses for a fill to read as its own color. A photograph is
// the scrim (the dark ground capped at L 0.20) at 80% over a grey window: 0.7 to 18.4 from the dark ground across every
// grey on every preset, so it is apart from a light footer and never from a dark one; it is apart from any band above,
// since no flat band reads as a photograph. Every other value is one color token.

export type Close = (typeof CLOSES)[number]
export const CLOSE_APART_DE = 20
export const CLOSE_ABOVE_DE = 6

/** What the closing call to action is drawn beside: the footer's scheme as the site renders it, the visible ground of
 *  the band above it (the hero's where the canvas is empty), whether the site has an approved hero photograph, and the
 *  stored color roles. */
export type CloseFacts = {
  footer: ChromeScheme
  above: VisibleGround | null
  heroPhoto: boolean
  colors: ColorInputs | Record<string, unknown> | null | undefined
}

const GROUND_TOKEN: Partial<Record<VisibleGround | Close, string>> = {
  dark: '--color-brand-dark', light: '--color-background', tint: '--color-hero-tint', muted: '--color-muted',
  wash: '--color-wash', saturated: '--color-accent-fill', image: '--color-brand-dark',
}

/** The closing call to action's ground under a theme, beside the footer and the band above it. */
export function closeOf(flow: FlowRules | null | undefined, facts: CloseFacts): Close {
  const t = paletteOf(facts.colors).tokens
  const satOk = saturatedFillOk(facts.colors)
  const footerHex = facts.footer === 'dark' ? t['--color-brand-dark'] : t['--color-hero-tint']
  // The background's photograph first, where it asks for one (Photo scrims' own does), then the theme's grounds.
  const order: Close[] = [...(flow?.on.close === 'photo' ? ['photo' as const] : []), flow?.dark.close ?? 'muted', ...(flow?.dark.closeElse ?? [])]
  const drawable = order.filter((c) => (c !== 'photo' || facts.heroPhoto) && (c !== 'saturated' || satOk))
  // A ground's color as drawn; the color band's is its fill (`fillOf`).
  const hexOf = (token: string) => (token === '--color-accent-fill' ? fillOf(t) : t[token])
  const fromFooter = (c: Close) => (c === 'photo' ? facts.footer === 'light' : deltaE(hexOf(GROUND_TOKEN[c]!), footerHex) >= CLOSE_APART_DE)
  const aboveHex = facts.above ? hexOf(GROUND_TOKEN[facts.above] ?? '--color-background') : null
  // A dark close the theme lights does not melt into the dark run above it: its glow peaks in its own middle, as the
  // run's last band (the roster eye of 2026-10-03, `[R-631]`: the glow carries through to the close). Gradient bloom
  // alone, and only where the palette has room to glow; the ruling against the footer's color holds as always.
  const lit = (flow?.on.dark === 'glow' && glowGateOf(flow, facts.colors)) || (flow?.on.dark === 'gradient' && flow.on.ends)
  const fromAbove = (c: Close) => c === 'photo' || (c === 'dark' && lit) || !aboveHex || deltaE(hexOf(GROUND_TOKEN[c]!), aboveHex) >= CLOSE_ABOVE_DE
  return drawable.find((c) => fromFooter(c) && fromAbove(c)) ?? drawable.find(fromFooter) ?? (facts.footer === 'dark' ? 'muted' : 'dark')
}

// ─── The header and the footer (Phase 17B session 4, `[R-518]`, record §2.3) ───
//
// The shell draws the header and footer on every page, so their schemes are site-wide, like
// the carry. Read here, on the server, by `SiteShell` alone: the client `Header` receives the
// resolved strings, as it always has, and nothing in the header or footer imports this module
// (an ESLint rule holds it). A stored scheme wins, per field; the theme fills what is absent;
// the theme never yields a transparent value, so `heroMerge` with nothing stored gets the
// theme's solid bar fixed over the hero, and only a STORED transparent top is flipped to the
// hero's polarity downstream (`resolveMergedHeaderScheme`, unchanged).
//
// A dark header needs the logo made for dark grounds: without it `HeaderLogo` prints the firm's
// name as text (measured, ADV-17B4-A). Where the site has the light logo and not the dark one,
// the theme's dark header renders light and the switcher says why. A site with no logo prints
// the name on either ground, so nothing falls back.

type StoredHeader = {defaultScheme?: string | null; scrolledScheme?: string | null} | null | undefined
type StoredFooter = {footerScheme?: string | null} | null | undefined
export type SiteLogos = {onLight?: unknown; onDark?: unknown} | null | undefined

/** A logo the header can draw: one with an image. The query answers `{src: null, alt}` for a
 *  logo field holding alt text and no image (ADV-17B4-2), which is no logo. */
const drawable = (logo: unknown): boolean =>
  !!logo && (typeof logo !== 'object' || !!(logo as {src?: unknown}).src)

/** A logo for dark grounds that carries a white or colored box of its own, which no dark ground can take in (Phase 18
 *  session B, item 4: a black box is screened away, `logoBlend`). */
const boxedForDark = (logo: unknown): boolean => {
  const box = (logo as {facts?: {box?: string | null} | null} | null)?.facts?.box
  return box === 'white' || (typeof box === 'string' && box.startsWith('#'))
}

/** The theme's header can go dark on this site without losing its logo, or showing its logo's box. */
export function darkHeaderReady(logos: SiteLogos): boolean {
  return !(drawable(logos?.onLight) && (!drawable(logos?.onDark) || boxedForDark(logos?.onDark)))
}

/** The header's scheme at the top and when scrolled, and the footer's, as the site renders them. */
export function chromeSchemes(
  flow: Pick<FlowRules, 'chrome'>,
  header: StoredHeader,
  footer: StoredFooter,
  logos: SiteLogos,
): {top: string; scrolled: string; footer: ChromeScheme; darkLogoMissing: boolean} {
  const wantsDark = flow.chrome.header === 'dark'
  const themeHeader: ChromeScheme = wantsDark && !darkHeaderReady(logos) ? 'light' : flow.chrome.header
  const storedFooter = footer?.footerScheme
  return {
    top: header?.defaultScheme || themeHeader,
    scrolled: header?.scrolledScheme || themeHeader,
    footer: storedFooter === 'light' || storedFooter === 'dark' ? storedFooter : flow.chrome.footer,
    darkLogoMissing: wantsDark && !darkHeaderReady(logos),
  }
}

/** Every shape a theme may name, for the tests and the Studio. */
export const FLOW_DIVIDERS = DIVIDERS
