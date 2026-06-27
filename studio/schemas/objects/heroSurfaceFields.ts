import {defineField} from 'sanity'

// ─── Shared hero surface fields ───────────────────────────────────────────────
// The image + alt(+fit) sub-structure is identical between internalHero and
// homeHero (and the homeHero gallery). Factor it here so the mechanical bits
// (image type, hotspot, alt-required validation, the fit radio) live in one
// place. Editorial copy (titles / descriptions / fieldset / reveal predicates)
// stays per-schema via the opts — the emitted field NAMES, VALUES, TYPES and
// VALIDATION are unchanged, so document shape, GROQ and rendering are unaffected.

type FieldDef = ReturnType<typeof defineField>

export const heroAltField = (label: string): FieldDef =>
  defineField({
    name: 'alt',
    type: 'string',
    title: 'Alt Text',
    validation: (Rule) => Rule.required().error(`Alt text is required for the ${label}`),
  })

// `hidden` here is a nested-field predicate: its callback gets the top-level
// `document` (the immediate `parent` is the image object, which has no layout
// info), so a consumer can gate Fit on a grandparent field like the hero layout.
type FitHiddenFn = (ctx: {document?: Record<string, unknown>; parent?: Record<string, unknown>}) => boolean
type FitOpts = {description?: string; coverTitle?: string; tileTitle?: string; hidden?: FitHiddenFn}

const heroFitField = ({description, coverTitle = 'Cover', tileTitle = 'Tile', hidden}: FitOpts = {}): FieldDef =>
  defineField({
    name: 'fit',
    type: 'string',
    title: 'Fit',
    ...(description ? {description} : {}),
    options: {
      list: [
        {title: coverTitle, value: 'cover'},
        {title: tileTitle, value: 'tile'},
      ],
      layout: 'radio',
    },
    initialValue: 'cover',
    ...(hidden ? {hidden} : {}),
  })

type HiddenFn = (ctx: {parent?: Record<string, unknown>}) => boolean

type ImageFieldOpts = {
  name: string
  title: string
  /** Used in the required-alt validation message: "Alt text is required for the {altLabel}". */
  altLabel: string
  description?: string
  fieldset?: string
  /** Sanity field group(s) — for docs that organize fields into tabs (e.g. heroSettings). */
  group?: string | string[]
  hidden?: HiddenFn
  /** Pass an (optionally configured) fit radio. Omit for images that never tile (e.g. foreground cut-outs). */
  fit?: FitOpts
}

export const heroImageField = (opts: ImageFieldOpts): FieldDef =>
  defineField({
    name: opts.name,
    title: opts.title,
    type: 'image',
    ...(opts.fieldset ? {fieldset: opts.fieldset} : {}),
    ...(opts.group ? {group: opts.group} : {}),
    ...(opts.description ? {description: opts.description} : {}),
    options: {hotspot: true},
    fields: [heroAltField(opts.altLabel), ...(opts.fit ? [heroFitField(opts.fit)] : [])],
    ...(opts.hidden ? {hidden: opts.hidden} : {}),
  })
