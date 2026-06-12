import {groq} from 'next-sanity'

// ─── Reusable Fragments ───────────────────────────────────────────────────────
// Declared first — used by queries throughout this file.

// Explicit projection per blockContent schema (object/blockContent.ts):
// allowed array members are `block` and `image`. The `block` fields cover
// standard PortableText shape; the conditional resolves image assets +
// surfaces alt + caption for the PortableText image renderer.
export const BLOCK_CONTENT_FRAGMENT = groq`[]{
  _type,
  _key,
  style,
  markDefs,
  children,
  listItem,
  level,
  _type == "image" => {
    alt,
    caption,
    "src": asset->url,
    "width": asset->metadata.dimensions.width,
    "height": asset->metadata.dimensions.height
  },
  _type == "officeHours" => {
    title
  }
}`

const TESTIMONIAL_FIELDS_FRAGMENT = groq`{
  _id, quote, name, caseType, numberOfStars,
  "avatar": avatar{
    "src": asset->url,
    "alt": alt,
    "width": asset->metadata.dimensions.width,
    "height": asset->metadata.dimensions.height
  }
}`

export const SECTIONS_FRAGMENT = groq`[defined(@->_id)]->{
  _id,
  _type,
  name,
  tagline,
  heading,
  description,
  layout,
  sectionLayout,
  gridMode,
  cardStyle,
  hoverEffects,
  showArrow,
  iconPosition,
  mode,
  reviewsEmbed,
  footerHeading,
  footerDescription,
  "appearance": {
    "surface": surface,
    "spacing": spacing,
    "backgroundImage": sectionBackgroundImage{
      "src": asset->url
    }
  },
  // practiceAreaNav (silo nav): resolve each item's page reference to an href +
  // auto-pulled title/description, with per-item overrides; or auto-list all
  // top-level practice areas. href mirrors navItemPracticeAreas ("/" + slug + "/").
  "items": select(
    _type == "practiceAreaNav" && mode == "allTopLevel" =>
      *[_type == "practiceArea" && !defined(parentPage) && defined(slug.current)]{
        "_key": _id,
        "label": title,
        "href": "/" + slug.current + "/",
        "description": metaDescription,
        "icon": null,
        "image": null,
        "featured": false
      } | order(title asc),
    _type == "practiceAreaNav" =>
      items[defined(page->slug.current)]{
        _key,
        "label": coalesce(label, page->title),
        "href": "/" + page->slug.current + "/",
        "description": coalesce(description, page->metaDescription),
        "icon": icon{"src": asset->url, "alt": alt, "width": asset->metadata.dimensions.width, "height": asset->metadata.dimensions.height},
        "image": image{"src": asset->url, "alt": alt, "width": asset->metadata.dimensions.width, "height": asset->metadata.dimensions.height},
        "featured": featured
      }
  ),
  "buttons": buttons[]{title, url, variant},
  "footerButton": footerButton{title, url, variant},
  "image": image{
    "src": asset->url,
    "alt": alt,
    "width": asset->metadata.dimensions.width,
    "height": asset->metadata.dimensions.height
  },
  "testimonials": testimonials[defined(@->_id)]->${TESTIMONIAL_FIELDS_FRAGMENT},
  "testimonial": testimonial->${TESTIMONIAL_FIELDS_FRAGMENT},
  "questions": questions[defined(@->_id)]->{
    question,
    "answer": answer ${BLOCK_CONTENT_FRAGMENT},
    category,
    "slug": slug.current,
    tags
  },
  "badges": badges[]{
    "src": image.asset->url,
    "alt": image.alt,
    "width": image.asset->metadata.dimensions.width,
    "height": image.asset->metadata.dimensions.height
  },
  "orderedAttorneyIds": select(
    mode == 'practiceArea' => *[_type == "attorneyIndex"][0].orderedAttorneys[]._ref,
    null
  ),
  "attorneys": select(
    mode == 'all' => *[_type == "attorneyIndex"][0].orderedAttorneys[defined(@->_id)]->{
      _id, title, "slug": slug.current, h1, jobTitle, "bio": metaDescription,
      "photo": photo{
        "src": asset->url,
        "alt": coalesce(alt, ""),
        "width": asset->metadata.dimensions.width,
        "height": asset->metadata.dimensions.height
      }
    },
    mode == 'practiceArea' => *[_type == "attorneyPage" && references(^.practiceAreaPage._ref)]{
      _id, title, "slug": slug.current, h1, jobTitle, "bio": metaDescription,
      "photo": photo{
        "src": asset->url,
        "alt": coalesce(alt, ""),
        "width": asset->metadata.dimensions.width,
        "height": asset->metadata.dimensions.height
      }
    },
    mode == 'manual' => attorneys[defined(@->_id)]->{
      _id, title, "slug": slug.current, h1, jobTitle, "bio": metaDescription,
      "photo": photo{
        "src": asset->url,
        "alt": coalesce(alt, ""),
        "width": asset->metadata.dimensions.width,
        "height": asset->metadata.dimensions.height
      }
    },
    []
  ),
  "videos": videos[defined(@->_id)]->{
    _id, title, youTubeUrl, description, videoType
  }
}`

// ─── Root Site Metadata ───────────────────────────────────────────────────────
// Used by the root <RootLayout> generateMetadata() to populate firm-name and
// primary-domain values that appear in the HTML <title> template, the OG
// siteName, and metadataBase. Keeps the root layout client-agnostic — no
// hardcoded firm name or domain in the app shell.
export const SITE_METADATA_QUERY = groq`
  *[_type == "siteSettings"][0]{
    firmName,
    primaryDomain,
    "faviconUrl":  *[_type == "designSettings"][0].favicon.asset->url,
    "faviconMime": *[_type == "designSettings"][0].favicon.asset->mimeType,
    "webclipUrl":  *[_type == "designSettings"][0].webclipImage.asset->url,
  }
`

// ─── OG image composition ─────────────────────────────────────────────────────
// Used by `app/api/og/route.tsx` to render branded 1200×630 social cards.
// `primaryColor` falls back at render time to a neutral background when
// Sanity hasn't been configured yet.
export const OG_DATA_QUERY = groq`{
  "firmName":     *[_type == "siteSettings"][0].firmName,
  "logo":         *[_type == "designSettings"][0].logoOnDark.asset->url,
  "primaryColor": *[_type == "designSettings"][0].primaryColor,
}`

// ─── Site-wide Organization JSON-LD ───────────────────────────────────────────
// Sourced from siteSettings + footerSettings + designSettings + the primary
// location. Renders once in the root layout so search engines see the
// canonical Organization entity on every page. sameAs aggregates the social /
// directory URLs that exist; absent fields are filtered at render time.
export const ORGANIZATION_SCHEMA_QUERY = groq`{
  "firmName": *[_type == "siteSettings"][0].firmName,
  "domain":   *[_type == "siteSettings"][0].primaryDomain,
  "logo":     *[_type == "designSettings"][0].logoOnLight.asset->url,
  "address":  *[_type == "siteSettings"][0].primaryLocation->{
    address1,
    city,
    state,
    zip,
    officePhone,
    tollFreePhone
  },
  "socials":  *[_type == "footerSettings"][0]{
    facebookUrl,
    instagramUrl,
    twitterUrl,
    linkedInUrl,
    youTubeUrl,
    avvoUrl,
    justiaUrl
  }
}`

// ─── generateStaticParams slug lists ──────────────────────────────────────────
// Bare slug lists per route family for `generateStaticParams` build-time
// enumeration. All exclude drafts and noIndex pages so the SSG output stays
// clean. Routes still set `dynamicParams: true` (the framework default) so
// new docs added after deploy generate on demand and ISR-cache from there.
export const ATTORNEY_SLUGS_QUERY = groq`
  *[_type == "attorneyPage" && !(_id in path("drafts.**")) && coalesce(noIndex, false) == false && defined(slug.current)].slug.current
`
export const STAFF_SLUGS_QUERY = groq`
  *[_type == "staffPage" && !(_id in path("drafts.**")) && coalesce(noIndex, false) == false && defined(slug.current)].slug.current
`
export const BLOG_POST_SLUGS_QUERY = groq`
  *[_type == "blogPost" && !(_id in path("drafts.**")) && coalesce(noIndex, false) == false && defined(slug.current)].slug.current
`
export const BLOG_CATEGORY_SLUGS_QUERY = groq`
  *[_type == "blogCategory" && !(_id in path("drafts.**")) && coalesce(noIndex, false) == false && defined(slug.current)].slug.current
`
export const EVENT_SLUGS_QUERY = groq`
  *[_type == "eventPage" && !(_id in path("drafts.**")) && coalesce(noIndex, false) == false && defined(slug.current)].slug.current
`
export const REVIEW_SLUGS_QUERY = groq`
  *[_type == "reviewPage" && !(_id in path("drafts.**")) && defined(slug.current)].slug.current
`

// ─── Sitemap ──────────────────────────────────────────────────────────────────
// Used by app/sitemap.ts to enumerate routable documents with lastModified
// timestamps. Excludes drafts and noIndex pages. Singleton index documents
// (homePage, attorneyIndex, etc.) supply the lastModified for their
// corresponding hard-coded route; collection documents supply slug + updatedAt.
export const SITEMAP_QUERY = groq`{
  "domain": *[_type == "siteSettings"][0].primaryDomain,
  "home":             *[_type == "homePage"][0]{_updatedAt},
  "attorneyIndex":    *[_type == "attorneyIndex"][0]{_updatedAt},
  "staffIndex":       *[_type == "staffIndex"][0]{_updatedAt},
  "blogIndex":        *[_type == "blogIndex"][0]{_updatedAt},
  "eventIndex":       *[_type == "eventIndex"][0]{_updatedAt},
  "serviceAreaIndex": *[_type == "serviceAreaIndex"][0]{_updatedAt},
  "videoIndex":       *[_type == "videoIndex" && coalesce(noIndex, false) == false][0]{_updatedAt},
  "testimonials":     *[_type == "testimonialsPage"][0]{_updatedAt},
  "attorneys":        *[_type == "attorneyPage" && !(_id in path("drafts.**")) && coalesce(noIndex, false) == false && defined(slug.current)]{"slug": slug.current, _updatedAt},
  "staff":            *[_type == "staffPage"    && !(_id in path("drafts.**")) && coalesce(noIndex, false) == false && defined(slug.current)]{"slug": slug.current, _updatedAt},
  "blogPosts":        *[_type == "blogPost"     && !(_id in path("drafts.**")) && coalesce(noIndex, false) == false && defined(slug.current)]{"slug": slug.current, _updatedAt},
  "blogCategories":   *[_type == "blogCategory" && !(_id in path("drafts.**")) && coalesce(noIndex, false) == false && defined(slug.current)]{"slug": slug.current, _updatedAt},
  "events":           *[_type == "eventPage"    && !(_id in path("drafts.**")) && coalesce(noIndex, false) == false && defined(slug.current)]{"slug": slug.current, _updatedAt},
  "catchAll":         *[
    _type in ["practiceArea","locationPage","geoPracticeArea","generalPage","landingPage","aboutPage","faqPage","serviceAreaPage"]
    && !(_id in path("drafts.**"))
    && coalesce(noIndex, false) == false
    && defined(slug.current)
  ]{"slug": slug.current, _updatedAt}
}`

// ─── Header ───────────────────────────────────────────────────────────────────
export const HEADER_QUERY = groq`{
  "siteSettings": *[_type == "siteSettings"][0]{
    firmName,
    firmNameShort,
    "phone": primaryLocation->officePhone,
    "tollFreePhone": primaryLocation->tollFreePhone
  },
  "designSettings": *[_type == "designSettings"][0]{
    "logoOnLight": logoOnLight{
      "src": asset->url,
      "alt": alt,
      "width": asset->metadata.dimensions.width,
      "height": asset->metadata.dimensions.height
    },
    "logoOnDark": logoOnDark{
      "src": asset->url,
      "alt": alt,
      "width": asset->metadata.dimensions.width,
      "height": asset->metadata.dimensions.height
    },
    "logoMarkOnLight": logoMarkOnLight{
      "src": asset->url,
      "alt": alt,
      "width": asset->metadata.dimensions.width,
      "height": asset->metadata.dimensions.height
    },
    "logoMarkOnDark": logoMarkOnDark{
      "src": asset->url,
      "alt": alt,
      "width": asset->metadata.dimensions.width,
      "height": asset->metadata.dimensions.height
    }
  },
  "mainNavigation": *[_type == "mainNavigation"][0]{
    headerLayout,
    mobileLayout,
    heroMerge,
    sticky,
    stickyHideSupplementary,
    compactStyle,
    defaultScheme,
    scrolledScheme,
    topBarEnabled,
    topBarPinSide,
    topBarLeft,
    topBarRight,
    topBarStyle,
    headerPhone,
    headerPhone2,
    headerPhoneTagline,
    headerCtaLabel,
    headerCtaUrl,
    headerCtaLabel2,
    headerCtaUrl2,
    "navItems": items[]{
      _type,
      label,
      href,
      displayMode,
      "children": select(
        _type == "navItemStandard" => children[]{label, href},
        _type == "navItemAttorneys" => select(
          count(attorneyOrder) > 0 => attorneyOrder[defined(@->_id)]->{
            "_id": _id,
            "label": coalesce(firstName, "") + " " + coalesce(lastName, ""),
            "href": "/" + slug.current + "/"
          },
          *[_type == "attorneyPage"]{
            "label": coalesce(firstName, "") + " " + coalesce(lastName, ""),
            "href": "/" + slug.current + "/"
          } | order(lastName asc, firstName asc)
        ),
        _type == "navItemPracticeAreas" => select(
          count(practiceAreaOrder) > 0 => practiceAreaOrder[defined(@->_id)]->{
            "_id": _id,
            "label": title,
            "href": "/" + slug.current + "/",
            "parentRef": parentPage._ref
          },
          *[_type == "practiceArea"]{
            "_id": _id,
            "label": title,
            "href": "/" + slug.current + "/",
            "parentRef": parentPage._ref
          } | order(title asc)
        )
      )
    }
  }
}`

// ─── Footer ───────────────────────────────────────────────────────────────────
export const FOOTER_QUERY = groq`{
  "designSettings": *[_type == "designSettings"][0]{
    "logoOnDark": logoOnDark{
      "src": asset->url,
      "alt": alt,
      "width": asset->metadata.dimensions.width,
      "height": asset->metadata.dimensions.height
    },
    "logoOnLight": logoOnLight{
      "src": asset->url,
      "alt": alt,
      "width": asset->metadata.dimensions.width,
      "height": asset->metadata.dimensions.height
    },
    "showBackToTop": coalesce(showBackToTop, true)
  },
  "siteSettings": *[_type == "siteSettings"][0]{
    firmName,
    privacyPolicyUrl,
    disclaimerUrl,
    cookiesUrl,
    "address": primaryLocation->{
      address1,
      address2,
      address3,
      city,
      state,
      zip,
      officePhone,
      tollFreePhone,
      emergency24_7,
      emergencyPhone,
      appointmentRequired,
      hours
    }
  },
  "footerSettings": *[_type == "footerSettings"][0]{
    footerLayout,
    footerScheme,
    ctaText,
    ctaUrl,
    actionButton1Label,
    actionButton1Url,
    actionButton2Label,
    actionButton2Url,
    "column1": column1[]{label, href},
    "column2": column2[]{label, href},
    facebookUrl,
    instagramUrl,
    twitterUrl,
    linkedInUrl,
    youTubeUrl,
    "formEmbed": form->formEmbed,
  },
  "locations": *[_type == "location" && locationStatus == "Active"] | order(isPrimary desc, city asc) {
    _id,
    city,
    address1,
    address2,
    address3,
    state,
    zip,
    officePhone,
    tollFreePhone,
    emergency24_7,
    emergencyPhone,
    appointmentRequired,
    hours,
    "pageSlug": *[_type == "locationPage" && references(^._id)][0].slug.current
  }
}`

// ─── Sidebar Fragment ─────────────────────────────────────────────────────────
// Shared sidebar projection for practice area, location, and content pages.
// Blog post pages use an inline variant (the recentPosts sub-query requires
// a context reference, ^.^.slug.current, that cannot be extracted into a fragment).
//
// WS-Sidebar Phase 2.3 — areasOfLaw + orderedAolIds project the full AOL tree
// (parent → child → grandchild) for context-aware hierarchy rendering. The
// editor-selected `practiceArea` ref on the sidebarNav widget is no longer
// queried for hierarchy modes — render context is derived from the visitor's
// pathname client-side. Schema cleanup of the vestigial ref field follows after
// Phase 2.5. See BI/BI-Sidebar.md §1.
export const SIDEBAR_FRAGMENT = groq`sidebar[]{
  _type,
  _key,
  _type == "sidebarTableOfContents" => {
    "_componentType": "sidebarTableOfContents"
  },
  _type == "reference" => @->{
    "_componentType": _type,
    name,
    header,
    description,
    mode,
    layout,
    postCount,
    "formEmbed": form->formEmbed,
    tagline,
    supportingText1,
    supportingText2,
    phoneNumber,
    "button": button{title, url, variant},
    "orderedAolIds": *[_type == "mainNavigation"][0]
      .items[_type == "navItemPracticeAreas"][0]
      .practiceAreaOrder[]._ref,
    "areasOfLaw": *[
      _type == "practiceArea" && !defined(parentPage) && defined(slug.current)
    ]{
      _id,
      "slug": slug.current,
      title,
      "children": *[
        _type == "practiceArea" && parentPage._ref == ^._id && defined(slug.current)
      ]{
        _id,
        "slug": slug.current,
        title,
        "grandchildren": *[
          _type == "practiceArea" && parentPage._ref == ^._id && defined(slug.current)
        ]{
          "slug": slug.current,
          title,
        } | order(title asc),
      } | order(title asc),
    },
    "orderedAttorneyIds": select(
      mode == 'practiceArea' => *[_type == "attorneyIndex"][0].orderedAttorneys[]._ref,
      null
    ),
    "attorneys": select(
      mode == 'all' => *[_type == "attorneyIndex"][0].orderedAttorneys[defined(@->_id)]->{_id, title, "slug": slug.current, "photo": photo{"src": asset->url, "alt": coalesce(alt, "")}},
      mode == 'practiceArea' => *[_type == "attorneyPage" && references(^.practiceAreaPage._ref)]{_id, title, "slug": slug.current, "photo": photo{"src": asset->url, "alt": coalesce(alt, "")}},
      attorneys[defined(@->_id)]->{_id, title, "slug": slug.current, "photo": photo{"src": asset->url, "alt": coalesce(alt, "")}}
    ),
    "links": links[defined(@->_id)]->{
      _id,
      _type,
      "slug": slug.current,
      title
    }
  }
}`

// ─── Internal Hero Fragment ───────────────────────────────────────────────────
// Every internal-hero field EXCEPT `heading`. Page-type queries that need a
// page-specific heading fallback project `"heading": coalesce(heading, "...")`
// and splice these shared override fields in, so ALL page types surface the full
// cascade (scheme / bg / foreground / none / scrim / fit) — not just the few that
// used INTERNAL_HERO_FRAGMENT. Embed as:
//   "hero": hero{ "heading": coalesce(heading, "X"), ${INTERNAL_HERO_OVERRIDE_FIELDS} }
export const INTERNAL_HERO_OVERRIDE_FIELDS = groq`
  description,
  "buttons": buttons[]{title, url, variant},
  schemeOverride,
  backgroundNone,
  foregroundNone,
  scrimOpacityOverride,
  "backgroundImage": backgroundImage{
    "src": asset->url,
    "alt": alt,
    "fit": fit,
    "width": asset->metadata.dimensions.width,
    "height": asset->metadata.dimensions.height
  },
  "foregroundImage": foregroundImage{
    "src": asset->url,
    "alt": alt,
    "hotspot": hotspot{x, y},
    "width": asset->metadata.dimensions.width,
    "height": asset->metadata.dimensions.height
  }
`

// Embed in page queries as: hero ${INTERNAL_HERO_FRAGMENT}
export const INTERNAL_HERO_FRAGMENT = groq`{
  heading,
  ${INTERNAL_HERO_OVERRIDE_FIELDS}
}`

// ─── Design Tokens ────────────────────────────────────────────────────────────
export const DESIGN_TOKENS_QUERY = groq`
  *[_type == "designSettings"][0]{
    uiRadius,
    buttonShape,
    buttonAnimation,
    tertiaryStyle,
    taglineStyle,
    elevationStyle,
    motionTempo,
    marketingScale,
    fontPairingPreset,
    "colorApproach": colorApproach,
    "primaryColor":  primaryColor,
    "actionColor":   actionColor,
    "accent1Color":  accent1Color,
    "accent2Color":  accent2Color,
    internalHeroBackground,
    heroScrimOpacity,
    "siteHeroBackgroundImage": siteHeroBackgroundImage{
      "src": asset->url,
      "alt": alt,
      "fit": fit,
      "width": asset->metadata.dimensions.width,
      "height": asset->metadata.dimensions.height
    },
    "siteHeroForegroundImage": siteHeroForegroundImage{
      "src": asset->url,
      "alt": alt,
      "hotspot": hotspot{x, y},
      "width": asset->metadata.dimensions.width,
      "height": asset->metadata.dimensions.height
    },
    // WS-Sidebar Phase 2.1 — sidebar UI element settings. Behavior wired in
    // Phase 2.5; resolver in lib/designTokens.ts (resolveSidebarDesignSettings).
    sidebarNavIconStyle,
    sidebarWidgetHeaderLine,
    sidebarItemSeparators,
    "headingFont": customFonts.headingFont{
      name,
      "regular":   regular.asset->url,
      "bold":      bold.asset->url,
      "italic":    italic.asset->url,
    },
    "bodyFont": customFonts.bodyFont{
      name,
      "regular":   regular.asset->url,
      "semibold":  semibold.asset->url,
      "bold":      bold.asset->url,
      "italic":    italic.asset->url,
      "boldItalic": boldItalic.asset->url,
    },
  }
`

// ─── Global CTA ───────────────────────────────────────────────────────────────
//
// Per-page `ctaFormOverride` fields use the `ctaFormSection` object schema,
// which carries a `buttons[]` array of `ctaButton` items (matching GlobalCta's
// post-WS2 shape). Direct projection — no synthesis. The runtime layer
// (GlobalCta + toCtaItems) filters out null/empty entries.
//
// Migration history: the schema previously used `primaryButton` /
// `secondaryButton` named slots, and this fragment synthesized a 2-element
// array from them to keep a single runtime shape. Migrated in
// WS-Outstanding-Phase-4 (2026-05-11) — see
// Clients/henningson-snoxell-ltd/audits/WS-Outstanding-Phase-4/migration-log.md
// for the per-document migration log and rollback reference.
export const CTA_OVERRIDE_FRAGMENT = groq`{
  tagline,
  heading,
  description,
  "buttons": buttons[]{title, url, variant}
}`

export const GLOBAL_CTA_QUERY = groq`
  *[_type == "globalCta"][0]{
    layout,
    tagline,
    heading,
    description,
    "buttons": buttons[]{title, url, variant},
    "formEmbed": form->formEmbed,
  }
`

// ─── NAP Tokens ───────────────────────────────────────────────────────────────
export const NAP_TOKENS_QUERY = groq`
  *[_type == "siteSettings"][0]{
    firmName,
    firmNameShort,
    "profileLayout": *[_type == "designSettings"][0].profileLayout,
    "profileCtaLabel": *[_type == "designSettings"][0].profileCtaLabel,
    "profileCtaUrl": *[_type == "designSettings"][0].profileCtaUrl,
    "primaryPhone": primaryLocation->officePhone,
    "primaryTollFree": primaryLocation->tollFreePhone,
    "primaryLocationId": primaryLocation->_id,
    "locations": *[_type == "location" && locationStatus == "Active"]{
      "_id": _id,
      "phone": officePhone,
      "fax": officeFax,
      address1,
      address2,
      address3,
      city,
      state,
      zip,
      appointmentRequired,
      emergency24_7,
      emergencyPhone
    },
  }
`

// ─── Homepage ─────────────────────────────────────────────────────────────────
// The homepage's full-width sections (silo nav, CTA, testimonials, …). The unique
// homepage hero is a separate build; this projects the stacked sections so they
// render below it.
export const HOME_QUERY = groq`
  *[_type == "homePage"][0]{
    "sections": sections ${SECTIONS_FRAGMENT}
  }
`

// ─── Contact Page ─────────────────────────────────────────────────────────────
export const CONTACT_PAGE_QUERY = groq`
  *[_type == "contactPage"][0]{
    seoTitle,
    metaDescription,
    noIndex,
    canonicalUrl,
    "showHero": coalesce(showHero, true),
    "hero": hero ${INTERNAL_HERO_FRAGMENT},
    tagline,
    heading,
    description,
    "formEmbed": contactForm->formEmbed
  }
`

// ─── Testimonials Page ────────────────────────────────────────────────────────
export const TESTIMONIALS_PAGE_QUERY = groq`
  *[_type == "testimonialsPage"][0]{
    seoTitle,
    metaDescription,
    noIndex,
    canonicalUrl,
    "hero": hero ${INTERNAL_HERO_FRAGMENT},
    "title": coalesce(hero.heading, title, "Testimonials"),
    hideCtaForm,
    "ctaOverride": ctaFormOverride ${CTA_OVERRIDE_FRAGMENT},
    "testimonials": testimonials[defined(@->_id)]->{
      _id,
      quote,
      name,
      caseType,
      numberOfStars,
      "avatar": avatar{
        "src": asset->url,
        "alt": alt,
        "width": asset->metadata.dimensions.width,
        "height": asset->metadata.dimensions.height
      }
    }
  }
`

// ─── Attorney Index ───────────────────────────────────────────────────────────
export const ATTORNEY_INDEX_QUERY = groq`
  *[_type == "attorneyIndex"][0]{
    "slug": slug.current,
    seoTitle,
    metaDescription,
    noIndex,
    canonicalUrl,
    "hero": hero{
      "heading": coalesce(heading, "Our Attorneys"),
      ${INTERNAL_HERO_OVERRIDE_FIELDS}
    },
    "title": coalesce(hero.heading, "Our Attorneys"),
    tagline,
    heading,
    description,
    hideCtaForm,
    "ctaOverride": ctaFormOverride ${CTA_OVERRIDE_FRAGMENT},
    "orderedAttorneys": orderedAttorneys[defined(@->_id)]->{
      _id,
      "slug": slug.current,
      firstName,
      middleName,
      lastName,
      suffix,
      h1,
      jobTitle,
      linkedIn,
      "photo": photo{
        "src": asset->url,
        "alt": coalesce(alt, ""),
        "width": asset->metadata.dimensions.width,
        "height": asset->metadata.dimensions.height
      },
      "practiceAreas": practiceAreas[]{
        label,
        "slug": page->slug.current
      }
    }
  }
`

export const ATTORNEY_PAGES_QUERY = groq`
  *[_type == "attorneyPage"] | order(lastName asc, firstName asc) {
    "slug": slug.current,
    firstName,
    middleName,
    lastName,
    suffix,
    h1,
    jobTitle,
    linkedIn,
    "photo": photo{
      "src": asset->url,
      "alt": coalesce(alt, ""),
      "width": asset->metadata.dimensions.width,
      "height": asset->metadata.dimensions.height
    },
    "practiceAreas": practiceAreas[]{
      label,
      "slug": page->slug.current
    }
  }
`

// ─── Staff Index ─────────────────────────────────────────────────────────────
export const STAFF_INDEX_QUERY = groq`
  *[_type == "staffIndex"][0]{
    "slug": slug.current,
    seoTitle,
    metaDescription,
    noIndex,
    canonicalUrl,
    "hero": hero{
      "heading": coalesce(heading, "Our Team"),
      ${INTERNAL_HERO_OVERRIDE_FIELDS}
    },
    "title": coalesce(hero.heading, "Our Team"),
    hideCtaForm,
    "ctaOverride": ctaFormOverride ${CTA_OVERRIDE_FRAGMENT},
    "orderedStaff": orderedStaff[defined(@->_id)]->{
      _id,
      "slug": slug.current,
      firstName,
      lastName,
      jobTitle,
      "photo": photo{
        "src": asset->url,
        "alt": coalesce(alt, ""),
        "width": asset->metadata.dimensions.width,
        "height": asset->metadata.dimensions.height
      }
    }
  }
`

export const STAFF_PAGES_QUERY = groq`
  *[_type == "staffPage"] | order(lastName asc, firstName asc) {
    "slug": slug.current,
    firstName,
    lastName,
    jobTitle,
    "photo": photo{
      "src": asset->url,
      "alt": coalesce(alt, ""),
      "width": asset->metadata.dimensions.width,
      "height": asset->metadata.dimensions.height
    }
  }
`

export const STAFF_PAGE_QUERY = groq`
  *[_type == "staffPage" && slug.current == $slug][0]{
    "slug": slug.current,
    seoTitle,
    metaDescription,
    noIndex,
    canonicalUrl,
    firstName,
    lastName,
    jobTitle,
    email,
    phone,
    "photo": photo{
      "src": asset->url,
      "alt": coalesce(alt, ""),
      "width": asset->metadata.dimensions.width,
      "height": asset->metadata.dimensions.height
    },
    "biography": biography ${BLOCK_CONTENT_FRAGMENT},
    "location": location->{
      city,
      address1,
      address2,
      address3,
      state,
      zip,
      officePhone
    },
    hideCtaForm,
    "ctaFormOverride": ctaFormOverride ${CTA_OVERRIDE_FRAGMENT}
  }
`

// ─── Service Area Index ───────────────────────────────────────────────────────
export const SERVICE_AREA_INDEX_QUERY = groq`
  *[_type == "serviceAreaIndex"][0]{
    "slug": slug.current,
    seoTitle,
    metaDescription,
    noIndex,
    canonicalUrl,
    "hero": hero{
      "heading": coalesce(heading, "Service Area"),
      ${INTERNAL_HERO_OVERRIDE_FIELDS}
    },
    "title": coalesce(hero.heading, title, "Service Area"),
    tagline,
    heading,
    description,
    hideCtaForm,
    "ctaOverride": ctaFormOverride ${CTA_OVERRIDE_FRAGMENT}
  }
`

export const SERVICE_AREA_PAGES_QUERY = groq`
  *[_type == "serviceAreaPage"] | order(title asc) {
    "slug": slug.current,
    "displayName": coalesce(hero.heading, title),
  }
`

// ─── Attorney Profile Page ────────────────────────────────────────────────────
export const ATTORNEY_PAGE_QUERY = groq`
  *[_type == "attorneyPage" && slug.current == $slug][0]{
    "slug": slug.current,
    seoTitle,
    metaDescription,
    noIndex,
    canonicalUrl,
    firstName,
    middleName,
    lastName,
    suffix,
    h1,
    jobTitle,
    "ctaOverride": ctaOverride{label, url},
    "photo": photo{
      "src": asset->url,
      "alt": coalesce(alt, ""),
      "width": asset->metadata.dimensions.width,
      "height": asset->metadata.dimensions.height
    },
    email,
    showEmail,
    showLocations,
    linkedIn,
    avvo,
    superLawyers,
    findLaw,
    martindale,
    "fullBiography": fullBiography ${BLOCK_CONTENT_FRAGMENT},
    "practiceAreas": practiceAreas[]{
      label,
      "slug": page->slug.current
    },
    "location": location->{
      address1,
      city,
      state,
      zip,
      officePhone,
      tollFreePhone
    },
    yearAdmittedToBar,
    "barAdmissions": barAdmissions ${BLOCK_CONTENT_FRAGMENT},
    "stateBarAdmissions": stateBarAdmissions ${BLOCK_CONTENT_FRAGMENT},
    "educationDegrees": educationDegrees ${BLOCK_CONTENT_FRAGMENT},
    "certifiedLegalSpecialties": certifiedLegalSpecialties ${BLOCK_CONTENT_FRAGMENT},
    "honors": honors ${BLOCK_CONTENT_FRAGMENT},
    "professionalAssociations": professionalAssociations ${BLOCK_CONTENT_FRAGMENT},
    "proBonoActivities": proBonoActivities ${BLOCK_CONTENT_FRAGMENT},
    "publications": publications ${BLOCK_CONTENT_FRAGMENT},
    "presentationsSeminars": presentationsSeminars ${BLOCK_CONTENT_FRAGMENT},
    "representativeCases": representativeCases ${BLOCK_CONTENT_FRAGMENT},
    "pastPositions": pastPositions ${BLOCK_CONTENT_FRAGMENT},
    "languages": languages ${BLOCK_CONTENT_FRAGMENT},
    hideCtaForm,
    "ctaFormOverride": ctaFormOverride ${CTA_OVERRIDE_FRAGMENT}
  }
`

// ─── Practice Area ────────────────────────────────────────────────────────────
export const PRACTICE_AREA_QUERY = groq`
  *[_type in ["practiceArea", "geoPracticeArea", "serviceAreaPage"] && slug.current == $slug][0]{
    title,
    "slug": slug.current,
    seoTitle,
    metaDescription,
    noIndex,
    canonicalUrl,
    "parentPage": parentPage->{
      title,
      "slug": slug.current,
      "parentPage": parentPage->{
        title,
        "slug": slug.current
      }
    },
    "hero": hero {
      "heading": coalesce(heading, ^.title),
      ${INTERNAL_HERO_OVERRIDE_FIELDS}
    },
    "body": body ${BLOCK_CONTENT_FRAGMENT},
    "faqItems": faqItems[defined(@->_id)]->{
      question,
      "answer": answer ${BLOCK_CONTENT_FRAGMENT},
      category,
      "slug": slug.current,
      tags
    },
    ${SIDEBAR_FRAGMENT},
    "sections": sections ${SECTIONS_FRAGMENT},
    hideCtaForm,
    "ctaOverride": ctaFormOverride ${CTA_OVERRIDE_FRAGMENT}
  }
`

// ─── Event Index Page ─────────────────────────────────────────────────────────
export const EVENT_INDEX_PAGE_QUERY = groq`
  *[_type == "eventIndex"][0]{
    "slug": slug.current,
    seoTitle,
    metaDescription,
    noIndex,
    canonicalUrl,
    "hero": hero ${INTERNAL_HERO_FRAGMENT},
    "sections": sections ${SECTIONS_FRAGMENT},
    hideCtaForm,
    "ctaOverride": ctaFormOverride ${CTA_OVERRIDE_FRAGMENT}
  }
`

// ─── Event Index — All Cards ──────────────────────────────────────────────────
// Fetches card-level fields for all events; sort/filter done in Next.js
export const EVENT_INDEX_QUERY = groq`
  *[_type == "eventPage"] | order(eventDate asc) {
    title,
    "slug": slug.current,
    eventDate,
    eventEndDate,
    eventType,
    "category": category->title,
    locationType,
    locationAddress,
    registrationUrl,
    registrationCta,
    "formEmbed": registrationForm->formEmbed,
    "attorneys": attorneys[defined(@->_id)]->{
      _id,
      title,
      "slug": slug.current
    }
  }
`

// ─── Event Detail Page ────────────────────────────────────────────────────────
export const EVENT_PAGE_QUERY = groq`
  *[_type == "eventPage" && slug.current == $slug][0]{
    title,
    "slug": slug.current,
    seoTitle,
    metaDescription,
    noIndex,
    canonicalUrl,
    eventDate,
    eventEndDate,
    eventType,
    "category": category->title,
    locationType,
    locationAddress,
    virtualLink,
    registrationUrl,
    registrationCta,
    "formEmbed": registrationForm->formEmbed,
    "body": body ${BLOCK_CONTENT_FRAGMENT},
    "attorneys": attorneys[defined(@->_id)]->{
      _id,
      title,
      "slug": slug.current
    },
    hideCtaForm,
    "ctaOverride": ctaFormOverride ${CTA_OVERRIDE_FRAGMENT}
  }
`

// ─── Blog Index Page ──────────────────────────────────────────────────────────
export const BLOG_INDEX_PAGE_QUERY = groq`
  *[_type == "blogIndex"][0]{
    "slug": slug.current,
    seoTitle,
    metaDescription,
    noIndex,
    canonicalUrl,
    "hero": hero {
      "heading": coalesce(heading, "Blog"),
      ${INTERNAL_HERO_OVERRIDE_FIELDS}
    },
    "title": coalesce(hero.heading, "Blog"),
    hideCtaForm,
    "ctaOverride": ctaFormOverride ${CTA_OVERRIDE_FRAGMENT}
  }
`

// ─── Video Library Page ───────────────────────────────────────────────────────
// Curated, ordered video refs + an optional featured spotlight. The grid filter
// chips are derived client-side from each video's videoType.
const VIDEO_CARD_FRAGMENT = groq`{
  "id": _id,
  title,
  youTubeUrl,
  description,
  videoType,
  duration,
  "thumbnail": thumbnail{
    "src": asset->url,
    "alt": coalesce(alt, ""),
    "width": asset->metadata.dimensions.width,
    "height": asset->metadata.dimensions.height
  }
}`

export const VIDEO_INDEX_PAGE_QUERY = groq`
  *[_type == "videoIndex"][0]{
    "slug": slug.current,
    seoTitle,
    metaDescription,
    noIndex,
    canonicalUrl,
    "hero": hero {
      "heading": coalesce(heading, "Video Library"),
      ${INTERNAL_HERO_OVERRIDE_FIELDS}
    },
    "title": coalesce(hero.heading, "Video Library"),
    tagline,
    heading,
    description,
    "featuredVideo": featuredVideo->${VIDEO_CARD_FRAGMENT},
    "videos": videos[defined(@->_id)]->${VIDEO_CARD_FRAGMENT},
    hideCtaForm,
    "ctaOverride": ctaFormOverride ${CTA_OVERRIDE_FRAGMENT}
  }
`

// ─── Blog Posts — Index Cards ─────────────────────────────────────────────────
// All posts newest-first; read time derived from bodyText word count in JS
export const BLOG_POSTS_QUERY = groq`
  *[_type == "blogPost"] | order(publishedAt desc) {
    "slug": slug.current,
    h1,
    metaDescription,
    publishedAt,
    "category": category->{
      title,
      "slug": slug.current
    },
    "bodyText": pt::text(body)
  }
`

// Related posts — same category as the current post, newest first, excluding
// the current post. If no category match exists this returns the most recent
// posts overall. Drives the SSR inter-blog linking module on every blog post
// page so non-JS crawlers see a discoverable trail between posts and
// individual posts aren't dead-ends from a crawl perspective.
export const RELATED_POSTS_QUERY = groq`
  {
    "byCategory": *[
      _type == "blogPost" &&
      slug.current != $slug &&
      defined(category._ref) &&
      category._ref == *[_type == "blogPost" && slug.current == $slug][0].category._ref
    ] | order(publishedAt desc) [0..3] {
      "slug": slug.current,
      h1,
      metaDescription,
      publishedAt,
      "category": category->{title, "slug": slug.current}
    },
    "fallback": *[_type == "blogPost" && slug.current != $slug] | order(publishedAt desc) [0..3] {
      "slug": slug.current,
      h1,
      metaDescription,
      publishedAt,
      "category": category->{title, "slug": slug.current}
    }
  }
`

// ─── Blog Post Detail Page ────────────────────────────────────────────────────
export const BLOG_POST_PAGE_QUERY = groq`
  *[_type == "blogPost" && slug.current == $slug][0]{
    h1,
    "slug": slug.current,
    seoTitle,
    metaDescription,
    noIndex,
    canonicalUrl,
    publishedAt,
    lastModified,
    "featuredImage": featuredImage{
      "src": asset->url,
      "alt": alt,
      "width": asset->metadata.dimensions.width,
      "height": asset->metadata.dimensions.height
    },
    "bodyText": pt::text(body),
    "body": body ${BLOCK_CONTENT_FRAGMENT},
    "authors": authors[defined(@->_id)]->{
      _id,
      firstName,
      lastName,
      jobTitle,
      "slug": slug.current,
      "photo": photo{
        "src": asset->url,
        "alt": alt,
        "width": asset->metadata.dimensions.width,
        "height": asset->metadata.dimensions.height
      }
    },
    "category": category->{
      title,
      "slug": slug.current
    },
    "sidebar": sidebar[]{
      _type,
      _key,
      _type == "sidebarTableOfContents" => {
        "_componentType": "sidebarTableOfContents"
      },
      _type == "reference" => @->{
        "_componentType": _type,
        name,
        header,
        description,
        mode,
        layout,
        postCount,
        "formEmbed": form->formEmbed,
        tagline,
        supportingText1,
        supportingText2,
        phoneNumber,
        "button": button{title, url, variant},
        // WS-Sidebar Phase 2.3 — see SIDEBAR_FRAGMENT comment block. This
        // inline projection (blog post page) must stay in sync with the
        // fragment because the recentPosts sub-query below requires the
        // ^.^.slug.current parent-reference that prevents fragment extraction.
        "orderedAolIds": *[_type == "mainNavigation"][0]
          .items[_type == "navItemPracticeAreas"][0]
          .practiceAreaOrder[]._ref,
        "areasOfLaw": *[
          _type == "practiceArea" && !defined(parentPage) && defined(slug.current)
        ]{
          _id,
          "slug": slug.current,
          title,
          "children": *[
            _type == "practiceArea" && parentPage._ref == ^._id && defined(slug.current)
          ]{
            _id,
            "slug": slug.current,
            title,
            "grandchildren": *[
              _type == "practiceArea" && parentPage._ref == ^._id && defined(slug.current)
            ]{
              "slug": slug.current,
              title,
            } | order(title asc),
          } | order(title asc),
        },
        "orderedAttorneyIds": select(
          mode == 'practiceArea' => *[_type == "attorneyIndex"][0].orderedAttorneys[]._ref,
          null
        ),
        "attorneys": select(
          mode == 'all' => *[_type == "attorneyIndex"][0].orderedAttorneys[defined(@->_id)]->{_id, title, "slug": slug.current, "photo": photo{"src": asset->url, "alt": coalesce(alt, "")}},
          mode == 'practiceArea' => *[_type == "attorneyPage" && references(^.practiceAreaPage._ref)]{_id, title, "slug": slug.current, "photo": photo{"src": asset->url, "alt": coalesce(alt, "")}},
          attorneys[defined(@->_id)]->{_id, title, "slug": slug.current, "photo": photo{"src": asset->url, "alt": coalesce(alt, "")}}
        ),
        "links": links[defined(@->_id)]->{
          _id,
          _type,
          "slug": slug.current,
          title
        },
        "posts": select(
          mode == "recentPosts" => *[_type == "blogPost" && slug.current != ^.^.slug.current] | order(publishedAt desc)[0..20]{
            h1,
            "slug": slug.current
          },
          mode == "faqPosts" => *[_type == "blogPostFaq"] | order(publishedAt desc)[0..20]{
            h1,
            "slug": slug.current
          }
        )
      }
    },
    hideCtaForm,
    "ctaOverride": ctaFormOverride ${CTA_OVERRIDE_FRAGMENT}
  }
`

// ─── Blog Categories — active only ───────────────────────────────────────────
// Only categories that have at least one published blogPost
export const BLOG_CATEGORIES_QUERY = groq`
  *[_type == "blogCategory" && count(*[_type == "blogPost" && references(^._id)]) > 0]{
    title,
    "slug": slug.current
  } | order(title asc)
`

// ─── Blog Category Page ───────────────────────────────────────────────────────
export const BLOG_CATEGORY_PAGE_QUERY = groq`
  *[_type == "blogCategory" && slug.current == $slug][0]{
    title,
    "slug": slug.current,
    seoTitle,
    metaDescription,
    noIndex,
    canonicalUrl,
    h1,
    tagline,
    heading,
    description,
    hideCtaForm,
    "ctaOverride": ctaFormOverride ${CTA_OVERRIDE_FRAGMENT}
  }
`

// ─── Review Page ─────────────────────────────────────────────────────────────
// Slug is whatever the user sets in Sanity (e.g. "review-us", "review-us-maple-grove").
// $slug is the full Sanity slug.current value.
export const REVIEW_PAGE_QUERY = groq`{
  "page": *[_type == "reviewPage" && slug.current == $slug][0]{
    h1,
    seoTitle,
    "slug": slug.current,
    noIndex,
    "blurb": blurb ${BLOCK_CONTENT_FRAGMENT},
    "reviewLinks": reviewLinks[]{
      platform,
      url,
      label
    },
    "feedbackFormEmbed": feedbackForm->formEmbed
  },
  "logo": *[_type == "designSettings"][0]{
    logoOnLight{
      "src": asset->url,
      "alt": alt,
      "width": asset->metadata.dimensions.width,
      "height": asset->metadata.dimensions.height
    }
  }.logoOnLight,
  "firmInfo": *[_type == "siteSettings"][0]{
    firmName,
    "address": primaryLocation->{
      address1,
      city,
      state,
      zip,
      officePhone
    }
  }
}`

// ─── Blog Category Posts ──────────────────────────────────────────────────────
export const BLOG_CATEGORY_POSTS_QUERY = groq`
  *[_type == "blogPost" && category->slug.current == $slug] | order(publishedAt desc) {
    "slug": slug.current,
    h1,
    metaDescription,
    publishedAt,
    "category": category->{
      title,
      "slug": slug.current
    },
    "bodyText": pt::text(body)
  }
`

// ─── Location Page ────────────────────────────────────────────────────────────
export const LOCATION_PAGE_QUERY = groq`
  *[_type == "locationPage" && slug.current == $slug][0]{
    _type,
    "title": coalesce(title, ""),
    "slug": slug.current,
    seoTitle,
    metaDescription,
    noIndex,
    canonicalUrl,
    "hero": hero {
      "heading": coalesce(heading, ^.title),
      ${INTERNAL_HERO_OVERRIDE_FIELDS}
    },
    "body": body ${BLOCK_CONTENT_FRAGMENT},
    mapEmbed,
    "locationData": locationRef->{
      "_id": _id,
      city,
      state,
      address1,
      address2,
      address3,
      zip,
      officePhone,
      officeFax,
      tollFreePhone,
      hours,
      emergency24_7,
      emergencyPhone,
      appointmentRequired,
      gbpCidUrl
    },
    ${SIDEBAR_FRAGMENT},
    "sections": sections ${SECTIONS_FRAGMENT},
    hideCtaForm,
    "ctaOverride": ctaFormOverride ${CTA_OVERRIDE_FRAGMENT}
  }
`

// ─── General Content Pages ─────────────────────────────────────────────────────
// Handles: aboutPage, contactPage, faqPage, generalPage, landingPage
// All share the same hero/body/sidebar/sections structure as practiceArea.
export const CONTENT_PAGE_QUERY = groq`
  *[
    slug.current == $slug &&
    _type in ["aboutPage", "contactPage", "faqPage", "generalPage", "landingPage"]
  ][0]{
    _type,
    "title": coalesce(title, ""),
    "slug": slug.current,
    seoTitle,
    metaDescription,
    noIndex,
    canonicalUrl,
    "parentPage": parentPage->{
      title,
      "slug": slug.current,
      "parentPage": parentPage->{
        title,
        "slug": slug.current
      }
    },
    "hero": hero {
      "heading": coalesce(heading, ^.title),
      ${INTERNAL_HERO_OVERRIDE_FIELDS}
    },
    "body": body ${BLOCK_CONTENT_FRAGMENT},
    "faqItems": faqItems[defined(@->_id)]->{
      question,
      "answer": answer ${BLOCK_CONTENT_FRAGMENT},
      category,
      "slug": slug.current,
      tags
    },
    ${SIDEBAR_FRAGMENT},
    "sections": sections ${SECTIONS_FRAGMENT},
    hideCtaForm,
    "ctaOverride": ctaFormOverride ${CTA_OVERRIDE_FRAGMENT}
  }
`
