import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type AppError = {
    __kind__: "saleNotFound";
    saleNotFound: SaleId;
} | {
    __kind__: "itemNotFound";
    itemNotFound: ItemId;
} | {
    __kind__: "emptyField";
    emptyField: string;
} | {
    __kind__: "invalidNumber";
    invalidNumber: string;
} | {
    __kind__: "invalidDate";
    invalidDate: string;
} | {
    __kind__: "emptyOrder";
    emptyOrder: null;
} | {
    __kind__: "insufficientStock";
    insufficientStock: {
        itemId: ItemId;
        requested: Qty;
        available: Qty;
    };
};
export type AppResult = {
    __kind__: "ok";
    ok: ItemView;
} | {
    __kind__: "err";
    err: AppError;
};
export type AppResult_1 = {
    __kind__: "ok";
    ok: SaleView;
} | {
    __kind__: "err";
    err: AppError;
};
export interface Cell {
    value: Value;
    name: string;
}
export type Error_ = {
    __kind__: "FrontendOriginsNotConfigured";
    FrontendOriginsNotConfigured: null;
} | {
    __kind__: "MixedSsoSources";
    MixedSsoSources: {
        otherKeys: Array<string>;
        ssoKeys: Array<string>;
    };
} | {
    __kind__: "Stale";
    Stale: {
        ageNs: bigint;
    };
} | {
    __kind__: "MalformedCandid";
    MalformedCandid: null;
} | {
    __kind__: "AmbiguousAttribute";
    AmbiguousAttribute: {
        field: string;
        sources: Array<string>;
    };
} | {
    __kind__: "NoAttributes";
    NoAttributes: null;
} | {
    __kind__: "UnknownNonce";
    UnknownNonce: null;
} | {
    __kind__: "UntrustedSsoSource";
    UntrustedSsoSource: {
        domain: string;
    };
} | {
    __kind__: "MissingField";
    MissingField: string;
} | {
    __kind__: "FrontendOriginMismatch";
    FrontendOriginMismatch: {
        got: string;
        expected: Array<string>;
    };
};
export type IsoDate = string;
export interface ItemEdit {
    hargaPokok: Rupiah;
    ukuran: string;
}
export type ItemId = bigint;
export interface ItemView {
    id: ItemId;
    namaBarang: string;
    createdAt: Timestamp;
    hargaPokok: Rupiah;
    updatedAt: Timestamp;
    ukuran: string;
    stockMaster: Qty;
}
export type Month = bigint;
export interface MonthlyProfit {
    month: Month;
    laba: bigint;
}
export interface NewItem {
    namaBarang: string;
    hargaPokok: Rupiah;
    ukuran: string;
    stockMaster: Qty;
}
export interface NewSale {
    tanggal: IsoDate;
    lines: Array<NewSaleLine>;
}
export interface NewSaleLine {
    itemId?: ItemId;
    hargaJual: Rupiah;
    namaBarang?: string;
    qtyOrder: Qty;
    hargaPokok?: Rupiah;
    ukuran?: string;
}
export interface ProfitRow {
    saleId: SaleId;
    hargaJual: Rupiah;
    namaBarang: string;
    tanggal: IsoDate;
    qtyOrder: Qty;
    laba: bigint;
    hargaPokok: Rupiah;
    ukuran: string;
}
export interface ProfitSummary {
    rows: Array<ProfitRow>;
    totalLaba: bigint;
    untung: boolean;
}
export type Qty = bigint;
export interface Result {
    hasMore: boolean;
    rows: Array<Array<Cell>>;
}
export type Result__1 = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: Error_;
};
export type Rupiah = bigint;
export type SaleId = bigint;
export interface SaleLine {
    jumlah: Rupiah;
    itemId?: ItemId;
    hargaJual: Rupiah;
    namaBarang: string;
    qtyOrder: Qty;
    hargaPokok: Rupiah;
    ukuran: string;
    manual: boolean;
}
export interface SaleView {
    id: SaleId;
    total: Rupiah;
    tanggal: IsoDate;
    createdAt: Timestamp;
    lines: Array<SaleLine>;
}
export type Timestamp = bigint;
export type Value = {
    __kind__: "int";
    int: bigint;
} | {
    __kind__: "nat";
    nat: bigint;
} | {
    __kind__: "float";
    float: number;
} | {
    __kind__: "bool";
    bool: boolean;
} | {
    __kind__: "null";
    null: null;
} | {
    __kind__: "text";
    text: string;
};
export type Year = bigint;
export interface YearlyProfit {
    year: Year;
    totalLaba: bigint;
    months: Array<MonthlyProfit>;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    /**
     * / Create a master barang. Requires a signed-in caller.
     */
    createItem(input: NewItem): Promise<AppResult>;
    execute(qJson: string): Promise<Result>;
    /**
     * / Static Markdown documentation of this backend's public API.
     */
    getApiDoc(): Promise<string>;
    getCallerUserRole(): Promise<UserRole>;
    /**
     * / Fetch one master barang. Requires a signed-in caller.
     */
    getItem(id: ItemId): Promise<ItemView | null>;
    /**
     * / Monthly profit series for a year, ordered January..December.
     * / Requires a signed-in caller.
     */
    getMonthlyProfit(year: Year): Promise<YearlyProfit>;
    /**
     * / Profit/loss report rows and totals, optionally filtered by year and month.
     * / Requires a signed-in caller.
     */
    getProfitReport(year: Year | null, month: Month | null): Promise<ProfitSummary>;
    /**
     * / Fetch one penjualan with its lines. Requires a signed-in caller.
     */
    getSale(id: SaleId): Promise<SaleView | null>;
    isCallerAdmin(): Promise<boolean>;
    /**
     * / List every master barang. Requires a signed-in caller.
     */
    listItems(): Promise<Array<ItemView>>;
    /**
     * / List every penjualan, newest first. Requires a signed-in caller.
     */
    listSales(): Promise<Array<SaleView>>;
    /**
     * / Save a penjualan and decrement Stock Master. Requires a signed-in caller.
     */
    saveSale(input: NewSale): Promise<AppResult_1>;
    schema(): Promise<string>;
    /**
     * / Search master barang by name (case-insensitive substring). Requires a signed-in caller.
     */
    searchItems(term: string): Promise<Array<ItemView>>;
    /**
     * / Edit a master barang's `ukuran` and `hargaPokok`. Requires a signed-in caller.
     */
    updateItem(id: ItemId, edit: ItemEdit): Promise<AppResult>;
}
