import { useQuery } from "@tanstack/react-query";
import { getLessonsForRange } from "../../data/database/repositories/lessonRepository";
import { STUNDENPLAN24_SOURCE_ID } from "../../data/constants";

/** `className: null` means "alle Klassen" - a specific className restricts to just that class. */
export function useSubstitutionLessons(from: string, to: string, className: string | null = null) {
  return useQuery({
    queryKey: ["substitutionLessons", STUNDENPLAN24_SOURCE_ID, from, to, className],
    queryFn: async () => {
      const lessons = await getLessonsForRange(STUNDENPLAN24_SOURCE_ID, from, to);
      const changed = lessons.filter((l) => l.status !== "normal");
      return className ? changed.filter((l) => l.className === className) : changed;
    },
  });
}
