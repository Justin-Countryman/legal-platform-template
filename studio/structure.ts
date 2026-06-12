import {StructureBuilder} from 'sanity/structure'

export const structure = (S: StructureBuilder) =>
  S.list()
    .title('Legal Weblaunch Studio')
    .items([

      // ─── Settings ─────────────────────────────────────────────────────────
      S.listItem()
        .title('Site Settings')
        .id('siteSettings')
        .child(
          S.document()
            .schemaType('siteSettings')
            .documentId('siteSettings')
        ),
      S.listItem()
        .title('Design Settings')
        .id('designSettings')
        .child(
          S.document()
            .schemaType('designSettings')
            .documentId('designSettings')
            .title('Design Settings')
        ),
      S.listItem()
        .title('Header Settings')
        .id('mainNavigation')
        .child(
          S.document()
            .schemaType('mainNavigation')
            .documentId('mainNavigation')
            .title('Header Settings')
        ),
      S.listItem()
        .title('Footer Settings')
        .id('footerSettings')
        .child(
          S.document()
            .schemaType('footerSettings')
            .documentId('footerSettings')
            .title('Footer Settings')
        ),
      S.divider(),

      // ─── Core Pages ───────────────────────────────────────────────────────
      // Fixed order: Home, About, Contact, Location, General.
      S.listItem()
        .title('Core Pages')
        .child(
          S.list()
            .title('Core Pages')
            .items([
              S.listItem()
                .title('Homepage')
                .id('homePage')
                .child(
                  S.document()
                    .schemaType('homePage')
                    .documentId('homePage')
                    .title('Homepage')
                ),
              S.listItem()
                .title('About')
                .child(
                  S.list()
                    .title('About')
                    .items([
                      S.documentTypeListItem('aboutPage').title('About Page'),
                      S.listItem()
                        .title('About Sub-Pages')
                        .child(
                          S.documentList()
                            .title('About Sub-Pages')
                            .filter('_type == "generalPage" && parentPage._ref in *[_type == "aboutPage"]._id')
                        ),
                    ])
                ),
              S.documentTypeListItem('contactPage').title('Contact Page'),
              S.documentTypeListItem('locationPage').title('Location Pages'),
              S.listItem()
                .title('General Pages')
                .child(
                  S.documentList()
                    .title('General Pages')
                    .filter('_type == "generalPage" && !defined(parentPage) && !(_id in *[_type == "generalPage" && defined(parentPage)].parentPage._ref)')
                ),
            ])
        ),

      S.listItem()
        .title('Practice Areas')
        .child(
          S.documentList()
            .title('Practice Areas')
            .schemaType('practiceArea')
            .filter('_type == "practiceArea"')
            .defaultOrdering([
              {field: 'parentPage', direction: 'asc'},
              {field: 'slug.current', direction: 'asc'},
            ])
        ),

      S.listItem()
        .title('People')
        .child(
          S.list()
            .title('People')
            .items([
              S.documentTypeListItem('attorneyIndex').title('Attorney Index'),
              S.documentTypeListItem('attorneyPage').title('Attorneys'),
              S.documentTypeListItem('staffIndex').title('Staff Index'),
              S.documentTypeListItem('staffPage').title('Staff'),
            ])
        ),

      S.listItem()
        .title('Blog')
        .child(
          S.list()
            .title('Blog')
            .items([
              S.documentTypeListItem('blogIndex').title('Blog Index'),
              S.documentTypeListItem('blogPost').title('Blog Posts'),
              S.documentTypeListItem('blogCategory').title('Blog Categories'),
              S.documentTypeListItem('blogTag').title('Blog Tags'),
            ])
        ),

      // ─── Specialty Pages (alphabetical) ───────────────────────────────────
      S.listItem()
        .title('Specialty Pages')
        .child(
          S.list()
            .title('Specialty Pages')
            .items([
              S.listItem()
                .title('Events')
                .child(
                  S.list()
                    .title('Events')
                    .items([
                      S.listItem()
                        .title('Events Index')
                        .id('eventIndex')
                        .child(
                          S.document()
                            .schemaType('eventIndex')
                            .documentId('eventIndex')
                            .title('Events Index')
                        ),
                      S.documentTypeListItem('eventPage').title('Events'),
                    ])
                ),
              S.documentTypeListItem('faqPage').title('FAQ Pages'),
              S.listItem()
                .title('Geo Practice Areas')
                .child(
                  S.documentList()
                    .title('Geo Practice Areas')
                    .schemaType('geoPracticeArea')
                    .filter('_type == "geoPracticeArea"')
                    .defaultOrdering([
                      {field: 'parentPage', direction: 'asc'},
                      {field: 'slug.current', direction: 'asc'},
                    ])
                ),
              S.documentTypeListItem('landingPage').title('Landing Pages'),
              S.documentTypeListItem('reviewPage').title('Review Pages'),
              S.listItem()
                .title('Service Areas')
                .child(
                  S.list()
                    .title('Service Areas')
                    .items([
                      S.documentTypeListItem('serviceAreaIndex').title('Service Area Index'),
                      S.documentTypeListItem('serviceAreaPage').title('Service Area Pages'),
                    ])
                ),
              S.documentTypeListItem('testimonialsPage').title('Testimonials Page'),
              S.listItem()
                .title('Video Library Page')
                .id('videoIndex')
                .child(
                  S.document()
                    .schemaType('videoIndex')
                    .documentId('videoIndex')
                    .title('Video Library Page')
                ),
            ])
        ),

      S.divider(),

      // ─── Features ─────────────────────────────────────────────────────────
      S.listItem()
        .title('Full Width Sections')
        .child(
          S.list()
            .title('Full Width Sections')
            .items([
              S.listItem()
                .title('Global CTA')
                .id('globalCta')
                .child(
                  S.document()
                    .schemaType('globalCta')
                    .documentId('globalCta')
                ),
              S.divider(),
              S.documentTypeListItem('testimonialsGrid').title('Grid Testimonials Sections'),
              S.documentTypeListItem('featuredTestimonial').title('Featured Testimonial Sections'),
              S.divider(),
              S.documentTypeListItem('attorneySection').title('Attorney Sections'),
              S.documentTypeListItem('badgesSection').title('Badges Sections'),
              S.documentTypeListItem('ctaSection').title('Banner CTA Sections'),
              S.documentTypeListItem('faqSection').title('FAQ Sections'),
              S.documentTypeListItem('practiceAreaNav').title('Practice Area Nav Sections'),
              S.documentTypeListItem('reviewsSection').title('Reviews Sections'),
              S.documentTypeListItem('videoSection').title('Video Sections'),
            ])
        ),

      S.listItem()
        .title('Sidebar Widgets')
        .child(
          S.list()
            .title('Sidebar Widgets')
            .items([
              S.documentTypeListItem('sidebarNav').title('Sidebar Nav'),
              S.documentTypeListItem('sidebarAttorneyList').title('Sidebar Attorney Lists'),
              S.documentTypeListItem('sidebarCtaBox').title('Sidebar CTA'),
              S.documentTypeListItem('sidebarFormEmbed').title('Sidebar Forms'),
            ])
        ),

      S.divider(),

      // ─── Individual Items ──────────────────────────────────────────────
      // Reusable content documents that pages + sections reference. Grouped
      // into one flyout in WS-FAQ-Migration (2026-05-14) so the records mental
      // model lives in one place: edit once, propagate via references.
      S.listItem()
        .title('Individual Items')
        .child(
          S.list()
            .title('Individual Items')
            .items([
              S.documentTypeListItem('testimonial').title('Testimonials'),
              S.documentTypeListItem('faqItem').title('FAQs'),
              S.documentTypeListItem('location').title('Location Records'),
              S.documentTypeListItem('siteForm').title('Forms'),
              S.documentTypeListItem('video').title('Videos'),
            ])
        ),

      S.divider(),

      // ─── Redirects ────────────────────────────────────────────────────────
      // Isolated from records group — Redirects is a singleton system doc,
      // not a content record. Its own section keeps the Studio menu legible.
      S.listItem()
        .title('Redirects')
        .id('redirects')
        .child(
          S.document()
            .schemaType('redirects')
            .documentId('redirects')
        ),
    ])
