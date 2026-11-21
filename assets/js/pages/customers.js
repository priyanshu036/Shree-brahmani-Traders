/* ==========================================================================
   SHREE BRAHMANI TRADERS — Customers
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
    const summary = C.customerSummary();
    const masters = SBT.store.list("customers");

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

    return U.sortBy(list, "totalSales", true);
  }

  function filtered() {
    return UI.filterRows(rows(), search, ["name", "mobile", "address", "gstin"]);
  }

  function render() {
    const list = filtered();
    const all = rows();
    const totalSales = U.sum(all, function (c) { return c.totalSales; });
    const totalPaid = U.sum(all, function (c) { return c.totalPaid; });
    const totalPending = U.sum(all, function (c) { return c.pending; });

    return (
      App.pageHead(
        T("cus.title"),
        T("cus.subtitle"),
        '<button type="button" class="sbt-btn sbt-btn--outline" id="cusExport">' +
          '<i class="bi bi-file-earmark-excel"></i> ' + U.escape(T("common.export")) + '</button>' +
        '<button type="button" class="sbt-btn sbt-btn--accent" id="cusAdd">' +
          '<i class="bi bi-plus-lg"></i> ' + U.escape(T("cus.addCustomer")) + '</button>'
      ) +

      '<div class="sbt-kpi-grid">' +
        App.kpi({ label: T("cus.totalCustomers"), variant: "navy", icon: "bi-people-fill", value: all.length }) +
        App.kpi({ label: T("cus.totalSales"), variant: "orange", icon: "bi-receipt-cutoff",
          value: U.currency(totalSales) }) +
        App.kpi({ label: T("cus.totalReceived"), variant: "green", icon: "bi-check-circle-fill",
          value: U.currency(totalPaid) }) +
        App.kpi({ label: T("cus.pendingAmount"), variant: "red", icon: "bi-exclamation-circle-fill",
          value: U.currency(totalPending) }) +
      "</div>" +

      App.card({
        flush: true,
        body:
          '<div class="sbt-toolbar">' +
            '<div class="sbt-field sbt-field--grow">' +
              '<label for="cusSearch">' + U.escape(T("common.search")) + '</label>' +
              '<input type="search" class="sbt-input" id="cusSearch" placeholder="' +
                U.escape(T("cus.searchPlaceholder")) + '" value="' +
                U.escape(search) + '">' +
            "</div>" +
            '<div class="sbt-toolbar__spacer"></div>' +
            '<span class="sbt-muted" style="font-size:.78rem">' +
              U.escape(T("cus.count", { count: list.length })) + "</span>" +
          "</div>" +
          UI.table({
            columns: [
              { label: U.escape(T("common.customer")), render: function (r) { return UI.partyCell(r.name, r.mobile); } },
              { label: U.escape(T("common.gstin")), render: function (r) {
                return r.gstin ? '<span class="sbt-mono" style="font-size:.76rem">' + U.escape(r.gstin) + "</span>"
                  : '<span class="sbt-muted">—</span>';
              }},
              { label: U.escape(T("cus.invoices")), align: "right", render: function (r) { return r.entries; } },
              { label: U.escape(T("cus.totalSales")), align: "right", render: function (r) {
                return "<strong>" + U.currency(r.totalSales) + "</strong>";
              }},
              { label: U.escape(T("cus.totalPaid")), align: "right", render: function (r) { return U.currency(r.totalPaid); } },
              { label: U.escape(T("cus.pending")), align: "right", render: function (r) {
                return r.pending > 0
                  ? '<span class="sbt-text-danger sbt-strong">' + U.currency(r.pending) + "</span>"
                  : '<span class="sbt-text-success sbt-strong">' + U.escape(T("badge.settled")) + "</span>";
              }},
              { label: U.escape(T("common.actions")), className: "actions", render: function (r) {
                return '<button type="button" class="sbt-btn sbt-btn--sm sbt-btn--ghost" data-ledger="' +
                    U.escape(r.name) + '" title="' + U.escape(T("cus.ledgerBtn")) + '"><i class="bi bi-journal-text"></i></button>' +
                  '<button type="button" class="sbt-btn sbt-btn--sm sbt-btn--ghost" data-receive="' +
                    U.escape(r.name) + '" title="' + U.escape(T("cus.receivePayment")) + '"><i class="bi bi-cash-coin"></i></button>' +
                  '<button type="button" class="sbt-btn sbt-btn--sm sbt-btn--ghost" data-edit="' +
                    U.escape(r.name) + '" title="' + U.escape(T("common.edit")) + '"><i class="bi bi-pencil"></i></button>' +
                  (r.id ? '<button type="button" class="sbt-btn sbt-btn--sm sbt-btn--ghost" data-del="' +
                    r.id + '" title="' + U.escape(T("common.delete")) + '"><i class="bi bi-trash3"></i></button>' : "");
              }}
            ],
            rows: list,
            empty: { icon: "bi-people", title: T("cus.noCustomersYet"), message: T("cus.noCustomersYetMsg") }
          })
      })
    );
  }

  function openForm(name) {
    const existing = name ? SBT.store.list("customers").find(function (c) { return c.name === name; }) : null;
    const summary = name ? C.customerSummary()[name] : null;
    const c = existing || { name: name || "", mobile: summary ? summary.mobile : "" };

    const modal = UI.modal({
      title: existing ? T("cus.editCustomer") : T("cus.addCustomerTitle"),
      subtitle: T("cus.formSubtitle"),
      body:
        '<form id="cusForm" novalidate>' +
          UI.formGrid([
            { label: T("cus.customerName"), name: "name", required: true, value: c.name, full: true,
              placeholder: T("sup.namePlaceholder") },
            { label: T("common.mobile"), name: "mobile", value: c.mobile,
              placeholder: T("common.mobilePlaceholder"), inputmode: "numeric" },
            { label: T("common.gstin"), name: "gstin", value: c.gstin, placeholder: T("sup.gstPlaceholder") },
            { label: T("common.address"), name: "address", type: "textarea", value: c.address, full: true,
              placeholder: T("sup.addressPlaceholder") },
            { label: T("common.notes"), name: "notes", type: "textarea", value: c.notes, full: true,
              placeholder: T("sales.notesPlaceholder") }
          ]) +
        "</form>",
      footer:
        '<button type="button" class="sbt-btn sbt-btn--outline" data-act="cancel">' +
          U.escape(T("common.cancel")) + '</button>' +
        '<button type="button" class="sbt-btn sbt-btn--accent" data-act="save">' +
          '<i class="bi bi-check-lg"></i> ' +
          U.escape(existing ? T("cus.updateCustomer") : T("cus.saveCustomer")) + "</button>",
      onOpen: function (m) {
        const form = m.$("#cusForm");
        m.$('[data-act="cancel"]').addEventListener("click", m.close);
        m.$('[data-act="save"]').addEventListener("click", function () {
          const data = UI.readForm(form);
          const errors = U.validate({
            name: { value: data.name, label: T("cus.customerNameLabel"), required: true, minLength: 2, maxLength: 120 },
            mobile: { value: data.mobile, label: T("cus.mobileLabel"), mobile: true },
            gstin: { value: data.gstin, label: T("cus.gstLabel"), gst: true }
          });

          if (!errors.name) {
            const wanted = String(data.name).trim().toLowerCase();
            const dup = SBT.store.list("customers").find(function (x) {
              return String(x.name || "").trim().toLowerCase() === wanted &&
                x.id !== (existing ? existing.id : "");
            });
            if (dup) errors.name = T("cus.duplicate");
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
            SBT.store.update("customers", existing.id, payload);
            UI.success(T("cus.customerUpdated"));
          } else {
            SBT.store.insert("customers", payload);
            UI.success(T("cus.customerAdded"));
          }
          m.close();
          refresh();
        });
      }
    });
  }

  function openLedger(name) {
    const ledger = C.customerLedger(name);
    const summary = C.customerSummary()[name] || {};

    const rowsHtml = ledger.map(function (r) {
      return "<tr>" +
        "<td>" + U.formatDate(r.date) + "</td>" +
        "<td>" + U.escape(U.tv(r.type)) + "</td>" +
        '<td class="sbt-muted" style="font-size:.78rem">' + U.escape(r.description) + "</td>" +
        '<td class="num">' + (r.debit ? U.currency(r.debit) : "—") + "</td>" +
        '<td class="num">' + (r.credit ? U.currency(r.credit) : "—") + "</td>" +
        '<td class="num sbt-strong">' + U.currency(r.balance) + "</td>" +
        "</tr>";
    }).join("");

    UI.modal({
      title: T("cus.ledger", { name: name }),
      subtitle: T("cus.ledgerSubtitle"),
      size: "lg",
      body:
        '<div class="sbt-kpi-grid" style="margin-bottom:1rem">' +
          App.kpi({ label: T("cus.totalSales"), variant: "navy", icon: "bi-receipt-cutoff",
            value: U.currency(summary.totalSales || 0) }) +
          App.kpi({ label: T("cus.totalReceived"), variant: "green", icon: "bi-check-circle-fill",
            value: U.currency(summary.totalPaid || 0) }) +
          App.kpi({ label: T("cus.pending"), variant: "red", icon: "bi-exclamation-circle-fill",
            value: U.currency(summary.pending || 0) }) +
        "</div>" +
        (ledger.length ?
          '<div class="sbt-table-wrap"><table class="sbt-table sbt-table--compact">' +
            "<thead><tr><th>" + U.escape(T("common.date")) + "</th><th>" + U.escape(T("common.type")) +
            "</th><th>" + U.escape(T("common.description")) + "</th>" +
            '<th class="num">' + U.escape(T("common.sale")) + "</th>" +
            '<th class="num">' + U.escape(T("common.received")) + "</th>" +
            '<th class="num">' + U.escape(T("common.balance")) + "</th></tr></thead>" +
            "<tbody>" + rowsHtml + "</tbody></table></div>"
          : UI.emptyState("bi-journal", T("cus.noTransactions"), T("cus.noTransactionsMsg"))),
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

  function openReceipt(name) {
    const summary = C.customerSummary()[name] || {};
    const pending = U.num(summary.pending);

    const modal = UI.modal({
      title: T("cus.receivePayment"),
      subtitle: T("cus.receivePaymentSubtitle", { name: name }),
      size: "sm",
      body:
        '<form id="cusPayForm" novalidate>' +
          UI.formGrid([
            { label: T("cus.receiptDate"), name: "date", type: "date", required: true, value: U.today() },
            { label: T("common.amount"), name: "amount", type: "number", step: "0.01", min: 0.01,
              required: true, value: pending > 0 ? U.round(pending, 2) : "",
              prefix: SBT.store.settings.currency || "₹" },
            { label: T("exp.paymentMode"), name: "mode", type: "select", required: true,
              value: "Cash", options: SBT.config.paymentModes },
            { label: T("common.reference"), name: "reference", placeholder: T("pay.referencePlaceholder") },
            { label: T("common.notes"), name: "notes", type: "textarea", full: true,
              placeholder: T("sales.notesPlaceholder") }
          ]) +
          '<p class="sbt-help" style="margin-top:.6rem">' +
            T("cus.pendingBalance", { amount: U.currency(pending) }) + "</p>" +
        "</form>",
      footer:
        '<button type="button" class="sbt-btn sbt-btn--outline" data-act="cancel">' +
          U.escape(T("common.cancel")) + '</button>' +
        '<button type="button" class="sbt-btn sbt-btn--success" data-act="save">' +
          '<i class="bi bi-check-lg"></i> ' + U.escape(T("cus.recordReceipt")) + '</button>',
      onOpen: function (m) {
        const form = m.$("#cusPayForm");
        m.$('[data-act="cancel"]').addEventListener("click", m.close);
        m.$('[data-act="save"]').addEventListener("click", function () {
          const data = UI.readForm(form);
          const errors = U.validate({
            date: { value: data.date, label: T("cus.receiptDateLabel"), required: true, type: "date" },
            amount: { value: data.amount, label: T("pay.amountLabel"), required: true, type: "number", min: 0.01 }
          });
          if (!UI.showErrors(form, errors)) return;

          SBT.store.insert("payments", {
            date: data.date,
            partyType: "Customer",
            partyName: name,
            mobile: summary.mobile || "",
            amount: U.num(data.amount),
            mode: data.mode,
            reference: data.reference,
            notes: data.notes,
            direction: "in"
          });

          UI.success(T("cus.receiptRecorded"));
          m.close();
          refresh();
        });
      }
    });
  }

  async function remove(id) {
    const c = SBT.store.get("customers", id);
    if (!c) return;
    const ok = await UI.confirm({
      title: T("cus.deleteCustomer"),
      message: T("cus.deleteMessage", { name: c.name }),
      confirmText: T("cus.deleteCustomer")
    });
    if (!ok) return;
    SBT.store.remove("customers", id);
    UI.success(T("cus.customerDeleted"));
    refresh();
  }

  function exportData() {
    const list = rows().map(function (r) {
      return {
        [T("common.customer")]: r.name,
        [T("common.mobile")]: r.mobile,
        [T("common.gstin")]: r.gstin,
        [T("common.address")]: r.address,
        [T("cus.invoices")]: r.entries,
        [T("cus.totalSales")]: r.totalSales,
        [T("cus.totalPaid")]: r.totalPaid,
        [T("cus.pending")]: r.pending
      };
    });
    if (!list.length) { UI.warn(T("common.nothingToExport")); return; }
    U.exportExcel("SBT-Customers", list, null, T("cus.masterTitle"));
    UI.success(T("cus.exported"));
  }

  function mount() {
    const addBtn = document.getElementById("cusAdd");
    if (addBtn) addBtn.addEventListener("click", function () { openForm(null); });

    const exportBtn = document.getElementById("cusExport");
    if (exportBtn) exportBtn.addEventListener("click", exportData);

    const searchEl = document.getElementById("cusSearch");
    if (searchEl) {
      searchEl.addEventListener("input", U.debounce(function () {
        search = searchEl.value;
        refresh();
        const el = document.getElementById("cusSearch");
        if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
      }, 220));
    }

    const content = document.getElementById("sbtContent");
    U.on(content, "click", "[data-edit]", function (e, el) { openForm(el.dataset.edit); });
    U.on(content, "click", "[data-ledger]", function (e, el) { openLedger(el.dataset.ledger); });
    U.on(content, "click", "[data-receive]", function (e, el) { openReceipt(el.dataset.receive); });
    U.on(content, "click", "[data-del]", function (e, el) { remove(el.dataset.del); });
  }

  function refresh() {
    const content = document.getElementById("sbtContent");
    if (!content) return;
    content.innerHTML = render();
    mount();
  }

  App.customers = { render: render, mount: mount, refresh: refresh };
})(window);
