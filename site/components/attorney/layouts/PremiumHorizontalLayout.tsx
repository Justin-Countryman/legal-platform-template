// Layout 4 — Premium Horizontal (original)
// Full-bleed editorial split: tall photo fills the left half of the viewport,
// right half shows the attorney name at display scale with contact actions.
// Practice areas appear as a dark pill band immediately below the hero.
// Biography uses a vertical label + prose layout.
// Credentials render as flex-wrap "card row" — each credential is a white card
// with a bold top border, so editors only see cards that have content.

import {SanityImage} from '@/components/ui/SanityImage'
import {hasImage} from '@/lib/sanity/image'
import {Button} from '@/components/ui/Button'
import {Chip} from '@/components/ui/Chip'
import {Tagline} from '@/components/ui/Tagline'
import {PracticeAreaList} from '@/components/ui/PracticeAreaList'
import {BiLogoLinkedinSquare} from 'react-icons/bi'
import {PortableTextRenderer} from '@/components/ui/PortableText'
import {CredentialSection} from '@/components/attorney/CredentialSection'
import {AttorneyVideo} from '@/components/attorney/AttorneyVideo'
import {buildFullName, formatAddress, type Attorney} from '@/components/attorney/types'
import type {NapTokens} from '@/lib/tokens'

type Props = {attorney: Attorney; napTokens?: NapTokens; cta?: {label: string; href: string}}

const CREDENTIAL_DEFS: Array<{title: string; field: keyof Attorney}> = [
  {title: 'Education', field: 'educationDegrees'},
  {title: 'Bar Admissions', field: 'barAdmissions'},
  {title: 'State Bar Admissions', field: 'stateBarAdmissions'},
  {title: 'Honors & Recognition', field: 'honors'},
  {title: 'Certified Legal Specialties', field: 'certifiedLegalSpecialties'},
  {title: 'Professional Associations', field: 'professionalAssociations'},
  {title: 'Pro-Bono Activities', field: 'proBonoActivities'},
  {title: 'Publications', field: 'publications'},
  {title: 'Presentations & Seminars', field: 'presentationsSeminars'},
  {title: 'Representative Cases', field: 'representativeCases'},
  {title: 'Past Positions', field: 'pastPositions'},
]

export function PremiumHorizontalLayout({attorney, napTokens, cta = {label: 'Contact Us', href: '/contact/'}}: Props) {
  const name = buildFullName(attorney)
  const areas = attorney.practiceAreas ?? []

  const activeCredentials = CREDENTIAL_DEFS.filter(
    ({field}) => (attorney[field] as unknown[] | null)?.length,
  )

  const hasCredentials = activeCredentials.length > 0 || !!attorney.yearAdmittedToBar

  return (
    <>
      {/* ── Editorial hero ─────────────────────────────────────────────────── */}
      <section
        className="grid grid-cols-1 lg:grid-cols-[45%_1fr]"
        aria-labelledby="attorney-h1"
      >
        {/* Photo */}
        <div className="order-last flex items-start justify-center bg-muted p-8 lg:order-first">
          {hasImage(attorney.photo) ? (
            <SanityImage
              image={attorney.photo}
              mode="natural"
              alt={attorney.photo.alt || name}
              width={400}
              height={500}
              sizes="(max-width: 1024px) 100vw, 45vw"
              className="w-full max-w-[360px] object-contain"
              priority
            />
          ) : (
            <div className="flex h-64 w-full max-w-[360px] items-center justify-center bg-muted">
              <span className="font-heading text-7xl font-bold text-foreground-muted select-none">
                {attorney.firstName?.charAt(0) ?? ''}{attorney.lastName?.charAt(0) ?? ''}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-col justify-center bg-background px-8 py-14 lg:px-14 xl:px-20">

          <Tagline as="p" mb="mb-4">
            Attorney Profile
          </Tagline>

          <h1
            id="attorney-h1"
            className="font-heading text-3xl font-bold leading-none text-foreground md:text-5xl lg:text-6xl xl:text-7xl"
          >
            {name}
          </h1>

          <div className="mt-4 flex items-center gap-3">
            {attorney.jobTitle && (
              <p className="text-lg text-foreground-muted">{attorney.jobTitle}</p>
            )}
            {attorney.linkedIn && (
              <a
                href={attorney.linkedIn}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground-muted transition-colors duration-ui-fast hover:text-foreground"
                aria-label="LinkedIn profile"
              >
                <BiLogoLinkedinSquare className="size-5 shrink-0" aria-hidden="true" />
              </a>
            )}
          </div>

          {attorney.yearAdmittedToBar && (
            <p className="mt-1.5 text-sm text-foreground-muted">
              Admitted to practice since {attorney.yearAdmittedToBar}
            </p>
          )}

          {/* Decorative rule */}
          <div className="my-8 h-px w-16 bg-brand-dark" aria-hidden="true" />

          {/* Contact actions */}
          <div className="flex flex-wrap items-center gap-3">
            <Button href={cta.href}>{cta.label}</Button>
            {attorney.showEmail && attorney.email && (
              <a
                href={`mailto:${attorney.email}`}
                className="rounded-ui transition-colors duration-ui-fast hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
              >
                <Chip icon="mail" className="cursor-pointer">Email me</Chip>
              </a>
            )}
            {attorney.showLocations && attorney.location?.officePhone && (
              <a
                href={`tel:${attorney.location.officePhone.replace(/\D/g, '')}`}
                className="rounded-ui transition-colors duration-ui-fast hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
                aria-label={`Call ${attorney.location.officePhone}`}
              >
                <Chip icon="phone" className="cursor-pointer">
                  {attorney.location.officePhone}
                </Chip>
              </a>
            )}
          </div>

          {/* Address */}
          {attorney.showLocations && attorney.location &&
            (attorney.location.address1 || attorney.location.city) && (
              <address className="mt-5 not-italic text-sm text-foreground-muted">
                {formatAddress(attorney.location)}
              </address>
            )}

        </div>
      </section>

      {/* ── Practice areas band ───────────────────────────────────────────── */}
      {areas.length > 0 && (
        <div className="bg-brand-dark px-[5%] py-4">
          <div className="container flex flex-wrap items-center gap-3">
            <h3 className="tagline mr-2 shrink-0">
              Practice areas
            </h3>
            <PracticeAreaList areas={areas} context="dark" />
          </div>
        </div>
      )}

      <AttorneyVideo attorney={attorney} />

      {/* ── Biography ─────────────────────────────────────────────────────── */}
      {attorney.fullBiography && (
        <section className="px-[5%] py-16 md:py-20" aria-label="Biography">
          <div className="container grid grid-cols-1 gap-8 lg:grid-cols-[200px_1fr] lg:gap-16 xl:grid-cols-[240px_1fr]">

            {/* Vertical label + decorative line */}
            <div className="flex items-start">
              <div className="flex items-center gap-4 lg:flex-col lg:gap-3">
                <div className="h-px w-10 bg-border lg:h-14 lg:w-px" aria-hidden="true" />
                <h2 className="m-0 text-xs font-semibold uppercase tracking-[0.25em] text-foreground-muted lg:[writing-mode:vertical-rl] lg:rotate-180">
                  Biography
                </h2>
              </div>
            </div>

            {/* Prose */}
            <div>
              <PortableTextRenderer value={attorney.fullBiography} napTokens={napTokens} />
            </div>

          </div>
        </section>
      )}

      {/* ── Credentials ───────────────────────────────────────────────────── */}
      {hasCredentials && (
        <section
          className="border-t border-border bg-muted px-[5%] py-14 md:py-16"
          aria-label="Credentials and background"
        >
          <div className="container grid grid-cols-1 gap-0 md:grid-cols-3">

            {[0, 1, 2].map((col) => {
              const items = activeCredentials.filter((_, i) => i % 3 === col)
              const showYearAdmitted = attorney.yearAdmittedToBar && activeCredentials.length % 3 === col
              if (!items.length && !showYearAdmitted) return null
              return (
                <div
                  key={col}
                  className="divide-y divide-border md:border-l md:border-border md:px-10 first:border-l-0 first:pl-0"
                >
                  {items.map(({title, field}) => (
                    <CredentialSection
                      key={field}
                      title={title}
                      content={attorney[field] as unknown[] | null}
                      headingClassName="mb-4 font-heading text-sm font-bold uppercase tracking-widest text-foreground"
                      className="py-8 first:pt-0"
                    />
                  ))}
                  {showYearAdmitted && (
                    <dl className="py-8 first:pt-0">
                      <dt className="tagline mb-4">Year Admitted to Bar</dt>
                      <dd className="text-sm text-foreground">{attorney.yearAdmittedToBar}</dd>
                    </dl>
                  )}
                </div>
              )
            })}

          </div>
        </section>
      )}
    </>
  )
}
