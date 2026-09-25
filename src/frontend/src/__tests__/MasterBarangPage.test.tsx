/**
 * Master Barang page — create, search, and edit flows.
 *
 * The page is rendered against a typed in-memory actor (see `fake-backend.ts`),
 * so these are component/integration tests of the page's own state, validation,
 * and rendering. They do not exercise the real canister.
 */

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import MasterBarangPage from "@/pages/MasterBarangPage";
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

describe("MasterBarangPage", () => {
  beforeEach(() => {
    holder.actor = null;
  });

  it("shows the empty state when the master list is empty", async () => {
    const { actor } = createFakeBackend();
    holder.actor = actor;

    renderWithBackend(<MasterBarangPage />);

    expect(
      await screen.findByText("Belum ada barang di master"),
    ).toBeInTheDocument();
  });

  it("creates a barang and shows it in the master list", async () => {
    const user = userEvent.setup();
    const { actor, backend } = createFakeBackend();
    holder.actor = actor;

    renderWithBackend(<MasterBarangPage />);
    await screen.findByText("Belum ada barang di master");

    await user.type(screen.getByTestId("master.nama_input"), "Buku Tulis Sidu");
    await user.type(screen.getByTestId("master.ukuran_input"), "38 lembar");
    await user.type(screen.getByTestId("master.harga_input"), "3500");
    await user.type(screen.getByTestId("master.stock_input"), "24");
    await user.click(screen.getByTestId("master.submit_button"));

    expect(await screen.findByText("Buku Tulis Sidu")).toBeInTheDocument();
    expect(screen.getByText("38 lembar")).toBeInTheDocument();
    expect(screen.getByText("Rp 3.500")).toBeInTheDocument();
    expect(backend.createdItems).toHaveLength(1);
    expect(backend.createdItems[0]).toMatchObject({
      namaBarang: "Buku Tulis Sidu",
      ukuran: "38 lembar",
      hargaPokok: 3_500n,
      stockMaster: 24n,
    });
  });

  it("rejects an empty add form with per-field validation messages", async () => {
    const user = userEvent.setup();
    const { actor, backend } = createFakeBackend();
    holder.actor = actor;

    renderWithBackend(<MasterBarangPage />);
    await screen.findByText("Belum ada barang di master");

    await user.click(screen.getByTestId("master.submit_button"));

    expect(screen.getByTestId("master.nama_error")).toHaveTextContent(
      "Nama Barang wajib diisi.",
    );
    expect(screen.getByTestId("master.ukuran_error")).toHaveTextContent(
      "Ukuran wajib diisi.",
    );
    expect(screen.getByTestId("master.harga_error")).toHaveTextContent(
      "Harga Pokok wajib diisi",
    );
    expect(screen.getByTestId("master.stock_error")).toHaveTextContent(
      "Stock Master wajib diisi",
    );
    expect(backend.createdItems).toHaveLength(0);
  });

  it("filters the list live as the search term is typed", async () => {
    const user = userEvent.setup();
    const { actor } = createFakeBackend();
    actor.listItems = async () => [
      {
        id: 1n,
        namaBarang: "Buku Tulis",
        ukuran: "38 lembar",
        hargaPokok: 3_000n,
        stockMaster: 10n,
        createdAt: 1n,
        updatedAt: 1n,
      },
      {
        id: 2n,
        namaBarang: "Pulpen Biru",
        ukuran: "0.5 mm",
        hargaPokok: 2_000n,
        stockMaster: 5n,
        createdAt: 1n,
        updatedAt: 1n,
      },
    ];
    actor.searchItems = async (term: string) => {
      const needle = term.trim().toLowerCase();
      const all = await actor.listItems();
      return all.filter((item) =>
        item.namaBarang.toLowerCase().includes(needle),
      );
    };
    holder.actor = actor;

    renderWithBackend(<MasterBarangPage />);
    expect(await screen.findByText("Buku Tulis")).toBeInTheDocument();
    expect(screen.getByText("Pulpen Biru")).toBeInTheDocument();

    await user.type(screen.getByTestId("master.search_input"), "pulpen");

    await waitFor(() => {
      expect(screen.queryByText("Buku Tulis")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Pulpen Biru")).toBeInTheDocument();
  });

  it("edits ukuran and harga pokok through the edit dialog", async () => {
    const user = userEvent.setup();
    const { actor, backend } = createFakeBackend();
    backend.items.push({
      id: 1n,
      namaBarang: "Buku Tulis",
      ukuran: "38 lembar",
      hargaPokok: 3_000n,
      stockMaster: 10n,
      createdAt: 1n,
      updatedAt: 1n,
    });
    holder.actor = actor;

    renderWithBackend(<MasterBarangPage />);
    await screen.findByText("Buku Tulis");

    await user.click(screen.getByTestId("master.edit_button.1"));

    const dialog = await screen.findByTestId("master.dialog");
    const ukuranInput = within(dialog).getByTestId("master.edit_ukuran_input");
    const hargaInput = within(dialog).getByTestId("master.edit_harga_input");

    await user.clear(ukuranInput);
    await user.type(ukuranInput, "58 lembar");
    await user.clear(hargaInput);
    await user.type(hargaInput, "4200");
    await user.click(within(dialog).getByTestId("master.save_button"));

    await waitFor(() => {
      expect(backend.updatedItems).toHaveLength(1);
    });
    expect(backend.updatedItems[0]).toEqual({
      id: 1n,
      edit: { ukuran: "58 lembar", hargaPokok: 4_200n },
    });
    expect(await screen.findByText("58 lembar")).toBeInTheDocument();
    expect(screen.getByText("Rp 4.200")).toBeInTheDocument();
  });
});
