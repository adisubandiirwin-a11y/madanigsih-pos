import Common "common";

module {
  public type ItemId = Common.ItemId;
  public type SaleId = Common.SaleId;
  public type Rupiah = Common.Rupiah;
  public type Qty = Common.Qty;
  public type IsoDate = Common.IsoDate;
  public type Timestamp = Common.Timestamp;

  /// One line of a penjualan. Snapshots the item's name, ukuran and hargaPokok
  /// at the moment the order is saved, so later master edits never rewrite history.
  ///
  /// A line is either master-linked or manual:
  /// - master-linked: `itemId = ?id`, `manual = false`. The backend snapshots the
  ///   master item and decrements its Stock Master.
  /// - manual: `itemId = null`, `manual = true`. The barang is not in the master
  ///   list, so no master item is touched and no stock is decremented. `namaBarang`
  ///   and `ukuran` are the typed values, and `hargaPokok` is the supplied value
  ///   or `0`.
  public type SaleLine = {
    itemId : ?ItemId;
    manual : Bool;
    namaBarang : Text;
    ukuran : Text;
    hargaPokok : Rupiah;
    hargaJual : Rupiah;
    qtyOrder : Qty;
    /// hargaJual * qtyOrder
    jumlah : Rupiah;
  };

  /// A penjualan record as stored by the backend.
  public type Sale = {
    id : SaleId;
    tanggal : IsoDate;
    createdAt : Timestamp;
    lines : [SaleLine];
    /// Sum of every line's `jumlah`.
    total : Rupiah;
  };

  /// A penjualan record as returned across the API boundary.
  public type SaleView = {
    id : SaleId;
    tanggal : IsoDate;
    createdAt : Timestamp;
    lines : [SaleLine];
    total : Rupiah;
  };

  /// One requested line of a new order.
  ///
  /// - Master-linked line: set `itemId = ?id`; the backend resolves the master
  ///   barang and snapshots namaBarang / ukuran / hargaPokok itself. The manual
  ///   fields are ignored.
  /// - Manual line: set `itemId = null` and supply `namaBarang` (required,
  ///   non-blank). `ukuran` defaults to `""` and `hargaPokok` defaults to `0`.
  ///   A manual line never touches a master item and never decrements stock.
  public type NewSaleLine = {
    itemId : ?ItemId;
    namaBarang : ?Text;
    ukuran : ?Text;
    hargaPokok : ?Rupiah;
    hargaJual : Rupiah;
    qtyOrder : Qty;
  };

  /// Input for saving a penjualan.
  public type NewSale = {
    tanggal : IsoDate;
    lines : [NewSaleLine];
  };
};
