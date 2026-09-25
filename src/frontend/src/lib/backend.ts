/**
 * Shared backend access for the Toko Madanigsih Stationery POS.
 *
 * `createActor` is the generated bindgen factory; `useActor` from the core
 * infrastructure package supplies the configured agent and identity. Every
 * query/mutation hook goes through `useBackendActor` so the actor is created
 * exactly once per component tree.
 */

import { useActor } from "@caffeineai/core-infrastructure";
import { createActor } from "@/backend";
import type { AppError, AppResult, AppResult_1 } from "@/types";

/** Shared actor accessor — call at React hook top level, never in callbacks. */
export function useBackendActor() {
  return useActor(createActor);
}

/** Human-readable Indonesian message for a backend `AppError` variant. */
export function appErrorMessage(error: AppError): string {
  switch (error.__kind__) {
    case "emptyField":
      return `Kolom "${error.emptyField}" wajib diisi.`;
    case "invalidNumber":
      return `Nilai "${error.invalidNumber}" tidak valid. Masukkan angka nol atau lebih.`;
    case "invalidDate":
      return `Tanggal "${error.invalidDate}" tidak valid. Gunakan format YYYY-MM-DD.`;
    case "emptyOrder":
      return "Pesanan masih kosong. Tambahkan minimal satu barang sebelum menyimpan.";
    case "itemNotFound":
      return "Barang tidak ditemukan. Muat ulang daftar master barang.";
    case "saleNotFound":
      return "Transaksi tidak ditemukan. Muat ulang daftar penjualan.";
    case "insufficientStock":
      return `Stok tidak mencukupi: diminta ${error.insufficientStock.requested}, tersedia ${error.insufficientStock.available}.`;
    default:
      return "Terjadi kesalahan pada server. Silakan coba lagi.";
  }
}

/**
 * Unwrap an `AppResult` / `AppResult_1` into its value, or throw a readable
 * Indonesian error derived from the `AppError` variant.
 */
export function unwrapResult<T>(result: AppResult | AppResult_1): T {
  if (result.__kind__ === "ok") {
    return result.ok as T;
  }
  throw new Error(appErrorMessage(result.err));
}
