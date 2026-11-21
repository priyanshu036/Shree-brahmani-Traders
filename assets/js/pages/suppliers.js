/* ==========================================================================
   SHREE BRAHMANI TRADERS — Suppliers
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
    const summary = C.supplierSummary();
    const masters = SBT.store.list("suppliers");

    /* Merge master details into summary */
    const list = Object.keys(summary).map(function (name) {
      const s = summary[name];
      const master = masters.find(function (m) { return m.name === name; }) || {};
      return Object.assign({}, s, {
        id: master.id || "",
        address: master.address || "",
        gstin: master.gstin || "",
        notes: master.notes || ""
      });
    });

    return U.sortBy(list, "totalPurchase", true);
  }

  function filtered() {
    return UI.filterRows(rows(), search, ["name", "mobile", "address", "gstin"]);
  }

  function render() {
    const list = filtered();
    const all = rows();
    const totalPurchase = U.sum(all, function (s) { return s.totalPurchase; });
    const totalPaid = U.sum(all, function (s) { return s.totalPaid; });
    const totalBalance = U.sum(all, function (s) { return s.balance; });

    return (
      App.pageHead(
        T("sup.title"),
        T("sup.subtitle"),
        '<button type="button" class="sbt-btn sbt-btn--outline" id="supExport">' +
          '<i class="bi bi-file-earmark-excel"></i> ' + U.escape(T("common.export")) + '</button>' +
        '<button type="button" class="sbt-btn sbt-btn--accent" id="supAdd">' +
          '<i class="bi bi-plus-lg"></i> ' + U.escape(T("sup.addSupplier")) + '</button>'
      ) +

      '<div class="sbt-kpi-grid">' +
        App.kpi({ label: T("sup.totalSuppliers"), variant: "navy", icon: "bi-truck", value: all.length }) +
        App.kpi({ label: T("sup.totalPurchases"), variant: "orange", icon: "bi-cart-plus-fill",
          value: U.currency(totalPurchase) }) +
        App.kpi({ label: T("sup.totalPaid"), variant: "green", icon: "bi-check-circle-fill",
          value: U.currency(totalPaid) }) +
        App.kpi({ label: T("sup.outstanding"), variant: "red", icon: "bi-exclamation-circle-fill",
          value: U.currency(totalBalance) }) +
      "</div>" +

      App.card({
        flush: true,
        body:
          '<div class="sbt-toolbar">' +
            '<div class="sbt-field sbt-field--grow">' +
              '<label for="supSearch">' + U.escape(T("common.search")) + '</label>' +
              '<input type="search" class="sbt-input" id="supSearch" placeholder="' +
                U.escape(T("sup.searchPlaceholder")) + '" value="' +
                U.escape(search) + '">' +
            "</div>" +
            '<div class="sbt-toolbar__spacer"></div>' +
            '<span class="sbt-muted" style="font-size:.78rem">' +
              U.escape(T("sup.count", { count: list.length })) + "</span>" +
          "</div>" +
          UI.table({
            columns: [
              { label: U.escape(T("common.supplier")), render: function (r) { return UI.partyCell(r.name, r.mobile); } },
              { label: U.escape(T("common.gstin")), render: function (r) {
                return r.gstin ? '<span class="sbt-mono" style="font-size:.76rem">' + U.escape(r.gstin) + "</span>"
                  : '<span class="sbt-muted">—</span>';
              }},
              { label: U.escape(T("sup.entries")), align: "right", render: function (r) { return r.entries; } },
              { label: U.escape(T("sup.totalPurchase")), align: "right", render: function (r) {
                return "<strong>" + U.currency(r.totalPurchase) + "</strong>";
              }},
              { label: U.escape(T("sup.totalPaid")), align: "right", render: function (r) { return U.currency(r.totalPaid); } },
              { label: U.escape(T("common.balance")), align: "right", render: function (r) {
                return r.balance > 0
                  ? '<span class="sbt-text-danger sbt-strong">' + U.currency(r.balance) + "</span>"
                  : '<span class="sbt-text-success sbt-strong">' + U.escape(T("badge.settled")) + "</span>";
              }},
              { label: U.escape(T("common.actions")), className: "actions", render: function (r) {
                return '<button type="button" class="sbt-btn sbt-btn--sm sbt-btn--ghost" data-ledger="' +
                    U.escape(r.name) + '" title="' + U.escape(T("sup.ledgerBtn")) + '"><i class="bi bi-journal-text"></i></button>' +
                  '<button type="button" class="sbt-btn sbt-btn--sm sbt-btn--ghost" data-pay="' +
                    U.escape(r.name) + '" title="' + U.escape(T("sup.recordPayment")) + '"><i class="bi bi-cash-coin"></i></button>' +
                  '<button type="button" class="sbt-btn sbt-btn--sm sbt-btn--ghost" data-edit="' +
                    U.escape(r.name) + '" title="' + U.escape(T("common.edit")) + '"><i class="bi bi-pencil"></i></button>' +
                  (r.id ? '<button type="button" class="sbt-btn sbt-btn--sm sbt-btn--ghost" data-del="' +
                    r.id + '" title="' + U.escape(T("common.delete")) + '"><i class="bi bi-trash3"></i></button>' : "");
              }}
            ],
            rows: list,
            empty: { icon: "bi-truck", title: T("sup.noSuppliersYet"), message: T("sup.noSuppliersYetMsg") }
          })
      })
    );
  }

  function openForm(name) {
    const existing = name ? SBT.store.list("suppliers").find(function (s) { return s.name === name; }) : null;
    const summary = name ? C.supplierSummary()[name] : null;
    const s = existing || { name: name || "", mobile: summary ? summary.mobile : "" };

    const modal = UI.modal({
      title: existing ? T("sup.editSupplier") : T("sup.addSupplierTitle"),
      subtitle: T("sup.formSubtitle"),
      body:
        '<form id="supForm" novalidate>' +
          UI.formGrid([
            { label: T("sup.supplierName"), name: "name", required: true, value: s.name, full: true,
              placeholder: T("sup.namePlaceholder") },
            { label: T("common.mobile"), name: "mobile", value: s.mobile,
              placeholder: T("common.mobilePlaceholder"), inputmode: "numeric" },
            { label: T("common.gstin"), name: "gstin", value: s.gstin, placeholder: T("sup.gstPlaceholder") },
            { label: T("common.address"), name: "address", type: "textarea", value: s.address, full: true,
              placeholder: T("sup.addressPlaceholder") },
            { label: T("common.notes"), name: "notes", type: "textarea", value: s.notes, full: true,
              placeholder: T("sales.notesPlaceholder") }
          ]) +
        "</form>",
      footer:
        '<button type="button" class="sbt-btn sbt-btn--outline" data-act="cancel">' +
          U.escape(T("common.cancel")) + '</button>' +
        '<button type="button" class="sbt-btn sbt-btn--accent" data-act="save">' +
          '<i class="bi bi-check-lg"></i> ' +
          U.escape(existing ? T("sup.updateSupplier") : T("sup.saveSupplier")) + "</button>",
      onOpen: function (m) {
        const form = m.$("#supForm");
        m.$('[data-act="cancel"]').addEventListener("click", m.close);
        m.$('[data-act="save"]').addEventListener("click", function () {
          const data = UI.readForm(form);
          const errors = U.validate({
            name: { value: data.name, label: T("sup.supplierNameLabel"), required: true, minLength: 2, maxLength: 120 },
            mobile: { value: data.mobile, label: T("sup.mobileLabel"), mobile: true },
            gstin: { value: data.gstin, label: T("sup.gstLabel"), gst: true }
          });

          if (!errors.name) {
            const wanted = String(data.name).trim().toLowerCase();
            const dup = SBT.store.list("suppliers").find(function (x) {
              return String(x.name || "").trim().toLowerCase() === wanted &&
                x.id !== (existing ? existing.id : "");
            });
            if (dup) errors.name = T("sup.duplicate");
          }

          if (!UI.showErrors(form, errors)) return;

          const payload = {
            name: data.name,
            mobile: data.mobile,
            gstin: data.gstin ? data.gstin.toUpperCase() : "",
            address: data.address,
            notes: data.notes
          };

          if (existing) {
            SBT.store.update("suppliers", existing.id, payload);
            UI.success(T("sup.supplierUpdated"));
          } else {
            SBT.store.insert("suppliers", payload);
            UI.success(T("sup.supplierAdded"));
          }
          m.close();
          refresh();
        });
      }
    });
  }

  function openLedger(name) {
    const ledger = C.supplierLedger(name);
    const summary = C.supplierSummary()[name] || {};

    const rowsHtml = ledger.map(function (r) {
      return "<tr>" +
        "<td>" + U.formatDate(r.date) + "</td>" +
        "<td>" + U.escape(U.tv(r.type)) + "</td>" +
        '<td class="sbt-muted" style="font-size:.78rem">' + U.escape(r.description) + "</td>" +
        '<td class="num">' + (r.credit ? U.currency(r.credit) : "—") + "</td>" +
        '<td class="num">' + (r.debit ? U.currency(r.debit) : "—") + "</td>" +
        '<td class="num sbt-strong">' + U.currency(r.balance) + "</td>" +
        "</tr>";
    }).join("");

    UI.modal({
      title: T("sup.ledger", { name: name }),
      subtitle: T("sup.ledgerSubtitle"),
      size: "lg",
      body:
        '<div class="sbt-kpi-grid" style="margin-bottom:1rem">' +
          App.kpi({ label: T("sup.totalPurchase"), variant: "navy", icon: "bi-cart-plus-fill",
            value: U.currency(summary.totalPurchase || 0) }) +
          App.kpi({ label: T("sup.totalPaid"), variant: "green", icon: "bi-check-circle-fill",
            value: U.currency(summary.totalPaid || 0) }) +
          App.kpi({ label: T("sup.balanceDue"), variant: "red", icon: "bi-exclamation-circle-fill",
            value: U.currency(summary.balance || 0) }) +
        "</div>" +
        (ledger.length ?
          '<div class="sbt-table-wrap"><table class="sbt-table sbt-table--compact">' +
            "<thead><tr><th>" + U.escape(T("common.date")) + "</th><th>" + U.escape(T("common.type")) +
            "</th><th>" + U.escape(T("common.description")) + "</th>" +
            '<th class="num">' + U.escape(T("common.paid")) + "</th>" +
            '<th class="num">' + U.escape(T("common.purchase")) + "</th>" +
            '<th class="num">' + U.escape(T("common.balance")) + "</th></tr></thead>" +
            "<tbody>" + rowsHtml + "</tbody></table></div>"
          : UI.emptyState("bi-journal", T("sup.noTransactions"), T("sup.noTransactionsMsg"))),
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

  function openPayment(name) {
    const summary = C.supplierSummary()[name] || {};
    const balance = U.num(summary.balance);

    const modal = UI.modal({
      title: T("sup.recordPayment"),
      subtitle: T("sup.recordPaymentSubtitle", { name: name }),
      size: "sm",
      body:
        '<form id="supPayForm" novalidate>' +
          UI.formGrid([
            { label: T("pay.paymentDate"), name: "date", type: "date", required: true, value: U.today() },
            { label: T("common.amount"), name: "amount", type: "number", step: "0.01", min: 0.01,
              required: true, value: balance > 0 ? U.round(balance, 2) : "",
              prefix: SBT.store.settings.currency || "₹" },
            { label: T("exp.paymentMode"), name: "mode", type: "select", required: true,
              value: "Cash", options: SBT.config.paymentModes },
            { label: T("common.reference"), name: "reference", placeholder: T("pay.referencePlaceholder") },
            { label: T("common.notes"), name: "notes", type: "textarea", full: true,
              placeholder: T("sales.notesPlaceholder") }
          ]) +
          '<p class="sbt-help" style="margin-top:.6rem">' +
            T("sup.outstandingBalance", { amount: U.currency(balance) }) + "</p>" +
        "</form>",
      footer:
        '<button type="button" class="sbt-btn sbt-btn--outline" data-act="cancel">' +
          U.escape(T("common.cancel")) + '</button>' +
        '<button type="button" class="sbt-btn sbt-btn--success" data-act="save">' +
          '<i class="bi bi-check-lg"></i> ' + U.escape(T("sup.recordPayment")) + '</button>',
      onOpen: function (m) {
        const form = m.$("#supPayForm");
        m.$('[data-act="cancel"]').addEventListener("click", m.close);
        m.$('[data-act="save"]').addEventListener("click", function () {
          const data = UI.readForm(form);
          const errors = U.validate({
            date: { value: data.date, label: T("pay.paymentDateLabel"), required: true, type: "date" },
            amount: { value: data.amount, label: T("pay.amountLabel"), required: true, type: "number", min: 0.01 }
          });
          if (!UI.showErrors(form, errors)) return;

          SBT.store.insert("payments", {
            date: data.date,
            partyType: "Supplier",
            partyName: name,
            mobile: summary.mobile || "",
            amount: U.num(data.amount),
            mode: data.mode,
            reference: data.reference,
            notes: data.notes,
            direction: "out"
          });

          UI.success(T("pay.paymentRecorded"));
          m.close();
          refresh();
        });
      }
    });
  }

  async function remove(id) {
    const s = SBT.store.get("suppliers", id);
    if (!s) return;
    const ok = await UI.confirm({
      title: T("sup.deleteSupplier"),
      message: T("sup.deleteMessage", { name: s.name }),
      confirmText: T("sup.deleteSupplier")
    });
    if (!ok) return;
    SBT.store.remove("suppliers", id);
    UI.success(T("sup.supplierDeleted"));
    refresh();
  }

  function exportData() {
    const list = rows().map(function (r) {
      return {
        [T("common.supplier")]: r.name,
        [T("common.mobile")]: r.mobile,
        [T("common.gstin")]: r.gstin,
        [T("common.address")]: r.address,
        [T("sup.entries")]: r.entries,
        [T("sup.totalPurchase")]: r.totalPurchase,
        [T("sup.totalPaid")]: r.totalPaid,
        [T("common.balance")]: r.balance
      };
    });
    if (!list.length) { UI.warn(T("common.nothingToExport")); return; }
    U.exportExcel("SBT-Suppliers", list, null, T("sup.masterTitle"));
    UI.success(T("sup.exported"));
  }

  function mount() {
    const addBtn = document.getElementById("supAdd");
    if (addBtn) addBtn.addEventListener("click", function () { openForm(null); });

    const exportBtn = document.getElementById("supExport");
    if (exportBtn) exportBtn.addEventListener("click", exportData);

    const searchEl = document.getElementById("supSearch");
    if (searchEl) {
      searchEl.addEventListener("input", U.debounce(function () {
        search = searchEl.value;
        refresh();
        const el = document.getElementById("supSearch");
        if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
      }, 220));
    }

    const content = document.getElementById("sbtContent");
    U.on(content, "click", "[data-edit]", function (e, el) { openForm(el.dataset.edit); });
    U.on(content, "click", "[data-ledger]", function (e, el) { openLedger(el.dataset.ledger); });
    U.on(content, "click", "[data-pay]", function (e, el) { openPayment(el.dataset.pay); });
    U.on(content, "click", "[data-del]", function (e, el) { remove(el.dataset.del); });
  }

  function refresh() {
    const content = document.getElementById("sbtContent");
    if (!content) return;
    content.innerHTML = render();
    mount();
  }

  App.suppliers = { render: render, mount: mount, refresh: refresh };
})(window);
