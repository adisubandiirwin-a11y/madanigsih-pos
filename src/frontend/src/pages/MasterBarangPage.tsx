/**
 * Master Barang — add, search, and edit the shop's item catalogue.
 *
 * Two-column counter terminal: the add form sits in a left panel, the dense
 * line-item table fills the right. Money and quantities render through the
 * shared `.num` tabular utility so figures line up column to column.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useCreateItem,
  useItems,
  useSearchItems,
  useUpdateItem,
} from "@/hooks/use-items";
import { formatNumber, formatRupiah, parseNonNegativeInt } from "@/lib/format";
import type { ItemView } from "@/types";
import { AlertCircle, PackageOpen, Pencil, Plus, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface AddFormState {
  namaBarang: string;
  ukuran: string;
  hargaPokok: string;
  stockMaster: string;
}

interface AddFormErrors {
  namaBarang?: string;
  ukuran?: string;
  hargaPokok?: string;
  stockMaster?: string;
}

const EMPTY_ADD_FORM: AddFormState = {
  namaBarang: "",
  ukuran: "",
  hargaPokok: "",
  stockMaster: "",
};

const SKELETON_ROWS = Array.from({ length: 5 }, (_, i) => `item-skeleton-${i}`);

function validateAddForm(form: AddFormState): AddFormErrors {
  const errors: AddFormErrors = {};
  if (form.namaBarang.trim() === "") {
    errors.namaBarang = "Nama Barang wajib diisi.";
  }
  if (form.ukuran.trim() === "") {
    errors.ukuran = "Ukuran wajib diisi.";
  }
  if (parseNonNegativeInt(form.hargaPokok) === null) {
    errors.hargaPokok = "Harga Pokok wajib diisi dengan angka nol atau lebih.";
  }
  if (parseNonNegativeInt(form.stockMaster) === null) {
    errors.stockMaster =
      "Stock Master wajib diisi dengan angka nol atau lebih.";
  }
  return errors;
}

export default function MasterBarangPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [addForm, setAddForm] = useState<AddFormState>(EMPTY_ADD_FORM);
  const [addErrors, setAddErrors] = useState<AddFormErrors>({});

  const [editing, setEditing] = useState<ItemView | null>(null);
  const [editUkuran, setEditUkuran] = useState("");
  const [editHargaPokok, setEditHargaPokok] = useState("");
  const [editErrors, setEditErrors] = useState<{
    ukuran?: string;
    hargaPokok?: string;
  }>({});

  const itemsQuery = useItems();
  const searchQuery = useSearchItems(searchTerm);
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();

  const isSearching = searchTerm.trim() !== "";
  const activeQuery = isSearching ? searchQuery : itemsQuery;
  const items = activeQuery.data ?? [];
  const isLoading = activeQuery.isPending;
  const isError = activeQuery.isError;

  function handleAddSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateAddForm(addForm);
    setAddErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const namaBarang = addForm.namaBarang.trim();
    const ukuran = addForm.ukuran.trim();
    const hargaPokok = parseNonNegativeInt(addForm.hargaPokok);
    const stockMaster = parseNonNegativeInt(addForm.stockMaster);
    if (hargaPokok === null || stockMaster === null) return;

    const draft = addForm;
    setAddForm(EMPTY_ADD_FORM);
    setAddErrors({});

    createItem.mutate(
      {
        namaBarang,
        ukuran,
        hargaPokok: BigInt(hargaPokok),
        stockMaster: BigInt(stockMaster),
      },
      {
        onSuccess: () => {
          toast.success("Barang berhasil disimpan", {
            description: `${namaBarang} · ${ukuran} kini ada di daftar master.`,
          });
        },
        onError: (error) => {
          setAddForm((current) =>
            current === EMPTY_ADD_FORM ? draft : current,
          );
          toast.error("Gagal menyimpan barang", {
            description: error.message,
          });
        },
      },
    );
  }

  function openEdit(item: ItemView) {
    setEditing(item);
    setEditUkuran(item.ukuran);
    setEditHargaPokok(String(item.hargaPokok));
    setEditErrors({});
  }

  function handleEditSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;

    const errors: { ukuran?: string; hargaPokok?: string } = {};
    if (editUkuran.trim() === "") {
      errors.ukuran = "Ukuran wajib diisi.";
    }
    const hargaPokok = parseNonNegativeInt(editHargaPokok);
    if (hargaPokok === null) {
      errors.hargaPokok =
        "Harga Pokok wajib diisi dengan angka nol atau lebih.";
    }
    setEditErrors(errors);
    if (Object.keys(errors).length > 0 || hargaPokok === null) return;

    const ukuran = editUkuran.trim();
    const namaBarang = editing.namaBarang;
    updateItem.mutate(
      { id: editing.id, edit: { ukuran, hargaPokok: BigInt(hargaPokok) } },
      {
        onSuccess: () => {
          setEditing(null);
          toast.success("Perubahan tersimpan", {
            description: `${namaBarang} diperbarui.`,
          });
        },
        onError: (error) => {
          toast.error("Gagal menyimpan perubahan", {
            description: error.message,
          });
        },
      },
    );
  }

  return (
    <div className="flex flex-col gap-6" data-ocid="master.page">
      <header className="flex flex-col gap-1">
        <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Master Barang
        </h2>
        <p className="text-sm text-muted-foreground">
          Catat barang baru dan perbarui ukuran serta harga pokoknya.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        {/* Add form panel */}
        <section
          aria-labelledby="tambah-barang-heading"
          data-ocid="master.form_panel"
          className="h-fit rounded-lg border border-border bg-card p-5 shadow-subtle lg:sticky lg:top-24"
        >
          <div className="mb-4 flex items-center gap-2">
            <span
              aria-hidden="true"
              className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground"
            >
              <Plus className="size-4" />
            </span>
            <h3
              id="tambah-barang-heading"
              className="font-display text-base font-semibold text-foreground"
            >
              Tambah Barang
            </h3>
          </div>

          <form
            onSubmit={handleAddSubmit}
            noValidate
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="add-nama">Nama Barang</Label>
              <Input
                id="add-nama"
                data-ocid="master.nama_input"
                value={addForm.namaBarang}
                onChange={(event) =>
                  setAddForm((current) => ({
                    ...current,
                    namaBarang: event.target.value,
                  }))
                }
                placeholder="Contoh: Buku Tulis Sidu 38"
                aria-invalid={addErrors.namaBarang ? true : undefined}
                aria-describedby={
                  addErrors.namaBarang ? "add-nama-error" : undefined
                }
              />
              {addErrors.namaBarang ? (
                <p
                  id="add-nama-error"
                  data-ocid="master.nama_error"
                  className="flex items-center gap-1 text-xs font-medium text-destructive"
                >
                  <AlertCircle
                    className="size-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  {addErrors.namaBarang}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="add-ukuran">Ukuran</Label>
              <Input
                id="add-ukuran"
                data-ocid="master.ukuran_input"
                value={addForm.ukuran}
                onChange={(event) =>
                  setAddForm((current) => ({
                    ...current,
                    ukuran: event.target.value,
                  }))
                }
                placeholder="Contoh: 38 lembar / A5"
                aria-invalid={addErrors.ukuran ? true : undefined}
                aria-describedby={
                  addErrors.ukuran ? "add-ukuran-error" : undefined
                }
              />
              {addErrors.ukuran ? (
                <p
                  id="add-ukuran-error"
                  data-ocid="master.ukuran_error"
                  className="flex items-center gap-1 text-xs font-medium text-destructive"
                >
                  <AlertCircle
                    className="size-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  {addErrors.ukuran}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="add-harga">Harga Pokok</Label>
              <Input
                id="add-harga"
                data-ocid="master.harga_input"
                inputMode="numeric"
                value={addForm.hargaPokok}
                onChange={(event) =>
                  setAddForm((current) => ({
                    ...current,
                    hargaPokok: event.target.value,
                  }))
                }
                placeholder="Contoh: 3500"
                className="num"
                aria-invalid={addErrors.hargaPokok ? true : undefined}
                aria-describedby={
                  addErrors.hargaPokok ? "add-harga-error" : undefined
                }
              />
              {addErrors.hargaPokok ? (
                <p
                  id="add-harga-error"
                  data-ocid="master.harga_error"
                  className="flex items-center gap-1 text-xs font-medium text-destructive"
                >
                  <AlertCircle
                    className="size-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  {addErrors.hargaPokok}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="add-stock">Stock Master</Label>
              <Input
                id="add-stock"
                data-ocid="master.stock_input"
                inputMode="numeric"
                value={addForm.stockMaster}
                onChange={(event) =>
                  setAddForm((current) => ({
                    ...current,
                    stockMaster: event.target.value,
                  }))
                }
                placeholder="Contoh: 24"
                className="num"
                aria-invalid={addErrors.stockMaster ? true : undefined}
                aria-describedby={
                  addErrors.stockMaster ? "add-stock-error" : undefined
                }
              />
              {addErrors.stockMaster ? (
                <p
                  id="add-stock-error"
                  data-ocid="master.stock_error"
                  className="flex items-center gap-1 text-xs font-medium text-destructive"
                >
                  <AlertCircle
                    className="size-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  {addErrors.stockMaster}
                </p>
              ) : null}
            </div>

            <Button
              type="submit"
              data-ocid="master.submit_button"
              disabled={createItem.isPending}
              className="mt-1 w-full"
            >
              {createItem.isPending ? "Menyimpan…" : "Simpan"}
            </Button>
          </form>
        </section>

        {/* Catalogue table */}
        <section
          aria-labelledby="daftar-barang-heading"
          data-ocid="master.table_panel"
          className="flex min-w-0 flex-col gap-4"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-1">
              <h3
                id="daftar-barang-heading"
                className="font-display text-base font-semibold text-foreground"
              >
                Daftar Barang
              </h3>
              <p className="text-xs text-muted-foreground">
                {isLoading
                  ? "Memuat daftar…"
                  : `${formatNumber(items.length)} barang ditampilkan`}
              </p>
            </div>

            <div className="flex w-full flex-col gap-1.5 sm:w-72">
              <Label htmlFor="search-barang">Pencarian Nama Barang</Label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="search-barang"
                  data-ocid="master.search_input"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Ketik nama barang…"
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-subtle">
            {isLoading ? (
              <div
                data-ocid="master.loading_state"
                className="flex flex-col gap-3 p-4"
              >
                {SKELETON_ROWS.map((id) => (
                  <Skeleton key={id} className="h-10 w-full" />
                ))}
              </div>
            ) : isError ? (
              <div
                data-ocid="master.error_state"
                className="flex flex-col items-center gap-3 px-6 py-14 text-center"
              >
                <span
                  aria-hidden="true"
                  className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive"
                >
                  <AlertCircle className="size-6" />
                </span>
                <div className="flex flex-col gap-1">
                  <p className="font-display text-base font-semibold text-foreground">
                    Gagal memuat daftar barang
                  </p>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    Periksa koneksi lalu muat ulang daftar.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  data-ocid="master.retry_button"
                  onClick={() => void activeQuery.refetch()}
                >
                  Coba lagi
                </Button>
              </div>
            ) : items.length === 0 ? (
              <div
                data-ocid="master.empty_state"
                className="flex flex-col items-center gap-3 px-6 py-14 text-center"
              >
                <span
                  aria-hidden="true"
                  className="flex size-12 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
                >
                  <PackageOpen className="size-6" />
                </span>
                <div className="flex flex-col gap-1">
                  <p className="font-display text-base font-semibold text-foreground">
                    {isSearching
                      ? "Barang tidak ditemukan"
                      : "Belum ada barang di master"}
                  </p>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    {isSearching
                      ? `Tidak ada barang yang cocok dengan "${searchTerm.trim()}". Coba kata kunci lain.`
                      : "Tambahkan barang pertama lewat formulir di samping."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table data-ocid="master.table">
                  <TableHeader className="sticky top-0 z-10 bg-secondary">
                    <TableRow className="hover:bg-secondary">
                      <TableHead className="min-w-[12rem]">
                        Nama Barang
                      </TableHead>
                      <TableHead className="min-w-[8rem]">Ukuran</TableHead>
                      <TableHead className="min-w-[9rem] text-right">
                        Harga Pokok
                      </TableHead>
                      <TableHead className="min-w-[6rem] text-right">
                        Stock
                      </TableHead>
                      <TableHead className="w-[6rem] text-right">
                        Aksi
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow
                        key={String(item.id)}
                        data-ocid={`master.item.${index + 1}`}
                      >
                        <TableCell className="font-medium text-foreground">
                          {item.namaBarang}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.ukuran}
                        </TableCell>
                        <TableCell className="num text-right font-semibold text-accent">
                          {formatRupiah(item.hargaPokok)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={
                              item.stockMaster > 0n
                                ? "secondary"
                                : "destructive"
                            }
                            className="num"
                          >
                            {formatNumber(item.stockMaster)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            data-ocid={`master.edit_button.${index + 1}`}
                            onClick={() => openEdit(item)}
                          >
                            <Pencil className="size-3.5" aria-hidden="true" />
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Edit dialog */}
      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent data-ocid="master.dialog" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Edit Barang</DialogTitle>
            <DialogDescription>
              {editing
                ? `Perbarui ukuran dan harga pokok untuk ${editing.namaBarang}. Stock Master tidak dapat diubah di sini.`
                : ""}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleEditSubmit}
            noValidate
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-ukuran">Ukuran</Label>
              <Input
                id="edit-ukuran"
                data-ocid="master.edit_ukuran_input"
                value={editUkuran}
                onChange={(event) => setEditUkuran(event.target.value)}
                aria-invalid={editErrors.ukuran ? true : undefined}
                aria-describedby={
                  editErrors.ukuran ? "edit-ukuran-error" : undefined
                }
              />
              {editErrors.ukuran ? (
                <p
                  id="edit-ukuran-error"
                  data-ocid="master.edit_ukuran_error"
                  className="flex items-center gap-1 text-xs font-medium text-destructive"
                >
                  <AlertCircle
                    className="size-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  {editErrors.ukuran}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-harga">Harga Pokok</Label>
              <Input
                id="edit-harga"
                data-ocid="master.edit_harga_input"
                inputMode="numeric"
                value={editHargaPokok}
                onChange={(event) => setEditHargaPokok(event.target.value)}
                className="num"
                aria-invalid={editErrors.hargaPokok ? true : undefined}
                aria-describedby={
                  editErrors.hargaPokok ? "edit-harga-error" : undefined
                }
              />
              {editErrors.hargaPokok ? (
                <p
                  id="edit-harga-error"
                  data-ocid="master.edit_harga_error"
                  className="flex items-center gap-1 text-xs font-medium text-destructive"
                >
                  <AlertCircle
                    className="size-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  {editErrors.hargaPokok}
                </p>
              ) : null}
            </div>

            <DialogFooter className="mt-2 gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                data-ocid="master.cancel_button"
                onClick={() => setEditing(null)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                data-ocid="master.save_button"
                disabled={updateItem.isPending}
              >
                {updateItem.isPending ? "Menyimpan…" : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
