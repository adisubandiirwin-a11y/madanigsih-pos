module {
  /// Identifier for a master barang (item). Monotonic, assigned by the backend.
  public type ItemId = Nat;

  /// Identifier for a penjualan (sale/order). Monotonic, assigned by the backend.
  public type SaleId = Nat;

  /// Money in integer Rupiah. Never negative.
  public type Rupiah = Nat;

  /// Quantity of goods. Never negative.
  public type Qty = Nat;

  /// Calendar date as ISO text, `YYYY-MM-DD`.
  public type IsoDate = Text;

  /// Wall-clock instant in nanoseconds since the epoch, used for ordering.
  public type Timestamp = Nat;

  /// Year used by the laporan (report) aggregation, e.g. `2026`.
  public type Year = Nat;

  /// Month of a year, `1`..`12`.
  public type Month = Nat;

  /// Validation / domain failure returned to the caller.
  public type AppError = {
    /// A required text field was empty or whitespace only.
    #emptyField : Text;
    /// A numeric field received a value outside its allowed range.
    #invalidNumber : Text;
    /// The requested item does not exist.
    #itemNotFound : ItemId;
    /// The requested sale does not exist.
    #saleNotFound : SaleId;
    /// Qty Order exceeds the item's current Stock Master.
    #insufficientStock : { itemId : ItemId; requested : Qty; available : Qty };
    /// The order carried no line items.
    #emptyOrder;
    /// The supplied date is not a valid `YYYY-MM-DD` value.
    #invalidDate : Text;
  };

  /// Convenience alias for a fallible backend operation.
  public type AppResult<T> = { #ok : T; #err : AppError };
};
