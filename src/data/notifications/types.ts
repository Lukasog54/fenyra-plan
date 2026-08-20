/** Matches the notification categories from the spec: Vertretungen/Ausfälle/Raumänderungen/
 * Lehreränderungen/Synchronisierungsfehler/Updates - Fachänderung and Verlegung are folded into
 * "vertretungen" (not separately listed as toggleable categories in the spec's second list). */
export const NOTIFICATION_CATEGORIES = ["vertretungen", "ausfaelle", "raumaenderungen", "lehreraenderungen", "syncFehler", "updates"] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export const NOTIFICATION_CATEGORY_LABELS: Record<NotificationCategory, string> = {
  vertretungen: "Vertretungen",
  ausfaelle: "Ausfälle",
  raumaenderungen: "Raumänderungen",
  lehreraenderungen: "Lehreränderungen",
  syncFehler: "Synchronisierungsfehler",
  updates: "Updates",
};
