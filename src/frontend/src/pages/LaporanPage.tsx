/**
 * Laporan Laba Rugi — profit/loss report per transaction with period filters,
 * a prominent total, a detailed line-item table, and a monthly bar chart.
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMonthlyProfit, useProfitReport } from "@/hooks/use-reports";
import {
  formatIsoDate,
  formatNumber,
  formatRupiah,
  monthShortName,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ProfitRow } from "@/types";
import {
  AlertTriangle,
  BarChart3,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";

const ALL_MONTHS = "all" as const;

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1),
  label: monthShortName(index + 1),
}));

const chartConfig = {
  laba: { label: "Laba", color: "var(--chart-1)" },
} satisfies ChartConfig;

/** Build a descending list of selectable years around the current year. */
function useYearOptions(): number[] {
  return useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, index) => current - index);
  }, []);
}

function SummarySkeleton() {
  return (
    <Card data-ocid="laporan.summary_card">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-9 w-52" />
        </div>
        <Skeleton className="h-8 w-24 rounded-full" />
      </CardContent>
    </Card>
  );
}

function TableSkeleton() {
  const ids = Array.from(
    { length: 5 },
    (_, index) => `laporan-skeleton-${index}`,
  );
  return (
    <div className="space-y-2 p-4" data-ocid="laporan.table_loading_state">
      {ids.map((id) => (
        <Skeleton key={id} className="h-10 w-full" />
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div
      className="flex h-64 items-end gap-2 px-4 pb-4"
      data-ocid="laporan.chart_loading_state"
    >
      {Array.from({ length: 12 }, (_, index) => `laporan-bar-${index}`).map(
        (id, index) => (
          <Skeleton
            key={id}
            className="flex-1"
            style={{ height: `${30 + ((index * 37) % 60)}%` }}
          />
        ),
      )}
    </div>
  );
}

function EmptyState({
  title,
  description,
  ocid,
}: {
  title: string;
  description: string;
  ocid: string;
}) {
  return (
    <div
      data-ocid={ocid}
      className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center"
    >
      <span
        aria-hidden="true"
        className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground"
      >
        <BarChart3 className="size-5" />
      </span>
      <p className="font-display text-sm font-semibold text-foreground">
        {title}
      </p>
      <p className="max-w-sm text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function LabaCell({ value }: { value: bigint }) {
  const negative = value < 0n;
  return (
    <span
      className={cn(
        "num font-semibold tabular-nums",
        negative ? "text-destructive" : "text-foreground",
      )}
    >
      {negative ? `-${formatRupiah(-value)}` : formatRupiah(value)}
    </span>
  );
}

export default function LaporanPage() {
  const yearOptions = useYearOptions();
  const [year, setYear] = useState<number>(() => new Date().getFullYear());
  const [month, setMonth] = useState<number | null>(null);

  const report = useProfitReport(year, month);
  const monthly = useMonthlyProfit(year);

  const summary = report.data;
  const rows: ProfitRow[] = summary?.rows ?? [];
  const totalLaba = summary?.totalLaba ?? 0n;
  const untung = totalLaba >= 0n;

  const chartData = useMemo(() => {
    const months = monthly.data?.months ?? [];
    return Array.from({ length: 12 }, (_, index) => {
      const monthNumber = index + 1;
      const entry = months.find((item) => Number(item.month) === monthNumber);
      return {
        month: monthShortName(monthNumber),
        laba: entry ? Number(entry.laba) : 0,
      };
    });
  }, [monthly.data]);

  const hasChartData = chartData.some((entry) => entry.laba !== 0);

  return (
    <div className="space-y-6" data-ocid="laporan.page">
      <header className="flex flex-col gap-1">
        <h2 className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Laporan Laba Rugi
        </h2>
        <p className="text-sm text-muted-foreground">
          Laba per transaksi dihitung dari (Harga Jual − Harga Pokok) × Qty.
        </p>
      </header>

      {/* Period filter */}
      <section
        aria-label="Filter periode"
        data-ocid="laporan.filter_panel"
        className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-subtle sm:flex-row sm:items-end sm:gap-4"
      >
        <div className="flex flex-1 flex-col gap-1.5">
          <label
            htmlFor="laporan-year"
            className="label-caps text-muted-foreground"
          >
            Tahun
          </label>
          <Select
            value={String(year)}
            onValueChange={(value) => setYear(Number(value))}
          >
            <SelectTrigger
              id="laporan-year"
              data-ocid="laporan.year_select"
              className="w-full sm:w-40"
            >
              <SelectValue placeholder="Pilih tahun" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-1 flex-col gap-1.5">
          <label
            htmlFor="laporan-month"
            className="label-caps text-muted-foreground"
          >
            Bulan
          </label>
          <Select
            value={month === null ? ALL_MONTHS : String(month)}
            onValueChange={(value) =>
              setMonth(value === ALL_MONTHS ? null : Number(value))
            }
          >
            <SelectTrigger
              id="laporan-month"
              data-ocid="laporan.month_select"
              className="w-full sm:w-48"
            >
              <SelectValue placeholder="Pilih bulan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_MONTHS}>Semua Bulan</SelectItem>
              {MONTH_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* Summary */}
      {report.isLoading ? (
        <SummarySkeleton />
      ) : (
        <Card
          data-ocid="laporan.summary_card"
          className={cn(
            "border-l-4",
            untung ? "border-l-success" : "border-l-destructive",
          )}
        >
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="label-caps text-muted-foreground">
                Total Laba / Rugi
              </p>
              <p
                data-ocid="laporan.total_laba"
                className={cn(
                  "num mt-1 break-words text-3xl font-bold leading-tight sm:text-4xl",
                  untung ? "text-success" : "text-destructive",
                )}
              >
                {untung
                  ? formatRupiah(totalLaba)
                  : `-${formatRupiah(-totalLaba)}`}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {rows.length} transaksi
                {month === null ? " sepanjang tahun" : " pada bulan terpilih"}
              </p>
            </div>
            <Badge
              data-ocid="laporan.status_badge"
              className={cn(
                "shrink-0 gap-1.5 rounded-full px-3 py-1 text-sm font-semibold",
                untung
                  ? "bg-success text-success-foreground hover:bg-success"
                  : "bg-destructive text-destructive-foreground hover:bg-destructive",
              )}
            >
              {untung ? (
                <TrendingUp className="size-4" aria-hidden="true" />
              ) : (
                <TrendingDown className="size-4" aria-hidden="true" />
              )}
              {untung ? "Untung" : "Rugi"}
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* Detail table */}
      <Card data-ocid="laporan.table_card">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="font-display text-base font-semibold">
            Rincian Laba per Transaksi
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {report.isLoading ? (
            <TableSkeleton />
          ) : report.isError ? (
            <div
              data-ocid="laporan.table_error_state"
              className="flex flex-col items-center gap-2 px-6 py-12 text-center"
            >
              <AlertTriangle
                className="size-6 text-destructive"
                aria-hidden="true"
              />
              <p className="text-sm font-medium text-foreground">
                Gagal memuat laporan.
              </p>
              <p className="text-xs text-muted-foreground">
                Periksa koneksi lalu muat ulang halaman.
              </p>
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              ocid="laporan.table_empty_state"
              title="Belum ada transaksi"
              description="Tidak ada penjualan pada periode ini. Ubah filter tahun atau bulan untuk melihat data lain."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table data-ocid="laporan.table">
                <TableHeader className="sticky top-0 bg-muted/60">
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Tanggal</TableHead>
                    <TableHead className="min-w-[10rem]">Nama Barang</TableHead>
                    <TableHead className="whitespace-nowrap">Ukuran</TableHead>
                    <TableHead className="whitespace-nowrap text-right">
                      Harga Pokok
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-right">
                      Harga Jual
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-right">
                      Qty
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-right">
                      Laba
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, index) => (
                    <TableRow
                      key={`${row.saleId}-${row.namaBarang}-${row.ukuran}-${index}`}
                      data-ocid={`laporan.row.${index + 1}`}
                    >
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatIsoDate(row.tanggal)}
                      </TableCell>
                      <TableCell className="text-sm font-medium text-foreground">
                        {row.namaBarang}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {row.ukuran}
                      </TableCell>
                      <TableCell className="num whitespace-nowrap text-right text-sm text-muted-foreground">
                        {formatRupiah(row.hargaPokok)}
                      </TableCell>
                      <TableCell className="num whitespace-nowrap text-right text-sm text-foreground">
                        {formatRupiah(row.hargaJual)}
                      </TableCell>
                      <TableCell className="num whitespace-nowrap text-right text-sm text-foreground">
                        {formatNumber(row.qtyOrder)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right text-sm">
                        <LabaCell value={row.laba} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly chart */}
      <Card data-ocid="laporan.chart_card">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="font-display text-base font-semibold">
            Keuntungan per Bulan
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Laba bulanan sepanjang tahun {year}.
          </p>
        </CardHeader>
        <CardContent className="p-4">
          {monthly.isLoading ? (
            <ChartSkeleton />
          ) : monthly.isError ? (
            <div
              data-ocid="laporan.chart_error_state"
              className="flex flex-col items-center gap-2 px-6 py-12 text-center"
            >
              <AlertTriangle
                className="size-6 text-destructive"
                aria-hidden="true"
              />
              <p className="text-sm font-medium text-foreground">
                Gagal memuat grafik.
              </p>
              <p className="text-xs text-muted-foreground">
                Periksa koneksi lalu muat ulang halaman.
              </p>
            </div>
          ) : !hasChartData ? (
            <EmptyState
              ocid="laporan.chart_empty_state"
              title="Belum ada data grafik"
              description={`Tidak ada laba tercatat pada tahun ${year}. Pilih tahun lain untuk melihat grafik.`}
            />
          ) : (
            <ChartContainer
              config={chartConfig}
              data-ocid="laporan.chart"
              className="h-64 w-full sm:h-72"
            >
              <BarChart
                data={chartData}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  interval={0}
                  fontSize={11}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={64}
                  fontSize={11}
                  tickFormatter={(value: number) => formatNumber(value)}
                />
                <ChartTooltip
                  cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                  content={
                    <ChartTooltipContent
                      formatter={(value) => formatRupiah(Number(value))}
                    />
                  }
                />
                <Bar dataKey="laba" radius={[4, 4, 0, 0]} maxBarSize={48}>
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.month}
                      fill={
                        entry.laba < 0 ? "var(--chart-5)" : "var(--chart-1)"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
