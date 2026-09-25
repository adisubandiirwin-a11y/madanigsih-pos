import Map "mo:core/Map";
import Text "mo:core/Text";
import Common "../types/common";
import Sales "../types/sales";
import Types "../types/reports";

module {
  /// Stable state owned by the reports domain. `sales` is shared with the sales
  /// domain so reports always read the live ledger.
  public type State = {
    sales : Map.Map<Common.SaleId, Sales.Sale>;
  };

  /// Parse the `YYYY-MM-DD` prefix of a date into `(year, month)`.
  func parseYearMonth(tanggal : Common.IsoDate) : (Common.Year, Common.Month) {
    let chars = tanggal.toArray();
    if (chars.size() < 7) {
      return (0, 0);
    };
    let yearText = Text.fromArray([chars[0], chars[1], chars[2], chars[3]]);
    let monthText = Text.fromArray([chars[5], chars[6]]);
    (yearText.toNat() ?? 0, monthText.toNat() ?? 0);
  };

  func lineLaba(line : Sales.SaleLine) : Int {
    (line.hargaJual.toInt() - line.hargaPokok.toInt()) * line.qtyOrder.toInt();
  };

  /// Profit/loss rows for every sale line, optionally filtered to one month of
  /// one year. `month = null` covers the whole year; `year = null` covers all years.
  public func getProfitReport(state : State, year : ?Common.Year, month : ?Common.Month) : Types.ProfitSummary {
    var rows : [Types.ProfitRow] = [];
    var total : Int = 0;
    for (sale in state.sales.values()) {
      let (saleYear, saleMonth) = parseYearMonth(sale.tanggal);
      let yearOk = switch (year) {
        case null { true };
        case (?y) { y == saleYear };
      };
      let monthOk = switch (month) {
        case null { true };
        case (?m) { m == saleMonth };
      };
      if (yearOk and monthOk) {
        for (line in sale.lines.values()) {
          let laba = lineLaba(line);
          total += laba;
          rows := rows.concat([{
            saleId = sale.id;
            tanggal = sale.tanggal;
            namaBarang = line.namaBarang;
            ukuran = line.ukuran;
            hargaPokok = line.hargaPokok;
            hargaJual = line.hargaJual;
            qtyOrder = line.qtyOrder;
            laba;
          }]);
        };
      };
    };
    { rows; totalLaba = total; untung = total >= 0 };
  };

  /// Monthly profit series for a given year, ordered January..December.
  public func getMonthlyProfit(state : State, year : Common.Year) : Types.YearlyProfit {
    let buckets : [var Int] = [var 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (sale in state.sales.values()) {
      let (saleYear, saleMonth) = parseYearMonth(sale.tanggal);
      if (saleYear == year and saleMonth >= 1 and saleMonth <= 12) {
        var monthTotal : Int = 0;
        for (line in sale.lines.values()) {
          monthTotal += lineLaba(line);
        };
        var bucketIndex = 0;
        var monthCursor = 1;
        while (monthCursor < saleMonth) {
          bucketIndex += 1;
          monthCursor += 1;
        };
        buckets[bucketIndex] += monthTotal;
      };
    };
    var total : Int = 0;
    var months : [Types.MonthlyProfit] = [];
    var index = 0;
    while (index < 12) {
      let laba = buckets[index];
      total += laba;
      months := months.concat([{ month = index + 1; laba }]);
      index += 1;
    };
    { year; months; totalLaba = total };
  };
};
