import {AttorneyCardItem} from './AttorneyCardItem'
import {
  AttorneyCardPortrait,
  AttorneyCardAvatar,
  AttorneyCardMinimal,
  AttorneyCardSpotlight,
} from './AttorneyCardVariants'
import type {AttorneyCard as AttorneyCardData} from './AttorneyCardParts'

// 'editorial' retained as a legacy alias — that style was rebuilt as 'avatar'.
export type AttorneyCardStyle = 'classic' | 'portrait' | 'avatar' | 'editorial' | 'minimal' | 'spotlight'

// Picks the card style chosen on the section. Defaults to Classic (the original
// horizontal card) so existing sections and unset values render unchanged.
export function AttorneyCard({
  attorney,
  cardStyle,
}: {
  attorney: AttorneyCardData
  cardStyle?: AttorneyCardStyle | null
}) {
  switch (cardStyle) {
    case 'portrait':
      return <AttorneyCardPortrait attorney={attorney} />
    case 'avatar':
    case 'editorial': // legacy alias — Editorial was rebuilt as Avatar
      return <AttorneyCardAvatar attorney={attorney} />
    case 'minimal':
      return <AttorneyCardMinimal attorney={attorney} />
    case 'spotlight':
      return <AttorneyCardSpotlight attorney={attorney} />
    default:
      return <AttorneyCardItem attorney={attorney} />
  }
}
