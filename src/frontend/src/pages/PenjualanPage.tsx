/**
 * Penjualan (sales) page — the counter terminal.
 *
 * Two-column layout: the order form on the left, the dense line-item table on
 * the right. All backend access goes through the shared hooks in
 * `@/hooks/use-items` and `@/hooks/use-sales`.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSearchItems } from "@/hooks/use-items";
import { useSales, useSaveSale } from "@/hooks/use-sales";
import { appErrorMessage } from "@/lib/backend";
import {
  formatIsoDate,
  formatNumber,
  formatRupiah,
  parseNonNegativeInt,
  todayIso,
} from "@/lib/format";
import type {
  AppError,
  DraftSaleLine,
  ItemView,
  NewSale,
  SaleView,
} from "@/types";
import {
  AlertTriangle,
  Loader2,
  MessageCircle,
  Plus,
  Printer,
  Receipt,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const SHOP_NAME = "Toko Madanigsih Stationery";
const SHOP_ADDRESS = "Jl. Belakang Terminal Pakupatan Serang";

/** Normalise an Indonesian phone number to international `62…` digits. */
function normalisePhone(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits === "") return "";
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  return `62${digits}`;
}

/** Build the plain-text receipt shared by the print view and WhatsApp. */
function buildReceiptText(sale: SaleView): string {
  const lines: string[] = [
    SHOP_NAME,
    SHOP_ADDRESS,
    `Tanggal: ${formatIsoDate(sale.tanggal)}`,
    "--------------------------------",
  ];
  for (const line of sale.lines) {
    lines.push(line.namaBarang);
    if (line.ukuran.trim() !== "") lines.push(`  ${line.ukuran}`);
    lines.push(
      `  ${formatNumber(line.qtyOrder)} x ${formatRupiah(line.hargaJual)} = ${formatRupiah(line.jumlah)}`,
    );
  }
  lines.push("--------------------------------");
  lines.push(`TOTAL: ${formatRupiah(sale.total)}`);
  return lines.join("\n");
}

interface DraftLineInput {
  hargaJual: string;
  qtyOrder: string;
}

/**
 * Turn a thrown mutation error into a readable Indonesian message. Backend
 * failures surface as an `AppError` variant (mapped by `appErrorMessage`);
 * anything else falls back to the error's own message.
 */
function toErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "__kind__" in error &&
    typeof (error as AppError).__kind__ === "string"
  ) {
    return appErrorMessage(error as AppError);
  }
  if (error instanceof Error && error.message.trim() !== "") {
    return error.message;
  }
  return "Terjadi kesalahan. Silakan coba lagi.";
}

/**
 * Build the backend payload for one draft line. Master lines reference the
 * item by id (`itemId: Some(id)`); manual lines send `itemId: null` and carry
 * their own name/ukuran/hargaPokok so the backend can snapshot them without
 * touching master stock.
 */
function toNewSaleLine(line: DraftSaleLine): NewSale["lines"][number] {
  if (line.itemId !== null) {
    return {
      itemId: line.itemId,
      hargaJual: BigInt(line.hargaJual),
      qtyOrder: BigInt(line.qtyOrder),
    };
  }
  return {
    hargaJual: BigInt(line.hargaJual),
    qtyOrder: BigInt(line.qtyOrder),
    namaBarang: line.namaBarang,
    ukuran: line.ukuran,
    hargaPokok: line.hargaPokok,
  };
}

export default function PenjualanPage() {
  const [tanggal, setTanggal] = useState<string>(() => todayIso());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState<ItemView | null>(null);
  const [manualName, setManualName] = useState("");
  const [manualUkuran, setManualUkuran] = useState("");
  const [hargaJual, setHargaJual] = useState("");
  const [qtyOrder, setQtyOrder] = useState("");
  const [lines, setLines] = useState<DraftSaleLine[]>([]);
  const [lineInputs, setLineInputs] = useState<Record<string, DraftLineInput>>(
    {},
  );
  const [receiptSale, setReceiptSale] = useState<SaleView | null>(null);
  const [waNumber, setWaNumber] = useState("");
  const [stockWarning, setStockWarning] = useState<string | null>(null);

  const searchQuery = useSearchItems(searchTerm);
  const salesQuery = useSales();
  const saveSale = useSaveSale();

  const suggestions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (term === "") return [];
    return (searchQuery.data ?? []).slice(0, 8);
  }, [searchQuery.data, searchTerm]);

  const isManual = selectedItem === null && manualName.trim() !== "";
  const parsedHargaJual = parseNonNegativeInt(hargaJual);
  const parsedQtyOrder = parseNonNegativeInt(qtyOrder);

  const grandTotal = useMemo(
    () =>
      lines.reduce(
        (sum, line) => sum + BigInt(line.hargaJual) * BigInt(line.qtyOrder),
        0n,
      ),
    [lines],
  );

  const canAddLine =
    (selectedItem !== null || manualName.trim() !== "") &&
    parsedHargaJual !== null &&
    parsedQtyOrder !== null &&
    parsedQtyOrder > 0;

  const canSave = lines.length > 0 && tanggal.trim() !== "";

  function resetLineEntry() {
    setSelectedItem(null);
    setManualName("");
    setManualUkuran("");
    setHargaJual("");
    setQtyOrder("");
    setSearchTerm("");
    setStockWarning(null);
  }

  function handlePickItem(item: ItemView) {
    setSelectedItem(item);
    setManualName("");
    setManualUkuran("");
    setSearchTerm("");
    setStockWarning(null);
  }

  function handleAddLine() {
    if (!canAddLine || parsedHargaJual === null || parsedQtyOrder === null) {
      return;
    }
    const key = `line-${Date.now()}-${lines.length}`;
    const line: DraftSaleLine = {
      key,
      itemId: selectedItem?.id ?? null,
      namaBarang: selectedItem?.namaBarang ?? manualName.trim(),
      ukuran: selectedItem?.ukuran ?? manualUkuran.trim(),
      hargaPokok: selectedItem?.hargaPokok ?? 0n,
      hargaJual: parsedHargaJual,
      qtyOrder: parsedQtyOrder,
      stockMaster: selectedItem?.stockMaster ?? 0n,
    };
    setLines((current) => [...current, line]);
    setLineInputs((current) => ({
      ...current,
      [key]: {
        hargaJual: String(parsedHargaJual),
        qtyOrder: String(parsedQtyOrder),
      },
    }));
    resetLineEntry();
  }

  function handleRemoveLine(key: string) {
    setLines((current) => current.filter((line) => line.key !== key));
    setLineInputs((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function handleLineInput(
    key: string,
    field: keyof DraftLineInput,
    value: string,
  ) {
    setLineInputs((current) => ({
      ...current,
      [key]: {
        hargaJual: current[key]?.hargaJual ?? "",
        qtyOrder: current[key]?.qtyOrder ?? "",
        [field]: value,
      },
    }));
    const parsed = parseNonNegativeInt(value);
    setLines((current) =>
      current.map((line) => {
        if (line.key !== key) return line;
        if (field === "hargaJual") {
          return { ...line, hargaJual: parsed ?? 0 };
        }
        return { ...line, qtyOrder: parsed ?? 0 };
      }),
    );
  }

  function handleSave() {
    if (!canSave) return;
    const payload: NewSale = {
      tanggal,
      lines: lines.map(toNewSaleLine),
    };
    saveSale.mutate(payload, {
      onSuccess: (sale) => {
        toast.success("Pesanan berhasil disimpan.");
        setReceiptSale(sale);
        setLines([]);
        setLineInputs({});
        setStockWarning(null);
        resetLineEntry();
      },
      onError: (error) => {
        const message = toErrorMessage(error);
        setStockWarning(message);
        toast.error(message);
      },
    });
  }

  function handlePrint(sale: SaleView) {
    setReceiptSale(sale);
    window.setTimeout(() => window.print(), 100);
  }

  function handleSendWa(sale: SaleView) {
    const phone = normalisePhone(waNumber);
    if (phone === "") {
      toast.error("Masukkan nomor WhatsApp tujuan terlebih dahulu.");
      return;
    }
    const text = encodeURIComponent(buildReceiptText(sale));
    window.open(`https://wa.me/${phone}?text=${text}`, "_blank", "noreferrer");
  }

  const recentSales = salesQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Transaksi Penjualan
        </h2>
        <p className="text-sm text-muted-foreground">
          Catat pesanan pelanggan, simpan untuk mengurangi stok, lalu cetak
          struk atau kirim lewat WhatsApp.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        {/* ---------------- Order form ---------------- */}
        <Card
          data-ocid="penjualan.form_card"
          className="h-fit rounded-lg shadow-none"
        >
          <CardHeader>
            <CardTitle className="font-display text-lg">Form Pesanan</CardTitle>
            <CardDescription>
              Pilih barang dari master atau ketik nama manual.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="tanggal-penjualan">Tanggal Penjualan</Label>
              <Input
                id="tanggal-penjualan"
                type="date"
                value={tanggal}
                data-ocid="penjualan.tanggal_input"
                onChange={(event) => setTanggal(event.target.value)}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="cari-barang">Pencarian Nama Barang</Label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="cari-barang"
                  value={searchTerm}
                  placeholder="Ketik nama barang…"
                  autoComplete="off"
                  data-ocid="penjualan.search_input"
                  className="pl-9"
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                    setSelectedItem(null);
                  }}
                />
              </div>

              {searchTerm.trim() !== "" && (
                <div
                  data-ocid="penjualan.search_results"
                  className="max-h-56 overflow-y-auto rounded-md border border-border bg-card"
                >
                  {searchQuery.isPending || searchQuery.isFetching ? (
                    <p className="px-3 py-2 text-sm text-muted-foreground">
                      Mencari…
                    </p>
                  ) : suggestions.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-muted-foreground">
                      Tidak ada barang di master. Isi nama manual di bawah.
                    </p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {suggestions.map((item, index) => (
                        <li key={item.id.toString()}>
                          <button
                            type="button"
                            data-ocid={`penjualan.search_result.${index + 1}`}
                            onClick={() => handlePickItem(item)}
                            className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-smooth hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium text-foreground">
                                {item.namaBarang}
                              </span>
                              {item.ukuran.trim() !== "" && (
                                <span className="block truncate text-xs text-muted-foreground">
                                  {item.ukuran}
                                </span>
                              )}
                            </span>
                            <span className="num shrink-0 text-xs text-muted-foreground">
                              Stok {formatNumber(item.stockMaster)}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {selectedItem && (
                <div
                  data-ocid="penjualan.selected_item"
                  className="flex items-start justify-between gap-3 rounded-md border border-primary/30 bg-secondary px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {selectedItem.namaBarang}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {selectedItem.ukuran.trim() !== ""
                        ? selectedItem.ukuran
                        : "Tanpa ukuran"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    data-ocid="penjualan.clear_item_button"
                    onClick={() => setSelectedItem(null)}
                  >
                    Ganti
                  </Button>
                </div>
              )}

              {!selectedItem && (
                <div className="space-y-2 rounded-md border border-dashed border-border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">
                    Barang tidak ada di master? Isi nama manual — baris ini
                    dicatat tanpa tautan stok.
                  </p>
                  <Input
                    value={manualName}
                    placeholder="Nama barang manual"
                    data-ocid="penjualan.manual_name_input"
                    onChange={(event) => setManualName(event.target.value)}
                  />
                  <Input
                    value={manualUkuran}
                    placeholder="Ukuran (opsional)"
                    data-ocid="penjualan.manual_ukuran_input"
                    onChange={(event) => setManualUkuran(event.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="harga-jual">Harga Jual</Label>
                <Input
                  id="harga-jual"
                  inputMode="numeric"
                  value={hargaJual}
                  placeholder="0"
                  data-ocid="penjualan.harga_jual_input"
                  className="num"
                  onChange={(event) => setHargaJual(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qty-order">Qty Order</Label>
                <Input
                  id="qty-order"
                  inputMode="numeric"
                  value={qtyOrder}
                  placeholder="0"
                  data-ocid="penjualan.qty_order_input"
                  className="num"
                  onChange={(event) => setQtyOrder(event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Qty Stock</Label>
              <div
                data-ocid="penjualan.qty_stock_display"
                className="num flex min-h-10 items-center rounded-md border border-input bg-muted px-3 text-sm font-semibold text-foreground"
              >
                {selectedItem ? formatNumber(selectedItem.stockMaster) : "—"}
              </div>
              {!selectedItem && (
                <p className="text-xs text-muted-foreground">
                  Pilih barang dari master untuk melihat stok tersedia.
                </p>
              )}
            </div>

            {isManual && (
              <p
                data-ocid="penjualan.manual_notice"
                className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-foreground"
              >
                Baris manual: stok master tidak akan berkurang untuk barang ini.
              </p>
            )}

            <Button
              type="button"
              variant="secondary"
              className="w-full"
              disabled={!canAddLine}
              data-ocid="penjualan.add_line_button"
              onClick={handleAddLine}
            >
              <Plus className="mr-2 size-4" aria-hidden="true" />
              Tambah Baris
            </Button>
          </CardContent>
        </Card>

        {/* ---------------- Line items + totals ---------------- */}
        <div className="space-y-6">
          <Card
            data-ocid="penjualan.lines_card"
            className="rounded-lg shadow-none"
          >
            <CardHeader>
              <CardTitle className="font-display text-lg">
                Daftar Baris Pesanan
              </CardTitle>
              <CardDescription>
                Ubah harga jual atau qty langsung pada baris.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              {lines.length === 0 ? (
                <div
                  data-ocid="penjualan.lines_empty_state"
                  className="flex flex-col items-center gap-2 px-6 py-10 text-center"
                >
                  <Receipt
                    className="size-8 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <p className="font-display text-sm font-semibold text-foreground">
                    Belum ada barang pada pesanan
                  </p>
                  <p className="max-w-xs text-xs text-muted-foreground">
                    Cari barang di form, isi harga jual dan qty order, lalu
                    tekan Tambah Baris.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table data-ocid="penjualan.lines_table">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Barang</TableHead>
                        <TableHead className="text-right">Harga Jual</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Jumlah</TableHead>
                        <TableHead className="w-12" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines.map((line, index) => {
                        const input = lineInputs[line.key] ?? {
                          hargaJual: "",
                          qtyOrder: "",
                        };
                        const jumlah =
                          BigInt(line.hargaJual) * BigInt(line.qtyOrder);
                        const overStock =
                          line.itemId !== null &&
                          BigInt(line.qtyOrder) > line.stockMaster;
                        return (
                          <TableRow
                            key={line.key}
                            data-ocid={`penjualan.line.${index + 1}`}
                          >
                            <TableCell className="min-w-40">
                              <span className="block font-medium text-foreground">
                                {line.namaBarang}
                              </span>
                              <span className="block text-xs text-muted-foreground">
                                {line.ukuran.trim() !== ""
                                  ? line.ukuran
                                  : "Tanpa ukuran"}
                                {line.itemId === null && " · manual"}
                              </span>
                              {overStock && (
                                <span className="mt-1 block text-xs font-medium text-destructive">
                                  Melebihi stok (
                                  {formatNumber(line.stockMaster)})
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                inputMode="numeric"
                                value={input.hargaJual}
                                aria-label={`Harga jual ${line.namaBarang}`}
                                data-ocid={`penjualan.line_harga_input.${index + 1}`}
                                className="num ml-auto w-28 text-right"
                                onChange={(event) =>
                                  handleLineInput(
                                    line.key,
                                    "hargaJual",
                                    event.target.value,
                                  )
                                }
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                inputMode="numeric"
                                value={input.qtyOrder}
                                aria-label={`Qty order ${line.namaBarang}`}
                                data-ocid={`penjualan.line_qty_input.${index + 1}`}
                                className="num ml-auto w-20 text-right"
                                onChange={(event) =>
                                  handleLineInput(
                                    line.key,
                                    "qtyOrder",
                                    event.target.value,
                                  )
                                }
                              />
                            </TableCell>
                            <TableCell className="num text-right font-semibold text-accent">
                              {formatRupiah(jumlah)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={`Hapus ${line.namaBarang}`}
                                data-ocid={`penjualan.remove_line_button.${index + 1}`}
                                onClick={() => handleRemoveLine(line.key)}
                              >
                                <Trash2
                                  className="size-4 text-destructive"
                                  aria-hidden="true"
                                />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card
            data-ocid="penjualan.total_card"
            className="rounded-lg border-accent/40 shadow-none"
          >
            <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="label-caps text-muted-foreground">
                  Total Keseluruhan
                </p>
                <p
                  data-ocid="penjualan.grand_total"
                  className="num font-display text-3xl font-bold text-accent"
                >
                  {formatRupiah(grandTotal)}
                </p>
              </div>
              <Button
                type="button"
                size="lg"
                disabled={!canSave || saveSale.isPending}
                data-ocid="penjualan.save_button"
                onClick={handleSave}
              >
                {saveSale.isPending ? (
                  <Loader2
                    className="mr-2 size-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Save className="mr-2 size-4" aria-hidden="true" />
                )}
                {saveSale.isPending ? "Menyimpan…" : "Simpan Pesanan"}
              </Button>
            </CardContent>
          </Card>

          {stockWarning && (
            <div
              data-ocid="penjualan.stock_warning"
              className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3"
            >
              <AlertTriangle
                className="mt-0.5 size-5 shrink-0 text-destructive"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Pesanan tidak dapat disimpan
                </p>
                <p className="text-sm text-muted-foreground">{stockWarning}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ---------------- Recent sales ---------------- */}
      <Card
        data-ocid="penjualan.recent_card"
        className="rounded-lg shadow-none"
      >
        <CardHeader>
          <CardTitle className="font-display text-lg">
            Penjualan Terbaru
          </CardTitle>
          <CardDescription>
            Buka kembali struk transaksi yang sudah tersimpan.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          {salesQuery.isLoading ? (
            <p
              data-ocid="penjualan.recent_loading_state"
              className="px-6 py-6 text-sm text-muted-foreground"
            >
              Memuat penjualan…
            </p>
          ) : recentSales.length === 0 ? (
            <div
              data-ocid="penjualan.recent_empty_state"
              className="px-6 py-8 text-center"
            >
              <p className="font-display text-sm font-semibold text-foreground">
                Belum ada penjualan tersimpan
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Transaksi yang Anda simpan akan muncul di sini.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table data-ocid="penjualan.recent_table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead className="text-right">Jumlah Baris</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSales.slice(0, 10).map((sale, index) => (
                    <TableRow
                      key={sale.id.toString()}
                      data-ocid={`penjualan.recent_row.${index + 1}`}
                    >
                      <TableCell className="font-medium text-foreground">
                        {formatIsoDate(sale.tanggal)}
                      </TableCell>
                      <TableCell className="num text-right text-muted-foreground">
                        {formatNumber(sale.lines.length)}
                      </TableCell>
                      <TableCell className="num text-right font-semibold text-accent">
                        {formatRupiah(sale.total)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          data-ocid={`penjualan.open_receipt_button.${index + 1}`}
                          onClick={() => setReceiptSale(sale)}
                        >
                          <Receipt className="mr-2 size-4" aria-hidden="true" />
                          Lihat Struk
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ---------------- Receipt dialog ---------------- */}
      <Dialog
        open={receiptSale !== null}
        onOpenChange={(open) => {
          if (!open) setReceiptSale(null);
        }}
      >
        <DialogContent
          data-ocid="penjualan.receipt_dialog"
          className="max-h-[90vh] overflow-y-auto sm:max-w-md"
        >
          <DialogHeader>
            <DialogTitle className="font-display">Struk Penjualan</DialogTitle>
            <DialogDescription>
              Cetak struk atau kirim teksnya lewat WhatsApp.
            </DialogDescription>
          </DialogHeader>

          {receiptSale && (
            <>
              <div
                id="receipt-print-area"
                data-ocid="penjualan.receipt_print_area"
                className="rounded-md border border-border bg-card p-4"
              >
                <div className="text-center">
                  <p className="font-display text-base font-bold text-foreground">
                    {SHOP_NAME}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {SHOP_ADDRESS}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatIsoDate(receiptSale.tanggal)}
                  </p>
                </div>
                <Separator className="my-3" />
                <ul className="space-y-2">
                  {receiptSale.lines.map((line, index) => (
                    <li
                      key={`${line.itemId?.toString() ?? "manual"}-${index}`}
                      className="text-sm"
                    >
                      <p className="font-medium text-foreground">
                        {line.namaBarang}
                      </p>
                      {line.ukuran.trim() !== "" && (
                        <p className="text-xs text-muted-foreground">
                          {line.ukuran}
                        </p>
                      )}
                      <p className="num flex justify-between text-xs text-muted-foreground">
                        <span>
                          {formatNumber(line.qtyOrder)} x{" "}
                          {formatRupiah(line.hargaJual)}
                        </span>
                        <span className="font-semibold text-foreground">
                          {formatRupiah(line.jumlah)}
                        </span>
                      </p>
                    </li>
                  ))}
                </ul>
                <Separator className="my-3" />
                <div className="flex items-center justify-between">
                  <span className="label-caps text-muted-foreground">
                    Total
                  </span>
                  <span className="num font-display text-lg font-bold text-accent">
                    {formatRupiah(receiptSale.total)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="wa-number">Nomor WhatsApp Tujuan</Label>
                <Input
                  id="wa-number"
                  inputMode="tel"
                  value={waNumber}
                  placeholder="0812xxxxxxx"
                  data-ocid="penjualan.wa_number_input"
                  className="num"
                  onChange={(event) => setWaNumber(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Nomor diawali 0 otomatis diubah ke format 62.
                </p>
              </div>

              <DialogFooter className="gap-2 sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  data-ocid="penjualan.print_button"
                  onClick={() => handlePrint(receiptSale)}
                >
                  <Printer className="mr-2 size-4" aria-hidden="true" />
                  Cetak Struk
                </Button>
                <Button
                  type="button"
                  data-ocid="penjualan.send_wa_button"
                  onClick={() => handleSendWa(receiptSale)}
                >
                  <MessageCircle className="mr-2 size-4" aria-hidden="true" />
                  Kirim WA
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Print-only receipt: everything else is hidden while printing. */}
      {receiptSale && (
        <div id="receipt-print-root" aria-hidden="true">
          <div className="receipt-print">
            <p className="receipt-shop">{SHOP_NAME}</p>
            <p className="receipt-address">{SHOP_ADDRESS}</p>
            <p className="receipt-date">
              Tanggal: {formatIsoDate(receiptSale.tanggal)}
            </p>
            <hr />
            {receiptSale.lines.map((line, index) => (
              <div
                key={`print-${line.itemId?.toString() ?? "manual"}-${index}`}
                className="receipt-line"
              >
                <p className="receipt-name">
                  {line.namaBarang}
                  {line.ukuran.trim() !== "" ? ` — ${line.ukuran}` : ""}
                </p>
                <p className="receipt-calc">
                  {formatNumber(line.qtyOrder)} x {formatRupiah(line.hargaJual)}
                  <span>{formatRupiah(line.jumlah)}</span>
                </p>
              </div>
            ))}
            <hr />
            <p className="receipt-total">
              TOTAL <span>{formatRupiah(receiptSale.total)}</span>
            </p>
          </div>
        </div>
      )}

      <style>{`
        #receipt-print-root { display: none; }
        @media print {
          body * { visibility: hidden !important; }
          #receipt-print-root,
          #receipt-print-root * { visibility: visible !important; }
          #receipt-print-root {
            display: block !important;
            position: absolute;
            inset: 0 auto auto 0;
            width: 100%;
            padding: 16px;
            background: #fff;
            color: #000;
            font-family: var(--font-mono), monospace;
            font-size: 12px;
          }
          .receipt-print { max-width: 320px; margin: 0 auto; }
          .receipt-shop { font-weight: 700; text-align: center; font-size: 14px; }
          .receipt-address, .receipt-date { text-align: center; }
          .receipt-line { margin-top: 6px; }
          .receipt-name { font-weight: 600; }
          .receipt-calc { display: flex; justify-content: space-between; }
          .receipt-total {
            display: flex; justify-content: space-between; font-weight: 700;
          }
          hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
        }
      `}</style>
    </div>
  );
}
