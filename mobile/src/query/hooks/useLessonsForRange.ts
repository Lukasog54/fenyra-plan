import { useQuery } from "@tanstack/react-query";
import { getLessonsForRange } from "../../data/database/repositories/lessonRepository";
import { useSettingsStore } from "../../stores/useSettingsStore";
import { STUNDENPLAN24_SOURCE_ID } from "../../data/constants";
import { queryKeys } from "../keys";

export function useLessonsForRange(from: string, to: string) {
  const selectedClassName = useSettingsStore((s) => s.selectedClassName);

  return useQuery({
    queryKey: queryKeys.lessons(STUNDENPLAN24_SOURCE_ID, from, to, selectedClassName),
    queryFn: async () => {
      const lessons = await getLessonsForRange(STUNDENPLAN24_SOURCE_ID, from, to);
      return selectedClassName ? lessons.filter((l) => l.className === selectedClassName) : lessons;
    },
  });
}
