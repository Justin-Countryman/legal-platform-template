// Layout: Meridian
// Dark 3-column: logo | office address | phone + social
// Action buttons sit in the bottom bar alongside legal links.
// Inspired by Haft Law Group — elevated with column dividers + large phone treatment.

import Image from 'next/image'
import Link from 'next/link'
import {MdLocationOn} from 'react-icons/md'
import {SocialIcons, ActionButtons, OfficeHours, EmergencyContact, AppointmentNote, cityLine, officeLocationLabel} from './shared'
import {formatPhone} from '@/lib/tokens'
import type {FooterData} from '../Footer'

type Props = {data: FooterData}

export function MeridianFooter({data}: Props) {
  const {
    firmName, logo, address, locations,
    privacyPolicyUrl, disclaimerUrl, cookiesUrl,
  } = data

  const officePhone = address?.officePhone
  const tollFreePhone = address?.tollFreePhone

  // Use first location's pageSlug for office page link; fall back to primary address city
  const officeLocation = locations?.[0]
  const officePageSlug = officeLocation?.pageSlug
  const officeCityName = officeLocation?.city ?? address?.city

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

        {/* ── Main 3-col grid ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-10 py-14 lg:grid-cols-3 lg:gap-0 lg:divide-x lg:divide-border">

          {/* Col 1 — Logo */}
          <div className="lg:pr-12">
            {logo?.src ? (
              <Link href="/" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus">
                <Image
                  src={logo.src}
                  alt={logo.alt ?? ''}
                  width={logo.width}
                  height={logo.height}
                  className="h-24 w-auto object-contain"
                />
              </Link>
            ) : firmName ? (
              <Link href="/" className="font-heading text-2xl font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus">
                {firmName}
              </Link>
            ) : null}
            <SocialIcons data={data} className="mt-6 text-foreground-muted" />
          </div>

          {/* Col 2 — Office Address */}
          <div className="lg:px-12">
            <h3 className="text-base font-semibold mb-2 text-foreground-muted">Office Address</h3>
            {address?.address1 && <p className="text-sm">{address.address1}</p>}
            {address?.address2 && <p className="text-sm">{address.address2}</p>}
            {address?.address3 && <p className="text-sm">{address.address3}</p>}
            {(address?.city || address?.state || address?.zip) && (
              <p className="text-sm">{cityLine(address.city, address.state, address.zip)}</p>
            )}
            {officePageSlug && (
              <Link
                href={`/${officePageSlug}/`}
                className="mt-4 inline-flex items-center gap-1 text-sm text-foreground underline underline-offset-2 transition-colors duration-ui-fast hover:text-action-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus"
              >
                <MdLocationOn className="shrink-0" />
                {officeLocationLabel(officeCityName)}
              </Link>
            )}
            <AppointmentNote appointmentRequired={address?.appointmentRequired} className="mt-2 text-sm text-foreground-muted" />
          </div>

          {/* Col 3 — Phone + Social */}
          <div className="lg:pl-12">
            <h3 className="text-base font-semibold mb-2 text-foreground-muted">Phone Number</h3>
            {officePhone && (
              <a
                href={`tel:${officePhone.replace(/\D/g, '')}`}
                className="block text-3xl font-light tracking-tight text-foreground transition-colors duration-ui-fast hover:text-action-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus"
              >
                {formatPhone(officePhone)}
              </a>
            )}
            {tollFreePhone && (
              <a
                href={`tel:${tollFreePhone.replace(/\D/g, '')}`}
                className="mt-2 block text-xl font-light text-foreground-muted transition-colors duration-ui-fast hover:text-action-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus"
              >
                {formatPhone(tollFreePhone)}
              </a>
            )}
            <EmergencyContact
              emergency24_7={address?.emergency24_7}
              emergencyPhone={address?.emergencyPhone}
              className="mt-4"
              labelClass="text-sm font-semibold text-foreground-muted"
              phoneClass="text-base text-foreground"
            />
            {address?.hours && (
              <div className="mt-6">
                <h3 className="text-base font-semibold mb-2 text-foreground-muted">Office Hours</h3>
                <OfficeHours
                  hours={address.hours}
                  rowClass="text-sm text-foreground-muted"
                  closedRowClass="text-sm text-foreground-subtle"
                />
              </div>
            )}
          </div>
        </div>

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
          <ActionButtons data={data} context="dark" className="shrink-0 text-foreground-muted" />
        </div>

      </div>
    </footer>
  )
}
