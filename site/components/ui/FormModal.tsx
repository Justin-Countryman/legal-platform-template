'use client'

import {FormEmbed} from '@/components/layout/footers/FormEmbed'
import {Button} from '@/components/ui/Button'
import {DialogPanel} from '@/components/ui/DialogPanel'

type Props = {
  /** Button label that opens the modal */
  triggerLabel: string
  /** Modal heading */
  title: string
  /** Optional subheading / description shown below the title */
  description?: string
  /** Raw form embed HTML */
  formEmbed: string
  /** Optional extra classes on the trigger button */
  triggerClassName?: string
}

export function FormModal({triggerLabel, title, description, formEmbed, triggerClassName}: Props) {
  return (
    <DialogPanel
      title={title}
      description={description}
      closeAriaLabel="Close form"
      trigger={
        <Button variant="primary" context="light" className={triggerClassName}>
          {triggerLabel}
        </Button>
      }
    >
      <FormEmbed html={formEmbed} />
    </DialogPanel>
  )
}
