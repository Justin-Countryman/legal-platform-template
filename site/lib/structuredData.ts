// Pieces of the firm's and its offices' structured data that more than one route builds (monorepo backlog 517).
// Sources read 2026-10-16: schema.org's dayOfWeek expects a DayOfWeek; Google's LocalBusiness guidance lists
// https://schema.org/Monday and the like, and its PostalAddress example carries the suite in streetAddress.

type Hours = Record<string, string | null | undefined>

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const

/** One OpeningHoursSpecification per open day with both times, its day a schema.org DayOfWeek; undefined for none. */
export function openingHoursSpecification(hours: Hours | null | undefined) {
  if (!hours) return undefined
  const specs = DAYS.flatMap((day) => {
    const key = day.toLowerCase()
    const open = hours[`${key}Open`]
    const close = hours[`${key}Close`]
    if (hours[`${key}Status`] !== 'Open' || !open || !close) return []
    return [{'@type': 'OpeningHoursSpecification', dayOfWeek: `https://schema.org/${day}`, opens: open, closes: close}]
  })
  return specs.length > 0 ? specs : undefined
}

/** The street address with its suite (address1 and address2), for PostalAddress. address3 is the building's name
 * (Studio's help text), which the footer prints and an address matched against the firm's Business Profile does not
 * carry (ADV-517). */
export function streetAddress(loc: {address1?: string | null; address2?: string | null}): string {
  return [loc.address1, loc.address2].map((l) => (l ?? '').trim()).filter(Boolean).join(', ')
}
