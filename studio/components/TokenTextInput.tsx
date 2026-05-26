import React, {useRef, useState} from 'react'
import {set, unset} from 'sanity'
import type {StringInputProps} from 'sanity'
import {Stack, Flex, Box, TextArea} from '@sanity/ui'
import {TokenInsertButton} from './TokenInsertButton'

export function TokenTextInput(props: StringInputProps) {
  const {value, onChange, readOnly, elementProps} = props
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [cursorPos, setCursorPos] = useState<number>(0)

  const trackCursor = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    setCursorPos(e.currentTarget.selectionStart ?? value?.length ?? 0)
  }

  const handleTokenSelect = (insertValue: string) => {
    const current = value ?? ''
    const pos = cursorPos
    const newValue = current.slice(0, pos) + insertValue + current.slice(pos)
    onChange(newValue ? set(newValue) : unset())
    // Restore focus and cursor position after React re-render
    setTimeout(() => {
      if (textareaRef.current) {
        const newPos = pos + insertValue.length
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(newPos, newPos)
      }
    }, 0)
  }

  return (
    <Stack space={2}>
      <Flex justify="flex-end">
        <TokenInsertButton onSelect={handleTokenSelect} disabled={readOnly} />
      </Flex>
      <Box>
        <TextArea
          {...elementProps}
          ref={textareaRef}
          onClick={trackCursor}
          onKeyUp={trackCursor}
          onSelect={trackCursor}
          rows={(props.schemaType as any)?.options?.rows ?? 3}
        />
      </Box>
    </Stack>
  )
}
