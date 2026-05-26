// One-time migration: removes leading "- " or "– " from the start of any
// paragraph block's first text span across all blockContent credential fields
// on attorneyPage documents.
//
// Run with:  npx sanity exec migrations/strip-credential-dashes.ts --with-user-token

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2024-01-01'})

const BLOCK_FIELDS = [
  'fullBiography',
  'educationDegrees',
  'barAdmissions',
  'stateBarAdmissions',
  'certifiedLegalSpecialties',
  'honors',
  'professionalAssociations',
  'proBonoActivities',
  'publications',
  'presentationsSeminars',
  'representativeCases',
  'pastPositions',
  'languages',
]

function stripDashes(blocks: any[] | null | undefined): {cleaned: any[]; changed: boolean} {
  if (!blocks?.length) return {cleaned: blocks ?? [], changed: false}

  let changed = false
  const cleaned = blocks.map((block) => {
    if (block._type !== 'block' || !Array.isArray(block.children)) return block

    const children = block.children.map((span: any, i: number) => {
      if (i !== 0 || typeof span.text !== 'string') return span
      const stripped = span.text.replace(/^[-–]\s+/, '')
      if (stripped !== span.text) {
        changed = true
        return {...span, text: stripped}
      }
      return span
    })

    return children !== block.children ? {...block, children} : block
  })

  return {cleaned, changed}
}

async function main() {
  const attorneys = await client.fetch<Array<Record<string, any>>>(
    `*[_type == "attorneyPage"]{_id, pageName, ${BLOCK_FIELDS.join(', ')}}`
  )

  console.log(`Found ${attorneys.length} attorney document(s)`)

  let updatedDocs = 0

  for (const doc of attorneys) {
    const patch: Record<string, any> = {}
    let docChanged = false

    for (const field of BLOCK_FIELDS) {
      const {cleaned, changed} = stripDashes(doc[field])
      if (changed) {
        patch[field] = cleaned
        docChanged = true
      }
    }

    if (docChanged) {
      await client.patch(doc._id).set(patch).commit()
      console.log(`  ✓ ${doc.pageName ?? doc._id}`)
      updatedDocs++
    }
  }

  console.log(`\nDone — updated ${updatedDocs} document(s)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
