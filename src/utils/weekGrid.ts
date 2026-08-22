import type { Lesson } from "../data/models/Lesson";
import { groupParallelLessons } from "./lessonGroups";

export interface WeekGridRow {
  period: number;
  /** ISO date -> parallel-lesson groups for that day+period (empty array = no lesson). */
  cellsByDate: Record<string, Lesson[][]>;
}

/**
 * Builds the rows of a week grid (period number -> one cell per day) from a flat list of lessons
 * spanning several days. Rows only exist for periods that actually occur somewhere in the given
 * week - no assumption about "every school day has N periods". Lessons without a `period` (rare -
 * the source doesn't always guarantee one) are left out of the grid entirely rather than forcing
 * them into a row that doesn't represent them; they still show up in the day view.
 */
export function buildWeekGrid(days: string[], lessons: Lesson[]): WeekGridRow[] {
  const withPeriod = lessons.filter((l): l is Lesson & { period: number } => l.period !== undefined);
  const periods = [...new Set(withPeriod.map((l) => l.period))].sort((a, b) => a - b);

  return periods.map((period) => {
    const cellsByDate: Record<string, Lesson[][]> = {};
    for (const date of days) {
      const dayPeriodLessons = withPeriod.filter((l) => l.date === date && l.period === period);
      cellsByDate[date] = groupParallelLessons(dayPeriodLessons);
    }
    return { period, cellsByDate };
  });
}
