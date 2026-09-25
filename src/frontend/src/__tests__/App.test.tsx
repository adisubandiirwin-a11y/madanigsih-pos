/**
 * App shell — default route and primary navigation.
 *
 * Renders the real router and layout against the typed in-memory actor, so the
 * default-route redirect and the three navigation links are exercised as the
 * user sees them. This is component/integration coverage, not a deployed
 * browser test.
 */

import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "@/App";
import { type FakeActor, createFakeBackend } from "./fake-backend";
import { renderWithBackend } from "./render";

const holder = vi.hoisted(() => ({ actor: null as FakeActor | null }));

vi.mock("@/lib/backend", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/backend")>("@/lib/backend");
  return {
    ...actual,
    useBackendActor: () => ({ actor: holder.actor, isFetching: false }),
  };
});

describe("App shell", () => {
  beforeEach(() => {
    holder.actor = null;
    window.history.pushState({}, "", "/");
  });

  it("renders the shop header and navigation to Master, Penjualan, and Laporan", async () => {
    const { actor } = createFakeBackend();
    holder.actor = actor;

    renderWithBackend(<App />);

    expect(
      await screen.findByText("Toko Madanigsih Stationery"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("nav.penjualan_link")).toBeInTheDocument();
    expect(screen.getByTestId("nav.master_link")).toBeInTheDocument();
    expect(screen.getByTestId("nav.laporan_link")).toBeInTheDocument();
  });

  it("redirects the default route to Penjualan without a blank screen", async () => {
    const { actor } = createFakeBackend();
    holder.actor = actor;

    renderWithBackend(<App />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Transaksi Penjualan" }),
      ).toBeInTheDocument();
    });
  });
});
