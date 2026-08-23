/** Minimale, handgezeichnete Icons (keine Extra-Dependency) - stehen fuer die Ionicons-Symbole, die
 * die native App an denselben Stellen nutzt (@expo/vector-icons ist dort verfuegbar, hier nicht).
 * `currentColor` uebernimmt automatisch die Text-/Akzentfarbe des Elternelements. */

interface IconProps {
  size?: number;
}

/** Entspricht Ionicons "today-outline" (Kalenderblatt mit hervorgehobenem "heute"-Feld), das die
 * App fuer den Heute-Tab nutzt - dieselbe Kalender-Silhouette wie IconPlan, damit beide Tabs als
 * verwandt erkennbar bleiben, nur mit dem gefuellten "heute"-Punkt statt des Gitters. */
export function IconHeute({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 2v4M16 2v4" />
      <circle cx="12" cy="15" r="2.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconPlan({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 2v4M16 2v4" />
    </svg>
  );
}

/** Entspricht Ionicons "flash-outline", das die App fuer den Vertretungen-Tab nutzt. */
export function IconVertretungen({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
    </svg>
  );
}

export function IconCalendarOff({ size = 26 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 2v4M16 2v4M7 13l10 6M17 13l-10 6" />
    </svg>
  );
}

export function IconCheckCircle({ size = 26 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.3 2.3L16 10" />
    </svg>
  );
}

export function IconAlertTriangle({ size = 26 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.3 3.9 1.9 18a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}

/** Ionicons "person-outline" - Lehrer-Meta-Zeile in NextLessonCard/TimelineLessonRow. */
export function IconPerson({ size = 13 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" />
    </svg>
  );
}

/** Ionicons "location-outline" - Raum-Meta-Zeile. */
export function IconLocation({ size = 13 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s7-6.3 7-11.5A7 7 0 0 0 5 9.5C5 14.7 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.3" />
    </svg>
  );
}

/** Ionicons "play-circle"/"arrow-forward-circle" - Eyebrow-Icon in NextLessonCard. */
export function IconPlayCircle({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10" fillOpacity={0.15} />
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth={1.6} />
      <path d="M10 8.5v7l6-3.5-6-3.5Z" />
    </svg>
  );
}

export function IconArrowForwardCircle({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <circle cx="12" cy="12" r="10" />
      <path d="M10 8.5 14 12l-4 3.5" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Status-Icons, entsprechen STATUS_META in mobile/src/components/vertretungen/SubstitutionListItem.tsx. */
export function IconFlashFilled({ size = 15 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
    </svg>
  );
}

export function IconCloseCircleFilled({ size = 15 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10" />
      <path d="m9 9 6 6M15 9l-6 6" stroke="var(--color-card)" strokeWidth={1.8} strokeLinecap="round" />
    </svg>
  );
}

export function IconArrowRedoOutline({ size = 15 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 5 20 10l-5 5" />
      <path d="M4 18v-3a5 5 0 0 1 5-5h11" />
    </svg>
  );
}

export function IconHelpCircleOutline({ size = 15 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.7" />
      <path d="M12 17h.01" />
    </svg>
  );
}
