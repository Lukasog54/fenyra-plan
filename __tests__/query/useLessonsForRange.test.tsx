import { waitFor } from "@testing-library/react-native";
import { renderHookWithProviders } from "../../test-utils/renderWithProviders";
import { useLessonsForRange } from "../../src/query/hooks/useLessonsForRange";
import { useSettingsStore } from "../../src/stores/useSettingsStore";
import { resetStores } from "../../test-utils/resetStores";
import * as lessonRepository from "../../src/data/database/repositories/lessonRepository";
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

describe("useLessonsForRange", () => {
  it("returns all lessons when no class is selected", async () => {
    mockedGetLessonsForRange.mockResolvedValue([makeLesson({ className: "10a" }), makeLesson({ className: "10b" })]);

    const { result } = await renderHookWithProviders(() => useLessonsForRange("2026-08-17", "2026-08-21"));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
  });

  it("filters lessons by the selected class name", async () => {
    useSettingsStore.getState().setSelectedClassName("10a");
    mockedGetLessonsForRange.mockResolvedValue([makeLesson({ className: "10a" }), makeLesson({ className: "10b" })]);

    const { result } = await renderHookWithProviders(() => useLessonsForRange("2026-08-17", "2026-08-21"));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].className).toBe("10a");
  });
});
