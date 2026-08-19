import { useQuery } from "@tanstack/react-query";
import { getLessonsForRange } from "../../data/database/repositories/lessonRepository";
import { STUNDENPLAN24_SOURCE_ID } from "../../data/constants";

export function useSubstitutionLessons(from: string, to: string) {
  return useQuery({
    queryKey: ["substitutionLessons", STUNDENPLAN24_SOURCE_ID, from, to],
    queryFn: async () => {
      const lessons = await getLessonsForRange(STUNDENPLAN24_SOURCE_ID, from, to);
      return lessons.filter((l) => l.status !== "normal");
    },
  });
}
