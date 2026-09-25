# Project Guidance

## User Preferences

- Bahasa antarmuka Indonesia
- Nama toko: Toko Madanigsih Stationery
- Alamat toko: Jl. Belakang Terminal Pakupatan Serang
- Harga Pokok, Harga Jual, Qty Order, dan Stock Master diisi manual
- Tanggal Penjualan otomatis menampilkan tanggal sekarang

## Verified Commands

- **typecheck**: `pnpm typecheck`
- **fix**: `pnpm fix`
- **build**: `pnpm build`

## Learnings

- Generated Candid bindings serialize an optional bigint with a truthiness check, so bigint 0n becomes candid_none(); domain id counters must start at 1 so a master-linked record is never mistaken for an absent one.
- Mount the sonner <Toaster /> once in main.tsx outside the router, or toast.success/toast.error calls render nothing on any route.
- Declaring --success/--warning CSS variables in index.css is not enough; they must also be registered in tailwind.config.js theme.extend.colors or the utilities emit no CSS.
- A React Query disabled until the actor resolves reports isPending true but isLoading false, so loading UI must key off isPending/isFetching.
- This project uses the enhanced migration chain (mops.toml [canisters.backend.migrations]); stable domain state records must be the actor fields themselves and passed directly to mixins, or a copied var counter never persists.
- When mops check reports too many pending migrations for check-limit=1 and names a migration file, fold the new state-shape change into that file rather than adding a second one.
- An OQL manual-mode .payload returning Bool needs a top-level import of mo:caffeineai-oql/BoolValue; a manual entity cannot carry an edge for a column absent on some rows, so emit the FK as a text payload with an empty-string sentinel.
- Time.now() returns Int while Common.Timestamp is Nat, so every assignment needs Time.now().toNat(); Motoko switch patterns do not support `or` between literal cases.
- Array.sort returns a new array — using it as a bare statement with a trailing semicolon makes the function return ().
- Verified commands: frontend pnpm typecheck / pnpm fix / pnpm build; backend mops check --fix / mops build; root pnpm bindgen; root pnpm test runs the Vitest suite plus the PocketIC backend lane.
