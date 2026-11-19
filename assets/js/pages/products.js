/* ==========================================================================
   SHREE BRAHMANI TRADERS — Products
   ========================================================================== */
(function (global) {
  "use strict";

  const SBT = global.SBT;
  const U = SBT.utils;
  const App = SBT.app;
  const C = SBT.calc;
  const UI = SBT.ui;

  let search = "";

  function rows() {
    const stockMap = C.stockByProduct();
    return SBT.store.list("products").map(function (p) {
      const s = stockMap[p.name] || { stock: 0, purchased: 0, sold: 0 };
      return Object.assign({}, p, {
        stock: s.stock,
        purchased: s.purchased,
        sold: s.sold
      });
    });
  }

  function filtered() {
    return UI.filterRows(rows(), search, ["name", "unit", "hsn"]);
  }

  function render() {
    const list = filtered();
    const all = rows();

    return (
      App.pageHead(
        "Products",
        "Manage your construction material catalogue",
        '<button type="button" class="sbt-btn sbt-btn--outline" id="prodExport">' +
          '<i class="bi bi-file-earmark-excel"></i> Export</button>' +
        '<button type="button" class="sbt-btn sbt-btn--accent" id="prodAdd">' +
          '<i class="bi bi-plus-lg"></i> Add Product</button>'
      ) +

      '<div class="sbt-kpi-grid">' +
        App.kpi({ label: "Total Products", variant: "navy", icon: "bi-box-seam-fill", value: all.length }) +
        App.kpi({ label: "Active", variant: "green", icon: "bi-check-circle-fill",
          value: all.filter(function (p) { return p.active !== false; }).length }) +
        App.kpi({ label: "Low Stock", variant: "amber", icon: "bi-exclamation-triangle-fill",
          value: all.filter(function (p) { return p.stock > 0 && p.stock <= U.num(p.minStock); }).length }) +
        App.kpi({ label: "Out of Stock", variant: "red", icon: "bi-x-circle-fill",
          value: all.filter(function (p) { return p.stock <= 0; }).length }) +
      "</div>" +

      App.card({
        flush: true,
        body:
          '<div class="sbt-toolbar">' +
            '<div class="sbt-field sbt-field--grow">' +
              '<label for="prodSearch">Search</label>' +
              '<input type="search" class="sbt-input" id="prodSearch" placeholder="Search by name, unit or HSN…" value="' +
                U.escape(search) + '">' +
            "</div>" +
            '<div class="sbt-toolbar__spacer"></div>' +
            '<span class="sbt-muted" style="font-size:.78rem">' + list.length + " of " + all.length + " products</span>" +
          "</div>" +
          UI.table({
            columns: [
              { label: "Product", render: function (r) {
                return '<div class="sbt-row" style="gap:.6rem;flex-wrap:nowrap">' +
                  '<span style="display:grid;place-items:center;width:34px;height:34px;border-radius:9px;background:#eaf1f8;color:var(--sbt-navy-600);flex:0 0 auto">' +
                    '<i class="bi bi-box-seam"></i></span>' +
                  '<div><div class="sbt-strong">' + U.escape(r.name) + "</div>" +
                  '<div class="sbt-muted" style="font-size:.72rem">HSN ' + U.escape(r.hsn || "—") + "</div></div></div>";
              }},
              { label: "Unit", render: function (r) { return U.escape(r.unit || "—"); } },
              { label: "Purchase Rate", align: "right", render: function (r) { return U.currency(r.purchaseRate); } },
              { label: "Selling Rate", align: "right", render: function (r) { return U.currency(r.sellingRate); } },
              { label: "Margin", align: "right", render: function (r) {
                const p = U.num(r.purchaseRate);
                const s = U.num(r.sellingRate);
                const m = s > 0 ? ((s - p) / s) * 100 : 0;
                return '<span class="' + (m >= 0 ? "sbt-text-success" : "sbt-text-danger") + ' sbt-strong">' +
                  U.percent(m) + "</span>";
              }},
              { label: "Stock", align: "right", render: function (r) {
                return '<strong>' + U.qty(r.stock) + "</strong> <span class=\"sbt-muted\">" + U.escape(r.unit) + "</span>";
              }},
              { label: "Status", render: function (r) { return U.stockBadge(r.stock, r.minStock); } },
              { label: "Actions", className: "actions", render: function (r) {
                return '<button type="button" class="sbt-btn sbt-btn--sm sbt-btn--ghost" data-edit="' + r.id + '" title="Edit">' +
                    '<i class="bi bi-pencil"></i></button>' +
                  '<button type="button" class="sbt-btn sbt-btn--sm sbt-btn--ghost" data-del="' + r.id + '" title="Delete">' +
                    '<i class="bi bi-trash3"></i></button>';
              }}
            ],
            rows: list,
            empty: { icon: "bi-box-seam", title: "No products found", message: "Add your first material to get started." }
          })
      })
    );
  }

  function openForm(product) {
    const isEdit = !!product;
    const p = product || {};

    const modal = UI.modal({
      title: isEdit ? "Edit Product" : "Add Product",
      subtitle: isEdit ? "Update material details" : "Create a new construction material",
      body:
        '<form id="prodForm" novalidate>' +
          UI.formGrid([
            { label: "Product Name", name: "name", required: true, value: p.name, placeholder: "e.g. Bricks", full: true },
            { label: "Unit", name: "unit", type: "select", required: true, value: p.unit || "Piece",
              options: SBT.config.units },
            { label: "HSN Code", name: "hsn", value: p.hsn, placeholder: "e.g. 6904" },
            { label: "Purchase Rate", name: "purchaseRate", type: "number", step: "0.01", min: 0,
              required: true, value: p.purchaseRate, prefix: "₹" },
            { label: "Selling Rate", name: "sellingRate", type: "number", step: "0.01", min: 0,
              required: true, value: p.sellingRate, prefix: "₹" },
            { label: "GST Rate (%)", name: "gst", type: "number", step: "0.01", min: 0, max: 100,
              value: p.gst === undefined ? 5 : p.gst },
            { label: "Minimum Stock", name: "minStock", type: "number", step: "0.01", min: 0,
              value: p.minStock, help: "Low stock alert threshold" },
            { label: "Opening Stock", name: "openingStock", type: "number", step: "0.01",
              value: p.openingStock || 0, help: "Stock available before any purchase" },
            { label: "Active", name: "active", type: "checkbox", value: p.active !== false }
          ]) +
        "</form>",
      footer:
        '<button type="button" class="sbt-btn sbt-btn--outline" data-act="cancel">Cancel</button>' +
        '<button type="button" class="sbt-btn sbt-btn--accent" data-act="save">' +
          '<i class="bi bi-check-lg"></i> ' + (isEdit ? "Update Product" : "Save Product") + "</button>",
      onOpen: function (m) {
        const form = m.$("#prodForm");
        m.$('[data-act="cancel"]').addEventListener("click", m.close);
        m.$('[data-act="save"]').addEventListener("click", function () {
          const data = UI.readForm(form);
          const errors = U.validate({
            name: { value: data.name, label: "Product name", required: true, minLength: 2 },
            unit: { value: data.unit, label: "Unit", required: true },
            purchaseRate: { value: data.purchaseRate, label: "Purchase rate", required: true, type: "number", min: 0 },
            sellingRate: { value: data.sellingRate, label: "Selling rate", required: true, type: "number", min: 0 }
          });

          /* Duplicate name check */
          if (!errors.name) {
            const dup = SBT.store.list("products").find(function (x) {
              return x.name.toLowerCase() === String(data.name).toLowerCase() && x.id !== (p.id || "");
            });
            if (dup) errors.name = "A product with this name already exists";
          }

          if (!UI.showErrors(form, errors)) return;

          const payload = {
            name: data.name,
            unit: data.unit,
            hsn: data.hsn,
            purchaseRate: U.num(data.purchaseRate),
            sellingRate: U.num(data.sellingRate),
            gst: U.num(data.gst),
            minStock: U.num(data.minStock),
            openingStock: U.num(data.openingStock),
            active: !!data.active
          };

          if (isEdit) {
            SBT.store.update("products", p.id, payload);
            UI.success("Product updated successfully");
          } else {
            SBT.store.insert("products", payload);
            UI.success("Product added successfully");
          }
          m.close();
          refresh();
        });
      }
    });
  }

  async function remove(id) {
    const product = SBT.store.get("products", id);
    if (!product) return;

    const used = SBT.store.list("purchases").some(function (r) { return r.materialName === product.name; }) ||
      SBT.store.list("sales").some(function (r) { return r.materialName === product.name; });

    const ok = await UI.confirm({
      title: "Delete Product",
      message: used
        ? '"' + product.name + '" is used in existing transactions. Deleting it will not remove those records, but the product will no longer appear in dropdowns. Continue?'
        : 'Are you sure you want to delete "' + product.name + '"? This action cannot be undone.',
      confirmText: "Delete Product"
    });

    if (!ok) return;
    SBT.store.remove("products", id);
    UI.success("Product deleted");
    refresh();
  }

  function exportData() {
    const list = rows().map(function (r) {
      return {
        Product: r.name,
        Unit: r.unit,
        HSN: r.hsn || "",
        "Purchase Rate": r.purchaseRate,
        "Selling Rate": r.sellingRate,
        "GST %": r.gst,
        "Min Stock": r.minStock,
        "Opening Stock": r.openingStock,
        Purchased: r.purchased,
        Sold: r.sold,
        "Current Stock": r.stock,
        Status: r.active === false ? "Inactive" : "Active"
      };
    });
    U.exportExcel("SBT-Products", list, null, "Product Master");
    UI.success("Products exported");
  }

  function mount() {
    const addBtn = document.getElementById("prodAdd");
    if (addBtn) addBtn.addEventListener("click", function () { openForm(null); });

    const exportBtn = document.getElementById("prodExport");
    if (exportBtn) exportBtn.addEventListener("click", exportData);

    const searchEl = document.getElementById("prodSearch");
    if (searchEl) {
      searchEl.addEventListener("input", U.debounce(function () {
        search = searchEl.value;
        refresh();
        const el = document.getElementById("prodSearch");
        if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
      }, 220));
    }

    U.on(document.getElementById("sbtContent"), "click", "[data-edit]", function (e, el) {
      openForm(SBT.store.get("products", el.dataset.edit));
    });

    U.on(document.getElementById("sbtContent"), "click", "[data-del]", function (e, el) {
      remove(el.dataset.del);
    });
  }

  function refresh() {
    const content = document.getElementById("sbtContent");
    if (!content) return;
    content.innerHTML = render();
    mount();
  }

  App.products = { render: render, mount: mount, refresh: refresh };
})(window);
