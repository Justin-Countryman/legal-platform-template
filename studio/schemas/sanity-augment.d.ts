// Declaration merging so a field definition may carry `buildTime: true`
// (see schemas/buildTime.ts) under `defineField`'s strict typing. Sanity's
// own answer for custom field properties; no `strict: false` needed.
import 'sanity'

declare module 'sanity' {
  interface StringDefinition {
    buildTime?: true
  }
  interface BooleanDefinition {
    buildTime?: true
  }
  interface NumberDefinition {
    buildTime?: true
  }
  interface TextDefinition {
    buildTime?: true
  }
}
