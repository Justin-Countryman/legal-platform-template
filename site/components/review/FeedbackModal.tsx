'use client'

import {MdMessage} from 'react-icons/md'
import {FormEmbed} from '@/components/layout/footers/FormEmbed'
import {DialogPanel} from '@/components/ui/DialogPanel'
import {Button} from '@/components/ui/Button'

type Props = {
  feedbackFormEmbed: string
}

export function FeedbackModal({feedbackFormEmbed}: Props) {
  return (
    <DialogPanel
      title="Share Your Feedback"
      description="Your feedback is confidential and helps us serve every client better."
      closeAriaLabel="Close feedback form"
      trigger={
        <Button variant="secondary" context="light" type="button" fullWidth>
          <MdMessage className="size-5 shrink-0" aria-hidden="true" />
          Prefer to share privately? Leave feedback instead.
        </Button>
      }
    >
      <FormEmbed html={feedbackFormEmbed} />
    </DialogPanel>
  )
}
