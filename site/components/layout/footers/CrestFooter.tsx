// Layout: Crest
// Centered logo/firm name header with a fine decorative rule.
// 3-column content below: address + social | nav links | phone + action buttons.
// Clean, symmetrical, editorial — suits firms that want the logo to anchor the footer.

import Image from 'next/image'
import Link from 'next/link'
import {MdLocationOn} from 'react-icons/md'
import {SocialIcons, ActionButtons, OfficeHours, EmergencyContact, AppointmentNote, cityLine, FooterNavRegion, FooterNavList, officeLocationLabel} from './shared'
import {formatPhone} from '@/lib/tokens'
import type {FooterData} from '../Footer'

type Props = {data: FooterData}

export function CrestFooter({data}: Props) {
  const {
    firmName, logo, address, locations, ctaText, ctaUrl,
    column1, column2,
    privacyPolicyUrl, disclaimerUrl, cookiesUrl,
  } = data

  const officePhone = address?.officePhone
  const tollFreePhone = address?.tollFreePhone
  const col1 = (column1 ?? []).filter((l): l is typeof l & {href: string} => !!l.href)
  const col2 = (column2 ?? []).filter((l): l is typeof l & {href: string} => !!l.href)
  const hasNav = col1.length > 0 || col2.length > 0
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

      {/* ── Crest header — centered ──────────────────────────────────────── */}
      <div className="border-b border-border py-10 text-center">
        {logo?.src ? (
          <Link href="/" className="inline-block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus" aria-label={firmName ?? 'Home'}>
            <Image
              src={logo.src}
              alt={logo.alt ?? firmName ?? ''}
              width={logo.width}
              height={logo.height}
              className="mx-auto h-16 w-auto"
            />
          </Link>
        ) : firmName ? (
          <Link href="/" className="font-heading text-2xl font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus">
            {firmName}
          </Link>
        ) : null}
        <div className="mx-auto mt-6 h-px w-12 bg-border" aria-hidden="true" />
      </div>

      {/* ── 3-col content ─────────────────────────────────────────────────── */}
      <div className="container grid grid-cols-1 gap-10 py-14 lg:grid-cols-3 lg:gap-8">

        {/* Col 1 — Address + social */}
        <div>
          <h3 className="text-base font-semibold mb-2 text-foreground-muted">Our Office</h3>
          {address?.address1 && <p className="text-sm">{address.address1}</p>}
          {address?.address2 && <p className="text-sm">{address.address2}</p>}
          {address?.address3 && <p className="text-sm">{address.address3}</p>}
          {(address?.city || address?.state || address?.zip) && (
            <p className="text-sm">{cityLine(address?.city, address?.state, address?.zip)}</p>
          )}
          {officePageSlug && (
            <Link
              href={`/${officePageSlug}/`}
              className="mt-3 flex w-fit items-center gap-1 text-sm text-foreground underline underline-offset-2 transition-colors duration-ui-fast hover:text-action-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus"
            >
              <MdLocationOn className="shrink-0" aria-hidden="true" />
              {officeLocationLabel(officeCityName)}
            </Link>
          )}
          <AppointmentNote appointmentRequired={address?.appointmentRequired} className="mt-2 text-sm text-foreground-muted" />
          {ctaText && ctaUrl && (
            <Link href={ctaUrl} className="mt-4 inline-block text-sm underline underline-offset-2 transition-colors duration-ui-fast hover:text-action-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus">
              {ctaText}
            </Link>
          )}
          <ActionButtons data={data} context="dark" className="mt-8 text-foreground-muted" />
        </div>

        {/* Col 2 — Phone + hours + social */}
        <div>
          <h3 className="text-base font-semibold mb-2 text-foreground-muted">Contact</h3>
          {officePhone && (
            <a
              href={`tel:${officePhone.replace(/\D/g, '')}`}
              className="block text-xl font-light text-foreground transition-colors duration-ui-fast hover:text-action-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus"
            >
              {formatPhone(officePhone)}
            </a>
          )}
          {tollFreePhone && (
            <a
              href={`tel:${tollFreePhone.replace(/\D/g, '')}`}
              className="mt-1 block text-sm text-foreground-muted transition-colors duration-ui-fast hover:text-action-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus"
            >
              {formatPhone(tollFreePhone)}
            </a>
          )}
          <EmergencyContact
            emergency24_7={address?.emergency24_7}
            emergencyPhone={address?.emergencyPhone}
            className="mt-3"
            labelClass="text-sm font-semibold text-foreground-muted"
            phoneClass="text-sm text-foreground"
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
          <SocialIcons data={data} className="mt-8 text-foreground-subtle" />
        </div>

        {/* Col 3 — Nav columns. Pre-fix this section merged column1+column2
            into a single array then split in half for display, which
            destroyed the operator's semantic distinction between
            practice-area links and core site nav. Now each column renders
            as its own labeled list, matching AnchorFooter + PillarFooter
            (canonical contract documented in footers/shared.tsx). */}
        {hasNav && (
          <FooterNavRegion>
            <h3 className="text-base font-semibold mb-2 text-foreground-muted">Quick Links</h3>
            <div className="grid grid-cols-[auto_auto] justify-start gap-x-8">
              <FooterNavList
                label="Practice areas"
                links={col1}
                liClassName="py-1"
                linkClassName="text-sm transition-colors duration-ui-fast hover:text-action-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus"
              />
              <FooterNavList
                label="Site navigation"
                links={col2}
                liClassName="py-1"
                linkClassName="text-sm transition-colors duration-ui-fast hover:text-action-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus"
              />
            </div>
          </FooterNavRegion>
        )}
      </div>

      {/* ── Bottom bar ────────────────────────────────────────────────────── */}
      <div className="border-t border-border">
        <div className="container py-6 text-center text-xs text-foreground-subtle">
          <p>© {year} {firmName}. All rights reserved.</p>
          {legalLinks.length > 0 && (
            <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
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
