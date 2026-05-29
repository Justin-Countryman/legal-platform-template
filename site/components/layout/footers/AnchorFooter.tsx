// Layout: Anchor
// Brand block left (logo, address, contact, social, action buttons) + nav columns right.
// Solid, trustworthy — good default for single-location firms with nav-heavy footers.

import Image from 'next/image'
import Link from 'next/link'
import {MdLocationOn} from 'react-icons/md'
import {SocialIcons, ActionButtons, OfficeHours, cityLine, FooterNavRegion, FooterNavList, officeLocationLabel} from './shared'
import type {FooterData} from '../Footer'

type Props = {data: FooterData}

export function AnchorFooter({data}: Props) {
  const {
    firmName, logo, address, locations,
    column1, column2,
    privacyPolicyUrl, disclaimerUrl, cookiesUrl,
  } = data

  const officePhone = address?.officePhone
  const tollFreePhone = address?.tollFreePhone
  const officeLocation = locations?.[0]
  const officePageSlug = officeLocation?.pageSlug
  const officeCityName = officeLocation?.city ?? address?.city
  const col1 = (column1 ?? []).filter((l): l is typeof l & {href: string} => !!l.href)
  const col2 = (column2 ?? []).filter((l): l is typeof l & {href: string} => !!l.href)
  const hasNav = col1.length > 0 || col2.length > 0

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

        {/* ── Main grid ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-10 py-14 lg:grid-cols-[2fr_1.5fr_1.5fr] lg:gap-12">

          {/* Col 1: brand */}
          <div>
            {logo?.src ? (
              <Link href="/" className="mb-6 inline-block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus" aria-label={firmName ?? 'Home'}>
                <Image
                  src={logo.src}
                  alt={logo.alt ?? firmName ?? ''}
                  width={logo.width}
                  height={logo.height}
                  className="h-16 w-auto"
                />
              </Link>
            ) : firmName ? (
              <p className="mb-6 font-heading text-2xl font-bold text-foreground">{firmName}</p>
            ) : null}

            {address && (
              <div>
                <h3 className="text-base font-semibold mb-2 text-foreground-muted">Office</h3>
                {address.address1 && <p className="text-sm">{address.address1}</p>}
                {address.address2 && <p className="text-sm">{address.address2}</p>}
                {address.address3 && <p className="text-sm">{address.address3}</p>}
                {(address.city || address.state || address.zip) && (
                  <p className="text-sm">{cityLine(address.city, address.state, address.zip)}</p>
                )}
                {officePageSlug && (
                  <Link
                    href={`/${officePageSlug}/`}
                    className="mt-3 inline-flex items-center gap-1 text-sm text-foreground underline underline-offset-2 transition-colors duration-ui-fast hover:text-action-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus"
                  >
                    <MdLocationOn className="shrink-0" aria-hidden="true" />
                    {officeLocationLabel(officeCityName)}
                  </Link>
                )}
              </div>
            )}

            <SocialIcons data={data} className="mt-8 text-foreground-muted" />
            <ActionButtons data={data} context="dark" className="mt-6 text-foreground-muted" />
          </div>

          {/* Col 2: contact + hours */}
          <div>
            {(officePhone || tollFreePhone) && (
              <div>
                <h3 className="text-base font-semibold mb-2 text-foreground-muted">Contact</h3>
                {officePhone && (
                  <a href={`tel:${officePhone.replace(/\D/g, '')}`} className="block text-sm transition-colors duration-ui-fast hover:text-action-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus">
                    {officePhone}
                  </a>
                )}
                {tollFreePhone && (
                  <a href={`tel:${tollFreePhone.replace(/\D/g, '')}`} className="block text-sm transition-colors duration-ui-fast hover:text-action-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus">
                    {tollFreePhone}
                  </a>
                )}
              </div>
            )}

            {(address?.hours || address?.emergency24_7) && (
              <div className="mt-8">
                <h3 className="text-base font-semibold mb-2 text-foreground-muted">Office Hours</h3>
                <OfficeHours
                  hours={address.hours}
                  emergency24_7={address.emergency24_7}
                  rowClass="text-sm text-foreground-muted"
                  closedRowClass="text-sm text-foreground-subtle"
                />
              </div>
            )}
          </div>

          {/* Col 3: nav links — see shared.tsx footer-nav contract */}
          {hasNav && (
            <FooterNavRegion>
              <div className="grid grid-cols-2 items-start gap-8">
                <FooterNavList label="Practice areas" links={col1} />
                <FooterNavList label="Site navigation" links={col2} />
              </div>
            </FooterNavRegion>
          )}
        </div>

        {/* ── Bottom bar ────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 border-t border-border py-6 text-xs text-foreground-subtle md:flex-row md:items-center md:justify-between">
          <p>© {year} {firmName}. All rights reserved.</p>
          {legalLinks.length > 0 && (
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {legalLinks.map((l, i) => (
                <Link key={i} href={l.href} className="underline transition-colors duration-ui-fast hover:text-action-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus">{l.label}</Link>
              ))}
            </div>
          )}
        </div>

      </div>
    </footer>
  )
}
