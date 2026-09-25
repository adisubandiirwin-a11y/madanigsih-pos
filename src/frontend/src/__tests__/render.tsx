/**
 * Render helpers for the frontend suite.
 *
 * `renderWithBackend` mocks `@/lib/backend` so every hook receives the supplied
 * typed fake actor, then wraps the page in a fresh `QueryClientProvider`. The
 * pages are rendered directly rather than through the router, so a test asserts
 * one page's behavior without depending on navigation.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type RenderResult, render } from "@testing-library/react";
import type { ReactElement } from "react";
import { vi } from "vitest";

import type { FakeActor } from "./fake-backend";

/**
 * Install the `@/lib/backend` mock for the current test file. Call once at the
 * top level of a test module, before importing the page under test.
 */
export function mockBackendModule(actor: FakeActor): void {
  vi.mock("@/lib/backend", async () => {
    const actual =
      await vi.importActual<typeof import("@/lib/backend")>("@/lib/backend");
    return {
      ...actual,
      useBackendActor: () => ({ actor, isFetching: false }),
    };
  });
}

/** Render a page inside a fresh QueryClient with retries disabled. */
export function renderWithBackend(ui: ReactElement): RenderResult {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}
