import Common "common";

module {
  public type SaleId = Common.SaleId;
  public type Rupiah = Common.Rupiah;
  public type Qty = Common.Qty;
  public type IsoDate = Common.IsoDate;
  public type Year = Common.Year;
  public type Month = Common.Month;

  /// One profit/loss row, derived from a single sale line.
  public type ProfitRow = {
    saleId : SaleId;
    tanggal : IsoDate;
    namaBarang : Text;
    ukuran : Text;
    hargaPokok : Rupiah;
    hargaJual : Rupiah;
    qtyOrder : Qty;
    /// (hargaJual - hargaPokok) * qtyOrder. Negative when sold below cost.
    laba : Int;
  };

  /// Aggregate profit/loss over a set of rows.
  public type ProfitSummary = {
    rows : [ProfitRow];
    /// Sum of every row's `laba`.
    totalLaba : Int;
    /// True when `totalLaba` is zero or positive.
    untung : Bool;
  };

  /// Profit aggregated for one month of a year.
  public type MonthlyProfit = {
    month : Month;
    /// Sum of `laba` for every sale line dated in this month.
    laba : Int;
  };

  /// Monthly profit series for a whole year, ordered January..December.
  public type YearlyProfit = {
    year : Year;
    months : [MonthlyProfit];
    /// Sum of every month's `laba`.
    totalLaba : Int;
  };
};
