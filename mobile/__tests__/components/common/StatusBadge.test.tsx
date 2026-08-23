import React from "react";
import { screen } from "@testing-library/react-native";
import { renderWithProviders } from "../../../test-utils/renderWithProviders";
import { StatusBadge } from "../../../src/components/common/StatusBadge";
import type { LessonStatus } from "../../../src/data/models/Lesson";
import { statusLabels } from "../../../src/theme/colors";

describe("StatusBadge", () => {
  it("renders nothing for status 'normal'", async () => {
    const { toJSON } = await renderWithProviders(<StatusBadge status="normal" />);
    expect(toJSON()).toBeNull();
  });

  const nonNormalStatuses: LessonStatus[] = [
    "cancelled",
    "substitution",
    "room-change",
    "teacher-change",
    "subject-change",
    "moved",
    "unknown",
  ];

  it.each(nonNormalStatuses)("renders the German label for status '%s'", async (status) => {
    await renderWithProviders(<StatusBadge status={status} />);
    expect(screen.getByText(statusLabels[status])).toBeTruthy();
  });
});
