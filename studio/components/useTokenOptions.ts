import {useEffect, useState} from 'react'
import {useClient} from 'sanity'

export type TokenOption = {
  group: string
  label: string
  value: string       // the tokenKey stored in the document (for contentToken objects)
  insertValue: string // the {{key}} string inserted into plain string/text fields
}

export const STATIC_TOKENS: TokenOption[] = [
  {group: 'Firm Identity',   label: 'Firm Name — Full',        value: 'firmName',         insertValue: '{{firmName}}'},
  {group: 'Firm Identity',   label: 'Firm Name — Short',       value: 'firmNameShort',    insertValue: '{{firmNameShort}}'},
  {group: 'Primary Contact', label: 'Primary Phone',           value: 'primaryPhone',     insertValue: '{{primaryPhone}}'},
  {group: 'Primary Contact', label: 'Primary Toll-Free Phone', value: 'primaryTollFree',  insertValue: '{{primaryTollFree}}'},
  // Current Office — resolves to the page's own location on location pages, and
  // to the firm's primary office everywhere else. Use these to build one
  // location-page template that works for every office.
  {group: 'Current Office', label: 'Office Address (Full)',      value: 'office.address',        insertValue: '{{office.address}}'},
  {group: 'Current Office', label: 'Office Address Line 1',      value: 'office.address1',       insertValue: '{{office.address1}}'},
  {group: 'Current Office', label: 'Office City',                value: 'office.city',           insertValue: '{{office.city}}'},
  {group: 'Current Office', label: 'Office State',               value: 'office.state',          insertValue: '{{office.state}}'},
  {group: 'Current Office', label: 'Office ZIP',                 value: 'office.zip',            insertValue: '{{office.zip}}'},
  {group: 'Current Office', label: 'Office Phone',               value: 'office.phone',          insertValue: '{{office.phone}}'},
  {group: 'Current Office', label: 'Office Appointment Policy',  value: 'office.appointment',    insertValue: '{{office.appointment}}'},
  {group: 'Current Office', label: 'Office 24/7 Emergency Label', value: 'office.emergencyLabel', insertValue: '{{office.emergencyLabel}}'},
  {group: 'Current Office', label: 'Office 24/7 Emergency Phone', value: 'office.emergency',      insertValue: '{{office.emergency}}'},
]

export function useTokenOptions() {
  const client = useClient({apiVersion: '2024-01-01'})
  const [options, setOptions] = useState<TokenOption[]>(STATIC_TOKENS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    client
      .fetch<{_id: string; title: string; officeFax?: string; address1?: string; address2?: string; address3?: string; city?: string; state?: string; zip?: string; appointmentRequired?: string; emergency24_7?: boolean}[]>(
        `*[_type == "location" && locationStatus == "Active"] | order(isPrimary desc, title asc) {_id, title, officeFax, address1, address2, address3, city, state, zip, appointmentRequired, emergency24_7}`
      )
      .then((locations) => {
        const locationTokens: TokenOption[] = locations.flatMap((loc) => [
          {
            group: loc.title,
            label: 'Phone',
            value: `location.${loc._id}.phone`,
            insertValue: `{{location.${loc._id}.phone}}`,
          },
          ...(loc.officeFax ? [{
            group: loc.title,
            label: 'Fax',
            value: `location.${loc._id}.fax`,
            insertValue: `{{location.${loc._id}.fax}}`,
          }] : []),
          {
            group: loc.title,
            label: 'Full Address',
            value: `location.${loc._id}.address`,
            insertValue: `{{location.${loc._id}.address}}`,
          },
          ...(loc.address1 ? [{
            group: loc.title,
            label: 'Address Line 1',
            value: `location.${loc._id}.address1`,
            insertValue: `{{location.${loc._id}.address1}}`,
          }] : []),
          ...(loc.address2 ? [{
            group: loc.title,
            label: 'Address Line 2',
            value: `location.${loc._id}.address2`,
            insertValue: `{{location.${loc._id}.address2}}`,
          }] : []),
          ...(loc.address3 ? [{
            group: loc.title,
            label: 'Address Line 3',
            value: `location.${loc._id}.address3`,
            insertValue: `{{location.${loc._id}.address3}}`,
          }] : []),
          ...(loc.city ? [{
            group: loc.title,
            label: 'City',
            value: `location.${loc._id}.city`,
            insertValue: `{{location.${loc._id}.city}}`,
          }] : []),
          ...(loc.state ? [{
            group: loc.title,
            label: 'State',
            value: `location.${loc._id}.state`,
            insertValue: `{{location.${loc._id}.state}}`,
          }] : []),
          ...(loc.zip ? [{
            group: loc.title,
            label: 'ZIP Code',
            value: `location.${loc._id}.zip`,
            insertValue: `{{location.${loc._id}.zip}}`,
          }] : []),
          ...(loc.appointmentRequired ? [{
            group: loc.title,
            label: 'Appointment Policy',
            value: `location.${loc._id}.appointment`,
            insertValue: `{{location.${loc._id}.appointment}}`,
          }] : []),
          ...(loc.emergency24_7 ? [{
            group: loc.title,
            label: '24/7 Emergency Label',
            value: `location.${loc._id}.emergencyLabel`,
            insertValue: `{{location.${loc._id}.emergencyLabel}}`,
          }, {
            group: loc.title,
            label: '24/7 Emergency Phone',
            value: `location.${loc._id}.emergency`,
            insertValue: `{{location.${loc._id}.emergency}}`,
          }] : []),
        ])
        setOptions([...STATIC_TOKENS, ...locationTokens])
      })
      .finally(() => setLoading(false))
  }, [client])

  return {options, loading}
}
