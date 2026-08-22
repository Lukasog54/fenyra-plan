import { waitFor } from "@testing-library/react-native";
import { renderHookWithProviders } from "../../test-utils/renderWithProviders";
import { useTodayLessons } from "../../src/query/hooks/useTodayLessons";
import { useSettingsStore } from "../../src/stores/useSettingsStore";
import { resetStores } from "../../test-utils/resetStores";
import * as lessonRepository from "../../src/data/database/repositories/lessonRepository";
import { STUNDENPLAN24_SOURCE_ID } from "../../src/data/constants";
import { todayIsoDate } from "../../src/utils/date";
import type { Lesson } from "../../src/data/models/Lesson";

jest.mock("../../src/data/database/repositories/lessonRepository", () => ({
  getLessonsForRange: jest.fn(),
}));

const mockedGetLessonsForRange = lessonRepository.getLessonsForRange as jest.MockedFunction<
  typeof lessonRepository.getLessonsForRange
>;

function makeLesson(overrides: Partial<Lesson>): Lesson {
  return {
    id: `l_${Math.random()}`,
    date: todayIsoDate(),
    startTime: "08:00",
    endTime: "08:45",
    period: 1,
    className: "10a",
    status: "normal",
    sourceId: "test",
    ...overrides,
  };
}

beforeEach(() => {
  resetStores();
  mockedGetLessonsForRange.mockReset();
});

describe("useTodayLessons", () => {
  it("queries the repository for today's date on both ends of the range", async () => {
    mockedGetLessonsForRange.mockResolvedValue([makeLesson({ className: "10a" })]);

    const { result } = await renderHookWithProviders(() => useTodayLessons());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const today = todayIsoDate();
    expect(mockedGetLessonsForRange).toHaveBeenCalledWith(STUNDENPLAN24_SOURCE_ID, today, today);
    expect(result.current.data).toHaveLength(1);
  });

  it("filters today's lessons by the selected class name", async () => {
    useSettingsStore.getState().setSelectedClassName("10a");
    mockedGetLessonsForRange.mockResolvedValue([makeLesson({ className: "10a" }), makeLesson({ className: "10b" })]);

    const { result } = await renderHookWithProviders(() => useTodayLessons());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].className).toBe("10a");
  });
});
