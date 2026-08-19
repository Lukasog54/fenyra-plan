export const queryKeys = {
  lessons: (sourceId: string, from: string, to: string, className: string | null) =>
    ["lessons", sourceId, from, to, className] as const,
  substitutions: (from: string, to: string) => ["substitutions", from, to] as const,
  syncMeta: (sourceId: string) => ["syncMeta", sourceId] as const,
};
