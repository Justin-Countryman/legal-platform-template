// Layout: Districts — flagship multi-location footer.
// Premium structure shared with Ledger (which wears a minimal personality):
//   Brand + CTA band → location cards → nav/sitemap → bottom bar.
// Each location is a bordered card (equal height; office-link pinned to the
// bottom) showing the essentials — full office hours live on the location page,
// not here. Dark or light via footerSettings.footerScheme.
// Falls back to the primary address when no locations array is populated.

import Image from 'next/image'
import Link from 'next/link'
import {MdLocationOn, MdPhone} from 'react-icons/md'
import {Button} from '@/components/ui/Button'
import {
  SocialIcons, ActionButtons, EmergencyContact, AppointmentNote,
  cityLine, officeLocationLabel, footerSurface, footerLogo,
} from './shared'
import {formatPhone} from '@/lib/tokens'
import type {FooterData, FooterLocation} from '../Footer'

type Props = {data: FooterData}

const LINK = 'transition-colors duration-ui-fast hover:text-action-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus'

export function DistrictsFooter({data}: Props) {
  const {
    firmName, address, locations, ctaText, ctaUrl,
    privacyPolicyUrl, disclaimerUrl, cookiesUrl,
  } = data

  const surface = footerSurface(data.footerScheme)
  const logo = footerLogo(data, data.footerScheme)
  const primaryPhone = address?.officePhone

  const primaryAsLocation: FooterLocation | null = address
    ? {
        _id: 'primary',
        city: address.city, address1: address.address1, address2: address.address2,
        address3: address.address3, state: address.state, zip: address.zip,
        officePhone: address.officePhone, tollFreePhone: address.tollFreePhone,
        hours: address.hours, emergency24_7: address.emergency24_7,
        emergencyPhone: address.emergencyPhone, appointmentRequired: address.appointmentRequired,
        pageSlug: null,
      }
    : null

  const locs: FooterLocation[] =
    locations?.length ? locations : primaryAsLocation ? [primaryAsLocation] : []

  // Cards wrap at a max of 4 per row. ≤3 locations get a tailored column count
  // (no stretched/empty columns); 4+ use a 4-wide grid that wraps naturally
  // (5 → 4+1, 6 → 4+2, 7 → 4+3, 8 → 4+4).
  const colClass =
    locs.length <= 1 ? 'sm:grid-cols-1'
    : locs.length === 2 ? 'sm:grid-cols-2'
    : locs.length === 3 ? 'sm:grid-cols-2 lg:grid-cols-3'
    : 'sm:grid-cols-2 lg:grid-cols-4'

  const hasCta = !!(ctaText && ctaUrl)
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
    <footer
      data-ring-context={surface.ringContext}
      aria-labelledby="footer-heading"
      className={`${surface.footerClass} px-[5%]`}
    >
      <h2 id="footer-heading" className="sr-only">Footer</h2>
      <div className="container">

        {/* ── Brand + CTA band ──────────────────────────────────────────────── */}
        <div className="flex flex-col gap-6 border-b border-border py-12 md:flex-row md:items-center md:justify-between">
          {logo?.src ? (
            <Link href="/" aria-label={firmName ?? 'Home'} className="inline-block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus">
              <Image src={logo.src} alt={logo.alt ?? firmName ?? ''} width={logo.width} height={logo.height} className="h-14 w-auto" />
            </Link>
          ) : firmName ? (
            <p className="font-heading text-2xl font-bold text-foreground">{firmName}</p>
          ) : <span />}

          {(primaryPhone || hasCta) && (
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              {primaryPhone && (
                <a href={`tel:${primaryPhone.replace(/\D/g, '')}`} className={`inline-flex items-center gap-2 text-lg font-semibold text-foreground ${LINK}`}>
                  <MdPhone className="shrink-0" aria-hidden="true" />
                  {formatPhone(primaryPhone)}
                </a>
              )}
              {hasCta && <Button context={surface.buttonContext} href={ctaUrl!}>{ctaText}</Button>}
            </div>
          )}
        </div>

        {/* ── Location cards ────────────────────────────────────────────────── */}
        <ul role="list" aria-label="Office locations" className={`grid grid-cols-1 gap-6 py-12 ${colClass}`}>
          {locs.map((loc) => (
            <li key={loc._id} className="flex flex-col gap-3 rounded-ui border border-border p-6">
              <div className="flex items-center gap-2">
                <MdLocationOn className="shrink-0 text-action-text" aria-hidden="true" />
                <h3 className="font-heading text-lg font-semibold text-foreground">
                  {loc.city ?? 'Office'}
                </h3>
              </div>

              <address className="not-italic text-sm leading-relaxed text-foreground-muted">
                {loc.address1 && <p>{loc.address1}</p>}
                {loc.address2 && <p>{loc.address2}</p>}
                {loc.address3 && <p>{loc.address3}</p>}
                {(loc.city || loc.state || loc.zip) && <p>{cityLine(loc.city, loc.state, loc.zip)}</p>}
              </address>

              {loc.officePhone && (
                <a href={`tel:${loc.officePhone.replace(/\D/g, '')}`} className={`inline-flex items-center gap-2 text-sm font-semibold text-foreground ${LINK}`}>
                  <MdPhone className="shrink-0" aria-hidden="true" />
                  {formatPhone(loc.officePhone)}
                </a>
              )}
              {loc.tollFreePhone && (
                <a href={`tel:${loc.tollFreePhone.replace(/\D/g, '')}`} className={`text-sm text-foreground-muted ${LINK}`}>
                  Toll free {formatPhone(loc.tollFreePhone)}
                </a>
              )}

              <EmergencyContact
                emergency24_7={loc.emergency24_7}
                emergencyPhone={loc.emergencyPhone}
                className="mt-1"
                labelClass="text-xs font-semibold uppercase tracking-wide text-foreground-muted"
                phoneClass="text-sm text-foreground"
              />
              <AppointmentNote appointmentRequired={loc.appointmentRequired} className="text-sm text-foreground-muted" />

              {loc.pageSlug && (
                <div className="mt-auto pt-3">
                  <Button variant="secondary" context={surface.buttonContext} size="small" href={`/${loc.pageSlug}/`}>
                    {officeLocationLabel(loc.city)}
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>

        {/* ── Bottom bar ────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-6 border-t border-border py-6 text-xs text-foreground-subtle md:flex-row md:items-center md:justify-between">
          {/* © + legal links on one line */}
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-1">
            <p>© {year} {firmName}. All rights reserved.</p>
            {legalLinks.map((l, i) => (
              <Link key={i} href={l.href} className={`underline ${LINK}`}>{l.label}</Link>
            ))}
          </div>
          {/* Social icons + action buttons, side by side with a gap */}
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <SocialIcons data={data} className="text-foreground-muted" hoverClass="hover:text-action-text" />
            {hasActionButtons && <ActionButtons data={data} context={surface.buttonContext} />}
          </div>
        </div>

      </div>
    </footer>
  )
}
