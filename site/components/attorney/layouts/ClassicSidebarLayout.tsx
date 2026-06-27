// Layout 2 — Classic Sidebar
// Dark banner at top with name, title, and contact CTAs.
// Below: sticky sidebar (photo + practice areas) beside a main column
// that flows biography → credential sections sequentially.

import {SanityImage} from '@/components/ui/SanityImage'
import {hasImage} from '@/lib/sanity/image'
import {MdEmail, MdPhone, MdOpenInNew} from 'react-icons/md'
import {Button} from '@/components/ui/Button'
import {Tagline} from '@/components/ui/Tagline'
import {PracticeAreaList} from '@/components/ui/PracticeAreaList'
import {BiLogoLinkedinSquare} from 'react-icons/bi'
import {PortableTextRenderer} from '@/components/ui/PortableText'
import {CredentialSection} from '@/components/attorney/CredentialSection'
import {buildFullName, formatAddress, type Attorney} from '@/components/attorney/types'
import type {NapTokens} from '@/lib/tokens'

type Props = {attorney: Attorney; napTokens?: NapTokens; cta?: {label: string; href: string}; isDark?: boolean}

const CREDENTIAL_HEADING = 'mb-3 text-xs font-semibold uppercase tracking-widest text-foreground-muted'

export function ClassicSidebarLayout({attorney, napTokens, cta = {label: 'Contact Us', href: '/contact/'}, isDark = true}: Props) {
  const name = buildFullName(attorney)
  const areas = attorney.practiceAreas ?? []
  const buttonContext = isDark ? 'dark' : 'light'

  return (
    <>
      {/* ── Top banner ────────────────────────────────────────────────────── */}
      <div
        data-ring-context={isDark ? 'dark' : undefined}
        className={`${isDark ? 'bg-brand-dark' : 'bg-hero-tint'} px-[5%] py-12 md:py-16`}
        aria-labelledby="attorney-h1"
      >
        <div className="container">
          {attorney.jobTitle && (
            <Tagline as="p">
              {attorney.jobTitle}
            </Tagline>
          )}
          <h1
            id="attorney-h1"
            className="font-heading text-3xl font-extrabold uppercase tracking-wide text-foreground md:text-4xl lg:text-5xl"
          >
            {name || 'Attorney'}
          </h1>

          <hr className="mt-5 mb-6 w-16 border-border" />

          {/* Contact CTAs */}
          <div className="flex flex-wrap items-center gap-3">
            <Button context={buttonContext} href={cta.href}>{cta.label}</Button>
            {attorney.showEmail && attorney.email && (
              <Button variant="secondary" context={buttonContext} href={`mailto:${attorney.email}`}>
                <MdEmail className="size-4 shrink-0" aria-hidden="true" />
                Email me
              </Button>
            )}
            {attorney.showLocations && attorney.location?.officePhone && (
              <a
                href={`tel:${attorney.location.officePhone.replace(/\D/g, '')}`}
                className="flex items-center gap-2 text-sm text-foreground transition-colors duration-ui-fast hover:text-accent"
                aria-label={`Call ${attorney.location.officePhone}`}
              >
                <MdPhone className="size-4 shrink-0" aria-hidden="true" />
                {attorney.location.officePhone}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── Main layout ───────────────────────────────────────────────────── */}
      <div className="px-[5%] py-12 md:py-16">
        <div className="container grid grid-cols-1 gap-10 lg:grid-cols-[300px_1fr] lg:gap-16 xl:grid-cols-[340px_1fr]">

          {/* ── Sidebar ───────────────────────────────────────────────────── */}
          <aside
            className="lg:sticky lg:top-8 lg:self-start"
            aria-label="Attorney photo and practice areas"
          >
            {/* Photo */}
            {hasImage(attorney.photo) ? (
              <div className="flex items-start justify-center bg-muted">
                <SanityImage
                  image={attorney.photo}
                  mode="natural"
                  alt={attorney.photo.alt || name}
                  width={340}
                  height={420}
                  className="w-full max-w-[340px] object-contain"
                  sizes="(max-width: 1024px) 100vw, 340px"
                  priority
                />
              </div>
            ) : null}

            {/* LinkedIn */}
            {attorney.linkedIn && (
              <Button
                variant="secondary"
                context="light"
                href={attorney.linkedIn}
                fullWidth
                className="mt-3"
              >
                <BiLogoLinkedinSquare className="size-4 shrink-0" aria-hidden="true" />
                LinkedIn
                <MdOpenInNew className="size-3 shrink-0" aria-hidden="true" />
              </Button>
            )}

            {/* Office address */}
            {attorney.showLocations && attorney.location &&
              (attorney.location.address1 || attorney.location.city) && (
                <address className="mt-5 not-italic text-sm leading-relaxed text-foreground-muted">
                  {formatAddress(attorney.location)}
                </address>
              )}

            {/* Practice areas */}
            {areas.length > 0 && (
              <div className="mt-8 border-t border-border pt-8">
                <h3 className="tagline mb-4">
                  Practice Areas
                </h3>
                <PracticeAreaList areas={areas} context="light" direction="column" />
              </div>
            )}
          </aside>

          {/* ── Main column ───────────────────────────────────────────────── */}
          {/* Uses <section> (not <main>) because (site)/layout.tsx already provides the single <main id="main-content"> landmark — nested <main> is a WCAG violation. */}
          <section aria-label="Biography and credentials">

            {/* Biography */}
            {attorney.fullBiography && (
              <div className="mb-12">
                <h2 className="mb-4 font-heading text-2xl font-extrabold uppercase tracking-wide text-foreground">
                  Biography
                </h2>
                <PortableTextRenderer value={attorney.fullBiography} napTokens={napTokens} />
              </div>
            )}

            {/* Sequential credential sections */}
            <div className="divide-y divide-border">
              {[
                {title: 'Education', content: attorney.educationDegrees},
                {title: 'Honors & Recognition', content: attorney.honors},
                {title: 'Certified Legal Specialties', content: attorney.certifiedLegalSpecialties},
                {title: 'Bar Admissions', content: attorney.barAdmissions},
                {title: 'State Bar Admissions', content: attorney.stateBarAdmissions},
                {title: 'Professional Associations', content: attorney.professionalAssociations},
                {title: 'Pro-Bono Activities', content: attorney.proBonoActivities},
                {title: 'Publications', content: attorney.publications},
                {title: 'Presentations & Seminars', content: attorney.presentationsSeminars},
                {title: 'Representative Cases', content: attorney.representativeCases},
                {title: 'Past Positions', content: attorney.pastPositions},
                {title: 'Languages', content: attorney.languages},
              ].map(({title, content}) => (
                <CredentialSection
                  key={title}
                  title={title}
                  content={content}
                  headingClassName={CREDENTIAL_HEADING}
                  className="py-8 first:pt-0"
                />
              ))}
              {attorney.yearAdmittedToBar && (
                <dl className="py-8">
                  <dt className="tagline mb-3">Year Admitted to Bar</dt>
                  <dd className="text-sm text-foreground">{attorney.yearAdmittedToBar}</dd>
                </dl>
              )}
            </div>

          </section>
        </div>
      </div>
    </>
  )
}
