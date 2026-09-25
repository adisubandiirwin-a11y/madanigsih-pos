/**
 * PocketIC backend lane — installs the app's own compiled canister and calls
 * its real public API.
 *
 * The frontend suite mocks the actor, so it passes unchanged against a canister
 * whose public methods are unimplemented stubs. This file closes that hole: it
 * installs `src/backend/dist/backend.wasm` into the platform's PocketIC replica
 * and drives the real methods the acceptance criteria depend on.
 *
 * The runner (`run-backend-lane.mjs`) proves the replica is live before Vitest
 * starts and skips the whole lane cleanly when it cannot be. Every runtime
 * import here is limited to `@dfinity/pic`, `vitest`, Node built-ins, and the
 * app's own generated declarations.
 *
 * This file speaks the *declarations'* Candid shapes, not the TypeScript
 * wrapper's: `AppResult` is `{ ok: ItemView } | { err: AppError }`, an optional
 * is `[] | [T]`, and `Nat`/`Int` are `bigint`.
 */

import { PocketIc } from "@dfinity/pic";
import type { Actor, CanisterFixture } from "@dfinity/pic";
import { afterAll, beforeAll, expect, it } from "vitest";

import { idlFactory } from "../../src/frontend/src/declarations/backend.did.js";
import type { _SERVICE } from "../../src/frontend/src/declarations/backend.did";

const PIC_URL = process.env.POCKET_IC_URL ?? "";
const BACKEND_WASM = process.env.BACKEND_WASM ?? "";
// Set only on a converted project: the last pre-EM revision, whose schema this
// app's migration chain replays from.
const BASELINE_WASM = process.env.BACKEND_WASM_BASELINE;

let pic: PocketIc | undefined;
let actor: Actor<_SERVICE>;
let canisterId: CanisterFixture<_SERVICE>["canisterId"];

beforeAll(async () => {
  pic = await PocketIc.create(PIC_URL);
  if (BASELINE_WASM === undefined) {
    ({ actor, canisterId } = await pic.setupCanister<_SERVICE>({
      idlFactory,
      wasm: BACKEND_WASM,
    }));
    return;
  }
  // `[baseline, current]`, the same install contract the hosted deploy uses for
  // a converted project. The upgrade replays the chain from the legacy schema.
  const installed = await pic.setupCanister<_SERVICE>({
    idlFactory,
    wasm: BASELINE_WASM,
  });
  await pic.upgradeCanister({
    canisterId: installed.canisterId,
    wasm: BACKEND_WASM,
    arg: new Uint8Array(),
  });
  ({ actor, canisterId } = installed);
});

afterAll(async () => {
  // `?.` because `beforeAll` may not have got that far.
  await pic?.tearDown();
});

it("answers empty-state reads instead of trapping", async () => {
  await expect(actor.listItems()).resolves.toEqual([]);
  await expect(actor.listSales()).resolves.toEqual([]);
  await expect(actor.searchItems("buku")).resolves.toEqual([]);
});

it("round-trips a master barang through create, search, and update", async () => {
  const created = await actor.createItem({
    namaBarang: "Buku Tulis Sidu",
    ukuran: "38 lembar",
    hargaPokok: 3_000n,
    stockMaster: 10n,
  });
  expect("ok" in created).toBe(true);
  if (!("ok" in created)) return;
  const id = created.ok.id;
  expect(id).toBeGreaterThan(0n);

  const found = await actor.searchItems("buku");
  expect(found).toHaveLength(1);
  expect(found[0]).toMatchObject({ id, namaBarang: "Buku Tulis Sidu" });

  const updated = await actor.updateItem(id, {
    ukuran: "58 lembar",
    hargaPokok: 4_200n,
  });
  expect("ok" in updated).toBe(true);
  if (!("ok" in updated)) return;
  expect(updated.ok).toMatchObject({
    ukuran: "58 lembar",
    hargaPokok: 4_200n,
    stockMaster: 10n,
  });
});

it("saves a master-linked sale and decrements Stock Master", async () => {
  const created = await actor.createItem({
    namaBarang: "Pulpen Biru",
    ukuran: "0.5 mm",
    hargaPokok: 2_000n,
    stockMaster: 10n,
  });
  expect("ok" in created).toBe(true);
  if (!("ok" in created)) return;
  const id = created.ok.id;

  const saved = await actor.saveSale({
    tanggal: "2026-09-25",
    lines: [
      {
        itemId: [id],
        hargaJual: 5_000n,
        qtyOrder: 4n,
        namaBarang: [],
        ukuran: [],
        hargaPokok: [],
      },
    ],
  });
  expect("ok" in saved).toBe(true);
  if (!("ok" in saved)) return;
  expect(saved.ok.total).toBe(20_000n);
  expect(saved.ok.lines[0]).toMatchObject({
    itemId: [id],
    qtyOrder: 4n,
    jumlah: 20_000n,
    manual: false,
  });

  const after = await actor.getItem(id);
  expect(after).toHaveLength(1);
  expect(after[0].stockMaster).toBe(6n);
});

it("rejects a sale that exceeds available stock", async () => {
  const created = await actor.createItem({
    namaBarang: "Penghapus",
    ukuran: "besar",
    hargaPokok: 1_000n,
    stockMaster: 3n,
  });
  expect("ok" in created).toBe(true);
  if (!("ok" in created)) return;
  const id = created.ok.id;

  const saved = await actor.saveSale({
    tanggal: "2026-09-25",
    lines: [
      {
        itemId: [id],
        hargaJual: 2_000n,
        qtyOrder: 10n,
        namaBarang: [],
        ukuran: [],
        hargaPokok: [],
      },
    ],
  });
  expect("err" in saved).toBe(true);
  if (!("err" in saved)) return;
  expect("insufficientStock" in saved.err).toBe(true);

  // The rejected order left stock untouched.
  const after = await actor.getItem(id);
  expect(after[0].stockMaster).toBe(3n);
});

it("saves a manual line without decrementing any master stock", async () => {
  const created = await actor.createItem({
    namaBarang: "Spidol",
    ukuran: "hitam",
    hargaPokok: 4_000n,
    stockMaster: 5n,
  });
  expect("ok" in created).toBe(true);
  if (!("ok" in created)) return;
  const id = created.ok.id;

  const saved = await actor.saveSale({
    tanggal: "2026-09-25",
    lines: [
      {
        itemId: [],
        hargaJual: 6_000n,
        qtyOrder: 2n,
        namaBarang: ["Barang Manual"],
        ukuran: ["custom"],
        hargaPokok: [1_000n],
      },
    ],
  });
  expect("ok" in saved).toBe(true);
  if (!("ok" in saved)) return;
  expect(saved.ok.lines[0]).toMatchObject({
    manual: true,
    namaBarang: "Barang Manual",
    jumlah: 12_000n,
    itemId: [],
  });

  // The unrelated master item's stock is unchanged.
  const after = await actor.getItem(id);
  expect(after[0].stockMaster).toBe(5n);
});

it("reports profit per transaction and monthly totals", async () => {
  const report = await actor.getProfitReport([2026n], []);
  expect(report.rows.length).toBeGreaterThan(0);
  expect(report.totalLaba).toBe(
    report.rows.reduce((sum, row) => sum + row.laba, 0n),
  );

  const monthly = await actor.getMonthlyProfit(2026n);
  expect(monthly.months).toHaveLength(12);
  expect(monthly.months[8]).toMatchObject({ month: 9n });
  expect(monthly.totalLaba).toBe(
    monthly.months.reduce((sum, entry) => sum + entry.laba, 0n),
  );
});

it("exposes the API documentation", async () => {
  const doc = await actor.getApiDoc();
  expect(typeof doc).toBe("string");
  expect(doc.length).toBeGreaterThan(0);
});
