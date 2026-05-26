// Temporary migration: adds 3 preview office locations to test the Districts footer layout.
// Run with:  npx sanity exec migrations/add-preview-locations.ts --with-user-token
// To clean up: npx sanity exec migrations/remove-preview-locations.ts --with-user-token

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2024-01-01'})

const previewOffices = [
  {_id: 'location-preview-minneapolis', city: 'Minneapolis', address1: '100 Washington Ave S', address2: 'Suite 1500', zip: '55401'},
  {_id: 'location-preview-plymouth',    city: 'Plymouth',    address1: '3601 Minnesota Dr',    address2: 'Suite 800',  zip: '55441'},
  {_id: 'location-preview-eden-prairie', city: 'Eden Prairie', address1: '8040 Flying Cloud Dr', address2: 'Suite 200', zip: '55344'},
]

async function main() {
  for (const office of previewOffices) {
    await client.createOrReplace({
      _type: 'location',
      _id: office._id,
      city: office.city,
      address1: office.address1,
      address2: office.address2,
      address3: null,
      state: 'Minnesota',
      zip: office.zip,
      officePhone: '(763) 560-5700',
      tollFreePhone: '(866) 211-4311',
      locationStatus: 'Active',
    })
    console.log(`  ✓ ${office.city}`)
  }
  console.log('\nDone — 3 preview offices added.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
