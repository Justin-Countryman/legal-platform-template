declare module 'culori' {
  export type ColorObject = {mode: string; l?: number; c?: number; h?: number; [key: string]: number | string | undefined}

  export function converter(mode: string): (color: string | ColorObject) => ColorObject | undefined
  export function formatHex(color: string | ColorObject | undefined): string
  export function parse(color: string): ColorObject | undefined
  export function wcagContrast(a: string | ColorObject | undefined, b: string | ColorObject | undefined): number
}
