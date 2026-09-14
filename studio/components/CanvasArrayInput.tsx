import {ArrayOfObjectsFunctions, type ArrayOfObjectsInputProps, type ArraySchemaType} from 'sanity'
import type {ComponentProps} from 'react'

// ─── Homepage canvas input ────────────────────────────────────────────────────
//
// Hides retired block types from the canvas's Add item menu while keeping them
// in the array's `of`, so a stored member still renders and validates in Studio
// and the build can still write one until Phase 12 migrates them (Justin,
// 2026-09-14: "Areas of Law" is no longer offered; use Practice Area
// Navigation). Removing a type from `of` instead would flag every stored member
// as an invalid type, and Site-Build's canvas guard (`drop_undeclared`) would
// leave it out of every fresh homepage.
//
// How: the default array input builds its insert menu from the `schemaType.of`
// it hands to its functions component (sanity 6.13.2, ArrayOfObjectsFunctions:
// `insertMenuProps.schemaTypes = props.schemaType.of`). This input swaps in a
// functions component that passes a copy of the schema type without the hidden
// members; the list the array renders and validates is untouched.

/** Canvas member types that stay valid but are not offered in Add item. */
export const HIDDEN_FROM_INSERT_MENU: ReadonlySet<string> = new Set(['siloNavBlock'])

/** The member types the Add item menu offers. Pure, for the verifier. */
export function insertableTypes<T extends {name: string}>(types: readonly T[]): T[] {
  return types.filter((type) => !HIDDEN_FROM_INSERT_MENU.has(type.name))
}

type FunctionsProps = ComponentProps<typeof ArrayOfObjectsFunctions>

function CanvasArrayFunctions(props: FunctionsProps) {
  const schemaType = props.schemaType as ArraySchemaType
  return <ArrayOfObjectsFunctions {...props} schemaType={{...schemaType, of: insertableTypes(schemaType.of)} as never} />
}

export function CanvasArrayInput(props: ArrayOfObjectsInputProps) {
  return props.renderDefault({...props, arrayFunctions: CanvasArrayFunctions as never})
}
