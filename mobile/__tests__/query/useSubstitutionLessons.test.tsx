import { waitFor } from "@testing-library/react-native";
import { renderHookWithProviders } from "../../test-utils/renderWithProviders";
import { useSubstitutionLessons } from "../../src/query/hooks/useSubstitutionLessons";
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

describe("useSubstitutionLessons", () => {
  it("only returns groups where at least one lesson is a real change", async () => {
    mockedGetLessonsForRange.mockResolvedValue([
      makeLesson({ id: "1", period: 1, status: "normal" }),
      makeLesson({ id: "2", period: 2, status: "cancelled" }),
    ]);

    const { result } = await renderHookWithProviders(() => useSubstitutionLessons("2026-08-17", "2026-08-21"));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0][0].status).toBe("cancelled");
  });

  it("keeps unaffected parallel lessons in a group alongside a changed one", async () => {
    mockedGetLessonsForRange.mockResolvedValue([
      makeLesson({ id: "1", period: 1, className: "10a", status: "cancelled" }),
      makeLesson({ id: "2", period: 1, className: "10a", status: "normal" }),
    ]);

    const { result } = await renderHookWithProviders(() => useSubstitutionLessons("2026-08-17", "2026-08-21"));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0]).toHaveLength(2);
  });

  it("restricts results to a specific class when className is provided", async () => {
    mockedGetLessonsForRange.mockResolvedValue([
      makeLesson({ id: "1", className: "10a", status: "cancelled" }),
      makeLesson({ id: "2", className: "10b", status: "cancelled" }),
    ]);

    const { result } = await renderHookWithProviders(() => useSubstitutionLessons("2026-08-17", "2026-08-21", "10a"));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0][0].className).toBe("10a");
  });

  it("returns an empty array when nothing changed in the range", async () => {
    mockedGetLessonsForRange.mockResolvedValue([makeLesson({ status: "normal" })]);

    const { result } = await renderHookWithProviders(() => useSubstitutionLessons("2026-08-17", "2026-08-21"));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});
