/** Web-Pendant zu mobile/src/components/common/PulsingDot.tsx (dort Reanimated, hier CSS-Keyframe -
 * siehe .pulsing-dot in globals.css). Sanftes Pulsieren statt hartem Blinken, "das läuft gerade". */
export function PulsingDot({ color, size = 6 }: { color: string; size?: number }) {
  return <span className="pulsing-dot" style={{ width: size, height: size, borderRadius: size / 2, background: color }} />;
}
