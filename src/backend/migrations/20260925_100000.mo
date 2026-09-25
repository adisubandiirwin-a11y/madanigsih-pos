import Map "mo:core/Map";
import Principal "mo:core/Principal";

module {
  // Old stable state: the fresh scaffold had no domain state at all.
  type OldActor = {};

  type ItemId = Nat;
  type SaleId = Nat;
  type Rupiah = Nat;
  type Qty = Nat;
  type Timestamp = Nat;

  type UserRole = {
    #admin;
    #user;
    #guest;
  };

  type AccessControlState = {
    var adminAssigned : Bool;
    userRoles : Map.Map<Principal, UserRole>;
  };

  type Item = {
    id : ItemId;
    namaBarang : Text;
    ukuran : Text;
    hargaPokok : Rupiah;
    stockMaster : Qty;
    createdAt : Timestamp;
    updatedAt : Timestamp;
  };

  type SaleLine = {
    itemId : ?ItemId;
    manual : Bool;
    namaBarang : Text;
    ukuran : Text;
    hargaPokok : Rupiah;
    hargaJual : Rupiah;
    qtyOrder : Qty;
    jumlah : Rupiah;
  };

  type Sale = {
    id : SaleId;
    tanggal : Text;
    createdAt : Timestamp;
    lines : [SaleLine];
    total : Rupiah;
  };

  type ItemsState = {
    items : Map.Map<ItemId, Item>;
    var nextItemId : ItemId;
  };

  type SalesState = {
    sales : Map.Map<SaleId, Sale>;
    var nextSaleId : SaleId;
    items : Map.Map<ItemId, Item>;
  };

  type ReportsState = {
    sales : Map.Map<SaleId, Sale>;
  };

  type NewActor = {
    accessControlState : AccessControlState;
    itemsDomain : ItemsState;
    salesDomain : SalesState;
    reportsDomain : ReportsState;
  };

  public func migration(_old : OldActor) : NewActor {
    // One shared items map and one shared sales map, referenced by every domain
    // record that needs them, so stock decrements and reports stay consistent.
    let items = Map.empty<ItemId, Item>();
    let sales = Map.empty<SaleId, Sale>();
    {
      accessControlState = {
        var adminAssigned = false;
        userRoles = Map.empty();
      };
      // Counters start at 1 so the first created item/sale never has id 0.
      itemsDomain = { items; var nextItemId = 1 };
      salesDomain = { sales; var nextSaleId = 1; items };
      reportsDomain = { sales };
    };
  };
};
