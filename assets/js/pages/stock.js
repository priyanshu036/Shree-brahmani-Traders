/* ==========================================================================
   SHREE BRAHMANI TRADERS — Stock
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
  let onlyLow = false;

  /* Enrich raw stock rows with rate + value */
  function enrich(item) {
    const rate = C.avgPurchaseRate(item.name);
    return Object.assign({}, item, {
      avgRate: U.round(rate, 2),
      stockValue: U.round(item.stock * rate)
    });
  }

  function allRows() {
    return C.stockList().map(enrich);
  }

  function rows() {
    let list = allRows();
    if (onlyLow) {
      list = list.filter(function (r) { return r.status === "low" || r.status === "out"; });
    }
    return UI.filterRows(list, search, ["name", "unit"]);
  }

  function render() {
    const list = rows();
    const all = allRows();
    const totalValue = U.sum(all, function (r) { return r.stockValue; });
    const lowCount = all.filter(function (r) { return r.status === "low" || r.status === "out"; }).length;

    return (
      App.pageHead(
        T("stk.title"),
        T("stk.subtitle"),
        '<button type="button" class="sbt-btn sbt-btn--outline" id="stkExport">' +
          '<i class="bi bi-file-earmark-excel"></i> ' + U.escape(T("common.export")) + '</button>' +
        '<button type="button" class="sbt-btn sbt-btn--accent" id="stkAdjust">' +
          '<i class="bi bi-sliders"></i> ' + U.escape(T("stk.adjustment")) + '</button>'
      ) +

      '<div class="sbt-kpi-grid">' +
        App.kpi({ label: T("stk.totalMaterials"), variant: "navy", icon: "bi-box-seam-fill", value: all.length }) +
        App.kpi({ label: T("stk.stockValue"), variant: "green", icon: "bi-currency-rupee",
          value: U.currency(totalValue) }) +
        App.kpi({ label: T("stk.lowStockItems"), variant: lowCount ? "red" : "green",
          icon: "bi-exclamation-triangle-fill", value: lowCount,
          meta: lowCount ? T("stk.needsRestocking") : T("stk.allHealthy") }) +
        App.kpi({ label: T("stk.totalSoldQty"), variant: "orange", icon: "bi-arrow-up-right-circle-fill",
          value: U.qty(U.sum(all, function (r) { return r.sold; })) }) +
      "</div>" +

      App.card({
        flush: true,
        body:
          '<div class="sbt-toolbar">' +
            '<div class="sbt-field sbt-field--grow">' +
              '<label for="stkSearch">' + U.escape(T("common.search")) + '</label>' +
              '<input type="search" class="sbt-input" id="stkSearch" placeholder="' +
                U.escape(T("stk.searchPlaceholder")) + '" value="' +
                U.escape(search) + '">' +
            "</div>" +
            '<div class="sbt-field" style="align-self:flex-end">' +
              '<label class="sbt-row" style="text-transform:none;letter-spacing:0;font-size:.82rem;' +
                'font-weight:600;cursor:pointer;gap:.45rem;padding-bottom:.55rem">' +
                '<input type="checkbox" id="stkLow"' + (onlyLow ? " checked" : "") +
                  ' style="width:16px;height:16px;accent-color:var(--sbt-navy-600)">' +
                "<span>" + U.escape(T("stk.lowStockOnly")) + "</span>" +
              "</label>" +
            "</div>" +
          "</div>" +
          UI.table({
            columns: [
              { label: U.escape(T("common.material")), render: function (r) {
                return '<div class="sbt-strong">' + U.escape(r.name) + "</div>" +
                  '<div class="sbt-muted" style="font-size:.72rem">' + U.escape(U.tv(r.unit)) + "</div>";
              }},
              { label: U.escape(T("stk.purchased")), align: "right", render: function (r) { return U.qty(r.purchased); } },
              { label: U.escape(T("stk.sold")), align: "right", render: function (r) { return U.qty(r.sold); } },
              { label: U.escape(T("stk.adjusted")), align: "right", render: function (r) {
                if (!r.adjusted) return '<span class="sbt-muted">—</span>';
                return '<span class="' + (r.adjusted > 0 ? "sbt-text-success" : "sbt-text-danger") + '">' +
                  (r.adjusted > 0 ? "+" : "") + U.qty(r.adjusted) + "</span>";
              }},
              { label: U.escape(T("stk.inStock")), align: "right", render: function (r) {
                return '<span class="sbt-strong" style="font-size:.95rem">' + U.qty(r.stock) + "</span>" +
                  ' <span class="sbt-muted" style="font-size:.72rem">' + U.escape(U.tv(r.unit)) + "</span>";
              }},
              { label: U.escape(T("stk.minLevel")), align: "right", render: function (r) { return U.qty(r.minStock); } },
              { label: U.escape(T("stk.avgRate")), align: "right", render: function (r) { return U.currency(r.avgRate); } },
              { label: U.escape(T("stk.value")), align: "right", render: function (r) {
                return "<strong>" + U.currency(r.stockValue) + "</strong>";
              }},
              { label: U.escape(T("common.status")), render: function (r) { return U.stockBadge(r.stock, r.minStock); } },
              { label: U.escape(T("common.actions")), className: "actions", render: function (r) {
                return '<button type="button" class="sbt-btn sbt-btn--sm sbt-btn--ghost" data-history="' +
                    U.escape(r.name) + '" title="' + U.escape(T("stk.movementHistory")) + '"><i class="bi bi-clock-history"></i></button>' +
                  '<button type="button" class="sbt-btn sbt-btn--sm sbt-btn--ghost" data-adjust="' +
                    U.escape(r.name) + '" title="' + U.escape(T("stk.adjust")) + '"><i class="bi bi-sliders"></i></button>';
              }}
            ],
            rows: list,
            footer: list.length ?
              "<tr><td colspan='7'>" + U.escape(T("stk.totalStockValue")) + "</td>" +
              '<td class="num">' + U.currency(U.sum(list, function (r) { return r.stockValue; })) + "</td>" +
              "<td colspan='2'></td></tr>" : "",
            empty: { icon: "bi-box-seam", title: T("stk.noStockRecords"), message: T("stk.noStockRecordsMsg") }
          })
      })
    );
  }

  function openHistory(productName) {
    const history = C.stockHistory(productName);
    const found = C.stockList().find(function (r) { return r.name === productName; }) ||
      { name: productName, unit: "", stock: 0, purchased: 0, sold: 0, minStock: 0, opening: 0 };

    /* Running balance computed oldest → newest, then displayed newest first */
    const ordered = history.slice().reverse();
    let running = U.num(found.opening);
    ordered.forEach(function (h) {
      running += U.num(h.qty);
      h.balance = U.round(running, 3);
    });
    ordered.reverse();

    const rowsHtml = ordered.map(function (h) {
      const isIn = U.num(h.qty) >= 0;
      return "<tr>" +
        "<td>" + U.formatDate(h.date) + "</td>" +
        "<td>" + U.escape(U.tv(h.type)) + "</td>" +
        '<td class="sbt-muted" style="font-size:.78rem">' + U.escape(h.party || "—") + "</td>" +
        '<td class="num ' + (isIn ? "sbt-text-success" : "sbt-text-danger") + '">' +
          (isIn ? "+" : "−") + U.qty(Math.abs(U.num(h.qty))) + "</td>" +
        '<td class="num sbt-strong">' + U.qty(h.balance) + "</td>" +
        "</tr>";
    }).join("");

    UI.modal({
      title: T("stk.movementTitle", { name: productName }),
      subtitle: T("stk.movementSubtitle"),
      size: "lg",
      body:
        '<div class="sbt-kpi-grid" style="margin-bottom:1rem">' +
          App.kpi({ label: T("stk.currentStock"), variant: "navy", icon: "bi-box-seam-fill",
            value: U.qty(found.stock) + " " + U.escape(U.tv(found.unit) || "") }) +
          App.kpi({ label: T("stk.purchased"), variant: "green", icon: "bi-arrow-down-circle-fill",
            value: U.qty(found.purchased) }) +
          App.kpi({ label: T("stk.sold"), variant: "orange", icon: "bi-arrow-up-circle-fill",
            value: U.qty(found.sold) }) +
        "</div>" +
        (ordered.length ?
          '<div class="sbt-table-wrap"><table class="sbt-table sbt-table--compact">' +
            "<thead><tr><th>" + U.escape(T("common.date")) + "</th><th>" + U.escape(T("common.type")) +
            "</th><th>" + U.escape(T("stk.partyReason")) + "</th>" +
            '<th class="num">' + U.escape(T("stk.qty")) + "</th>" +
            '<th class="num">' + U.escape(T("stk.balance")) + "</th></tr></thead>" +
            "<tbody>" + rowsHtml + "</tbody></table></div>"
          : UI.emptyState("bi-clock-history", T("stk.noMovements"), T("stk.noMovementsMsg"))),
      footer:
        '<button type="button" class="sbt-btn sbt-btn--outline" data-act="close">' +
          U.escape(T("common.close")) + '</button>' +
        '<button type="button" class="sbt-btn sbt-btn--primary" data-act="print">' +
          '<i class="bi bi-printer"></i> ' + U.escape(T("common.print")) + '</button>',
      onOpen: function (m) {
        m.$('[data-act="close"]').addEventListener("click", m.close);
        m.$('[data-act="print"]').addEventListener("click", function () { window.print(); });
      }
    });
  }

  function openAdjust(productName) {
    const info = productName
      ? C.stockList().find(function (r) { return r.name === productName; })
      : null;

    const modal = UI.modal({
      title: T("stk.adjustment"),
      subtitle: T("stk.adjustmentSubtitle"),
      size: "sm",
      body:
        '<form id="stkForm" novalidate>' +
          UI.formGrid([
            { label: T("stk.adjustmentDate"), name: "date", type: "date", required: true, value: U.today() },
            { label: T("common.material"), name: "materialName", type: "select", required: true,
              value: info ? info.name : "", options: [] },
            { label: T("stk.direction"), name: "direction", type: "select", required: true, value: "decrease",
              options: [
                { value: "increase", label: T("stk.increase") },
                { value: "decrease", label: T("stk.decrease") }
              ] },
            { label: T("common.quantity"), name: "quantity", type: "number", step: "0.001", min: 0.001,
              required: true, placeholder: "0" },
            { label: T("stk.reason"), name: "reason", type: "select", required: true, value: "Wastage",
              options: ["Wastage", "Damage", "Physical Count Correction", "Return to Supplier",
                "Sample / Free Issue", "Other"].map(function (r) {
                  return { value: r, label: U.tv(r) };
                }) },
            { label: T("common.notes"), name: "notes", type: "textarea", full: true,
              placeholder: T("sales.notesPlaceholder") }
          ]) +
          '<p class="sbt-help" style="margin-top:.6rem" id="stkCurrent"></p>' +
        "</form>",
      footer:
        '<button type="button" class="sbt-btn sbt-btn--outline" data-act="cancel">' +
          U.escape(T("common.cancel")) + '</button>' +
        '<button type="button" class="sbt-btn sbt-btn--accent" data-act="save">' +
          '<i class="bi bi-check-lg"></i> ' + U.escape(T("stk.saveAdjustment")) + '</button>',
      onOpen: function (m) {
        const form = m.$("#stkForm");
        const matSel = form.querySelector('[name="materialName"]');
        const dirSel = form.querySelector('[name="direction"]');
        const qtyEl = form.querySelector('[name="quantity"]');
        const currentEl = m.$("#stkCurrent");

        matSel.innerHTML = App.productOptions(true);
        if (info) matSel.value = info.name;

        function updateCurrent() {
          const found = C.stockList().find(function (x) { return x.name === matSel.value; });
          const stock = found ? U.num(found.stock) : 0;
          const unit = found ? U.tv(found.unit) : "";
          const qty = U.num(qtyEl.value);
          const after = dirSel.value === "increase" ? stock + qty : stock - qty;
          currentEl.innerHTML = matSel.value
            ? T("stk.currentStockLabel", { qty: U.qty(stock), unit: U.escape(unit) }) +
              (qty ? T("stk.afterAdjustment", { qty: U.qty(after), unit: U.escape(unit) }) : "")
            : U.escape(T("stk.selectMaterialHint"));
        }

        matSel.addEventListener("change", updateCurrent);
        dirSel.addEventListener("change", updateCurrent);
        qtyEl.addEventListener("input", updateCurrent);
        updateCurrent();

        m.$('[data-act="cancel"]').addEventListener("click", m.close);
        m.$('[data-act="save"]').addEventListener("click", function () {
          const data = UI.readForm(form);
          const errors = U.validate({
            date: { value: data.date, label: T("stk.dateLabel"), required: true, type: "date" },
            materialName: { value: data.materialName, label: T("stk.materialLabel"), required: true },
            quantity: { value: data.quantity, label: T("stk.quantityLabel"), required: true,
              type: "number", min: 0.001, max: 1000000000 }
          });

          if (!errors.materialName && !C.stockList().some(function (x) { return x.name === data.materialName; })) {
            errors.materialName = T("stk.materialNotFound");
          }

          if (!errors.quantity && data.direction === "decrease") {
            const stock = C.stockOf(data.materialName);
            if (U.num(data.quantity) > stock + 0.0001) {
              errors.quantity = T("stk.cannotReduce", { qty: U.qty(stock) });
            }
          }

          if (!UI.showErrors(form, errors)) return;

          const qty = U.num(data.quantity) * (data.direction === "increase" ? 1 : -1);
          const found = C.stockList().find(function (x) { return x.name === data.materialName; });

          SBT.store.insert("adjustments", {
            date: data.date,
            materialName: data.materialName,
            quantity: qty,
            unit: found ? found.unit : "",
            reason: data.reason,
            notes: data.notes
          });

          UI.success(T("stk.adjustedSuccess"));
          m.close();
          refresh();
        });
      }
    });
  }

  function exportData() {
    const list = rows().map(function (r) {
      return {
        [T("common.material")]: r.name,
        [T("common.unit")]: U.tv(r.unit),
        [T("stk.purchased")]: r.purchased,
        [T("stk.sold")]: r.sold,
        [T("stk.adjusted")]: r.adjusted,
        [T("stk.inStock")]: r.stock,
        [T("stk.minLevel")]: r.minStock,
        [T("stk.avgRate")]: r.avgRate,
        [T("stk.stockValue")]: r.stockValue,
        [T("common.status")]: r.status === "out" ? T("badge.outOfStock")
          : (r.status === "low" ? T("badge.lowStock") : T("badge.inStock"))
      };
    });
    if (!list.length) { UI.warn(T("common.nothingToExport")); return; }
    U.exportExcel("SBT-Stock", list, null, T("stk.title"));
    UI.success(T("stk.exported"));
  }

  function mount() {
    const adjustBtn = document.getElementById("stkAdjust");
    if (adjustBtn) adjustBtn.addEventListener("click", function () { openAdjust(null); });

    const exportBtn = document.getElementById("stkExport");
    if (exportBtn) exportBtn.addEventListener("click", exportData);

    const searchEl = document.getElementById("stkSearch");
    if (searchEl) {
      searchEl.addEventListener("input", U.debounce(function () {
        search = searchEl.value;
        refresh();
        const el = document.getElementById("stkSearch");
        if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
      }, 220));
    }

    const lowEl = document.getElementById("stkLow");
    if (lowEl) lowEl.addEventListener("change", function () {
      onlyLow = lowEl.checked;
      refresh();
    });

    const content = document.getElementById("sbtContent");
    U.on(content, "click", "[data-history]", function (e, el) { openHistory(el.dataset.history); });
    U.on(content, "click", "[data-adjust]", function (e, el) { openAdjust(el.dataset.adjust); });
  }

  function refresh() {
    const content = document.getElementById("sbtContent");
    if (!content) return;
    content.innerHTML = render();
    mount();
  }

  App.stock = { render: render, mount: mount, refresh: refresh };
})(window);
