import React from 'react'
import {Button, Menu, MenuButton, MenuDivider, MenuItem, Text, Box} from '@sanity/ui'
import {TagIcon} from '@sanity/icons'
import {useTokenOptions} from './useTokenOptions'

type Props = {
  onSelect: (insertValue: string) => void
  disabled?: boolean
}

export function TokenInsertButton({onSelect, disabled}: Props) {
  const {options, loading} = useTokenOptions()

  // Build unique group list in order
  const groups = Array.from(new Set(options.map((t) => t.group)))

  return (
    <MenuButton
      button={
        <Button
          icon={TagIcon}
          mode="ghost"
          fontSize={1}
          padding={2}
          text="Insert NAP Shortcode"
          disabled={disabled || loading}
          title="Insert a NAP shortcode — firm name, phone number, or location address"
        />
      }
      id="token-insert-menu"
      menu={
        <Menu style={{minWidth: 220}}>
          {groups.map((group, i) => (
            <React.Fragment key={group}>
              {i > 0 && <MenuDivider />}
              <Box paddingX={3} paddingTop={2} paddingBottom={1}>
                <Text size={0} weight="semibold" muted>
                  {group}
                </Text>
              </Box>
              {options
                .filter((t) => t.group === group)
                .map((token) => (
                  <MenuItem
                    key={token.value}
                    text={token.label}
                    fontSize={1}
                    onClick={() => onSelect(token.insertValue)}
                  />
                ))}
            </React.Fragment>
          ))}
        </Menu>
      }
      placement="bottom-start"
      popover={{portal: true}}
    />
  )
}
