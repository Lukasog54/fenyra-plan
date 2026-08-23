import { useQuery } from "@tanstack/react-query";
import { getLessonsForRange } from "../../data/database/repositories/lessonRepository";
import { STUNDENPLAN24_SOURCE_ID } from "../../data/constants";
import { groupParallelLessons } from "../../utils/lessonGroups";

/**
 * Returns groups of lessons (same date+className+period) where at least one lesson in the group
 * is a real change. A group's *other*, unaffected parallel lessons (e.g. a simultaneous elective
 * group that isn't cancelled) are kept in the group for context, instead of being filtered out
 * and only showing the changed one in isolation - otherwise "Ausfall" for one of two parallel
 * groups reads as if the whole period is cancelled.
 *
 * `className: null` means "alle Klassen" - a specific className restricts to just that class.
 */
export function useSubstitutionLessons(from: string, to: string, className: string | null = null) {
  return useQuery({
    queryKey: ["substitutionLessons", STUNDENPLAN24_SOURCE_ID, from, to, className],
    queryFn: async () => {
      const lessons = await getLessonsForRange(STUNDENPLAN24_SOURCE_ID, from, to);
      const scoped = className ? lessons.filter((l) => l.className === className) : lessons;
      const groups = groupParallelLessons(scoped);
      return groups.filter((group) => group.some((l) => l.status !== "normal"));
    },
  });
}
