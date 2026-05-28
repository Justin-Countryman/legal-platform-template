// Layout: Beacon
// Dark split layout: info card on the left, embedded contact form on the right.
// Info card: logo, address, office page link, phone, social icons, action buttons.
// Form panel: ctaText as headline, then raw embed code (iframe, script-based forms, etc.).
// Form embed is rendered client-side so script tags execute correctly.

import Image from 'next/image'
import Link from 'next/link'
import {MdLocationOn} from 'react-icons/md'
import {SocialIcons, ActionButtons, OfficeHours, cityLine, officeLocationLabel} from './shared'
import {FormEmbed} from './FormEmbed'
import type {FooterData} from '../Footer'

type Props = {data: FooterData}

export function BeaconFooter({data}: Props) {
  const {
    firmName, logo, address, locations,
    ctaText,
    privacyPolicyUrl, disclaimerUrl, cookiesUrl,
    formEmbed,
  } = data

  const officePhone = address?.officePhone
  const tollFreePhone = address?.tollFreePhone

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
    <footer data-ring-context="dark" aria-labelledby="footer-heading" className="bg-brand-dark text-foreground-muted">
      <h2 id="footer-heading" className="sr-only">Footer</h2>

      {/* ── Main split ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[5fr_7fr]">

        {/* Left — info card */}
        <div className="flex flex-col justify-center gap-6 border-b border-border px-[5%] py-14 lg:border-b-0 lg:border-r lg:px-14 lg:py-16">

          {/* Logo / firm name */}
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

          {/* Address */}
          {address && (
            <address className="not-italic text-sm leading-relaxed text-foreground-muted">
              {address.address1 && <p>{address.address1}</p>}
              {address.address2 && <p>{address.address2}</p>}
              {address.address3 && <p>{address.address3}</p>}
              {(address.city || address.state || address.zip) && (
                <p>{cityLine(address.city, address.state, address.zip)}</p>
              )}
            </address>
          )}

          {/* Office page link */}
          {officePageSlug && (
            <Link
              href={`/${officePageSlug}/`}
              className="inline-flex items-center gap-1 text-sm text-foreground underline underline-offset-2 transition-colors duration-ui-fast hover:text-action-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus"
            >
              <MdLocationOn className="shrink-0" />
              {officeLocationLabel(officeCityName)}
            </Link>
          )}

          {/* Phone */}
          {(officePhone || tollFreePhone) && (
            <div className="space-y-1">
              {officePhone && (
                <a
                  href={`tel:${officePhone.replace(/\D/g, '')}`}
                  className="block text-xl font-light text-foreground transition-colors duration-ui-fast hover:text-action-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus"
                >
                  {officePhone}
                </a>
              )}
              {tollFreePhone && (
                <a
                  href={`tel:${tollFreePhone.replace(/\D/g, '')}`}
                  className="block text-sm text-foreground-subtle transition-colors duration-ui-fast hover:text-action-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus"
                >
                  {tollFreePhone}
                </a>
              )}
            </div>
          )}

          {/* Hours */}
          {(address?.hours || address?.emergency24_7) && (
            <div>
              <h3 className="text-base font-semibold mb-2 text-foreground-muted">Office Hours</h3>
              <OfficeHours
                hours={address.hours}
                emergency24_7={address.emergency24_7}
                rowClass="text-sm text-foreground-muted"
                closedRowClass="text-sm text-foreground-subtle"
              />
            </div>
          )}

          {/* Social + action buttons */}
          <SocialIcons data={data} className="text-foreground-subtle" />
          <ActionButtons data={data} context="dark" className="text-foreground-muted" />
        </div>

        {/* Right — form panel */}
        <div className="px-[5%] py-14 lg:px-14 lg:py-16">
          {ctaText && (
            <h2 className="mb-8 font-heading text-2xl font-bold uppercase tracking-wide text-foreground">
              {ctaText}
            </h2>
          )}
          {formEmbed ? (
            <FormEmbed html={formEmbed} />
          ) : (
            <p className="text-sm text-foreground-subtle italic">No form embed code set — add it in Footer Settings.</p>
          )}
        </div>
      </div>

      {/* ── Bottom bar ──────────────────────────────────────────────────────────── */}
      <div className="border-t border-border px-[5%]">
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
