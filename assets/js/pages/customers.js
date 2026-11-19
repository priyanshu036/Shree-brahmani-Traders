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
        "Customers",
        "Manage customer accounts and pending payments",
        '<button type="button" class="sbt-btn sbt-btn--outline" id="cusExport">' +
          '<i class="bi bi-file-earmark-excel"></i> Export</button>' +
        '<button type="button" class="sbt-btn sbt-btn--accent" id="cusAdd">' +
          '<i class="bi bi-plus-lg"></i> Add Customer</button>'
      ) +

      '<div class="sbt-kpi-grid">' +
        App.kpi({ label: "Total Customers", variant: "navy", icon: "bi-people-fill", value: all.length }) +
        App.kpi({ label: "Total Sales", variant: "orange", icon: "bi-receipt-cutoff",
          value: U.currency(totalSales) }) +
        App.kpi({ label: "Total Received", variant: "green", icon: "bi-check-circle-fill",
          value: U.currency(totalPaid) }) +
        App.kpi({ label: "Pending Amount", variant: "red", icon: "bi-exclamation-circle-fill",
          value: U.currency(totalPending) }) +
      "</div>" +

      App.card({
        flush: true,
        body:
          '<div class="sbt-toolbar">' +
            '<div class="sbt-field sbt-field--grow">' +
              '<label for="cusSearch">Search</label>' +
              '<input type="search" class="sbt-input" id="cusSearch" placeholder="Name, mobile, GST…" value="' +
                U.escape(search) + '">' +
            "</div>" +
            '<div class="sbt-toolbar__spacer"></div>' +
            '<span class="sbt-muted" style="font-size:.78rem">' + list.length + " customers</span>" +
          "</div>" +
          UI.table({
            columns: [
              { label: "Customer", render: function (r) { return UI.partyCell(r.name, r.mobile); } },
              { label: "GSTIN", render: function (r) {
                return r.gstin ? '<span class="sbt-mono" style="font-size:.76rem">' + U.escape(r.gstin) + "</span>"
                  : '<span class="sbt-muted">—</span>';
              }},
              { label: "Invoices", align: "right", render: function (r) { return r.entries; } },
              { label: "Total Sales", align: "right", render: function (r) {
                return "<strong>" + U.currency(r.totalSales) + "</strong>";
              }},
              { label: "Total Paid", align: "right", render: function (r) { return U.currency(r.totalPaid); } },
              { label: "Pending", align: "right", render: function (r) {
                return r.pending > 0
                  ? '<span class="sbt-text-danger sbt-strong">' + U.currency(r.pending) + "</span>"
                  : '<span class="sbt-text-success sbt-strong">Clear</span>';
              }},
              { label: "Actions", className: "actions", render: function (r) {
                return '<button type="button" class="sbt-btn sbt-btn--sm sbt-btn--ghost" data-ledger="' +
                    U.escape(r.name) + '" title="Ledger"><i class="bi bi-journal-text"></i></button>' +
                  '<button type="button" class="sbt-btn sbt-btn--sm sbt-btn--ghost" data-receive="' +
                    U.escape(r.name) + '" title="Receive Payment"><i class="bi bi-cash-coin"></i></button>' +
                  '<button type="button" class="sbt-btn sbt-btn--sm sbt-btn--ghost" data-edit="' +
                    U.escape(r.name) + '" title="Edit"><i class="bi bi-pencil"></i></button>' +
                  (r.id ? '<button type="button" class="sbt-btn sbt-btn--sm sbt-btn--ghost" data-del="' +
                    r.id + '" title="Delete"><i class="bi bi-trash3"></i></button>' : "");
              }}
            ],
            rows: list,
            empty: { icon: "bi-people", title: "No customers yet", message: "Customers are created automatically when you record a sale." }
          })
      })
    );
  }

  function openForm(name) {
    const existing = name ? SBT.store.list("customers").find(function (c) { return c.name === name; }) : null;
    const summary = name ? C.customerSummary()[name] : null;
    const c = existing || { name: name || "", mobile: summary ? summary.mobile : "" };

    const modal = UI.modal({
      title: existing ? "Edit Customer" : "Add Customer",
      subtitle: "Customer contact and tax details",
      body:
        '<form id="cusForm" novalidate>' +
          UI.formGrid([
            { label: "Customer Name", name: "name", required: true, value: c.name, full: true,
              placeholder: "Business or person name" },
            { label: "Mobile Number", name: "mobile", value: c.mobile, placeholder: "10-digit mobile",
              inputmode: "numeric" },
            { label: "GST Number", name: "gstin", value: c.gstin, placeholder: "24AAAAA0000A1Z5" },
            { label: "Address", name: "address", type: "textarea", value: c.address, full: true,
              placeholder: "Full address" },
            { label: "Notes", name: "notes", type: "textarea", value: c.notes, full: true,
              placeholder: "Optional remarks" }
          ]) +
        "</form>",
      footer:
        '<button type="button" class="sbt-btn sbt-btn--outline" data-act="cancel">Cancel</button>' +
        '<button type="button" class="sbt-btn sbt-btn--accent" data-act="save">' +
          '<i class="bi bi-check-lg"></i> ' + (existing ? "Update Customer" : "Save Customer") + "</button>",
      onOpen: function (m) {
        const form = m.$("#cusForm");
        m.$('[data-act="cancel"]').addEventListener("click", m.close);
        m.$('[data-act="save"]').addEventListener("click", function () {
          const data = UI.readForm(form);
          const errors = U.validate({
            name: { value: data.name, label: "Customer name", required: true, minLength: 2 },
            mobile: { value: data.mobile, label: "Mobile number", mobile: true },
            gstin: { value: data.gstin, label: "GST number", gst: true }
          });

          if (!errors.name) {
            const dup = SBT.store.list("customers").find(function (x) {
              return x.name.toLowerCase() === data.name.toLowerCase() && x.id !== (existing ? existing.id : "");
            });
            if (dup) errors.name = "A customer with this name already exists";
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
            UI.success("Customer updated");
          } else {
            SBT.store.insert("customers", payload);
            UI.success("Customer added");
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
        "<td>" + U.escape(r.type) + "</td>" +
        '<td class="sbt-muted" style="font-size:.78rem">' + U.escape(r.description) + "</td>" +
        '<td class="num">' + (r.debit ? U.currency(r.debit) : "—") + "</td>" +
        '<td class="num">' + (r.credit ? U.currency(r.credit) : "—") + "</td>" +
        '<td class="num sbt-strong">' + U.currency(r.balance) + "</td>" +
        "</tr>";
    }).join("");

    UI.modal({
      title: "Customer Ledger — " + name,
      subtitle: "Sales and receipt history",
      size: "lg",
      body:
        '<div class="sbt-kpi-grid" style="margin-bottom:1rem">' +
          App.kpi({ label: "Total Sales", variant: "navy", icon: "bi-receipt-cutoff",
            value: U.currency(summary.totalSales || 0) }) +
          App.kpi({ label: "Total Received", variant: "green", icon: "bi-check-circle-fill",
            value: U.currency(summary.totalPaid || 0) }) +
          App.kpi({ label: "Pending", variant: "red", icon: "bi-exclamation-circle-fill",
            value: U.currency(summary.pending || 0) }) +
        "</div>" +
        (ledger.length ?
          '<div class="sbt-table-wrap"><table class="sbt-table sbt-table--compact">' +
            "<thead><tr><th>Date</th><th>Type</th><th>Description</th>" +
            '<th class="num">Sale</th><th class="num">Received</th><th class="num">Balance</th></tr></thead>' +
            "<tbody>" + rowsHtml + "</tbody></table></div>"
          : UI.emptyState("bi-journal", "No transactions", "This customer has no sales or receipt records yet.")),
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

  function openReceipt(name) {
    const summary = C.customerSummary()[name] || {};
    const pending = U.num(summary.pending);

    const modal = UI.modal({
      title: "Receive Customer Payment",
      subtitle: "Collect against pending balance from " + name,
      size: "sm",
      body:
        '<form id="cusPayForm" novalidate>' +
          UI.formGrid([
            { label: "Receipt Date", name: "date", type: "date", required: true, value: U.today() },
            { label: "Amount", name: "amount", type: "number", step: "0.01", min: 0.01,
              required: true, value: pending > 0 ? U.round(pending, 2) : "", prefix: "₹" },
            { label: "Payment Mode", name: "mode", type: "select", required: true,
              value: "Cash", options: SBT.config.paymentModes },
            { label: "Reference No.", name: "reference", placeholder: "Cheque / UTR / Txn ID" },
            { label: "Notes", name: "notes", type: "textarea", full: true, placeholder: "Optional remarks" }
          ]) +
          '<p class="sbt-help" style="margin-top:.6rem">Pending balance: <strong>' +
            U.currency(pending) + "</strong></p>" +
        "</form>",
      footer:
        '<button type="button" class="sbt-btn sbt-btn--outline" data-act="cancel">Cancel</button>' +
        '<button type="button" class="sbt-btn sbt-btn--success" data-act="save">' +
          '<i class="bi bi-check-lg"></i> Record Receipt</button>',
      onOpen: function (m) {
        const form = m.$("#cusPayForm");
        m.$('[data-act="cancel"]').addEventListener("click", m.close);
        m.$('[data-act="save"]').addEventListener("click", function () {
          const data = UI.readForm(form);
          const errors = U.validate({
            date: { value: data.date, label: "Receipt date", required: true },
            amount: { value: data.amount, label: "Amount", required: true, type: "number", min: 0.01 }
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

          UI.success("Receipt recorded");
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
      title: "Delete Customer",
      message: 'Delete customer "' + c.name + '"? Sales records will remain intact.',
      confirmText: "Delete Customer"
    });
    if (!ok) return;
    SBT.store.remove("customers", id);
    UI.success("Customer deleted");
    refresh();
  }

  function exportData() {
    const list = rows().map(function (r) {
      return {
        Customer: r.name,
        Mobile: r.mobile,
        GSTIN: r.gstin,
        Address: r.address,
        Invoices: r.entries,
        "Total Sales": r.totalSales,
        "Total Paid": r.totalPaid,
        Pending: r.pending
      };
    });
    U.exportExcel("SBT-Customers", list, null, "Customer Master");
    UI.success("Customers exported");
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
