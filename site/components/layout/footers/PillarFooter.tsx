// Layout: Pillar
// Two full-height dark panels side by side — no container constraint.
// Left panel (deeper black): logo, address, phone, action buttons.
// Right panel (gray-900): nav columns, social.
// Creates depth through contrast without color.

import Image from 'next/image'
import Link from 'next/link'
import {MdLocationOn} from 'react-icons/md'
import {SocialIcons, ActionButtons, OfficeHours, EmergencyContact, AppointmentNote, cityLine, FooterNavRegion, FooterNavList, officeLocationLabel} from './shared'
import {formatPhone} from '@/lib/tokens'
import type {FooterData} from '../Footer'

type Props = {data: FooterData}

export function PillarFooter({data}: Props) {
  const {
    firmName, logo, address, locations,
    column1, column2,
    privacyPolicyUrl, disclaimerUrl, cookiesUrl,
  } = data

  const officePhone = address?.officePhone
  const tollFreePhone = address?.tollFreePhone
  const col1 = (column1 ?? []).filter((l): l is typeof l & {href: string} => !!l.href)
  const col2 = (column2 ?? []).filter((l): l is typeof l & {href: string} => !!l.href)

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
    <footer data-ring-context="dark" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">Footer</h2>

      {/* ── Split panels ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[5fr_7fr]">

        {/* Left — brand + contact */}
        <div className="relative bg-brand-dark px-[5%] py-14 text-foreground-muted lg:px-14">
          {/* Vertical divider */}
          <div className="absolute inset-y-0 right-0 hidden w-px bg-border lg:block" aria-hidden="true" />

          {logo?.src ? (
            <Link href="/" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus">
              <Image src={logo.src} alt={logo.alt ?? ''} width={logo.width} height={logo.height} className="h-24 w-auto" />
            </Link>
          ) : firmName ? (
            <p className="font-heading text-xl font-bold text-foreground">{firmName}</p>
          ) : null}

          <div className="mt-4 h-px w-10 bg-border" aria-hidden="true" />

          {address && (
            <address className="mt-8 not-italic text-sm leading-relaxed text-foreground-muted">
              {address.address1 && <p>{address.address1}</p>}
              {address.address2 && <p>{address.address2}</p>}
              {address.address3 && <p>{address.address3}</p>}
              {(address.city || address.state || address.zip) && (
                <p>{cityLine(address.city, address.state, address.zip)}</p>
              )}
            </address>
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
          <AppointmentNote appointmentRequired={address?.appointmentRequired} className="mt-2 text-sm text-foreground-muted" />

          {(officePhone || tollFreePhone) && (
            <div className="mt-8 space-y-1">
              {officePhone && (
                <a
                  href={`tel:${officePhone.replace(/\D/g, '')}`}
                  className="block text-3xl font-light text-foreground transition-colors duration-ui-fast hover:text-action-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus"
                >
                  {formatPhone(officePhone)}
                </a>
              )}
              {tollFreePhone && (
                <a
                  href={`tel:${tollFreePhone.replace(/\D/g, '')}`}
                  className="block text-sm text-foreground-subtle transition-colors duration-ui-fast hover:text-action-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus"
                >
                  {formatPhone(tollFreePhone)}
                </a>
              )}
              <EmergencyContact
                emergency24_7={address?.emergency24_7}
                emergencyPhone={address?.emergencyPhone}
                className="pt-2"
                labelClass="text-sm font-semibold text-foreground-muted"
                phoneClass="text-sm text-foreground"
              />
            </div>
          )}

          {address?.hours && (
            <div className="mt-8">
              <h3 className="text-base font-semibold mb-2 text-foreground-muted">Office Hours</h3>
              <OfficeHours
                hours={address.hours}
                rowClass="text-sm text-foreground-muted"
                closedRowClass="text-sm text-foreground-subtle"
              />
            </div>
          )}

          <ActionButtons data={data} context="dark" className="mt-10 text-foreground-subtle" />
        </div>

        {/* Right — nav + social */}
        <div className="bg-brand-dark px-[5%] py-14 text-foreground-muted lg:px-14">
          {firmName && (
            <p className="tagline mb-10">
              {firmName}
            </p>
          )}

          {/* Nav columns — see shared.tsx footer-nav contract */}
          <FooterNavRegion className="flex gap-16">
            <FooterNavList label="Practice areas" links={col1} />
            <FooterNavList label="Site navigation" links={col2} />
          </FooterNavRegion>

          <SocialIcons data={data} className="mt-10 text-foreground-subtle" />
        </div>
      </div>

      {/* ── Bottom bar ────────────────────────────────────────────────────── */}
      <div className="bg-brand-dark px-[5%]">
        <div className="container flex flex-col gap-3 py-5 text-xs text-foreground-subtle md:flex-row md:items-center md:justify-between">
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
