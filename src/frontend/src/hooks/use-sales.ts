/**
 * React Query hooks for penjualan (sales).
 */

import { itemKeys } from "@/hooks/use-items";
import { reportKeys } from "@/hooks/use-reports";
import { unwrapResult, useBackendActor } from "@/lib/backend";
import type { NewSale, SaleView } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const saleKeys = {
  all: ["sales"] as const,
  list: () => [...saleKeys.all, "list"] as const,
};

/** List every penjualan, newest first. */
export function useSales() {
  const { actor, isFetching } = useBackendActor();
  return useQuery<SaleView[]>({
    queryKey: saleKeys.list(),
    queryFn: async () => {
      if (!actor) return [];
      return actor.listSales();
    },
    enabled: !!actor && !isFetching,
  });
}

/**
 * Save a penjualan. On success the master list (stock changed) and every
 * report query are invalidated so stock and profit figures stay in sync.
 */
export function useSaveSale() {
  const { actor } = useBackendActor();
  const queryClient = useQueryClient();
  return useMutation<SaleView, Error, NewSale>({
    mutationFn: async (input: NewSale) => {
      if (!actor) throw new Error("Backend belum siap. Coba lagi sebentar.");
      return unwrapResult<SaleView>(await actor.saveSale(input));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: saleKeys.all });
      void queryClient.invalidateQueries({ queryKey: itemKeys.all });
      void queryClient.invalidateQueries({ queryKey: reportKeys.all });
    },
  });
}
