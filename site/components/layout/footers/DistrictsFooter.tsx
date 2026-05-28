// Layout: Districts
// Multi-office column grid on dark background.
// Each location: city name + decorative rule, address, phone, office page link.
// Falls back to primary address when no locations array is populated.
// Social + action buttons in bottom bar.
// Inspired by Reitan Law Office — refined with cleaner typography and spacing.

import Link from 'next/link'
import {Button} from '@/components/ui/Button'
import {SocialIcons, ActionButtons, OfficeHours, cityLine, officeLocationLabel} from './shared'
import type {FooterData, FooterLocation} from '../Footer'

type Props = {data: FooterData}

export function DistrictsFooter({data}: Props) {
  const {
    firmName, address, locations,
    privacyPolicyUrl, disclaimerUrl, cookiesUrl,
  } = data

  // Fall back to primary address as a single location
  const primaryAsLocation: FooterLocation | null = address
    ? {
        _id: 'primary',
        city: address.city,
        address1: address.address1,
        address2: address.address2,
        address3: address.address3,
        state: address.state,
        zip: address.zip,
        officePhone: address.officePhone,
        tollFreePhone: address.tollFreePhone,
        pageSlug: null,
      }
    : null

  const locs: FooterLocation[] =
    locations?.length ? locations : primaryAsLocation ? [primaryAsLocation] : []

  const colClass =
    locs.length <= 1
      ? ''
      : locs.length === 2
      ? 'sm:grid-cols-2'
      : locs.length === 3
      ? 'sm:grid-cols-3'
      : 'sm:grid-cols-2 xl:grid-cols-4'

  const legalLinks = [
    ...(privacyPolicyUrl ? [{label: 'Privacy Policy', href: privacyPolicyUrl}] : []),
    ...(disclaimerUrl ? [{label: 'Legal Disclaimer', href: disclaimerUrl}] : []),
    ...(cookiesUrl ? [{label: 'Cookie Policy', href: cookiesUrl}] : []),
  ]

  const year = new Date().getFullYear()

  return (
    <footer data-ring-context="dark" aria-labelledby="footer-heading" className="bg-brand-dark text-foreground-muted px-[5%]">
      <h2 id="footer-heading" className="sr-only">Footer</h2>
      <div className="container">

        {/* ── Location grid ─────────────────────────────────────────────────── */}
        <ul role="list" aria-label="Office locations" className={`grid grid-cols-1 gap-10 py-14 md:py-16 ${colClass}`}>
          {locs.map((loc) => (
            <li key={loc._id} className="flex flex-col">
              {loc.city && (
                <>
                  <h3 className="text-base font-semibold mb-2 text-foreground-muted">
                    {loc.city}
                  </h3>
                  <div className="mt-2 mb-6 h-px w-8 bg-border" aria-hidden="true" />
                </>
              )}

              <address className="not-italic text-sm leading-relaxed text-foreground-muted">
                {loc.address1 && <p>{loc.address1}</p>}
                {loc.address2 && <p>{loc.address2}</p>}
                {loc.address3 && <p>{loc.address3}</p>}
                {(loc.city || loc.state || loc.zip) && (
                  <p>{cityLine(loc.city, loc.state, loc.zip)}</p>
                )}
              </address>

              {loc.officePhone && (
                <a
                  href={`tel:${loc.officePhone.replace(/\D/g, '')}`}
                  className="mt-3 text-sm text-foreground transition-colors duration-ui-fast hover:text-action-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus"
                >
                  {loc.officePhone}
                </a>
              )}
              {loc.tollFreePhone && (
                <a
                  href={`tel:${loc.tollFreePhone.replace(/\D/g, '')}`}
                  className="mt-1 text-sm text-foreground-subtle transition-colors duration-ui-fast hover:text-action-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus"
                >
                  {loc.tollFreePhone}
                </a>
              )}

              {(loc.hours || loc.emergency24_7) && (
                <OfficeHours
                  hours={loc.hours}
                  emergency24_7={loc.emergency24_7}
                  className="mt-4"
                  rowClass="text-sm text-foreground-muted"
                  closedRowClass="text-sm text-foreground-subtle"
                />
              )}
              {loc.pageSlug && (
                <Button
                  variant="secondary"
                  context="dark"
                  size="small"
                  href={`/${loc.pageSlug}/`}
                  className="mt-5 self-start"
                >
                  {officeLocationLabel(loc.city)}
                </Button>
              )}
            </li>
          ))}
        </ul>

        {/* ── Bottom bar ────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 border-t border-border py-6 text-xs text-foreground-subtle md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1.5">
            <p>© {year} {firmName}. All rights reserved.</p>
            {legalLinks.length > 0 && (
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {legalLinks.map((l, i) => (
                  <Link key={i} href={l.href} className="underline transition-colors duration-ui-fast hover:text-action-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus">{l.label}</Link>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <SocialIcons data={data} />
            <ActionButtons data={data} context="dark" />
          </div>
        </div>

      </div>
    </footer>
  )
}
