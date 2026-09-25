/**
 * Indonesian formatting helpers for money, dates, and quantities.
 *
 * Money and quantities arrive from the backend as `bigint`; convert with
 * `Number()` only at the display boundary.
 */

const RUPIAH_FORMATTER = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 0,
});

const MONTHS_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
] as const;

const MONTHS_SHORT_ID = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
] as const;

/** Format an integer Rupiah amount as `Rp 1.234.567`. */
export function formatRupiah(value: bigint | number): string {
  const numeric = typeof value === "bigint" ? Number(value) : value;
  if (!Number.isFinite(numeric)) return "Rp 0";
  return `Rp ${RUPIAH_FORMATTER.format(Math.round(numeric))}`;
}

/** Format a plain integer with Indonesian thousands separators. */
export function formatNumber(value: bigint | number): string {
  const numeric = typeof value === "bigint" ? Number(value) : value;
  if (!Number.isFinite(numeric)) return "0";
  return RUPIAH_FORMATTER.format(numeric);
}

/** Parse a user-typed numeric string into a non-negative integer, or `null`. */
export function parseNonNegativeInt(raw: string): number | null {
  const cleaned = raw.replace(/[^\d]/g, "");
  if (cleaned === "") return null;
  const parsed = Number.parseInt(cleaned, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Today's date as an ISO `YYYY-MM-DD` string in local time. */
export function todayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Format an ISO `YYYY-MM-DD` string as `25 September 2026`. */
export function formatIsoDate(iso: string): string {
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  const year = Number.parseInt(parts[0], 10);
  const month = Number.parseInt(parts[1], 10);
  const day = Number.parseInt(parts[2], 10);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    return iso;
  }
  const monthName = MONTHS_ID[month - 1];
  if (!monthName) return iso;
  return `${day} ${monthName} ${year}`;
}

/** Short Indonesian month name for a 1-based month number. */
export function monthShortName(month: number): string {
  return MONTHS_SHORT_ID[month - 1] ?? String(month);
}

/** Full Indonesian month name for a 1-based month number. */
export function monthName(month: number): string {
  return MONTHS_ID[month - 1] ?? String(month);
}

/** Convert a backend nanosecond timestamp into a `Date`, or `null` if invalid. */
export function timestampToDate(timestamp: bigint): Date | null {
  const date = new Date(Number(timestamp / 1_000_000n));
  return Number.isNaN(date.getTime()) ? null : date;
}
