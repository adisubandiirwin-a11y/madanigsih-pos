/**
 * Shared domain types for the Toko Madanigsih Stationery POS.
 *
 * The generated bindings in `@/backend` are the single source of truth for the
 * backend contract. This module re-exports the pieces the pages need so page
 * code imports from one stable place.
 */

export type {
  AppError,
  AppResult,
  AppResult_1,
  ItemEdit,
  ItemId,
  ItemView,
  IsoDate,
  Month,
  MonthlyProfit,
  NewItem,
  NewSale,
  NewSaleLine,
  ProfitRow,
  ProfitSummary,
  Qty,
  Rupiah,
  SaleId,
  SaleLine,
  SaleView,
  Timestamp,
  Year,
  YearlyProfit,
} from "@/backend";

/** A single line being composed in the Penjualan form, before it is saved. */
export interface DraftSaleLine {
  /** Local identity for React keys — never sent to the backend. */
  key: string;
  /**
   * Master item id for a master-linked line, or `null` for a manual line.
   * A manual line must never resolve to item id `0n`.
   */
  itemId: bigint | null;
  namaBarang: string;
  ukuran: string;
  hargaPokok: bigint;
  hargaJual: number;
  qtyOrder: number;
  stockMaster: bigint;
}
