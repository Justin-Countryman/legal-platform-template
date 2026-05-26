import {useCallback, useState} from 'react'
import {set, type ArrayOfObjectsInputProps, useClient} from 'sanity'

export function AttorneyOrderInput(props: ArrayOfObjectsInputProps) {
  const client = useClient({apiVersion: '2024-01-01'})
  const [loading, setLoading] = useState(false)

  const handleAddAll = useCallback(async () => {
    setLoading(true)
    try {
      const attorneys = await client.fetch<Array<{_id: string}>>(
        `*[_type == "attorneyPage" && !(_id in path("drafts.**"))]{_id}
         | order(lastName asc, firstName asc)`,
      )

      const items = attorneys.map((a) => ({
        _type: 'reference' as const,
        _ref: a._id,
        _key: a._id,
      }))

      props.onChange(set(items))
    } finally {
      setLoading(false)
    }
  }, [client, props])

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
      <button
        type="button"
        onClick={handleAddAll}
        disabled={loading}
        style={{
          alignSelf: 'flex-start',
          padding: '6px 12px',
          background: 'var(--card-fg-color)',
          color: 'var(--card-bg-color)',
          border: 'none',
          borderRadius: '3px',
          fontSize: '13px',
          fontWeight: 600,
          cursor: loading ? 'wait' : 'pointer',
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? 'Loading…' : '+ Add All Attorneys'}
      </button>
      {props.renderDefault(props)}
    </div>
  )
}
