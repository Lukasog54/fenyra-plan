import { LessonsTable, type LessonsViewProps } from "./LessonsTable";
import { TimelineLessonRow } from "./TimelineLessonRow";
import { groupParallelLessons } from "@/lib/lessonGroups";
import { Card } from "./Card";

/**
 * Rendert Desktop-Tabelle und Mobile-Timeline gleichzeitig - CSS (`.desktop-only`/`.mobile-only` in
 * globals.css) entscheidet ohne JS/Hydration-Risiko, welche sichtbar ist. Bringt wie WeekView seine
 * eigene Card-Umrandung nur fuer Desktop mit: die Mobile-Timeline (1:1 wie
 * mobile/src/components/plan/DayTimeline.tsx) sitzt bewusst ohne umschliessende Karte direkt auf dem
 * Hintergrund - jede Stunde ist schon selbst eine Karte (TimelineLessonRow), eine zusaetzliche
 * aeussere Karte waere eine doppelte Umrandung, die es in der App nicht gibt.
 */
export function LessonsView({ lessons, showDate = false, showClass = false, highlightCurrent = false }: LessonsViewProps) {
  const groups = groupParallelLessons(lessons);

  return (
    <>
      <div className="desktop-only">
        <Card style={{ padding: 0, overflowX: "auto" }}>
          <LessonsTable lessons={lessons} showDate={showDate} showClass={showClass} highlightCurrent={highlightCurrent} />
        </Card>
      </div>
      <div className="mobile-only">
        {groups.map((group) => (
          <TimelineLessonRow key={group.map((l) => l.id).join("+")} lessons={group} />
        ))}
      </div>
    </>
  );
}
