/**
 * Vitest setup for the frontend suite.
 *
 * Registers jest-dom matchers and points Testing Library's `getByTestId` at the
 * generated `data-ocid` attribute, which is the only stable selector the
 * generated components expose.
 */

import "@testing-library/jest-dom/vitest";
import { configure } from "@testing-library/react";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

configure({ testIdAttribute: "data-ocid" });

// jsdom does not implement ResizeObserver, which recharts' ResponsiveContainer
// requires to measure its chart area. A no-op observer is enough for the chart
// to mount and render its axes and bars.
if (!("ResizeObserver" in globalThis)) {
  class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  globalThis.ResizeObserver =
    ResizeObserverStub as unknown as typeof ResizeObserver;
}

afterEach(() => {
  cleanup();
});
