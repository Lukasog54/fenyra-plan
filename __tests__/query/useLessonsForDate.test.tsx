import { waitFor } from "@testing-library/react-native";
import { renderHookWithProviders } from "../../test-utils/renderWithProviders";
import { useLessonsForDate } from "../../src/query/hooks/useLessonsForDate";
import { useSettingsStore } from "../../src/stores/useSettingsStore";
import { resetStores } from "../../test-utils/resetStores";
import * as lessonRepository from "../../src/data/database/repositories/lessonRepository";
import { STUNDENPLAN24_SOURCE_ID } from "../../src/data/constants";
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
    date: "2026-08-17",
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

describe("useLessonsForDate", () => {
  it("returns all lessons for the given date when no class is selected", async () => {
    mockedGetLessonsForRange.mockResolvedValue([makeLesson({ className: "10a" }), makeLesson({ className: "10b" })]);

    const { result } = await renderHookWithProviders(() => useLessonsForDate("2026-08-17"));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
    expect(mockedGetLessonsForRange).toHaveBeenCalledWith(STUNDENPLAN24_SOURCE_ID, "2026-08-17", "2026-08-17");
  });

  it("filters lessons by the selected class name", async () => {
    useSettingsStore.getState().setSelectedClassName("10b");
    mockedGetLessonsForRange.mockResolvedValue([makeLesson({ className: "10a" }), makeLesson({ className: "10b" })]);

    const { result } = await renderHookWithProviders(() => useLessonsForDate("2026-08-17"));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].className).toBe("10b");
  });

  it("returns an empty array when nothing is scheduled for the date", async () => {
    mockedGetLessonsForRange.mockResolvedValue([]);

    const { result } = await renderHookWithProviders(() => useLessonsForDate("2026-08-17"));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});
