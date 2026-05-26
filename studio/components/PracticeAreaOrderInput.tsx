import {useCallback, useState} from 'react'
import {set, type ArrayOfObjectsInputProps, useClient} from 'sanity'

type PracticeAreaRecord = {
  _id: string
  children: Array<{_id: string}>
}

export function PracticeAreaOrderInput(props: ArrayOfObjectsInputProps) {
  const client = useClient({apiVersion: '2024-01-01'})
  const [loading, setLoading] = useState(false)

  const handleAddAll = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch parent practice areas with their children, both ordered alphabetically
      const parents = await client.fetch<PracticeAreaRecord[]>(
        `*[_type == "practiceArea" && !defined(parentPage) && !(_id in path("drafts.**"))]{
          _id,
          "children": *[_type == "practiceArea" && parentPage._ref == ^._id && !(_id in path("drafts.**"))]{
            _id
          } | order(title asc)
        } | order(title asc)`,
      )

      // Flatten: parent first, then its children, preserving order
      const items = parents.flatMap((parent) => [
        {_type: 'reference' as const, _ref: parent._id, _key: parent._id},
        ...parent.children.map((child) => ({
          _type: 'reference' as const,
          _ref: child._id,
          _key: child._id,
        })),
      ])

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
        {loading ? 'Loading…' : '+ Add All Practice Areas'}
      </button>
      {props.renderDefault(props)}
    </div>
  )
}
