// ─── An attorney's email address: public in the data, whatever the page shows ─────────────────────────────────
//
// A firm's production dataset is public: anyone can read any published field with an anonymous query. The
// attorney page draws the mailto link only when Display Email Publicly is on, but the address itself is in the
// data either way, so a hidden page is not a hidden address (monorepo backlog 463). The build writes the address
// only when the firm said it is public; this is the Studio's half, a warning on an address saved with the switch
// off. A warning and never an error, because no validation may block Publish (`[R-162]`).

export const HIDDEN_EMAIL_WARNING =
  'Display Email Publicly is off, but anyone can still read this address through the site\'s public data. ' +
  'Leave Email Address empty unless the firm wants it public.'

/** The Studio's answer for an attorney's Email Address: true, or the warning when the address would be hidden. */
export function hiddenEmailWarning(email: unknown, showEmail: unknown): true | string {
  if (typeof email !== 'string' || email.trim() === '') return true
  return showEmail === true ? true : HIDDEN_EMAIL_WARNING
}
