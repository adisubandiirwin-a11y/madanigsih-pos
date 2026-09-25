import Map "mo:core/Map";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Common "../types/common";
import Types "../types/items";

module {
  /// Stable state owned by the items domain.
  public type State = {
    items : Map.Map<Common.ItemId, Types.Item>;
    var nextItemId : Common.ItemId;
  };

  func toView(item : Types.Item) : Types.ItemView {
    {
      id = item.id;
      namaBarang = item.namaBarang;
      ukuran = item.ukuran;
      hargaPokok = item.hargaPokok;
      stockMaster = item.stockMaster;
      createdAt = item.createdAt;
      updatedAt = item.updatedAt;
    };
  };

  func byName(a : Types.ItemView, b : Types.ItemView) : { #less; #equal; #greater } {
    Text.compare(a.namaBarang, b.namaBarang);
  };

  /// Create a master barang and return its generated id.
  public func createItem(state : State, input : Types.NewItem) : Common.AppResult<Types.ItemView> {
    let namaBarang = input.namaBarang.trim(#predicate(func c = c == ' '));
    if (namaBarang == "") {
      return #err(#emptyField("namaBarang"));
    };
    let ukuran = input.ukuran.trim(#predicate(func c = c == ' '));
    if (ukuran == "") {
      return #err(#emptyField("ukuran"));
    };
    let now = Time.now().toNat();
    // Ids start at 1: the generated Candid bindings serialize an optional
    // bigint with a truthiness check, so an id of 0 would collapse to `none`
    // and a master-linked sale line would be mistaken for a manual line.
    let id = if (state.nextItemId == 0) { 1 } else { state.nextItemId };
    state.nextItemId := id + 1;
    let item : Types.Item = {
      id;
      namaBarang;
      ukuran;
      hargaPokok = input.hargaPokok;
      stockMaster = input.stockMaster;
      createdAt = now;
      updatedAt = now;
    };
    state.items.add(id, item);
    #ok(toView(item));
  };

  /// Change only `ukuran` and `hargaPokok` of an existing master barang.
  public func updateItem(state : State, id : Common.ItemId, edit : Types.ItemEdit) : Common.AppResult<Types.ItemView> {
    let ukuran = edit.ukuran.trim(#predicate(func c = c == ' '));
    if (ukuran == "") {
      return #err(#emptyField("ukuran"));
    };
    switch (state.items.get(id)) {
      case null { #err(#itemNotFound(id)) };
      case (?item) {
        let updated : Types.Item = {
          id = item.id;
          namaBarang = item.namaBarang;
          ukuran;
          hargaPokok = edit.hargaPokok;
          stockMaster = item.stockMaster;
          createdAt = item.createdAt;
          updatedAt = Time.now().toNat();
        };
        state.items.add(id, updated);
        #ok(toView(updated));
      };
    };
  };

  /// Fetch one master barang.
  public func getItem(state : State, id : Common.ItemId) : ?Types.ItemView {
    switch (state.items.get(id)) {
      case null { null };
      case (?item) { ?toView(item) };
    };
  };

  /// List every master barang, sorted by name.
  public func listItems(state : State) : [Types.ItemView] {
    let views = state.items.values().map(func item = toView(item)).toArray();
    views.sort(byName)
  };

  /// Case-insensitive substring search over `namaBarang`. An empty term lists all.
  public func searchItems(state : State, term : Text) : [Types.ItemView] {
    let needle = term.trim(#predicate(func c = c == ' ')).toLower();
    let views = state.items.values().map(func item = toView(item)).toArray();
    let matched = if (needle == "") {
      views;
    } else {
      views.filter(func view = view.namaBarang.toLower().contains(#text needle));
    };
    matched.sort(byName)
  };
};
