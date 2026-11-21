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

  function T(key, vars) { return U.t(key, vars); }

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
        T("prod.title"),
        T("prod.subtitle"),
        '<button type="button" class="sbt-btn sbt-btn--outline" id="prodExport">' +
          '<i class="bi bi-file-earmark-excel"></i> ' + U.escape(T("common.export")) + '</button>' +
        '<button type="button" class="sbt-btn sbt-btn--accent" id="prodAdd">' +
          '<i class="bi bi-plus-lg"></i> ' + U.escape(T("prod.addProduct")) + '</button>'
      ) +

      '<div class="sbt-kpi-grid">' +
        App.kpi({ label: T("prod.totalProducts"), variant: "navy", icon: "bi-box-seam-fill", value: all.length }) +
        App.kpi({ label: T("prod.active"), variant: "green", icon: "bi-check-circle-fill",
          value: all.filter(function (p) { return p.active !== false; }).length }) +
        App.kpi({ label: T("prod.lowStock"), variant: "amber", icon: "bi-exclamation-triangle-fill",
          value: all.filter(function (p) { return p.stock > 0 && p.stock <= U.num(p.minStock); }).length }) +
        App.kpi({ label: T("prod.outOfStock"), variant: "red", icon: "bi-x-circle-fill",
          value: all.filter(function (p) { return p.stock <= 0; }).length }) +
      "</div>" +

      App.card({
        flush: true,
        body:
          '<div class="sbt-toolbar">' +
            '<div class="sbt-field sbt-field--grow">' +
              '<label for="prodSearch">' + U.escape(T("common.search")) + '</label>' +
              '<input type="search" class="sbt-input" id="prodSearch" placeholder="' +
                U.escape(T("prod.searchPlaceholder")) + '" value="' +
                U.escape(search) + '">' +
            "</div>" +
            '<div class="sbt-toolbar__spacer"></div>' +
            '<span class="sbt-muted" style="font-size:.78rem">' +
              U.escape(T("prod.countOf", { shown: list.length, total: all.length })) + "</span>" +
          "</div>" +
          UI.table({
            columns: [
              { label: U.escape(T("dash.product")), render: function (r) {
                return '<div class="sbt-row" style="gap:.6rem;flex-wrap:nowrap">' +
                  '<span style="display:grid;place-items:center;width:34px;height:34px;border-radius:9px;background:#eaf1f8;color:var(--sbt-navy-600);flex:0 0 auto">' +
                    '<i class="bi bi-box-seam"></i></span>' +
                  '<div><div class="sbt-strong">' + U.escape(r.name) + "</div>" +
                  '<div class="sbt-muted" style="font-size:.72rem">' + U.escape(T("prod.hsn")) + " " +
                    U.escape(r.hsn || "—") + "</div></div></div>";
              }},
              { label: U.escape(T("common.unit")), render: function (r) { return U.escape(U.tv(r.unit) || "—"); } },
              { label: U.escape(T("prod.purchaseRate")), align: "right", render: function (r) { return U.currency(r.purchaseRate); } },
              { label: U.escape(T("prod.sellingRate")), align: "right", render: function (r) { return U.currency(r.sellingRate); } },
              { label: U.escape(T("prod.margin")), align: "right", render: function (r) {
                const p = U.num(r.purchaseRate);
                const s = U.num(r.sellingRate);
                const m = s > 0 ? ((s - p) / s) * 100 : 0;
                return '<span class="' + (m >= 0 ? "sbt-text-success" : "sbt-text-danger") + ' sbt-strong">' +
                  U.percent(m) + "</span>";
              }},
              { label: U.escape(T("prod.stock")), align: "right", render: function (r) {
                return '<strong>' + U.qty(r.stock) + '</strong> <span class="sbt-muted">' +
                  U.escape(U.tv(r.unit)) + "</span>";
              }},
              { label: U.escape(T("common.status")), render: function (r) { return U.stockBadge(r.stock, r.minStock); } },
              { label: U.escape(T("common.actions")), className: "actions", render: function (r) {
                return '<button type="button" class="sbt-btn sbt-btn--sm sbt-btn--ghost" data-edit="' + r.id + '" title="' +
                    U.escape(T("common.edit")) + '">' +
                    '<i class="bi bi-pencil"></i></button>' +
                  '<button type="button" class="sbt-btn sbt-btn--sm sbt-btn--ghost" data-del="' + r.id + '" title="' +
                    U.escape(T("common.delete")) + '">' +
                    '<i class="bi bi-trash3"></i></button>';
              }}
            ],
            rows: list,
            empty: { icon: "bi-box-seam", title: T("prod.noProductsFound"), message: T("prod.noProductsFoundMsg") }
          })
      })
    );
  }

  function openForm(product) {
    const isEdit = !!product;
    const p = product || {};

    const modal = UI.modal({
      title: isEdit ? T("prod.editProduct") : T("prod.addProductTitle"),
      subtitle: isEdit ? T("prod.editSubtitle") : T("prod.addSubtitle"),
      body:
        '<form id="prodForm" novalidate>' +
          UI.formGrid([
            { label: T("prod.productName"), name: "name", required: true, value: p.name,
              placeholder: T("prod.productNamePlaceholder"), full: true },
            { label: T("common.unit"), name: "unit", type: "select", required: true, value: p.unit || "Piece",
              options: SBT.config.units },
            { label: T("prod.hsn"), name: "hsn", value: p.hsn, placeholder: T("prod.hsnPlaceholder") },
            { label: T("prod.purchaseRate"), name: "purchaseRate", type: "number", step: "0.01", min: 0,
              required: true, value: p.purchaseRate, prefix: SBT.store.settings.currency || "₹" },
            { label: T("prod.sellingRate"), name: "sellingRate", type: "number", step: "0.01", min: 0,
              required: true, value: p.sellingRate, prefix: SBT.store.settings.currency || "₹" },
            { label: T("prod.gstRate"), name: "gst", type: "number", step: "0.01", min: 0, max: 100,
              value: p.gst === undefined ? 5 : p.gst },
            { label: T("prod.minStock"), name: "minStock", type: "number", step: "0.01", min: 0,
              value: p.minStock, help: T("prod.minStockHelp") },
            { label: T("prod.openingStock"), name: "openingStock", type: "number", step: "0.01", min: 0,
              value: p.openingStock || 0, help: T("prod.openingStockHelp") },
            { label: T("prod.active"), name: "active", type: "checkbox", value: p.active !== false }
          ]) +
        "</form>",
      footer:
        '<button type="button" class="sbt-btn sbt-btn--outline" data-act="cancel">' +
          U.escape(T("common.cancel")) + '</button>' +
        '<button type="button" class="sbt-btn sbt-btn--accent" data-act="save">' +
          '<i class="bi bi-check-lg"></i> ' +
          U.escape(isEdit ? T("prod.updateProduct") : T("prod.saveProduct")) + "</button>",
      onOpen: function (m) {
        const form = m.$("#prodForm");
        m.$('[data-act="cancel"]').addEventListener("click", m.close);
        m.$('[data-act="save"]').addEventListener("click", function () {
          const data = UI.readForm(form);
          const errors = U.validate({
            name: { value: data.name, label: T("prod.productNameLabel"), required: true, minLength: 2, maxLength: 80 },
            unit: { value: data.unit, label: T("prod.unitLabel"), required: true },
            purchaseRate: { value: data.purchaseRate, label: T("prod.purchaseRateLabel"), required: true, type: "number", min: 0 },
            sellingRate: { value: data.sellingRate, label: T("prod.sellingRateLabel"), required: true, type: "number", min: 0 },
            gst: { value: data.gst, label: T("prod.gstRate"), type: "number", min: 0, max: 100 },
            minStock: { value: data.minStock, label: T("prod.minStock"), type: "number", min: 0 },
            openingStock: { value: data.openingStock, label: T("prod.openingStock"), type: "number", min: 0 }
          });

          /* Duplicate name check (case-insensitive, ignores the record itself) */
          if (!errors.name) {
            const wanted = String(data.name).trim().toLowerCase();
            const dup = SBT.store.list("products").find(function (x) {
              return String(x.name || "").trim().toLowerCase() === wanted && x.id !== (p.id || "");
            });
            if (dup) errors.name = T("prod.duplicate");
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
            UI.success(T("prod.productUpdated"));
          } else {
            SBT.store.insert("products", payload);
            UI.success(T("prod.productAdded"));
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
      title: T("prod.deleteProduct"),
      message: used
        ? T("prod.deleteUsed", { name: product.name })
        : T("prod.deleteConfirm", { name: product.name }),
      confirmText: T("prod.deleteProduct")
    });

    if (!ok) return;
    SBT.store.remove("products", id);
    UI.success(T("prod.productDeleted"));
    refresh();
  }

  function exportData() {
    const list = rows().map(function (r) {
      return {
        [T("dash.product")]: r.name,
        [T("common.unit")]: U.tv(r.unit),
        [T("prod.hsn")]: r.hsn || "",
        [T("prod.purchaseRate")]: r.purchaseRate,
        [T("prod.sellingRate")]: r.sellingRate,
        [T("prod.gstRate")]: r.gst,
        [T("prod.minStock")]: r.minStock,
        [T("prod.openingStock")]: r.openingStock,
        [T("stk.purchased")]: r.purchased,
        [T("stk.sold")]: r.sold,
        [T("prod.stock")]: r.stock,
        [T("common.status")]: r.active === false ? T("badge.inactive") : T("badge.active")
      };
    });
    if (!list.length) { UI.warn(T("common.nothingToExport")); return; }
    U.exportExcel("SBT-Products", list, null, T("prod.masterTitle"));
    UI.success(T("prod.exported"));
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
