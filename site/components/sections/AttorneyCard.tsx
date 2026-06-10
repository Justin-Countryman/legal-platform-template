import {AttorneyCardItem} from './AttorneyCardItem'
import {
  AttorneyCardPortrait,
  AttorneyCardEditorial,
  AttorneyCardMinimal,
  AttorneyCardSpotlight,
} from './AttorneyCardVariants'
import type {AttorneyCard as AttorneyCardData} from './AttorneyCardParts'

export type AttorneyCardStyle = 'classic' | 'portrait' | 'editorial' | 'minimal' | 'spotlight'

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
    case 'editorial':
      return <AttorneyCardEditorial attorney={attorney} />
    case 'minimal':
      return <AttorneyCardMinimal attorney={attorney} />
    case 'spotlight':
      return <AttorneyCardSpotlight attorney={attorney} />
    default:
      return <AttorneyCardItem attorney={attorney} />
  }
}
