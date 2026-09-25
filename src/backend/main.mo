import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import Nat "mo:core/Nat";
import Expose "mo:caffeineai-oql/Expose";
import MapEntity "mo:caffeineai-oql/MapEntity";
import Entity "mo:caffeineai-oql/Entity";
import RecordValue "mo:caffeineai-oql/RecordValue";
import NatValue "mo:caffeineai-oql/NatValue";
import IntValue "mo:caffeineai-oql/IntValue";
import TextValue "mo:caffeineai-oql/TextValue";
import BoolValue "mo:caffeineai-oql/BoolValue";

import ItemsLib "lib/items";
import SalesLib "lib/sales";
import ReportsLib "lib/reports";

import SalesTypes "types/sales";

import ItemsApi "mixins/items-api";
import SalesApi "mixins/sales-api";
import ReportsApi "mixins/reports-api";
import ApiDocMixin "mixins/api-doc";

actor {
  let accessControlState : AccessControl.AccessControlState;
  include MixinAuthorization(accessControlState, null);

  // Stable state. Initial values come from the migration chain. The domain
  // state records are the stable fields themselves, so the mixins mutate the
  // same bindings the migration initialized (no per-mixin copies).
  let itemsDomain : ItemsLib.State;
  let salesDomain : SalesLib.State;
  let reportsDomain : ReportsLib.State;

  include ItemsApi(itemsDomain);
  include SalesApi(salesDomain);
  include ReportsApi(reportsDomain);
  include ApiDocMixin();

  include Expose({
    entities = [
      itemsDomain.items.toEntity("item", "Item", "id")
        .sample({
          id = 0;
          namaBarang = "";
          ukuran = "";
          hargaPokok = 0;
          stockMaster = 0;
          createdAt = 0;
          updatedAt = 0;
        })
        .controllerOnly()
        .build(),
      salesDomain.sales.toEntityManual("sale", "Sale", "id")
        .sample({
          id = 0;
          tanggal = "";
          createdAt = 0;
          lines = [];
          total = 0;
        })
        .payload("id", func sale = sale.id)
        .payload("tanggal", func sale = sale.tanggal)
        .payload("createdAt", func sale = sale.createdAt)
        .payload("total", func sale = sale.total)
        .payload("lineCount", func sale = sale.lines.size())
        .controllerOnly()
        .build(),
      // One row per penjualan line item, so the lines of a sale are queryable
      // on their own and can be joined back to `sale` by edge. A manual line has
      // no master item, so `itemId` is empty and `manual` is true; only
      // master-linked rows carry an item id.
      Entity.manual<(SalesTypes.Sale, Nat, SalesTypes.SaleLine)>(
        "saleLine",
        func () = SalesLib.flattenLines(salesDomain),
        "SaleLine",
        "lineKey",
      )
        .sample((
          { id = 0; tanggal = ""; createdAt = 0; lines = []; total = 0 },
          0,
          {
            itemId = null;
            manual = true;
            namaBarang = "";
            ukuran = "";
            hargaPokok = 0;
            hargaJual = 0;
            qtyOrder = 0;
            jumlah = 0;
          },
        ))
        .payload("lineKey", func ((sale, index, _)) = sale.id.toText() # ":" # index.toText())
        .payload("saleId", func ((sale, _, _)) = sale.id)
        .edge("saleId", "sale")
        .payload("itemId", func ((_, _, line)) = switch (line.itemId) {
          case null { "" };
          case (?id) { id.toText() };
        })
        .payload("manual", func ((_, _, line)) = line.manual)
        .payload("tanggal", func ((sale, _, _)) = sale.tanggal)
        .payload("namaBarang", func ((_, _, line)) = line.namaBarang)
        .payload("ukuran", func ((_, _, line)) = line.ukuran)
        .payload("hargaPokok", func ((_, _, line)) = line.hargaPokok)
        .payload("hargaJual", func ((_, _, line)) = line.hargaJual)
        .payload("qtyOrder", func ((_, _, line)) = line.qtyOrder)
        .payload("jumlah", func ((_, _, line)) = line.jumlah)
        .payload("laba", func ((_, _, line)) = (line.hargaJual.toInt() - line.hargaPokok.toInt()) * line.qtyOrder.toInt())
        .controllerOnly()
        .build(),
    ];
  });
};
