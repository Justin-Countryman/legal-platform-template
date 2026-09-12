/**
 * The singleton documents, and the one id each of them lives under.
 *
 * ONE LIST, THREE READERS. `structure.ts` opens every singleton pane by this
 * id, `sanity.config.ts` derives `PROTECTED_TYPES` (no Delete) and the
 * "Create new" filter from it, and `scripts/extract-field-map.ts` writes it
 * into `field-map.json` so the platform repo can assert that the ids the
 * build writes (`page_creation._INDEX_SINGLETONS`, `sanity_singletons.
 * CREATE_ONLY_SINGLETONS`) are the ids the Studio opens.
 *
 * WHY THE IDS ARE HERE AND NOT IN structure.ts. Until 2026-09-11 the desk
 * pinned `eventIndex` and `videoIndex` while the build wrote
 * `eventIndex-events` and `videoIndex-videos` (Site Build writes page
 * documents as `<type>-<slug>`), and it listed `attorneyIndex`, `staffIndex`
 * and `blogIndex` as document-type lists, whose "Create new" button makes a
 * second document of the type. The site reads every index page as
 * `*[_type == "X"][0]`, so a second document is a coin toss, and `homePage`
 * had already been found once (see the note on the Homepage pane in
 * structure.ts). Monorepo `BI/_workstreams/WS-V1-PHASE5-DESIGN.md` §4 and
 * §9 items 30; plan Phase 5 "index singletons".
 *
 * `aboutPage` is deliberately NOT here: it is bare-id by convention but an
 * editor may legitimately have none (`BI-SANITY.md`, canonical singleton
 * list), so it keeps its type list and stays deletable.
 */

/** Settings singletons: the document id IS the type name. */
export const SETTINGS_SINGLETON_IDS = {
  siteSettings: 'siteSettings',
  designSettings: 'designSettings',
  mainNavigation: 'mainNavigation',
  footerSettings: 'footerSettings',
  heroSettings: 'heroSettings',
  globalCta: 'globalCta',
} as const

/** Index-page singletons: `<type>-<slug>`, the id Site Build writes. */
export const INDEX_SINGLETON_IDS = {
  homePage: 'homePage-home',
  blogIndex: 'blogIndex-blog',
  attorneyIndex: 'attorneyIndex-attorneys',
  staffIndex: 'staffIndex-staff',
  eventIndex: 'eventIndex-events',
  videoIndex: 'videoIndex-videos',
} as const

export const SINGLETON_IDS: Readonly<Record<string, string>> = {
  ...SETTINGS_SINGLETON_IDS,
  ...INDEX_SINGLETON_IDS,
}

/** Every singleton type, in a stable order. */
export const SINGLETON_TYPES: readonly string[] = Object.keys(SINGLETON_IDS)

export function singletonId(type: keyof typeof SINGLETON_IDS | string): string {
  const id = SINGLETON_IDS[type]
  if (!id) throw new Error(`${type} is not a singleton (see studio/singletons.ts)`)
  return id
}
