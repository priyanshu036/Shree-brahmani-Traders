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
        "Suppliers",
        "Manage supplier accounts and outstanding balances",
        '<button type="button" class="sbt-btn sbt-btn--outline" id="supExport">' +
          '<i class="bi bi-file-earmark-excel"></i> Export</button>' +
        '<button type="button" class="sbt-btn sbt-btn--accent" id="supAdd">' +
          '<i class="bi bi-plus-lg"></i> Add Supplier</button>'
      ) +

      '<div class="sbt-kpi-grid">' +
        App.kpi({ label: "Total Suppliers", variant: "navy", icon: "bi-truck", value: all.length }) +
        App.kpi({ label: "Total Purchases", variant: "orange", icon: "bi-cart-plus-fill",
          value: U.currency(totalPurchase) }) +
        App.kpi({ label: "Total Paid", variant: "green", icon: "bi-check-circle-fill",
          value: U.currency(totalPaid) }) +
        App.kpi({ label: "Outstanding", variant: "red", icon: "bi-exclamation-circle-fill",
          value: U.currency(totalBalance) }) +
      "</div>" +

      App.card({
        flush: true,
        body:
          '<div class="sbt-toolbar">' +
            '<div class="sbt-field sbt-field--grow">' +
              '<label for="supSearch">Search</label>' +
              '<input type="search" class="sbt-input" id="supSearch" placeholder="Name, mobile, GST…" value="' +
                U.escape(search) + '">' +
            "</div>" +
            '<div class="sbt-toolbar__spacer"></div>' +
            '<span class="sbt-muted" style="font-size:.78rem">' + list.length + " suppliers</span>" +
          "</div>" +
          UI.table({
            columns: [
              { label: "Supplier", render: function (r) { return UI.partyCell(r.name, r.mobile); } },
              { label: "GSTIN", render: function (r) {
                return r.gstin ? '<span class="sbt-mono" style="font-size:.76rem">' + U.escape(r.gstin) + "</span>"
                  : '<span class="sbt-muted">—</span>';
              }},
              { label: "Entries", align: "right", render: function (r) { return r.entries; } },
              { label: "Total Purchase", align: "right", render: function (r) {
                return "<strong>" + U.currency(r.totalPurchase) + "</strong>";
              }},
              { label: "Total Paid", align: "right", render: function (r) { return U.currency(r.totalPaid); } },
              { label: "Balance", align: "right", render: function (r) {
                return r.balance > 0
                  ? '<span class="sbt-text-danger sbt-strong">' + U.currency(r.balance) + "</span>"
                  : '<span class="sbt-text-success sbt-strong">Clear</span>';
              }},
              { label: "Actions", className: "actions", render: function (r) {
                return '<button type="button" class="sbt-btn sbt-btn--sm sbt-btn--ghost" data-ledger="' +
                    U.escape(r.name) + '" title="Ledger"><i class="bi bi-journal-text"></i></button>' +
                  '<button type="button" class="sbt-btn sbt-btn--sm sbt-btn--ghost" data-pay="' +
                    U.escape(r.name) + '" title="Record Payment"><i class="bi bi-cash-coin"></i></button>' +
                  '<button type="button" class="sbt-btn sbt-btn--sm sbt-btn--ghost" data-edit="' +
                    U.escape(r.name) + '" title="Edit"><i class="bi bi-pencil"></i></button>' +
                  (r.id ? '<button type="button" class="sbt-btn sbt-btn--sm sbt-btn--ghost" data-del="' +
                    r.id + '" title="Delete"><i class="bi bi-trash3"></i></button>' : "");
              }}
            ],
            rows: list,
            empty: { icon: "bi-truck", title: "No suppliers yet", message: "Suppliers are created automatically when you record a purchase." }
          })
      })
    );
  }

  function openForm(name) {
    const existing = name ? SBT.store.list("suppliers").find(function (s) { return s.name === name; }) : null;
    const summary = name ? C.supplierSummary()[name] : null;
    const s = existing || { name: name || "", mobile: summary ? summary.mobile : "" };

    const modal = UI.modal({
      title: existing ? "Edit Supplier" : "Add Supplier",
      subtitle: "Supplier contact and tax details",
      body:
        '<form id="supForm" novalidate>' +
          UI.formGrid([
            { label: "Supplier Name", name: "name", required: true, value: s.name, full: true,
              placeholder: "Business or person name" },
            { label: "Mobile Number", name: "mobile", value: s.mobile, placeholder: "10-digit mobile",
              inputmode: "numeric" },
            { label: "GST Number", name: "gstin", value: s.gstin, placeholder: "24AAAAA0000A1Z5" },
            { label: "Address", name: "address", type: "textarea", value: s.address, full: true,
              placeholder: "Full address" },
            { label: "Notes", name: "notes", type: "textarea", value: s.notes, full: true,
              placeholder: "Optional remarks" }
          ]) +
        "</form>",
      footer:
        '<button type="button" class="sbt-btn sbt-btn--outline" data-act="cancel">Cancel</button>' +
        '<button type="button" class="sbt-btn sbt-btn--accent" data-act="save">' +
          '<i class="bi bi-check-lg"></i> ' + (existing ? "Update Supplier" : "Save Supplier") + "</button>",
      onOpen: function (m) {
        const form = m.$("#supForm");
        m.$('[data-act="cancel"]').addEventListener("click", m.close);
        m.$('[data-act="save"]').addEventListener("click", function () {
          const data = UI.readForm(form);
          const errors = U.validate({
            name: { value: data.name, label: "Supplier name", required: true, minLength: 2 },
            mobile: { value: data.mobile, label: "Mobile number", mobile: true },
            gstin: { value: data.gstin, label: "GST number", gst: true }
          });

          if (!errors.name) {
            const dup = SBT.store.list("suppliers").find(function (x) {
              return x.name.toLowerCase() === data.name.toLowerCase() && x.id !== (existing ? existing.id : "");
            });
            if (dup) errors.name = "A supplier with this name already exists";
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
            UI.success("Supplier updated");
          } else {
            SBT.store.insert("suppliers", payload);
            UI.success("Supplier added");
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
        "<td>" + U.escape(r.type) + "</td>" +
        '<td class="sbt-muted" style="font-size:.78rem">' + U.escape(r.description) + "</td>" +
        '<td class="num">' + (r.credit ? U.currency(r.credit) : "—") + "</td>" +
        '<td class="num">' + (r.debit ? U.currency(r.debit) : "—") + "</td>" +
        '<td class="num sbt-strong">' + U.currency(r.balance) + "</td>" +
        "</tr>";
    }).join("");

    UI.modal({
      title: "Supplier Ledger — " + name,
      subtitle: "Purchase and payment history",
      size: "lg",
      body:
        '<div class="sbt-kpi-grid" style="margin-bottom:1rem">' +
          App.kpi({ label: "Total Purchase", variant: "navy", icon: "bi-cart-plus-fill",
            value: U.currency(summary.totalPurchase || 0) }) +
          App.kpi({ label: "Total Paid", variant: "green", icon: "bi-check-circle-fill",
            value: U.currency(summary.totalPaid || 0) }) +
          App.kpi({ label: "Balance Due", variant: "red", icon: "bi-exclamation-circle-fill",
            value: U.currency(summary.balance || 0) }) +
        "</div>" +
        (ledger.length ?
          '<div class="sbt-table-wrap"><table class="sbt-table sbt-table--compact">' +
            "<thead><tr><th>Date</th><th>Type</th><th>Description</th>" +
            '<th class="num">Paid</th><th class="num">Purchase</th><th class="num">Balance</th></tr></thead>' +
            "<tbody>" + rowsHtml + "</tbody></table></div>"
          : UI.emptyState("bi-journal", "No transactions", "This supplier has no purchase or payment records yet.")),
      footer:
        '<button type="button" class="sbt-btn sbt-btn--outline" data-act="close">Close</button>' +
        '<button type="button" class="sbt-btn sbt-btn--primary" data-act="print">' +
          '<i class="bi bi-printer"></i> Print</button>',
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
      title: "Record Supplier Payment",
      subtitle: "Pay against outstanding balance for " + name,
      size: "sm",
      body:
        '<form id="supPayForm" novalidate>' +
          UI.formGrid([
            { label: "Payment Date", name: "date", type: "date", required: true, value: U.today() },
            { label: "Amount", name: "amount", type: "number", step: "0.01", min: 0.01,
              required: true, value: balance > 0 ? U.round(balance, 2) : "", prefix: "₹" },
            { label: "Payment Mode", name: "mode", type: "select", required: true,
              value: "Cash", options: SBT.config.paymentModes },
            { label: "Reference No.", name: "reference", placeholder: "Cheque / UTR / Txn ID" },
            { label: "Notes", name: "notes", type: "textarea", full: true, placeholder: "Optional remarks" }
          ]) +
          '<p class="sbt-help" style="margin-top:.6rem">Outstanding balance: <strong>' +
            U.currency(balance) + "</strong></p>" +
        "</form>",
      footer:
        '<button type="button" class="sbt-btn sbt-btn--outline" data-act="cancel">Cancel</button>' +
        '<button type="button" class="sbt-btn sbt-btn--success" data-act="save">' +
          '<i class="bi bi-check-lg"></i> Record Payment</button>',
      onOpen: function (m) {
        const form = m.$("#supPayForm");
        m.$('[data-act="cancel"]').addEventListener("click", m.close);
        m.$('[data-act="save"]').addEventListener("click", function () {
          const data = UI.readForm(form);
          const errors = U.validate({
            date: { value: data.date, label: "Payment date", required: true },
            amount: { value: data.amount, label: "Amount", required: true, type: "number", min: 0.01 }
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

          UI.success("Payment recorded");
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
      title: "Delete Supplier",
      message: 'Delete supplier "' + s.name + '"? Purchase records will remain intact.',
      confirmText: "Delete Supplier"
    });
    if (!ok) return;
    SBT.store.remove("suppliers", id);
    UI.success("Supplier deleted");
    refresh();
  }

  function exportData() {
    const list = rows().map(function (r) {
      return {
        Supplier: r.name,
        Mobile: r.mobile,
        GSTIN: r.gstin,
        Address: r.address,
        Entries: r.entries,
        "Total Purchase": r.totalPurchase,
        "Total Paid": r.totalPaid,
        Balance: r.balance
      };
    });
    U.exportExcel("SBT-Suppliers", list, null, "Supplier Master");
    UI.success("Suppliers exported");
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
