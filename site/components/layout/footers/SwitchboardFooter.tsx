'use client'

// Layout: Switchboard — selector-driven multi-location footer.
// A different organizing principle from Districts (all offices at once, as a
// grid): here a row of city tabs drives ONE rich detail panel. Stays compact
// with many offices, and the single panel has room for the full detail a card
// can't hold — hours, directions, 24/7 line, appointment policy.
// All offices render in the DOM (inactive panels `hidden`) so every office's
// NAP stays crawlable; only the selected one is shown. ARIA tablist + roving
// tabindex + arrow-key navigation. Dark or light via footerSettings.footerScheme.

import {useId, useState} from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {MdPhone, MdLocationOn, MdDirections} from 'react-icons/md'
import {Button} from '@/components/ui/Button'
import {
  SocialIcons, ActionButtons, EmergencyContact, AppointmentNote, OfficeHours,
  cityLine, officeLocationLabel, footerSurface, footerLogo,
} from './shared'
import {formatPhone} from '@/lib/tokens'
import type {FooterData, FooterLocation} from '../Footer'

type Props = {data: FooterData}

const LINK = 'transition-colors duration-ui-fast hover:text-action-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus'

function directionsHref(loc: FooterLocation): string {
  const q = [loc.address1, loc.address2, cityLine(loc.city, loc.state, loc.zip)].filter(Boolean).join(', ')
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`
}

export function SwitchboardFooter({data}: Props) {
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

  const tabsId = useId()
  const [active, setActive] = useState(0)

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

  const onTabKey = (e: React.KeyboardEvent, i: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i + 1) % locs.length)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i - 1 + locs.length) % locs.length)
    }
  }

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

        {/* ── Office selector ───────────────────────────────────────────────── */}
        <div className="py-12">
          {locs.length > 1 && (
            <div role="tablist" aria-label="Office locations" className="flex flex-wrap gap-2 border-b border-border pb-6">
              {locs.map((loc, i) => (
                <button
                  key={loc._id}
                  type="button"
                  role="tab"
                  id={`${tabsId}-tab-${i}`}
                  aria-selected={i === active}
                  aria-controls={`${tabsId}-panel-${i}`}
                  tabIndex={i === active ? 0 : -1}
                  onClick={() => setActive(i)}
                  onKeyDown={(e) => onTabKey(e, i)}
                  className={[
                    'rounded-full px-5 py-2 text-sm font-semibold transition-colors duration-ui-fast',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus',
                    i === active ? 'bg-action text-action-fg' : 'text-foreground-muted hover:text-foreground hover:bg-foreground/5',
                  ].join(' ')}
                >
                  {loc.city ?? 'Office'}
                </button>
              ))}
            </div>
          )}

          {locs.map((loc, i) => (
            <div
              key={loc._id}
              role={locs.length > 1 ? 'tabpanel' : undefined}
              id={`${tabsId}-panel-${i}`}
              aria-labelledby={locs.length > 1 ? `${tabsId}-tab-${i}` : undefined}
              hidden={i !== active}
              className="pt-8"
            >
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.5fr_1fr] lg:gap-16">

                {/* Identity + contact */}
                <div>
                  <div className="flex items-center gap-2">
                    <MdLocationOn className="shrink-0 text-action-text" aria-hidden="true" />
                    <h3 className="font-heading text-xl font-semibold text-foreground">
                      {loc.city ? `${loc.city} Office` : 'Office'}
                    </h3>
                  </div>

                  <address className="mt-4 not-italic text-base leading-relaxed text-foreground-muted">
                    {loc.address1 && <p>{loc.address1}</p>}
                    {loc.address2 && <p>{loc.address2}</p>}
                    {loc.address3 && <p>{loc.address3}</p>}
                    {(loc.city || loc.state || loc.zip) && <p>{cityLine(loc.city, loc.state, loc.zip)}</p>}
                  </address>

                  <div className="mt-4 flex flex-col gap-1">
                    {loc.officePhone && (
                      <a href={`tel:${loc.officePhone.replace(/\D/g, '')}`} className={`inline-flex items-center gap-2 text-base font-semibold text-foreground ${LINK}`}>
                        <MdPhone className="shrink-0" aria-hidden="true" />
                        {formatPhone(loc.officePhone)}
                      </a>
                    )}
                    {loc.tollFreePhone && (
                      <a href={`tel:${loc.tollFreePhone.replace(/\D/g, '')}`} className={`text-sm text-foreground-muted ${LINK}`}>
                        Toll free {formatPhone(loc.tollFreePhone)}
                      </a>
                    )}
                  </div>

                  <EmergencyContact
                    emergency24_7={loc.emergency24_7}
                    emergencyPhone={loc.emergencyPhone}
                    className="mt-4"
                    labelClass="text-xs font-semibold uppercase tracking-wide text-foreground-muted"
                    phoneClass="text-sm text-foreground"
                  />
                </div>

                {/* Hours → appointment policy → actions */}
                <div className="space-y-6 lg:border-l lg:border-border lg:pl-16">
                  {loc.hours && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-widest text-foreground-muted">Office Hours</h4>
                      <OfficeHours
                        hours={loc.hours}
                        className="mt-4"
                        rowClass="text-sm text-foreground-muted"
                        closedRowClass="text-sm text-foreground-subtle"
                      />
                    </div>
                  )}
                  <AppointmentNote appointmentRequired={loc.appointmentRequired} className="text-sm text-foreground-muted" />
                  <div className="flex flex-wrap gap-3">
                    <Button variant="secondary" context={surface.buttonContext} size="small" href={directionsHref(loc)} target="_blank">
                      <MdDirections className="size-4 shrink-0" aria-hidden="true" />
                      Get directions
                    </Button>
                    {loc.pageSlug && (
                      <Button context={surface.buttonContext} size="small" href={`/${loc.pageSlug}/`}>
                        {officeLocationLabel(loc.city)}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Bottom bar ────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-6 border-t border-border py-6 text-xs text-foreground-subtle md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-1">
            <p>© {year} {firmName}. All rights reserved.</p>
            {legalLinks.map((l, i) => (
              <Link key={i} href={l.href} className={`underline ${LINK}`}>{l.label}</Link>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <SocialIcons data={data} className="text-foreground-muted" hoverClass="hover:text-action-text" />
            {hasActionButtons && <ActionButtons data={data} context={surface.buttonContext} />}
          </div>
        </div>

      </div>
    </footer>
  )
}
