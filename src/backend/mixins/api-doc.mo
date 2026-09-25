mixin () {
  /// Static Markdown documentation of this backend's public API.
  public query func getApiDoc() : async Text {
    "# Toko Madanigsih Stationery — Backend API\n\n" #
    "Backend for a stationery shop at Jl. Belakang Terminal Pakupatan Serang: master barang, penjualan, and laporan laba/rugi.\n\n" #
    "## Authentication and authorization\n\n" #
    "Every domain method (`createItem`, `updateItem`, `getItem`, `listItems`, `searchItems`, `saveSale`, `getSale`, `listSales`, `getProfitReport`, `getMonthlyProfit`) requires a signed-in (non-anonymous) caller. The app's frontend pins an Internet Identity derivation origin, published at `/.well-known/ii-derivation-origin` when available; an agent already holding the user's Internet Identity authorization derives the correct per-app principal against that origin (for example `icp identity link web <name> --app <host>`). Such a delegation acts with the user's full authority in this app until it expires.\n\n" #
    "A direct API caller must register before any guarded call: call `_initialize_access_control` once as a signed-in caller. The first initializer receives the admin role; every later caller receives the user role. An unregistered or anonymous caller is rejected on guarded endpoints. Registration happens only when a caller signs in through the app's own frontend, so a principal that never did so is unregistered even when it belongs to the app's owner, and a signed-in caller derived against a different origin is a different principal than the one the frontend registered.\n\n" #
    "## Units and encodings\n\n" #
    "- Money is integer Rupiah (`Nat`), never a float.\n" #
    "- Quantities are `Nat`.\n" #
    "- Dates are ISO text `YYYY-MM-DD`; `createdAt` is a nanosecond timestamp used for ordering.\n" #
    "- Profit values are `Int` because a sale below cost is negative.\n" #
    "- `year` is a four-digit `Nat` (e.g. `2026`); `month` is `1`..`12`.\n\n" #
    "## Master Barang\n\n" #
    "- `createItem(input)` — create an item from `namaBarang`, `ukuran`, `hargaPokok`, `stockMaster`. Returns the created item.\n" #
    "- `updateItem(id, edit)` — change only `ukuran` and `hargaPokok`. `namaBarang` and `stockMaster` are never touched by this call.\n" #
    "- `getItem(id)` — fetch one item, or `null` when it does not exist.\n" #
    "- `listItems()` — list all items, sorted by name.\n" #
    "- `searchItems(term)` — case-insensitive substring match on `namaBarang`; an empty term lists all. Results are sorted by name.\n\n" #
    "## Penjualan\n\n" #
    "A sale line is either **master-linked** or **manual**:\n\n" #
    "- Master-linked line: `itemId = ?id`. The backend resolves the master barang, snapshots its `namaBarang`, `ukuran` and `hargaPokok`, computes `jumlah = hargaJual * qtyOrder`, and decrements `stockMaster` by `qtyOrder`. The whole order is rejected with `#insufficientStock` when any master-linked line exceeds available stock — no line is saved and no stock is decremented.\n" #
    "- Manual line: `itemId = null` with a non-blank `namaBarang`. The barang is not in the master list, so no master item is touched and no stock is decremented. The line snapshots the typed `namaBarang` and `ukuran` (`ukuran` defaults to `\"\"`), uses the entered `hargaJual` and `qtyOrder`, and records `hargaPokok` as the supplied value or `0`. A manual line never resolves to an item id, so it can never attach to a real master item.\n\n" #
    "- `saveSale(input)` — save an order. `input.lines` mixes master-linked and manual lines freely. Validation runs over the whole order first, so one invalid line rejects everything.\n" #
    "- `getSale(id)` — fetch one sale with its lines, or `null` when it does not exist.\n" #
    "- `listSales()` — list all sales, newest first.\n\n" #
    "## Laporan\n\n" #
    "- `getProfitReport(year, month)` — profit/loss rows and totals; `(hargaJual - hargaPokok) * qtyOrder` per line. `month = null` covers the whole year, `year = null` covers all years. `untung` is true when `totalLaba` is zero or positive.\n" #
    "- `getMonthlyProfit(year)` — monthly profit series for a year, ordered January..December, with the year total.\n\n" #
    "## Queryable data (OQL)\n\n" #
    "The canister exposes its persisted data through the Object Query Layer. `schema()` returns the table/field description and `execute(json)` runs a JSON query. All three tables are controller-only: only the platform's Data Intelligence agent (a controller) reads them; end users read through the domain methods above.\n\n" #
    "- `item` — one row per master barang: `id`, `namaBarang`, `ukuran`, `hargaPokok`, `stockMaster`, `createdAt`, `updatedAt`.\n" #
    "- `sale` — one row per penjualan: `id`, `tanggal`, `createdAt`, `total`, `lineCount`.\n" #
    "- `saleLine` — one row per penjualan line item: `lineKey` (unique), `saleId` (edge to `sale`), `itemId` (the master item id as text, or `\"\"` for a manual line), `manual` (true for a manual line), `tanggal`, `namaBarang`, `ukuran`, `hargaPokok`, `hargaJual`, `qtyOrder`, `jumlah`, and `laba` = `(hargaJual - hargaPokok) * qtyOrder`. Use dotted paths such as `saleId.total` to traverse the sale edge. Manual lines carry no item id, so they have no item edge.\n\n" #
    "## Errors\n\n" #
    "Fallible methods return `#ok(value)` or `#err(AppError)`. Error tags and their meanings:\n\n" #
    "- `#emptyField(field)` — a required text field was empty or whitespace only.\n" #
    "- `#invalidNumber(field)` — a numeric field received a value outside its allowed range.\n" #
    "- `#itemNotFound(id)` — the referenced master barang does not exist.\n" #
    "- `#saleNotFound(id)` — the referenced penjualan does not exist.\n" #
    "- `#insufficientStock({ itemId; requested; available })` — Qty Order exceeds the item's current Stock Master; the whole order is rejected.\n" #
    "- `#emptyOrder` — the order carried no line items.\n" #
    "- `#invalidDate(value)` — the supplied date is not a valid `YYYY-MM-DD` value.\n\n" #
    "## Lifecycle and polling\n\n" #
    "All reads (`getItem`, `listItems`, `searchItems`, `getSale`, `listSales`, `getProfitReport`, `getMonthlyProfit`) are query calls and return immediately. Writes (`createItem`, `updateItem`, `saveSale`) are update calls; a caller that needs the persisted result should read it back with the corresponding getter rather than assume the write landed.\n\n" #
    "## Retry safety\n\n" #
    "`saveSale` is NOT idempotent: each successful call creates a new sale and decrements stock again. Do not retry a call whose result is unknown without first checking `listSales()`. `createItem` is likewise not idempotent — a retry creates a second item. `updateItem` is idempotent for the same `ukuran`/`hargaPokok` values.\n\n" #
    "## Gotchas\n\n" #
    "- `saveSale` validates every line before mutating anything, so an order with one over-stocked line saves nothing at all.\n" #
    "- A manual line (`itemId = null`) never touches a master item and never decrements stock; only master-linked lines change `stockMaster`.\n" #
    "- `updateItem` changes only `ukuran` and `hargaPokok`; to change a name or stock, create a new item.\n" #
    "- Sale lines snapshot `namaBarang`, `ukuran` and `hargaPokok` at save time, so later master edits never rewrite historical sales or reports.\n" #
    "- `getProfitReport` and `getMonthlyProfit` derive from the same sale lines, so their totals agree for the same period.\n";
  };
};
