/**
 * Fenyra design tokens: spacing, radius, typography, motion. Colors live in
 * colors.ts (they're theme-dependent, these aren't). Every screen/component
 * should pull from here instead of hardcoding numbers, so the app reads as
 * one design system rather than a pile of one-off values.
 */

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 32, fontWeight: "800" as const, letterSpacing: -0.5 },
  heading: { fontSize: 24, fontWeight: "700" as const, letterSpacing: -0.3 },
  title: { fontSize: 18, fontWeight: "700" as const, letterSpacing: -0.1 },
  subtitle: { fontSize: 15, fontWeight: "600" as const },
  body: { fontSize: 15, fontWeight: "400" as const },
  caption: { fontSize: 13, fontWeight: "400" as const },
  label: { fontSize: 11, fontWeight: "700" as const, letterSpacing: 1 },
} as const;

/** Screen transition / feedback durations (ms), kept short and consistent. */
export const motion = {
  fast: 120,
  base: 200,
  sheet: 260,
} as const;
