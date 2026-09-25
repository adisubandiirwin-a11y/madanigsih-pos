/**
 * Laporan page — profit/loss rows, total, and the monthly chart.
 *
 * Rendered against a typed in-memory actor (see `fake-backend.ts`). These are
 * component/integration tests of the page's own rendering and formatting; the
 * profit arithmetic itself is the fake actor's, not the canister's.
 */

import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import LaporanPage from "@/pages/LaporanPage";
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

const YEAR = new Date().getFullYear();

/** Seed one sale with a profitable and a loss-making line in the current year. */
function seedSales() {
  const handle = createFakeBackend();
  handle.backend.sales.push({
    id: 1n,
    tanggal: `${YEAR}-03-15`,
    createdAt: 1n,
    total: 20_000n,
    lines: [
      {
        jumlah: 15_000n,
        itemId: 1n,
        hargaJual: 5_000n,
        namaBarang: "Buku Tulis",
        qtyOrder: 3n,
        hargaPokok: 3_000n,
        ukuran: "38 lembar",
        manual: false,
      },
      {
        jumlah: 5_000n,
        itemId: 2n,
        hargaJual: 2_000n,
        namaBarang: "Pulpen",
        qtyOrder: 5n,
        hargaPokok: 2_500n,
        ukuran: "0.5 mm",
        manual: false,
      },
    ],
  });
  return handle;
}

describe("LaporanPage", () => {
  beforeEach(() => {
    holder.actor = null;
  });

  it("shows the empty state when there are no transactions", async () => {
    const { actor } = createFakeBackend();
    holder.actor = actor;

    renderWithBackend(<LaporanPage />);

    expect(
      await screen.findByTestId("laporan.table_empty_state"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("laporan.total_laba")).toHaveTextContent("Rp 0");
  });

  it("renders one row per transaction line with its laba", async () => {
    const { actor } = seedSales();
    holder.actor = actor;

    renderWithBackend(<LaporanPage />);

    const row1 = await screen.findByTestId("laporan.row.1");
    // (5.000 - 3.000) x 3 = 6.000
    expect(within(row1).getByText("Buku Tulis")).toBeInTheDocument();
    expect(within(row1).getByText("Rp 6.000")).toBeInTheDocument();

    const row2 = screen.getByTestId("laporan.row.2");
    // (2.000 - 2.500) x 5 = -2.500
    expect(within(row2).getByText("Pulpen")).toBeInTheDocument();
    expect(within(row2).getByText("-Rp 2.500")).toBeInTheDocument();
  });

  it("shows the total laba across transactions", async () => {
    const { actor } = seedSales();
    holder.actor = actor;

    renderWithBackend(<LaporanPage />);

    // 6.000 + (-2.500) = 3.500
    expect(await screen.findByTestId("laporan.total_laba")).toHaveTextContent(
      "Rp 3.500",
    );
    expect(screen.getByTestId("laporan.status_badge")).toHaveTextContent(
      "Untung",
    );
  });

  it("renders the monthly chart container when the year has profit data", async () => {
    const { actor } = seedSales();
    holder.actor = actor;

    renderWithBackend(<LaporanPage />);

    // With non-zero monthly data the page renders the chart container rather
    // than the "no chart data" empty state. jsdom gives the responsive
    // container zero size, so recharts draws no axis ticks here; the branch
    // under test is which of the two states the page chooses.
    const chart = await screen.findByTestId("laporan.chart");
    expect(chart).toBeInTheDocument();
    expect(
      screen.queryByTestId("laporan.chart_empty_state"),
    ).not.toBeInTheDocument();
  });

  it("shows the chart empty state when the year has no profit data", async () => {
    const { actor } = createFakeBackend();
    holder.actor = actor;

    renderWithBackend(<LaporanPage />);

    expect(
      await screen.findByTestId("laporan.chart_empty_state"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("laporan.chart")).not.toBeInTheDocument();
  });
});
