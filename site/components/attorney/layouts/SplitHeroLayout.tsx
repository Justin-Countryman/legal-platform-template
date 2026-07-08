// Layout 1 — Split Hero (Edwards-inspired)
// Contained card: photo left + dark info panel right.
// Below: 2-col biography (left) + credential stack (right).

import {SanityImage} from '@/components/ui/SanityImage'
import {hasImage} from '@/lib/sanity/image'
import {MdEmail} from 'react-icons/md'
import {Button} from '@/components/ui/Button'
import {Chip} from '@/components/ui/Chip'
import {PracticeAreaList} from '@/components/ui/PracticeAreaList'
import {BiLogoLinkedinSquare} from 'react-icons/bi'
import {PortableTextRenderer} from '@/components/ui/PortableText'
import {CredentialSection} from '@/components/attorney/CredentialSection'
import {AttorneyVideo} from '@/components/attorney/AttorneyVideo'
import {buildFullName, formatAddress, type Attorney} from '@/components/attorney/types'
import type {NapTokens} from '@/lib/tokens'

type Props = {attorney: Attorney; napTokens?: NapTokens; cta?: {label: string; href: string}; isDark?: boolean}

export function SplitHeroLayout({attorney, napTokens, cta = {label: 'Contact Us', href: '/contact/'}, isDark = true}: Props) {
  const name = buildFullName(attorney)
  const areas = attorney.practiceAreas ?? []
  const buttonContext = isDark ? 'dark' : 'light'

  return (
    <>
      {/* ── Profile Card ──────────────────────────────────────────────────── */}
      <section aria-labelledby="attorney-h1" className="bg-background py-8 px-[5%]">
        <div className="grid grid-cols-1 overflow-hidden lg:grid-cols-[5fr_7fr]">

          {/* Photo */}
          <div className="relative flex items-center justify-center bg-muted min-h-[300px]">
            {hasImage(attorney.photo) ? (
              <SanityImage
                image={attorney.photo}
                mode="natural"
                alt={attorney.photo.alt || name}
                width={400}
                height={500}
                sizes="(max-width: 1024px) 100vw, 42vw"
                className="w-full max-w-[360px] object-contain"
                priority
              />
            ) : (
              <div className="h-full w-full bg-muted" />
            )}
          </div>

          {/* Info panel */}
          <div
            data-ring-context={isDark ? 'dark' : undefined}
            className={`flex flex-col justify-center ${isDark ? 'bg-brand-dark' : 'bg-hero-tint'} px-10 py-12 lg:px-14`}
          >

            <h1
              id="attorney-h1"
              className="font-heading text-3xl font-extrabold uppercase leading-tight tracking-wide text-foreground md:text-4xl lg:text-[2.6rem]"
            >
              {name || 'Attorney'}
            </h1>

            <div className="mt-2 flex items-center gap-3">
              {attorney.jobTitle && (
                <p className="text-sm font-normal text-foreground">{attorney.jobTitle}</p>
              )}
              {attorney.linkedIn && (
                <a
                  href={attorney.linkedIn}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground-subtle transition-colors duration-ui-fast hover:text-accent"
                  aria-label="LinkedIn profile"
                >
                  <BiLogoLinkedinSquare className="size-5 shrink-0" aria-hidden="true" />
                </a>
              )}
            </div>

            {/* Divider */}
            <hr className="mt-5 border-border" />

            {/* Secondary contact links */}
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {attorney.showEmail && attorney.email && (
                <Button variant="secondary" context={buttonContext} href={`mailto:${attorney.email}`}>
                  <MdEmail className="size-4 shrink-0" aria-hidden="true" />
                  Email me
                </Button>
              )}
              {attorney.location?.officePhone && (
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

            {/* Practice area chips */}
            <PracticeAreaList
              areas={areas}
              context={buttonContext}
              className="mt-5 flex flex-wrap gap-2"
            />

            {/* Primary CTA */}
            <div className="mt-10">
              <Button context={buttonContext} href={cta.href}>{cta.label}</Button>
            </div>

            {/* Office address */}
            {attorney.showLocations && attorney.location && (
              <address className="mt-6 not-italic text-xs text-foreground-muted">
                {formatAddress(attorney.location)}
              </address>
            )}

          </div>
        </div>
      </section>

      <AttorneyVideo attorney={attorney} />

      {/* ── Biography + Credentials ───────────────────────────────────────── */}
      <section className="bg-background px-[5%] py-14 md:py-20" aria-label="Biography and credentials">
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-2 lg:gap-20">

          {/* Biography */}
          {attorney.fullBiography && (
            <div>
              <h2 className="mb-6 font-heading text-2xl font-extrabold uppercase tracking-wide text-foreground">
                Biography
              </h2>
              <PortableTextRenderer value={attorney.fullBiography} napTokens={napTokens} />
            </div>
          )}

          {/* Credentials */}
          <div>
            <CredentialSection
              title="Education"
              content={attorney.educationDegrees}
              headingClassName="mb-4 font-heading text-2xl font-extrabold uppercase tracking-wide text-foreground"
              className="pb-8"
            />
            <CredentialSection
              title="Honors & Recognition"
              content={attorney.honors}
              headingClassName="mb-4 font-heading text-2xl font-extrabold uppercase tracking-wide text-foreground"
              className="border-t border-border pt-8 pb-8"
            />
            <CredentialSection
              title="Bar Admissions"
              content={attorney.barAdmissions}
              headingClassName="mb-4 font-heading text-2xl font-extrabold uppercase tracking-wide text-foreground"
              className="border-t border-border pt-8 pb-8"
            />
            <CredentialSection
              title="State Bar Admissions"
              content={attorney.stateBarAdmissions}
              headingClassName="mb-4 font-heading text-2xl font-extrabold uppercase tracking-wide text-foreground"
              className="border-t border-border pt-8 pb-8"
            />
            <CredentialSection
              title="Certified Legal Specialties"
              content={attorney.certifiedLegalSpecialties}
              headingClassName="mb-4 font-heading text-2xl font-extrabold uppercase tracking-wide text-foreground"
              className="border-t border-border pt-8 pb-8"
            />
            <CredentialSection
              title="Professional Associations"
              content={attorney.professionalAssociations}
              headingClassName="mb-4 font-heading text-2xl font-extrabold uppercase tracking-wide text-foreground"
              className="border-t border-border pt-8 pb-8"
            />
            <CredentialSection
              title="Pro-Bono Activities"
              content={attorney.proBonoActivities}
              headingClassName="mb-4 font-heading text-2xl font-extrabold uppercase tracking-wide text-foreground"
              className="border-t border-border pt-8 pb-8"
            />
            <CredentialSection
              title="Publications"
              content={attorney.publications}
              headingClassName="mb-4 font-heading text-2xl font-extrabold uppercase tracking-wide text-foreground"
              className="border-t border-border pt-8 pb-8"
            />
            <CredentialSection
              title="Presentations & Seminars"
              content={attorney.presentationsSeminars}
              headingClassName="mb-4 font-heading text-2xl font-extrabold uppercase tracking-wide text-foreground"
              className="border-t border-border pt-8 pb-8"
            />
            <CredentialSection
              title="Representative Cases"
              content={attorney.representativeCases}
              headingClassName="mb-4 font-heading text-2xl font-extrabold uppercase tracking-wide text-foreground"
              className="border-t border-border pt-8 pb-8"
            />
            <CredentialSection
              title="Past Positions"
              content={attorney.pastPositions}
              headingClassName="mb-4 font-heading text-2xl font-extrabold uppercase tracking-wide text-foreground"
              className="border-t border-border pt-8 pb-8"
            />
            {attorney.yearAdmittedToBar && (
              <dl className="border-t border-border pt-8">
                <dt className="tagline mb-4">Year Admitted to Bar</dt>
                <dd className="text-sm text-foreground">{attorney.yearAdmittedToBar}</dd>
              </dl>
            )}
          </div>

        </div>
      </section>
    </>
  )
}
