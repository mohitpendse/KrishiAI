// Minimal JSX type declarations to unblock builds when React types are unavailable
// This preserves JSX support without full type safety. Prefer installing @types/react.

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any
  }

  // Allow children prop inference
  interface ElementChildrenAttribute {
    children: {}
  }
}


