// The operator's Google Analytics ids, found in the scripts the root layout runs, and
// the one line that switches each off before those scripts load, so a preview visit is
// not counted as the firm's traffic (Phase 17A, monorepo WS-V1-PHASE17A-DESIGN §2.5).
// Web Vitals reports through gtag, so it goes quiet too. Tag Manager containers and
// other vendors (call tracking, chat, pixels) cannot be switched off this way, and the
// design record says so rather than pretending otherwise.
//
// Since monorepo [R-785] this returns the ids, which the preview layout puts in `data-ga-off` on one fixed script
// (lib/inlineScripts.ts PREVIEW_OFF_JS) that the Content Security Policy names by hash; a script written per firm could
// not be.
export function analyticsOff(scripts: unknown): string[] {
  return typeof scripts === 'string' ? [...new Set(scripts.match(/\bG-[A-Z0-9]{4,}\b/g) ?? [])] : []
}
