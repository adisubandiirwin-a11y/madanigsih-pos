/**
 * Shared test harness for the Toko Madanigsih Stationery frontend suite.
 *
 * The pages reach the backend through `useBackendActor` in `@/lib/backend`,
 * which wraps the generated `createActor` factory. Mocking that one module
 * gives every hook a typed in-memory actor without an agent, an identity, or a
 * network call, and keeps the pages' own rendering and state logic under test.
 *
 * The fake actor implements the generated `backendInterface` shape the app
 * consumes (`@/backend`), so a change to the contract surfaces as a type error
 * here rather than as a silently passing mock.
 */

import type {
  AppError,
  AppResult,
  AppResult_1,
  ItemEdit,
  ItemId,
  ItemView,
  NewItem,
  NewSale,
  NewSaleLine,
  ProfitRow,
  ProfitSummary,
  SaleId,
  SaleLine,
  SaleView,
  YearlyProfit,
} from "@/backend";

/** A typed in-memory backend the pages can be driven against. */
export interface FakeBackend {
  items: ItemView[];
  sales: SaleView[];
  nextItemId: bigint;
  nextSaleId: bigint;
  /** Every `saveSale` payload the page sent, in call order. */
  savedSales: NewSale[];
  /** Every `createItem` payload the page sent, in call order. */
  createdItems: NewItem[];
  /** Every `updateItem` payload the page sent, in call order. */
  updatedItems: Array<{ id: ItemId; edit: ItemEdit }>;
  /** When set, the next `saveSale` rejects with this error. */
  failNextSaveSale: AppError | null;
  /** When set, the next `createItem` rejects with this error. */
  failNextCreateItem: AppError | null;
  /** When set, the next `updateItem` rejects with this error. */
  failNextUpdateItem: AppError | null;
}

export interface FakeActor {
  listItems(): Promise<ItemView[]>;
  searchItems(term: string): Promise<ItemView[]>;
  getItem(id: ItemId): Promise<ItemView | null>;
  createItem(input: NewItem): Promise<AppResult>;
  updateItem(id: ItemId, edit: ItemEdit): Promise<AppResult>;
  listSales(): Promise<SaleView[]>;
  getSale(id: SaleId): Promise<SaleView | null>;
  saveSale(input: NewSale): Promise<AppResult_1>;
  getProfitReport(
    year: bigint | null,
    month: bigint | null,
  ): Promise<ProfitSummary>;
  getMonthlyProfit(year: bigint): Promise<YearlyProfit>;
}

export interface FakeBackendHandle {
  backend: FakeBackend;
  actor: FakeActor;
}

/** Build a fresh in-memory backend plus the actor that reads and writes it. */
export function createFakeBackend(): FakeBackendHandle {
  const backend: FakeBackend = {
    items: [],
    sales: [],
    nextItemId: 1n,
    nextSaleId: 1n,
    savedSales: [],
    createdItems: [],
    updatedItems: [],
    failNextSaveSale: null,
    failNextCreateItem: null,
    failNextUpdateItem: null,
  };

  const actor: FakeActor = {
    async listItems() {
      return [...backend.items].sort((a, b) =>
        a.namaBarang.localeCompare(b.namaBarang),
      );
    },
    async searchItems(term: string) {
      const needle = term.trim().toLowerCase();
      const matched =
        needle === ""
          ? backend.items
          : backend.items.filter((item) =>
              item.namaBarang.toLowerCase().includes(needle),
            );
      return [...matched].sort((a, b) =>
        a.namaBarang.localeCompare(b.namaBarang),
      );
    },
    async getItem(id: ItemId) {
      return backend.items.find((item) => item.id === id) ?? null;
    },
    async createItem(input: NewItem) {
      backend.createdItems.push(input);
      if (backend.failNextCreateItem) {
        const err = backend.failNextCreateItem;
        backend.failNextCreateItem = null;
        return { __kind__: "err", err };
      }
      const id = backend.nextItemId;
      backend.nextItemId += 1n;
      const now = BigInt(Date.now()) * 1_000_000n;
      const item: ItemView = {
        id,
        namaBarang: input.namaBarang,
        ukuran: input.ukuran,
        hargaPokok: input.hargaPokok,
        stockMaster: input.stockMaster,
        createdAt: now,
        updatedAt: now,
      };
      backend.items.push(item);
      return { __kind__: "ok", ok: item };
    },
    async updateItem(id: ItemId, edit: ItemEdit) {
      backend.updatedItems.push({ id, edit });
      if (backend.failNextUpdateItem) {
        const err = backend.failNextUpdateItem;
        backend.failNextUpdateItem = null;
        return { __kind__: "err", err };
      }
      const index = backend.items.findIndex((item) => item.id === id);
      if (index === -1) {
        return {
          __kind__: "err",
          err: { __kind__: "itemNotFound", itemNotFound: id },
        };
      }
      const updated: ItemView = {
        ...backend.items[index],
        ukuran: edit.ukuran,
        hargaPokok: edit.hargaPokok,
        updatedAt: BigInt(Date.now()) * 1_000_000n,
      };
      backend.items[index] = updated;
      return { __kind__: "ok", ok: updated };
    },
    async listSales() {
      return [...backend.sales].sort((a, b) =>
        a.createdAt === b.createdAt ? 0 : a.createdAt > b.createdAt ? -1 : 1,
      );
    },
    async getSale(id: SaleId) {
      return backend.sales.find((sale) => sale.id === id) ?? null;
    },
    async saveSale(input: NewSale) {
      backend.savedSales.push(input);
      if (backend.failNextSaveSale) {
        const err = backend.failNextSaveSale;
        backend.failNextSaveSale = null;
        return { __kind__: "err", err };
      }
      const lines: SaleLine[] = input.lines.map((line) => {
        const master =
          line.itemId === undefined
            ? undefined
            : backend.items.find((item) => item.id === line.itemId);
        const manual = master === undefined;
        const hargaPokok = manual
          ? (line.hargaPokok ?? 0n)
          : (master?.hargaPokok ?? 0n);
        const namaBarang = manual
          ? (line.namaBarang ?? "")
          : (master?.namaBarang ?? "");
        const ukuran = manual ? (line.ukuran ?? "") : (master?.ukuran ?? "");
        return {
          jumlah: line.hargaJual * line.qtyOrder,
          itemId: line.itemId,
          hargaJual: line.hargaJual,
          namaBarang,
          qtyOrder: line.qtyOrder,
          hargaPokok,
          ukuran,
          manual,
        };
      });
      const total = lines.reduce((sum, line) => sum + line.jumlah, 0n);
      const id = backend.nextSaleId;
      backend.nextSaleId += 1n;
      const sale: SaleView = {
        id,
        total,
        tanggal: input.tanggal,
        createdAt: BigInt(Date.now()) * 1_000_000n,
        lines,
      };
      backend.sales.push(sale);
      // Mirror the backend: decrement master stock for master-linked lines.
      for (const line of input.lines) {
        if (line.itemId === undefined) continue;
        const index = backend.items.findIndex(
          (item) => item.id === line.itemId,
        );
        if (index === -1) continue;
        backend.items[index] = {
          ...backend.items[index],
          stockMaster: backend.items[index].stockMaster - line.qtyOrder,
        };
      }
      return { __kind__: "ok", ok: sale };
    },
    async getProfitReport(year: bigint | null, month: bigint | null) {
      const rows: ProfitRow[] = [];
      let totalLaba = 0n;
      for (const sale of backend.sales) {
        const [saleYear, saleMonth] = sale.tanggal
          .split("-")
          .map((part) => BigInt(Number.parseInt(part, 10)));
        if (year !== null && saleYear !== year) continue;
        if (month !== null && saleMonth !== month) continue;
        for (const line of sale.lines) {
          const laba = (line.hargaJual - line.hargaPokok) * line.qtyOrder;
          totalLaba += laba;
          rows.push({
            saleId: sale.id,
            tanggal: sale.tanggal,
            namaBarang: line.namaBarang,
            ukuran: line.ukuran,
            hargaPokok: line.hargaPokok,
            hargaJual: line.hargaJual,
            qtyOrder: line.qtyOrder,
            laba,
          });
        }
      }
      return { rows, totalLaba, untung: totalLaba >= 0n };
    },
    async getMonthlyProfit(year: bigint) {
      const buckets = Array.from({ length: 12 }, () => 0n);
      let totalLaba = 0n;
      for (const sale of backend.sales) {
        const [saleYear, saleMonth] = sale.tanggal
          .split("-")
          .map((part) => BigInt(Number.parseInt(part, 10)));
        if (saleYear !== year) continue;
        const monthIndex = Number(saleMonth) - 1;
        if (monthIndex < 0 || monthIndex > 11) continue;
        for (const line of sale.lines) {
          const laba = (line.hargaJual - line.hargaPokok) * line.qtyOrder;
          buckets[monthIndex] += laba;
          totalLaba += laba;
        }
      }
      return {
        year,
        totalLaba,
        months: buckets.map((laba, index) => ({
          month: BigInt(index + 1),
          laba,
        })),
      };
    },
  };

  return { backend, actor };
}

/** Build an `ItemView` fixture with sensible defaults. */
export function makeItem(overrides: Partial<ItemView> = {}): ItemView {
  return {
    id: 1n,
    namaBarang: "Buku Tulis",
    ukuran: "38 lembar",
    hargaPokok: 3_000n,
    stockMaster: 10n,
    createdAt: 1_700_000_000_000_000_000n,
    updatedAt: 1_700_000_000_000_000_000n,
    ...overrides,
  };
}
