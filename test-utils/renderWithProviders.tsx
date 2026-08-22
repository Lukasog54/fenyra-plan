import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, renderHook, type RenderOptions } from "@testing-library/react-native";
import { ThemeProvider } from "../src/theme/ThemeProvider";

/**
 * A fresh QueryClient per call - retries disabled so failing queries in tests resolve immediately
 * instead of retrying with backoff and timing out the test.
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      // gcTime: 0 avoids leaking React Query's garbage-collection timers past the end of a test.
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>{children}</ThemeProvider>
      </QueryClientProvider>
    );
  };
}

export async function renderWithProviders(ui: React.ReactElement, options?: RenderOptions) {
  const queryClient = createTestQueryClient();
  const result = await render(ui, { wrapper: makeWrapper(queryClient), ...options });
  return { queryClient, ...result };
}

export async function renderHookWithProviders<TResult, TProps>(
  callback: (props: TProps) => TResult,
  options?: Parameters<typeof renderHook<TResult, TProps>>[1]
) {
  const queryClient = createTestQueryClient();
  const result = await renderHook(callback, { wrapper: makeWrapper(queryClient), ...options });
  return { queryClient, ...result };
}
