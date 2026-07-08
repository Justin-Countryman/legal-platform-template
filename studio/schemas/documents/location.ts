import {defineType} from 'sanity'

// Location document — mirrors Zite Locations table via CS-FIRM-DATA.json
// Referenced by locationPage via locationRef

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
  'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
  'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
  'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
  'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
  'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
  'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
  'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
  'West Virginia', 'Wisconsin', 'Wyoming',
].map((s) => ({title: s, value: s}))

export const location = defineType({
  name: 'location',
  title: 'Location Record',
  type: 'document',
  fieldsets: [
    {name: 'identity', title: 'Identity', options: {collapsible: true, collapsed: false}},
    {name: 'address', title: 'Address', options: {collapsible: true, collapsed: false}},
    {name: 'contact', title: 'Contact', options: {collapsible: true, collapsed: false}},
    {name: 'availability', title: 'Availability', options: {collapsible: true, collapsed: true}},
    {name: 'display', title: 'Display', options: {collapsible: true, collapsed: true}},
    {name: 'gbp', title: 'Google Business Profile', options: {collapsible: true, collapsed: true}},
    {name: 'hours', title: 'Office Hours', options: {collapsible: true, collapsed: true}},
  ],
  fields: [
    {
      name: 'title',
      title: 'Location Title',
      type: 'string',
      fieldset: 'identity',
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'isPrimary',
      title: 'Primary Location',
      type: 'boolean',
      fieldset: 'identity',
      description: 'Primary location renders first in footer',
      initialValue: false,
    },
    {
      name: 'locationType',
      title: 'Location Type',
      type: 'string',
      fieldset: 'identity',
      options: {
        list: [
          {title: 'Physical', value: 'Physical'},
          {title: 'Virtual', value: 'Virtual'},
          {title: 'Shared', value: 'Shared'},
          {title: 'Home', value: 'Home'},
        ],
        layout: 'radio',
      },
      description: 'Physical/Shared: full address displayed. Virtual/Home: no address displayed.',
      validation: (Rule) => Rule.required().warning(),
    },
    {
      name: 'locationStatus',
      title: 'Location Status',
      type: 'string',
      fieldset: 'identity',
      options: {
        list: [
          {title: 'Active', value: 'Active'},
          {title: 'Inactive', value: 'Inactive'},
        ],
        layout: 'radio',
      },
      initialValue: 'Active',
      validation: (Rule) => Rule.required().warning(),
    },
    // ─── Address ──────────────────────────────────────────────────────────────
    {
      name: 'address1',
      title: 'Address 1',
      type: 'string',
      fieldset: 'address',
    },
    {
      name: 'address2',
      title: 'Address 2',
      type: 'string',
      fieldset: 'address',
    },
    {
      name: 'address3',
      title: 'Address 3',
      type: 'string',
      fieldset: 'address',
      description: 'Building name or additional address line (e.g. Arbor Lakes Professional Center)',
    },
    {
      name: 'city',
      title: 'City',
      type: 'string',
      fieldset: 'address',
    },
    {
      name: 'state',
      title: 'State',
      type: 'string',
      fieldset: 'address',
      options: {
        list: US_STATES,
      },
    },
    {
      name: 'zip',
      title: 'Zip',
      type: 'string',
      fieldset: 'address',
    },
    {
      name: 'county',
      title: 'County',
      type: 'string',
      fieldset: 'address',
      description: 'Used in LocalBusiness structured data — e.g. "Hennepin"',
    },
    {
      name: 'geo',
      title: 'Geo Coordinates',
      type: 'geopoint',
      fieldset: 'address',
      description: 'Latitude/longitude for LocalBusiness GeoCoordinates structured data. Only emitted for Physical/Shared locations (gated like the street address).',
    },
    // ─── Contact ──────────────────────────────────────────────────────────────
    {
      name: 'officePhone',
      title: 'Office Phone',
      type: 'string',
      fieldset: 'contact',
    },
    {
      name: 'tollFreePhone',
      title: 'Toll Free Phone',
      type: 'string',
      fieldset: 'contact',
    },
    {
      name: 'officeFax',
      title: 'Office Fax',
      type: 'string',
      fieldset: 'contact',
    },
    {
      name: 'officeEmail',
      title: 'Office Email',
      type: 'string',
      fieldset: 'contact',
      description: 'Internal use only — not shown on any public page',
    },
    // ─── Availability ─────────────────────────────────────────────────────────
    {
      name: 'emergency24_7',
      title: '24/7 Emergency Availability',
      type: 'boolean',
      fieldset: 'availability',
      initialValue: false,
    },
    {
      name: 'emergencyPhone',
      title: 'Emergency Phone Number',
      type: 'string',
      fieldset: 'availability',
    },
    {
      name: 'appointmentRequired',
      title: 'Appointment Type',
      type: 'string',
      fieldset: 'availability',
      options: {
        list: [
          {title: 'Walk-Ins Welcome', value: 'Walk-Ins Welcome'},
          {title: 'Appointment Required', value: 'Appointment Required'},
        ],
        layout: 'radio',
      },
      initialValue: 'Appointment Required',
    },
    // ─── Display ──────────────────────────────────────────────────────────────
    {
      name: 'displayOnWebsite',
      title: 'Display on Website',
      type: 'boolean',
      fieldset: 'display',
      initialValue: true,
    },
    // ─── GBP ──────────────────────────────────────────────────────────────────
    {
      name: 'gbpCidUrl',
      title: 'GBP CID URL',
      type: 'url',
      fieldset: 'gbp',
      description: 'Used in LocalBusiness schema only — not displayed on page',
    },
    {
      name: 'gbpPrimaryCategory',
      title: 'GBP Primary Category',
      type: 'string',
      fieldset: 'gbp',
      description: 'Google Business Profile primary category — e.g. "Law firm". Used in LocalBusiness schema only.',
    },
    {
      name: 'gbpSecondaryCategories',
      title: 'GBP Secondary Categories',
      type: 'text',
      rows: 2,
      fieldset: 'gbp',
      description: 'Comma-separated GBP secondary categories — e.g. "Estate planning attorney, Family law attorney". Used in schema markup only.',
    },
    // ─── Office Hours ─────────────────────────────────────────────────────────
    {
      name: 'hours',
      title: 'Office Hours',
      type: 'object',
      fieldset: 'hours',
      description: 'Shown on location pages and footer if single office',
      fields: [
        {name: 'mondayStatus', title: 'Monday Status', type: 'string', options: {list: ['Open', 'Closed'], layout: 'radio'}},
        {name: 'mondayOpen', title: 'Monday Open', type: 'string'},
        {name: 'mondayClose', title: 'Monday Close', type: 'string'},
        {name: 'tuesdayStatus', title: 'Tuesday Status', type: 'string', options: {list: ['Open', 'Closed'], layout: 'radio'}},
        {name: 'tuesdayOpen', title: 'Tuesday Open', type: 'string'},
        {name: 'tuesdayClose', title: 'Tuesday Close', type: 'string'},
        {name: 'wednesdayStatus', title: 'Wednesday Status', type: 'string', options: {list: ['Open', 'Closed'], layout: 'radio'}},
        {name: 'wednesdayOpen', title: 'Wednesday Open', type: 'string'},
        {name: 'wednesdayClose', title: 'Wednesday Close', type: 'string'},
        {name: 'thursdayStatus', title: 'Thursday Status', type: 'string', options: {list: ['Open', 'Closed'], layout: 'radio'}},
        {name: 'thursdayOpen', title: 'Thursday Open', type: 'string'},
        {name: 'thursdayClose', title: 'Thursday Close', type: 'string'},
        {name: 'fridayStatus', title: 'Friday Status', type: 'string', options: {list: ['Open', 'Closed'], layout: 'radio'}},
        {name: 'fridayOpen', title: 'Friday Open', type: 'string'},
        {name: 'fridayClose', title: 'Friday Close', type: 'string'},
        {name: 'saturdayStatus', title: 'Saturday Status', type: 'string', options: {list: ['Open', 'Closed'], layout: 'radio'}},
        {name: 'saturdayOpen', title: 'Saturday Open', type: 'string'},
        {name: 'saturdayClose', title: 'Saturday Close', type: 'string'},
        {name: 'sundayStatus', title: 'Sunday Status', type: 'string', options: {list: ['Open', 'Closed'], layout: 'radio'}},
        {name: 'sundayOpen', title: 'Sunday Open', type: 'string'},
        {name: 'sundayClose', title: 'Sunday Close', type: 'string'},
      ],
    },
  ],

  preview: {
    select: {title: 'title', subtitle: 'city'},
    prepare({title, subtitle}) {
      return {title: title ?? 'Location', subtitle}
    },
  },
})
