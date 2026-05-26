import {set, unset} from 'sanity'
import type {StringInputProps} from 'sanity'
import {Flex, Box} from '@sanity/ui'
import {TokenInsertButton} from './TokenInsertButton'

// Phone fields store a single token (replaces entire value on select).
export function PhoneTokenInput(props: StringInputProps) {
  const {onChange, readOnly} = props

  const handleTokenSelect = (insertValue: string) => {
    onChange(insertValue ? set(insertValue) : unset())
  }

  return (
    <Flex gap={2} align="center">
      <Box flex={1}>{props.renderDefault(props)}</Box>
      <TokenInsertButton onSelect={handleTokenSelect} disabled={readOnly} />
    </Flex>
  )
}
