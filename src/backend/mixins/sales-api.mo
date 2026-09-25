import Common "../types/common";
import Types "../types/sales";
import SalesLib "../lib/sales";

mixin (state : SalesLib.State) {
  /// Save a penjualan and decrement Stock Master. Requires a signed-in caller.
  public shared ({ caller }) func saveSale(input : Types.NewSale) : async Common.AppResult<Types.SaleView> {
    ignore caller;
    SalesLib.saveSale(state, input);
  };

  /// Fetch one penjualan with its lines. Requires a signed-in caller.
  public query ({ caller }) func getSale(id : Common.SaleId) : async ?Types.SaleView {
    ignore caller;
    SalesLib.getSale(state, id);
  };

  /// List every penjualan, newest first. Requires a signed-in caller.
  public query ({ caller }) func listSales() : async [Types.SaleView] {
    ignore caller;
    SalesLib.listSales(state);
  };
};
