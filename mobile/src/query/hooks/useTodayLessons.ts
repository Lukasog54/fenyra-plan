import { todayIsoDate } from "../../utils/date";
import { useLessonsForDate } from "./useLessonsForDate";

export function useTodayLessons() {
  return useLessonsForDate(todayIsoDate());
}
