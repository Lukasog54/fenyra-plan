import * as Haptics from "expo-haptics";

/** Light tap feedback for a toggle/switch/button-style state change. Never throws - a haptics
 * failure (e.g. simulator, permission quirk) must never break the interaction it's attached to. */
export function lightImpact(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** Feedback for a discrete selection change (e.g. switching between day/week view). */
export function selectionFeedback(): void {
  Haptics.selectionAsync().catch(() => {});
}
