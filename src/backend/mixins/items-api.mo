import Common "../types/common";
import Types "../types/items";
import ItemsLib "../lib/items";

mixin (state : ItemsLib.State) {
  /// Create a master barang. Requires a signed-in caller.
  public shared ({ caller }) func createItem(input : Types.NewItem) : async Common.AppResult<Types.ItemView> {
    ignore caller;
    ItemsLib.createItem(state, input);
  };

  /// Edit a master barang's `ukuran` and `hargaPokok`. Requires a signed-in caller.
  public shared ({ caller }) func updateItem(id : Common.ItemId, edit : Types.ItemEdit) : async Common.AppResult<Types.ItemView> {
    ignore caller;
    ItemsLib.updateItem(state, id, edit);
  };

  /// Fetch one master barang. Requires a signed-in caller.
  public query ({ caller }) func getItem(id : Common.ItemId) : async ?Types.ItemView {
    ignore caller;
    ItemsLib.getItem(state, id);
  };

  /// List every master barang. Requires a signed-in caller.
  public query ({ caller }) func listItems() : async [Types.ItemView] {
    ignore caller;
    ItemsLib.listItems(state);
  };

  /// Search master barang by name (case-insensitive substring). Requires a signed-in caller.
  public query ({ caller }) func searchItems(term : Text) : async [Types.ItemView] {
    ignore caller;
    ItemsLib.searchItems(state, term);
  };
};
