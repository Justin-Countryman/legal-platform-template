'use client'

import React from 'react'
import {useDocumentOperation, useFormValue} from 'sanity'
import {getPresetById} from '../../site/fonts/presets'
import {BUTTON_SHAPE_MAP, UI_RADIUS_MAP} from '../../site/lib/designTokens'
import {
  STYLE_SETS, STYLE_SET_PICK_LABELS, isPlatformDefault, matchStyleSet, signatureOf, swappedPicks, styleSetPatch, updatePatch,
  usesCustomFonts, type StyleSet, type StyleSetDoc,
} from '../../site/lib/styleSets'
import {HEADING_LINE_DESIGNS} from '../../site/lib/headingLines'

// The Style set field (Phase 16B, [R-468], [R-469], [R-477]; named for the style set in
// Phase 17C, [R-535]). It stores nothing itself, like the palette and corner fields. It
// offers the style sets and writes a style set's values into the design settings in one
// patch. The active style set is matched by value: the Studio names it while the settings
// match it exactly (an earlier version of the same style set included, with the offer to
// take the current one), says "Platform default" for what the build writes, and otherwise
// says "Custom". A style set never writes a color and never touches a section. The style
// sets and the matching are the site's own (site/lib/styleSets.ts); the theme, the flow of
// the page, is the field below it.
//
// The specimen names each style set's fonts rather than drawing them: the site's font
// files are not in the Studio bundle (Phase 16B amendment 8).

const label: React.CSSProperties = {fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#555', margin: '0 0 8px'}
const ACCENT = '#9a6a1f'

function Specimen({styleSet}: {styleSet: StyleSet}) {
  const s = styleSet.settings
  const fonts = getPresetById(Number(s.fontPairingPreset))
  const upper = s.headingCase === 'upper'
  return (
    <span style={{display: 'flex', flexDirection: 'column', gap: 6, width: '100%'}}>
      <span style={{fontFamily: 'Georgia, serif', fontSize: 15, fontWeight: 700, color: '#1f2937', textTransform: upper ? 'uppercase' : 'none', letterSpacing: upper ? '0.06em' : 'normal', lineHeight: 1.2}}>
        Trusted <span style={{color: ACCENT, fontStyle: s.headingEmphasisStyle === 'italic' ? 'italic' : 'normal', fontWeight: s.headingEmphasisStyle === 'italic' ? 400 : 700}}>counsel</span>
      </span>
      {styleSet.picks.headingRule && <span style={{display: 'block', width: 24, height: 2, background: ACCENT}} />}
      <span style={{display: 'flex', alignItems: 'flex-end', gap: 8}}>
        <span
          style={{
            display: 'block', width: 34, height: 24, background: '#d1d5db', borderRadius: UI_RADIUS_MAP[String(s.uiRadius)],
            outline: s.imageFrame === 'framed' ? `2px solid ${ACCENT}` : undefined, outlineOffset: -5,
            boxShadow: s.imageFrame === 'slab' ? '4px 4px 0 #1f2937' : undefined,
          }}
        />
        <span style={{display: 'block', width: 36, height: 13, background: '#374151', borderRadius: BUTTON_SHAPE_MAP[String(s.buttonShape)]}} />
      </span>
      {fonts && <span style={{fontSize: 10, color: '#6b7280'}}>{fonts.heading.family} and {fonts.body.family}</span>}
    </span>
  )
}

/** The two or three things a visitor recognises, in the Studio's words (`[R-487]`). */
function recognizers(styleSet: StyleSet): string {
  const sig = signatureOf(styleSet)
  return styleSet.identity.recognizers.map((d) => sig[d].replace('frame/', '').replace('/', ' ')).join(' · ')
}

/** What a site has picked where it differs from the style set it matches (`[R-485]`): the
 *  heading line, the one pick since Phase 17B moved the divider to the theme layer. */
function pickLabel(value: unknown): string {
  if (!value) return 'none'
  return HEADING_LINE_DESIGNS[value as keyof typeof HEADING_LINE_DESIGNS]?.label ?? String(value)
}

function StyleSetButton({styleSet, active, onChoose}: {styleSet: StyleSet; active: boolean; onChoose: () => void}) {
  return (
    <button
      type="button"
      onClick={onChoose}
      aria-pressed={active}
      style={{
        display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
        background: active ? '#eef4ff' : '#fff', border: active ? '2px solid #2f6fd6' : '1px solid #ddd', textAlign: 'left',
      }}
    >
      <Specimen styleSet={styleSet} />
      <span style={{fontSize: 12, fontWeight: 600, color: '#222'}}>{styleSet.name}</span>
      <span style={{fontSize: 10, color: '#777'}}>{styleSet.identity.sentence}</span>
      <span style={{fontSize: 10, color: '#9a6a1f'}}>{recognizers(styleSet)}</span>
    </button>
  )
}

export function StyleSetPicker() {
  const documentId = (useFormValue(['_id']) as string | undefined) ?? 'designSettings'
  const {patch} = useDocumentOperation(documentId.replace(/^drafts\./, ''), 'designSettings')
  const doc = ((useFormValue([]) as StyleSetDoc | undefined) ?? {}) as StyleSetDoc

  const match = matchStyleSet(doc)
  // A retired style set (Phase 17C session 2b, `[R-534]`) is named plainly and offered no update:
  // the site keeps its look, and the buttons below offer the eight that are.
  const status = match
    ? match.retired
      ? `${match.styleSet.name} (no longer offered; nothing on your site changed)`
      : `${match.styleSet.name}${match.current ? '' : ' (earlier version)'}`
    : isPlatformDefault(doc) ? 'Platform default' : 'Custom'
  const choose = (styleSet: StyleSet) => {
    const {set, unset} = styleSetPatch(styleSet, doc)
    patch.execute([{set}, ...(unset.length ? [{unset}] : [])])
  }
  // Applying a style set's update keeps a pick the site swapped on purpose (`[R-485]`).
  const update = () => {
    if (!match) return
    const {set, unset} = updatePatch(doc, match)
    patch.execute([{set}, ...(unset.length ? [{unset}] : [])])
  }
  const swapped = match ? swappedPicks(doc, match) : []

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 0'}}>
      <p style={label}>Style set · {status}</p>
      {swapped.length > 0 && (
        <p style={{fontSize: 11, color: '#555', margin: 0}}>
          {swapped
            .map((s) => `${STYLE_SET_PICK_LABELS[s.field]} · ${pickLabel(s.site)} (${match?.styleSet.name}’s is ${pickLabel(s.styleSet)})`)
            .join('  —  ')}
        </p>
      )}
      {match && !match.current && !match.retired && (
        <div style={{padding: '8px 10px', background: '#f1f5f9', borderRadius: 4, fontSize: 11, color: '#334155', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap'}}>
          <span>{match.styleSet.name} has been updated since it was applied here.</span>
          <button type="button" onClick={update} style={{fontSize: 11, padding: '3px 8px', borderRadius: 4, border: '1px solid #94a3b8', background: '#fff', cursor: 'pointer'}}>
            Apply the current {match.styleSet.name}
          </button>
        </div>
      )}
      {usesCustomFonts(doc) && (
        <div style={{padding: '8px 10px', background: '#fef9c3', borderRadius: 4, fontSize: 11, color: '#854d0e'}}>
          This site uses its own uploaded fonts, so a style set keeps them and changes everything else.
        </div>
      )}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 8}}>
        {STYLE_SETS.map((styleSet) => (
          <StyleSetButton key={styleSet.id} styleSet={styleSet} active={match?.styleSet.id === styleSet.id && match.current} onChoose={() => choose(styleSet)} />
        ))}
      </div>
      <p style={{fontSize: 11, color: '#666', margin: 0}}>
        A style set sets the fonts, corners, headings, photo frames, texture and card hover below, and its heading
        line. It never changes your colors, a look set on one section on purpose stays as it was set, and swapping
        the heading line keeps the style set’s name.
      </p>
    </div>
  )
}
