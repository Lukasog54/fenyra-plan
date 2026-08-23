import type { Lesson } from "@/lib/types";
import { WeekGrid } from "./WeekGrid";
import { WeekGridCompact } from "./WeekGridCompact";
import { Card } from "./Card";

/**
 * Rendert Desktop-Raster und Mobile-Kompaktraster gleichzeitig - CSS entscheidet, welche sichtbar
 * ist (gleiches Muster wie LessonsView). Mobile tippt eine Zelle an, um in die Tagesansicht zu
 * springen (wie mobile/src/components/plan/WeekTimeline.tsx in der App).
 */
export function WeekView({ weekStart, lessons, onDaySelect }: { weekStart: string; lessons: Lesson[]; onDaySelect: (date: string) => void }) {
  return (
    <>
      <div className="desktop-only">
        <Card style={{ padding: 0, overflowX: "auto" }}>
          <WeekGrid lessons={lessons} />
        </Card>
      </div>
      <div className="mobile-only">
        <WeekGridCompact weekStart={weekStart} lessons={lessons} onDaySelect={onDaySelect} />
      </div>
    </>
  );
}
