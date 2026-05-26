import React, {useRef, useState} from 'react'
import {set, unset} from 'sanity'
import type {StringInputProps} from 'sanity'
import {Flex, Box, TextInput} from '@sanity/ui'
import {TokenInsertButton} from './TokenInsertButton'

export function TokenStringInput(props: StringInputProps) {
  const {value, onChange, readOnly, elementProps} = props
  const inputRef = useRef<HTMLInputElement>(null)
  const [cursorPos, setCursorPos] = useState<number>(0)

  const trackCursor = (e: React.SyntheticEvent<HTMLInputElement>) => {
    setCursorPos(e.currentTarget.selectionStart ?? value?.length ?? 0)
  }

  const handleTokenSelect = (insertValue: string) => {
    const current = value ?? ''
    const pos = cursorPos
    const newValue = current.slice(0, pos) + insertValue + current.slice(pos)
    onChange(newValue ? set(newValue) : unset())
    // Restore focus and cursor position after React re-render
    setTimeout(() => {
      if (inputRef.current) {
        const newPos = pos + insertValue.length
        inputRef.current.focus()
        inputRef.current.setSelectionRange(newPos, newPos)
      }
    }, 0)
  }

  return (
    <Flex gap={2} align="center">
      <Box flex={1}>
        <TextInput
          {...elementProps}
          ref={inputRef}
          onClick={trackCursor}
          onKeyUp={trackCursor}
          onSelect={trackCursor}
        />
      </Box>
      <TokenInsertButton onSelect={handleTokenSelect} disabled={readOnly} />
    </Flex>
  )
}
