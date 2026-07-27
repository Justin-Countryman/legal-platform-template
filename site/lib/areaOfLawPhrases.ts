// The twenty-five area-of-law title phrases — the SITE's mirror of doctrine.
//
// **Doctrine is the source of truth.** The table under TITLE-4 in
// `BI/BI-Content.md` (platform repo) is where these are edited. This file and
// `BE/_shared/area_of_law_phrases.py` are mirrors, and they exist because a
// client site cannot read the BI documents.
//
// Ruled by Justin, 2026-07-26: doctrine is the source, code mirrors it, and a
// check fails when they disagree. The detector is
// `BE/_shared/__tests__/test_area_of_law_phrases_agreement.py`. It parses the
// markdown table, the Python dict AND this object, and compares all three in
// every direction — no token, no network.
//
// SO: TO CHANGE A PHRASE, EDIT ALL THREE TOGETHER. Any one alone turns the
// platform suite red, on purpose. There is no generation step, so there is
// nothing to forget to regenerate.
//
// Why stored rather than derived: deriving breaks on real terms. `Tax Law` plus
// a legal term gives `Tax Law Attorney`, and people search `Tax Attorney`.
// Several phrases ARE the area name plus a term (`Bankruptcy Attorney`) — the
// ruling is not that derivation always fails, only that it fails often enough
// that the exception list would become the real artifact.
//
// The keys are the canonical areas of law from `BI-URL-Architecture.md` →
// Canonical Taxonomy, name for name.

export const AREA_OF_LAW_PHRASES: Record<string, string> = {
  'Bankruptcy': 'Bankruptcy Attorney',
  'Business Law': 'Business Attorney',
  'Civil Litigation': 'Civil Litigation Attorney',
  'Civil Rights': 'Civil Rights Attorney',
  'Construction Law': 'Construction Law Attorney',
  'Consumer Protection': 'Consumer Protection Attorney',
  'Criminal Defense': 'Criminal Defense Attorney',
  'Education Law': 'Education Law Attorney',
  'Elder Law': 'Elder Law Attorney',
  'Employment Law': 'Employment Attorney',
  'Estate Planning': 'Estate Planning Attorney',
  'Family Law': 'Family Law Attorney',
  'Government and Administrative Law': 'Administrative Law Attorney',
  'Health Care Law': 'Health Care Attorney',
  'Immigration Law': 'Immigration Lawyer',
  'Insurance Law': 'Insurance Attorney',
  'Juvenile Law': 'Juvenile Law Attorney',
  'Medical Malpractice': 'Medical Malpractice Lawyer',
  'Military and Veterans Law': 'Veterans Attorney',
  'Personal Injury': 'Personal Injury Lawyer',
  'Real Estate Law': 'Real Estate Attorney',
  'Social Security Disability': 'Disability Lawyer',
  'Tax Law': 'Tax Attorney',
  'Traffic Violations': 'Traffic Ticket Lawyer',
  "Workers' Compensation": "Workers' Comp Lawyer",
}

/**
 * The stored phrase for an area of law, or empty when it is not one of the
 * table.
 *
 * Returns empty rather than guessing, and that case is ordinary rather than
 * exceptional: a real client carries page names the canonical taxonomy does not
 * have. Of Dudley's fourteen top-level practice areas, seven map and seven do
 * not — including `Workers Compensation`, which misses `Workers' Compensation`
 * by an apostrophe. Inventing `<name> Attorney` for those is the exact
 * derivation the ruling rejected, so a caller that gets nothing back must fall
 * back to the page's own name.
 */
export function phraseForAreaOfLaw(areaOfLaw: string | null | undefined): string {
  return AREA_OF_LAW_PHRASES[(areaOfLaw ?? '').trim()] ?? ''
}
