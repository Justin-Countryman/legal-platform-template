// The homepage composer's six roles (monorepo `BE/_shared/homepage_member_table.py`,
// Phase 12): the stable member key, the type and the layout each writes. Held here so
// `flows.test.ts` can prove every role maps to a host; the monorepo's own test holds
// the table to its schema. Copied by hand from the table; a role added there is added
// here in the same change.
export const ROWS_BY_ROLE: Record<string, {key: string; type: string; layout: string | null}> = {
  differentiators: {key: 'hp-differentiatorBlock', type: 'contentSectionInline', layout: 'twoColumnText'},
  caseResults: {key: 'hp-caseResultsBlock', type: 'caseResultsSectionInline', layout: null},
  areasOfLaw: {key: 'hp-siloNavBlock', type: 'practiceAreaNavInline', layout: 'tile'},
  narrative: {key: 'hp-narrativeBlock', type: 'contentSectionInline', layout: 'twoColumnText'},
  attorneys: {key: 'hp-attorneyHighlightBlock', type: 'attorneySectionInline', layout: 'grid'},
  badges: {key: 'hp-badgesBlock', type: 'badgesSectionInline', layout: 'centeredGrid'},
}
