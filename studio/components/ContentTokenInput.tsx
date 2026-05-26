import React from 'react'
import {set, unset} from 'sanity'
import type {StringInputProps} from 'sanity'
import {Select, Stack, Text, Box} from '@sanity/ui'
import {useTokenOptions} from './useTokenOptions'

export function ContentTokenInput(props: StringInputProps) {
  const {value, onChange, readOnly} = props
  const {options, loading} = useTokenOptions()

  const groups = Array.from(new Set(options.map((t) => t.group)))

  return (
    <Stack space={2}>
      <Text size={1} muted>
        {loading ? 'Loading shortcodes…' : 'Select a shortcode'}
      </Text>
      <Box>
        <Select
          value={value ?? ''}
          disabled={readOnly || loading}
          onChange={(e) => {
            const val = e.currentTarget.value
            onChange(val ? set(val) : unset())
          }}
        >
          <option value="">— Select shortcode —</option>
          {groups.map((group) => (
            <optgroup key={group} label={group}>
              {options
                .filter((t) => t.group === group)
                .map((token) => (
                  <option key={token.value} value={token.value}>
                    {token.label}
                  </option>
                ))}
            </optgroup>
          ))}
        </Select>
      </Box>
    </Stack>
  )
}
