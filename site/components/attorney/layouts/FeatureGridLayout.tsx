// Layout 3 — Feature + Grid
// Feature row: photo left (portrait) + name / practice area chips / biography right.
// Below: 3-column credential grid on a gray-50 background.
// Inspired by the HDImmigration Law layout pattern.

import {SanityImage} from '@/components/ui/SanityImage'
import {hasImage} from '@/lib/sanity/image'
import {MdEmail, MdOpenInNew} from 'react-icons/md'
import {Button} from '@/components/ui/Button'
import {Tagline} from '@/components/ui/Tagline'
import {PracticeAreaList} from '@/components/ui/PracticeAreaList'
import {BiLogoLinkedinSquare} from 'react-icons/bi'
import {PortableTextRenderer} from '@/components/ui/PortableText'
import {CredentialSection} from '@/components/attorney/CredentialSection'
import {buildFullName, formatAddress, type Attorney} from '@/components/attorney/types'
import type {NapTokens} from '@/lib/tokens'

type Props = {attorney: Attorney; napTokens?: NapTokens; cta?: {label: string; href: string}}

export function FeatureGridLayout({attorney, napTokens, cta = {label: 'Contact Us', href: '/contact/'}}: Props) {
  const name = buildFullName(attorney)
  const areas = attorney.practiceAreas ?? []

  const credentialItems = [
    {title: 'Education', content: attorney.educationDegrees},
    {title: 'Bar Admissions', content: attorney.barAdmissions},
    {title: 'State Bar Admissions', content: attorney.stateBarAdmissions},
    {title: 'Certified Legal Specialties', content: attorney.certifiedLegalSpecialties},
    {title: 'Honors & Recognition', content: attorney.honors},
    {title: 'Professional Associations', content: attorney.professionalAssociations},
    {title: 'Pro-Bono Activities', content: attorney.proBonoActivities},
    {title: 'Publications', content: attorney.publications},
    {title: 'Presentations & Seminars', content: attorney.presentationsSeminars},
    {title: 'Representative Cases', content: attorney.representativeCases},
    {title: 'Past Positions', content: attorney.pastPositions},
    {title: 'Languages', content: attorney.languages},
  ].filter(({content}) => content?.length)

  const hasCredentials = credentialItems.length > 0 || !!attorney.yearAdmittedToBar

  return (
    <>
      {/* ── Feature row ───────────────────────────────────────────────────── */}
      <section className="px-[5%] py-12 md:py-16" aria-label="Attorney profile">
        <div className="container grid grid-cols-1 items-start gap-10 lg:grid-cols-[5fr_7fr] lg:gap-16">

          {/* Photo + Practice Areas */}
          <div className="flex flex-col gap-6">
            {hasImage(attorney.photo) && (
              <div className="flex items-start justify-center bg-muted p-6">
                <SanityImage
                  image={attorney.photo}
                  mode="natural"
                  alt={attorney.photo.alt || name}
                  width={400}
                  height={500}
                  className="w-full max-w-[320px] object-contain"
                  sizes="(max-width: 1024px) 100vw, 42vw"
                  priority
                />
              </div>
            )}

            {/* LinkedIn */}
            {attorney.linkedIn && (
              <a
                href={attorney.linkedIn}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-btn border border-border px-5 py-2.5 text-sm text-foreground transition-colors duration-ui-fast hover:border-action-text hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
              >
                <BiLogoLinkedinSquare className="size-4 shrink-0" aria-hidden="true" />
                LinkedIn
                <MdOpenInNew className="size-3 shrink-0" aria-hidden="true" />
              </a>
            )}

            {/* Practice area chips */}
            <PracticeAreaList areas={areas} context="light" />
          </div>

          {/* Name, bio */}
          <div>
            {attorney.jobTitle && (
              <Tagline as="p" mb="mb-2">
                {attorney.jobTitle}
              </Tagline>
            )}

            <h1 className="font-heading text-3xl font-bold text-foreground md:text-4xl lg:text-5xl">{name}</h1>

            {/* Contact CTAs */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button href={cta.href}>{cta.label}</Button>
              {attorney.showEmail && attorney.email && (
                <Button variant="secondary" context="light" href={`mailto:${attorney.email}`}>
                  <MdEmail className="size-4 shrink-0" aria-hidden="true" />
                  Email me
                </Button>
              )}
            </div>

            {/* Location */}
            {attorney.showLocations && attorney.location &&
              (attorney.location.address1 || attorney.location.city) && (
                <address className="mt-4 not-italic text-sm text-foreground-muted">
                  {formatAddress(attorney.location)}
                  {attorney.location.officePhone && (
                    <>
                      {' · '}
                      <a
                        href={`tel:${attorney.location.officePhone.replace(/\D/g, '')}`}
                        className="transition-colors duration-ui-fast hover:text-foreground"
                        aria-label={`Call ${attorney.location.officePhone}`}
                      >
                        {attorney.location.officePhone}
                      </a>
                    </>
                  )}
                </address>
              )}

            {/* Divider */}
            <hr className="my-7 border-border" />

            {/* Biography */}
            {attorney.fullBiography && (
              <>
                <h2 className="mb-4 font-heading text-xl font-bold text-foreground md:text-2xl">
                  Biography
                </h2>
                <PortableTextRenderer value={attorney.fullBiography} napTokens={napTokens} />
              </>
            )}
          </div>

        </div>
      </section>

      {/* ── Credential grid ───────────────────────────────────────────────── */}
      {hasCredentials && (
        <section
          className="border-t border-border bg-muted px-[5%] py-14"
          aria-label="Credentials and background"
        >
          <div className="container grid grid-cols-1 gap-0 md:grid-cols-3">
            {[0, 1, 2].map((col) => {
              const items = credentialItems.filter((_, i) => i % 3 === col)
              const showYearAdmitted = attorney.yearAdmittedToBar && credentialItems.length % 3 === col
              if (!items.length && !showYearAdmitted) return null
              return (
                <div
                  key={col}
                  className="divide-y divide-border md:border-l md:border-border md:px-10 first:border-l-0 first:pl-0"
                >
                  {items.map(({title, content}) => (
                    <CredentialSection
                      key={title}
                      title={title}
                      content={content}
                      className="py-8 first:pt-0"
                    />
                  ))}
                  {showYearAdmitted && (
                    <dl className="py-8 first:pt-0">
                      <dt className="tagline mb-1">Year Admitted to Bar</dt>
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
