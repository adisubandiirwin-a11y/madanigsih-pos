import Common "common";

module {
  public type ItemId = Common.ItemId;
  public type Rupiah = Common.Rupiah;
  public type Qty = Common.Qty;
  public type Timestamp = Common.Timestamp;

  /// A master barang record as stored by the backend.
  public type Item = {
    id : ItemId;
    namaBarang : Text;
    ukuran : Text;
    hargaPokok : Rupiah;
    stockMaster : Qty;
    createdAt : Timestamp;
    updatedAt : Timestamp;
  };

  /// A master barang record as returned across the API boundary.
  public type ItemView = {
    id : ItemId;
    namaBarang : Text;
    ukuran : Text;
    hargaPokok : Rupiah;
    stockMaster : Qty;
    createdAt : Timestamp;
    updatedAt : Timestamp;
  };

  /// Input for creating a master barang.
  public type NewItem = {
    namaBarang : Text;
    ukuran : Text;
    hargaPokok : Rupiah;
    stockMaster : Qty;
  };

  /// Input for editing a master barang. Only `ukuran` and `hargaPokok` may change.
  public type ItemEdit = {
    ukuran : Text;
    hargaPokok : Rupiah;
  };
};
