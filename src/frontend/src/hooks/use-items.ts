/**
 * React Query hooks for master barang (items).
 */

import { unwrapResult, useBackendActor } from "@/lib/backend";
import type { ItemEdit, ItemId, ItemView, NewItem } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const itemKeys = {
  all: ["items"] as const,
  list: () => [...itemKeys.all, "list"] as const,
  search: (term: string) => [...itemKeys.all, "search", term] as const,
};

/** List every master barang. */
export function useItems() {
  const { actor, isFetching } = useBackendActor();
  return useQuery<ItemView[]>({
    queryKey: itemKeys.list(),
    queryFn: async () => {
      if (!actor) return [];
      return actor.listItems();
    },
    enabled: !!actor && !isFetching,
  });
}

/** Search master barang by name. An empty term falls back to the full list. */
export function useSearchItems(term: string) {
  const { actor, isFetching } = useBackendActor();
  const trimmed = term.trim();
  return useQuery<ItemView[]>({
    queryKey: itemKeys.search(trimmed),
    queryFn: async () => {
      if (!actor) return [];
      if (trimmed === "") return actor.listItems();
      return actor.searchItems(trimmed);
    },
    enabled: !!actor && !isFetching,
  });
}

/** Create a master barang and refresh the master list. */
export function useCreateItem() {
  const { actor } = useBackendActor();
  const queryClient = useQueryClient();
  return useMutation<ItemView, Error, NewItem>({
    mutationFn: async (input: NewItem) => {
      if (!actor) throw new Error("Backend belum siap. Coba lagi sebentar.");
      return unwrapResult<ItemView>(await actor.createItem(input));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: itemKeys.all });
    },
  });
}

/** Edit a master barang's ukuran and harga pokok. */
export function useUpdateItem() {
  const { actor } = useBackendActor();
  const queryClient = useQueryClient();
  return useMutation<ItemView, Error, { id: ItemId; edit: ItemEdit }>({
    mutationFn: async ({ id, edit }) => {
      if (!actor) throw new Error("Backend belum siap. Coba lagi sebentar.");
      return unwrapResult<ItemView>(await actor.updateItem(id, edit));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: itemKeys.all });
    },
  });
}
