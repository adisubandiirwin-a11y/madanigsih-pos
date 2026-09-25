/**
 * Penjualan page — order composition, save, stock decrement, rejection, and
 * the receipt / WhatsApp text.
 *
 * Rendered against a typed in-memory actor (see `fake-backend.ts`). These are
 * component/integration tests: they assert the page's own state, formatting,
 * and the payloads it sends, not the real canister's behavior.
 */

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PenjualanPage from "@/pages/PenjualanPage";
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

/** Seed one master item and return the fake backend handle. */
function seedItem() {
  const handle = createFakeBackend();
  handle.backend.items.push({
    id: 1n,
    namaBarang: "Buku Tulis Sidu",
    ukuran: "38 lembar",
    hargaPokok: 3_000n,
    stockMaster: 10n,
    createdAt: 1n,
    updatedAt: 1n,
  });
  return handle;
}

describe("PenjualanPage", () => {
  beforeEach(() => {
    holder.actor = null;
  });

  it("defaults Tanggal Penjualan to today", async () => {
    const { actor } = seedItem();
    holder.actor = actor;

    renderWithBackend(<PenjualanPage />);

    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    expect(screen.getByTestId("penjualan.tanggal_input")).toHaveValue(iso);
  });

  it("selects a master item, shows its Qty Stock, and computes Jumlah and total", async () => {
    const user = userEvent.setup();
    const { actor } = seedItem();
    holder.actor = actor;

    renderWithBackend(<PenjualanPage />);

    await user.type(screen.getByTestId("penjualan.search_input"), "buku");
    const result = await screen.findByTestId("penjualan.search_result.1");
    expect(result).toHaveTextContent("Buku Tulis Sidu");
    expect(result).toHaveTextContent("Stok 10");
    await user.click(result);

    // Qty Stock reflects the selected master item's stock.
    expect(screen.getByTestId("penjualan.qty_stock_display")).toHaveTextContent(
      "10",
    );

    await user.type(screen.getByTestId("penjualan.harga_jual_input"), "5000");
    await user.type(screen.getByTestId("penjualan.qty_order_input"), "3");
    await user.click(screen.getByTestId("penjualan.add_line_button"));

    const line = await screen.findByTestId("penjualan.line.1");
    expect(within(line).getByText("Buku Tulis Sidu")).toBeInTheDocument();
    // Jumlah per baris = Harga Jual x Qty Order = 5.000 x 3.
    expect(within(line).getByText("Rp 15.000")).toBeInTheDocument();
    expect(screen.getByTestId("penjualan.grand_total")).toHaveTextContent(
      "Rp 15.000",
    );
  });

  it("saves an order, decrements master stock, and shows the receipt", async () => {
    const user = userEvent.setup();
    const { actor, backend } = seedItem();
    holder.actor = actor;

    renderWithBackend(<PenjualanPage />);

    await user.type(screen.getByTestId("penjualan.search_input"), "buku");
    await user.click(await screen.findByTestId("penjualan.search_result.1"));
    await user.type(screen.getByTestId("penjualan.harga_jual_input"), "5000");
    await user.type(screen.getByTestId("penjualan.qty_order_input"), "4");
    await user.click(screen.getByTestId("penjualan.add_line_button"));
    await screen.findByTestId("penjualan.line.1");

    await user.click(screen.getByTestId("penjualan.save_button"));

    await waitFor(() => {
      expect(backend.savedSales).toHaveLength(1);
    });
    expect(backend.savedSales[0].lines[0]).toMatchObject({
      itemId: 1n,
      hargaJual: 5_000n,
      qtyOrder: 4n,
    });
    // Stock Master 10 - 4 = 6.
    expect(backend.items[0].stockMaster).toBe(6n);

    // The receipt dialog opens with the full receipt.
    const receipt = await screen.findByTestId("penjualan.receipt_print_area");
    expect(receipt).toHaveTextContent("Toko Madanigsih Stationery");
    expect(receipt).toHaveTextContent("Jl. Belakang Terminal Pakupatan Serang");
    expect(receipt).toHaveTextContent("Buku Tulis Sidu");
    expect(receipt).toHaveTextContent("Rp 20.000");
  });

  it("rejects an order that exceeds stock and shows a warning", async () => {
    const user = userEvent.setup();
    const { actor, backend } = seedItem();
    backend.failNextSaveSale = {
      __kind__: "insufficientStock",
      insufficientStock: { itemId: 1n, requested: 20n, available: 10n },
    };
    holder.actor = actor;

    renderWithBackend(<PenjualanPage />);

    await user.type(screen.getByTestId("penjualan.search_input"), "buku");
    await user.click(await screen.findByTestId("penjualan.search_result.1"));
    await user.type(screen.getByTestId("penjualan.harga_jual_input"), "5000");
    await user.type(screen.getByTestId("penjualan.qty_order_input"), "20");
    await user.click(screen.getByTestId("penjualan.add_line_button"));
    await screen.findByTestId("penjualan.line.1");

    await user.click(screen.getByTestId("penjualan.save_button"));

    const warning = await screen.findByTestId("penjualan.stock_warning");
    expect(warning).toHaveTextContent("Pesanan tidak dapat disimpan");
    expect(warning).toHaveTextContent("Stok tidak mencukupi");
    // The order was not persisted and stock is untouched.
    expect(backend.sales).toHaveLength(0);
    expect(backend.items[0].stockMaster).toBe(10n);
  });

  it("saves a manual line without decrementing any master stock", async () => {
    const user = userEvent.setup();
    const { actor, backend } = seedItem();
    holder.actor = actor;

    renderWithBackend(<PenjualanPage />);

    await user.type(
      screen.getByTestId("penjualan.manual_name_input"),
      "Penghapus Manual",
    );
    await user.type(
      screen.getByTestId("penjualan.manual_ukuran_input"),
      "besar",
    );
    await user.type(screen.getByTestId("penjualan.harga_jual_input"), "2000");
    await user.type(screen.getByTestId("penjualan.qty_order_input"), "2");
    await user.click(screen.getByTestId("penjualan.add_line_button"));

    const line = await screen.findByTestId("penjualan.line.1");
    expect(within(line).getByText(/manual/)).toBeInTheDocument();

    await user.click(screen.getByTestId("penjualan.save_button"));

    await waitFor(() => {
      expect(backend.savedSales).toHaveLength(1);
    });
    // Manual line carries no itemId and leaves the master item untouched.
    expect(backend.savedSales[0].lines[0].itemId).toBeUndefined();
    expect(backend.savedSales[0].lines[0].namaBarang).toBe("Penghapus Manual");
    expect(backend.items[0].stockMaster).toBe(10n);
  });

  it("opens WhatsApp with the same receipt text as the printed receipt", async () => {
    const user = userEvent.setup();
    const { actor } = seedItem();
    holder.actor = actor;
    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);

    renderWithBackend(<PenjualanPage />);

    await user.type(screen.getByTestId("penjualan.search_input"), "buku");
    await user.click(await screen.findByTestId("penjualan.search_result.1"));
    await user.type(screen.getByTestId("penjualan.harga_jual_input"), "5000");
    await user.type(screen.getByTestId("penjualan.qty_order_input"), "2");
    await user.click(screen.getByTestId("penjualan.add_line_button"));
    await screen.findByTestId("penjualan.line.1");
    await user.click(screen.getByTestId("penjualan.save_button"));

    await screen.findByTestId("penjualan.receipt_print_area");
    await user.type(
      screen.getByTestId("penjualan.wa_number_input"),
      "08123456789",
    );
    await user.click(screen.getByTestId("penjualan.send_wa_button"));

    expect(openSpy).toHaveBeenCalledTimes(1);
    const url = openSpy.mock.calls[0][0] as string;
    expect(url).toContain("https://wa.me/628123456789?text=");
    const text = decodeURIComponent(url.split("?text=")[1]);
    expect(text).toContain("Toko Madanigsih Stationery");
    expect(text).toContain("Jl. Belakang Terminal Pakupatan Serang");
    expect(text).toContain("Buku Tulis Sidu");
    expect(text).toContain("2 x Rp 5.000 = Rp 10.000");
    expect(text).toContain("TOTAL: Rp 10.000");

    openSpy.mockRestore();
  });
});
