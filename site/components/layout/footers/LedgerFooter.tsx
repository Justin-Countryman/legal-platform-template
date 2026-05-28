// Layout: Ledger
// Minimal light layout for multi-office firms.
// Office columns with office name + fine rule + address.
// Contact column for phone + social.
// Action buttons isolated in their own column with a vertical divider.
// Inspired by Andy Weinstein — elevated with more generous spacing and small-caps treatment.

import Link from 'next/link'
import {SocialIcons, ActionButtons, OfficeHours, cityLine, officeLocationLabel} from './shared'
import type {FooterData, FooterLocation} from '../Footer'

type Props = {data: FooterData}

const HEADING = 'text-base font-semibold text-foreground mb-2'
const RULE = 'mt-2 mb-5 h-px w-8 bg-border'

export function LedgerFooter({data}: Props) {
  const {
    firmName, address, locations,
    ctaText, ctaUrl,
    privacyPolicyUrl, disclaimerUrl, cookiesUrl,
  } = data

  const officePhone = address?.officePhone
  const tollFreePhone = address?.tollFreePhone

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

  const hasActionButtons =
    (data.actionButton1Label && data.actionButton1Url) ||
    (data.actionButton2Label && data.actionButton2Url)

  const legalLinks = [
    ...(privacyPolicyUrl ? [{label: 'Privacy Policy', href: privacyPolicyUrl}] : []),
    ...(disclaimerUrl ? [{label: 'Legal Disclaimer', href: disclaimerUrl}] : []),
    ...(cookiesUrl ? [{label: 'Cookie Policy', href: cookiesUrl}] : []),
  ]

  const year = new Date().getFullYear()

  return (
    <footer aria-labelledby="footer-heading" className="bg-muted text-foreground px-[5%]">
      <h2 id="footer-heading" className="sr-only">Footer</h2>
      <div className="container">

        {/* ── Main columns ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-10 border-b border-border py-14 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(160px,1fr))]">

          {/* Office columns */}
          {locs.map((loc) => (
            <div key={loc._id}>
              <h3 className={HEADING}>
                {loc.city ? `${loc.city} Office` : 'Office Location'}
              </h3>
              <div className={RULE} />
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
                  className="mt-3 block text-sm text-foreground-muted transition-colors duration-ui-fast hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus"
                >
                  {loc.officePhone}
                </a>
              )}
              {loc.tollFreePhone && (
                <a
                  href={`tel:${loc.tollFreePhone.replace(/\D/g, '')}`}
                  className="mt-1 block text-sm text-foreground-muted transition-colors duration-ui-fast hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus"
                >
                  {loc.tollFreePhone}
                </a>
              )}
              {(loc.hours || loc.emergency24_7) && (
                <OfficeHours
                  hours={loc.hours}
                  emergency24_7={loc.emergency24_7}
                  className="mt-3"
                  rowClass="text-sm text-foreground-muted"
                  closedClass="opacity-40"
                />
              )}
              {loc.pageSlug && (
                <Link
                  href={`/${loc.pageSlug}/`}
                  className="mt-4 inline-block text-xs font-semibold underline underline-offset-2 text-foreground-muted transition-colors duration-ui-fast hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus"
                >
                  {officeLocationLabel(loc.city)}
                </Link>
              )}
            </div>
          ))}

          {/* Contact column */}
          <div>
            <h3 className={HEADING}>Contact Info</h3>
            <div className={RULE} />
            {officePhone && (
              <div className="text-sm text-foreground-muted">
                <span className="text-foreground-muted">Phone: </span>
                <a href={`tel:${officePhone.replace(/\D/g, '')}`} className="transition-colors duration-ui-fast hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus">
                  {officePhone}
                </a>
              </div>
            )}
            {tollFreePhone && (
              <div className="mt-1 text-sm text-foreground-muted">
                <span className="text-foreground-muted">Toll Free: </span>
                <a href={`tel:${tollFreePhone.replace(/\D/g, '')}`} className="transition-colors duration-ui-fast hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus">
                  {tollFreePhone}
                </a>
              </div>
            )}
            {ctaText && ctaUrl && (
              <Link href={ctaUrl} className="mt-4 inline-block text-sm underline underline-offset-2 transition-colors duration-ui-fast hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus">
                {ctaText}
              </Link>
            )}
            <SocialIcons data={data} className="mt-6 text-foreground-muted" hoverClass="hover:text-foreground" />
          </div>

          {/* Action column */}
          {hasActionButtons && (
            <div className="flex flex-col justify-center gap-3 lg:border-l lg:border-border lg:pl-10">
              <ActionButtons data={data} context="light" className="flex-col items-start" />
            </div>
          )}
        </div>

        {/* ── Bottom bar ────────────────────────────────────────────────────── */}
        <div className="py-6 text-center text-xs text-foreground-muted">
          <p>© {year} {firmName}. All rights reserved.</p>
          {legalLinks.length > 0 && (
            <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
              {legalLinks.map((l, i) => (
                <Link key={i} href={l.href} className="underline hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus">{l.label}</Link>
              ))}
            </div>
          )}
        </div>

      </div>
    </footer>
  )
}
