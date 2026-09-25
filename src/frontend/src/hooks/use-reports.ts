/**
 * React Query hooks for laporan laba/rugi (profit reports).
 */

import { useBackendActor } from "@/lib/backend";
import type { ProfitSummary, YearlyProfit } from "@/types";
import { useQuery } from "@tanstack/react-query";

export const reportKeys = {
  all: ["reports"] as const,
  profit: (year: number | null, month: number | null) =>
    [...reportKeys.all, "profit", year, month] as const,
  monthly: (year: number) => [...reportKeys.all, "monthly", year] as const,
};

/**
 * Profit/loss report rows and totals, optionally filtered by year and month.
 * Pass `null` for either filter to include all periods.
 */
export function useProfitReport(year: number | null, month: number | null) {
  const { actor, isFetching } = useBackendActor();
  return useQuery<ProfitSummary>({
    queryKey: reportKeys.profit(year, month),
    queryFn: async () => {
      if (!actor) {
        return {
          rows: [],
          totalLaba: 0n,
          untung: true,
        } satisfies ProfitSummary;
      }
      return actor.getProfitReport(
        year === null ? null : BigInt(year),
        month === null ? null : BigInt(month),
      );
    },
    enabled: !!actor && !isFetching,
  });
}

/** Monthly profit series for a year, ordered January..December. */
export function useMonthlyProfit(year: number) {
  const { actor, isFetching } = useBackendActor();
  return useQuery<YearlyProfit>({
    queryKey: reportKeys.monthly(year),
    queryFn: async () => {
      if (!actor) {
        return {
          year: BigInt(year),
          totalLaba: 0n,
          months: [],
        } satisfies YearlyProfit;
      }
      return actor.getMonthlyProfit(BigInt(year));
    },
    enabled: !!actor && !isFetching,
  });
}
