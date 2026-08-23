import type { LessonStatus } from "../data/models/Lesson";

export interface Palette {
  background: string;
  surface: string;
  card: string;
  elevatedSurface: string;
  border: string;
  text: string;
  textSecondary: string;
  muted: string;
  /** Primary Fenyra accent (cyan). Used sparingly - not every element. */
  accent: string;
  accentText: string;
  /** Secondary cyan variant, e.g. for gradients/secondary emphasis. */
  accentSecondary: string;
  /** Secondary accent only - never the dominant color. */
  violet: string;
  success: string;
  warning: string;
  danger: string;
  /** rgba shadow color for the dezent "current lesson" / active-element glow. */
  glow: string;
}

export const lightPalette: Palette = {
  background: "#F4F8FB",
  surface: "#FFFFFF",
  card: "#FFFFFF",
  elevatedSurface: "#EDF3F7",
  border: "#DCE4EC",
  text: "#0B1220",
  textSecondary: "#536274",
  muted: "#8B96A5",
  accent: "#0BC3B0",
  accentText: "#FFFFFF",
  accentSecondary: "#0EA0C2",
  violet: "#7C5CFF",
  success: "#1C9A6C",
  warning: "#B8720A",
  danger: "#D6483F",
  glow: "rgba(11,195,176,0.28)",
};

export const darkPalette: Palette = {
  background: "#070B14",
  surface: "#0D1320",
  card: "#111927",
  elevatedSurface: "#151F30",
  border: "#1C2536",
  text: "#F4FBFF",
  textSecondary: "#9AAABD",
  muted: "#657286",
  accent: "#20E6D2",
  accentText: "#04121A",
  accentSecondary: "#28C7E8",
  violet: "#7C5CFF",
  success: "#2FD988",
  warning: "#F2B84B",
  danger: "#FF6B6B",
  glow: "rgba(32,230,210,0.35)",
};

export const amoledPalette: Palette = {
  ...darkPalette,
  background: "#000000",
  surface: "#060606",
  card: "#0B0B0B",
  elevatedSurface: "#111111",
  border: "#1A1A1A",
};

export const statusColors: Record<LessonStatus, keyof Palette> = {
  normal: "textSecondary",
  cancelled: "danger",
  substitution: "warning",
  "room-change": "warning",
  "teacher-change": "warning",
  "subject-change": "warning",
  moved: "violet",
  unknown: "muted",
};

export const statusLabels: Record<LessonStatus, string> = {
  normal: "Regulär",
  cancelled: "Fällt aus",
  substitution: "Vertretung",
  "room-change": "Raumänderung",
  "teacher-change": "Lehrerwechsel",
  "subject-change": "Fachänderung",
  moved: "Verlegt",
  unknown: "Unbekannt",
};
