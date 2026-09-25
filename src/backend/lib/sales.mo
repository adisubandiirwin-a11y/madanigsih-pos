import Map "mo:core/Map";
import List "mo:core/List";
import Iter "mo:core/Iter";
import Int "mo:core/Int";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Common "../types/common";
import Items "../types/items";
import Types "../types/sales";

module {
  /// Stable state owned by the sales domain. `items` is shared with the items
  /// domain so saving an order can decrement Stock Master atomically.
  public type State = {
    sales : Map.Map<Common.SaleId, Types.Sale>;
    var nextSaleId : Common.SaleId;
    items : Map.Map<Common.ItemId, Items.Item>;
  };

  func toView(sale : Types.Sale) : Types.SaleView {
    {
      id = sale.id;
      tanggal = sale.tanggal;
      createdAt = sale.createdAt;
      lines = sale.lines;
      total = sale.total;
    };
  };

  /// A valid `YYYY-MM-DD` date: 10 chars, digits in the right places, and a
  /// real calendar day (month 1..12, day 1..daysInMonth).
  func isValidDate(value : Text) : Bool {
    let chars = value.toArray();
    if (chars.size() != 10) {
      return false;
    };
    if (chars[4] != '-' or chars[7] != '-') {
      return false;
    };
    for (i in [0, 1, 2, 3, 5, 6, 8, 9].values()) {
      if (not chars[i].isDigit()) {
        return false;
      };
    };
    let month = Text.fromArray([chars[5], chars[6]]).toNat() ?? 0;
    let day = Text.fromArray([chars[8], chars[9]]).toNat() ?? 0;
    if (month < 1 or month > 12) {
      return false;
    };
    let daysInMonth = if (month == 1 or month == 3 or month == 5 or month == 7 or month == 8 or month == 10 or month == 12) {
      31;
    } else if (month == 4 or month == 6 or month == 9 or month == 11) {
      30;
    } else if (month == 2) {
      29;
    } else {
      0;
    };
    day >= 1 and day <= daysInMonth;
  };

  /// Save a penjualan: validate every line, snapshot item data, compute `jumlah`
  /// and `total`, then decrement each master-linked item's `stockMaster` by its
  /// `qtyOrder`. Rejects the whole order when any master-linked line exceeds
  /// available stock.
  ///
  /// A line with `itemId = null` is a manual line: it must carry a non-blank
  /// `namaBarang`, it never resolves against the master list, and it never
  /// decrements any stock. A line with `itemId = ?id` keeps the master-linked
  /// behaviour exactly.
  public func saveSale(state : State, input : Types.NewSale) : Common.AppResult<Types.SaleView> {
    if (input.lines.size() == 0) {
      return #err(#emptyOrder);
    };
    if (not isValidDate(input.tanggal)) {
      return #err(#invalidDate(input.tanggal));
    };

    // Pass 1: validate every line before mutating anything. Manual lines need a
    // non-blank name; master-linked lines must exist and have enough stock.
    for (line in input.lines.values()) {
      switch (line.itemId) {
        case null {
          let namaBarang = (line.namaBarang ?? "").trim(#predicate(func c = c == ' '));
          if (namaBarang == "") {
            return #err(#emptyField("namaBarang"));
          };
        };
        case (?itemId) {
          switch (state.items.get(itemId)) {
            case null { return #err(#itemNotFound(itemId)) };
            case (?item) {
              if (line.qtyOrder > item.stockMaster) {
                return #err(#insufficientStock({
                  itemId;
                  requested = line.qtyOrder;
                  available = item.stockMaster;
                }));
              };
            };
          };
        };
      };
    };

    // Pass 2: snapshot lines and decrement stock for master-linked lines only.
    // Pass 1 proved every referenced item exists, so those lookups cannot fail.
    var total : Common.Rupiah = 0;
    let lines = List.empty<Types.SaleLine>();
    for (line in input.lines.values()) {
      let jumlah = line.hargaJual * line.qtyOrder;
      total += jumlah;
      switch (line.itemId) {
        case null {
          // Manual line: snapshot the typed values, touch no master item.
          lines.add({
            itemId = null;
            manual = true;
            namaBarang = (line.namaBarang ?? "").trim(#predicate(func c = c == ' '));
            ukuran = (line.ukuran ?? "").trim(#predicate(func c = c == ' '));
            hargaPokok = line.hargaPokok ?? 0;
            hargaJual = line.hargaJual;
            qtyOrder = line.qtyOrder;
            jumlah;
          });
        };
        case (?itemId) {
          let item = switch (state.items.get(itemId)) {
            case null { return #err(#itemNotFound(itemId)) };
            case (?found) { found };
          };
          let updated : Items.Item = {
            id = item.id;
            namaBarang = item.namaBarang;
            ukuran = item.ukuran;
            hargaPokok = item.hargaPokok;
            stockMaster = item.stockMaster - line.qtyOrder;
            createdAt = item.createdAt;
            updatedAt = Time.now().toNat();
          };
          state.items.add(item.id, updated);
          lines.add({
            itemId = ?item.id;
            manual = false;
            namaBarang = item.namaBarang;
            ukuran = item.ukuran;
            hargaPokok = item.hargaPokok;
            hargaJual = line.hargaJual;
            qtyOrder = line.qtyOrder;
            jumlah;
          });
        };
      };
    };

    // Sale ids start at 1 for the same reason item ids do: an id of 0 would be
    // serialized as `none` by the generated optional-bigint bindings.
    let id = if (state.nextSaleId == 0) { 1 } else { state.nextSaleId };
    state.nextSaleId := id + 1;
    let sale : Types.Sale = {
      id;
      tanggal = input.tanggal;
      createdAt = Time.now().toNat();
      lines = lines.toArray();
      total;
    };
    state.sales.add(id, sale);
    #ok(toView(sale));
  };

  /// Fetch one penjualan with its lines.
  public func getSale(state : State, id : Common.SaleId) : ?Types.SaleView {
    switch (state.sales.get(id)) {
      case null { null };
      case (?sale) { ?toView(sale) };
    };
  };

  /// List every penjualan, newest first.
  public func listSales(state : State) : [Types.SaleView] {
    let views = state.sales.values().map(func sale = toView(sale)).toArray();
    views.sort(func(a, b) = Int.compare(b.createdAt, a.createdAt))
  };

  /// Flatten every sale into one row per line, carrying the owning sale and the
  /// line's position within it. Backs the OQL `saleLine` entity so line items
  /// are queryable; the position makes each row's key unique.
  public func flattenLines(state : State) : Iter.Iter<(Types.Sale, Nat, Types.SaleLine)> {
    let rows = List.empty<(Types.Sale, Nat, Types.SaleLine)>();
    for (sale in state.sales.values()) {
      var index = 0;
      for (line in sale.lines.values()) {
        rows.add((sale, index, line));
        index += 1;
      };
    };
    rows.values();
  };
};
