// The operator's Google Analytics ids, found in the scripts the root layout runs, and
// the one line that switches each off before those scripts load, so a preview visit is
// not counted as the firm's traffic (Phase 17A, monorepo WS-V1-PHASE17A-DESIGN §2.5).
// Web Vitals reports through gtag, so it goes quiet too. Tag Manager containers and
// other vendors (call tracking, chat, pixels) cannot be switched off this way, and the
// design record says so rather than pretending otherwise.
export function analyticsOff(scripts: unknown): string {
  const ids = typeof scripts === 'string' ? [...new Set(scripts.match(/\bG-[A-Z0-9]{4,}\b/g) ?? [])] : []
  return ids.map((id) => `window['ga-disable-${id}']=true;`).join('')
}
