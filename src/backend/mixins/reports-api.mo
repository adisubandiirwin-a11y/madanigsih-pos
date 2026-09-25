import Common "../types/common";
import Types "../types/reports";
import ReportsLib "../lib/reports";

mixin (state : ReportsLib.State) {
  /// Profit/loss report rows and totals, optionally filtered by year and month.
  /// Requires a signed-in caller.
  public query ({ caller }) func getProfitReport(year : ?Common.Year, month : ?Common.Month) : async Types.ProfitSummary {
    ignore caller;
    ReportsLib.getProfitReport(state, year, month);
  };

  /// Monthly profit series for a year, ordered January..December.
  /// Requires a signed-in caller.
  public query ({ caller }) func getMonthlyProfit(year : Common.Year) : async Types.YearlyProfit {
    ignore caller;
    ReportsLib.getMonthlyProfit(state, year);
  };
};
