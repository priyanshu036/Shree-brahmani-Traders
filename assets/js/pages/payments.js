/* ==========================================================================
   SHREE BRAHMANI TRADERS — Payments
   ========================================================================== */
(function (global) {
  "use strict";

  const SBT = global.SBT;
  const U = SBT.utils;
  const App = SBT.app;
  const UI = SBT.ui;

  let filters = { search: "", partyType: "", mode: "", from: "", to: "" };

  function rows() {
    let list = SBT.store.list("payments");

    if (filters.from || filters.to) {
      list = list.filter(function (r) { return U.inRange(r.date, filters.from, filters.to); });
    }
    if (filters.partyType) {
      list = list.filter(function (r) { return r.partyType === filters.partyType; });
    }
    if (filters.mode) {
      list = list.filter(function (r) { return r.mode === filters.mode; });
    }
    if (filters.search) {
      list = UI.filterRows(list, filters.search, ["partyName", "mobile", "reference", "notes", "mode"]);
    }

    return U.sortBy(list, "date", true);
  }

  function render() {
    const list = rows();
    const all = SBT.store.list("payments");
    const received = U.sum(all.filter(function (r) { return r.partyType === "Customer"; }),
      function (r) { return r.amount; });
    const paid = U.sum(all.filter(function (r) { return r.partyType === "Supplier"; }),
      function (r) { return r.amount; });
    const filteredTotal = U.sum(list, function (r) { return r.amount; });

    return (
      App.pageHead(
        "Payments",
        "Customer receipts and supplier payments",
        '<button type="button" class="sbt-btn sbt-btn--outline" id="payExport">' +
          '<i class="bi bi-file-earmark-excel"></i> Export</button>' +
        '<button type="button" class="sbt-btn sbt-btn--accent" id="payAdd">' +
          '<i class="bi bi-plus-lg"></i> Record Payment</button>'
      ) +

      '<div class="sbt-kpi-grid">' +
        App.kpi({ label: "Total Received", variant: "green", icon: "bi-arrow-down-circle-fill",
          value: U.currency(received) }) +
        App.kpi({ label: "Total Paid", variant: "red", icon: "bi-arrow-up-circle-fill",
          value: U.currency(paid) }) +
        App.kpi({ label: "Net Cash Flow", variant: received - paid >= 0 ? "navy" : "red",
          icon: "bi-cash-stack", value: U.currency(received - paid) }) +
        App.kpi({ label: "Filtered Total", variant: "orange", icon: "bi-funnel-fill",
          value: U.currency(filteredTotal), meta: list.length + " entries" }) +
      "</div>" +

      App.card({
        flush: true,
        body:
          '<div class="sbt-toolbar">' +
            '<div class="sbt-field sbt-field--grow">' +
              '<label for="paySearch">Search</label>' +
              '<input type="search" class="sbt-input" id="paySearch" placeholder="Party, reference…" value="' +
                U.escape(filters.search) + '">' +
            "</div>" +
            '<div class="sbt-field">' +
              '<label for="payType">Party Type</label>' +
              '<select class="sbt-select" id="payType">' +
                '<option value="">All</option>' +
                '<option value="Customer"' + (filters.partyType === "Customer" ? " selected" : "") +
                  ">Customer</option>" +
                '<option value="Supplier"' + (filters.partyType === "Supplier" ? " selected" : "") +
                  ">Supplier</option>" +
              "</select>" +
            "</div>" +
            '<div class="sbt-field">' +
              '<label for="payMode">Mode</label>' +
              '<select class="sbt-select" id="payMode">' +
                '<option value="">All</option>' +
                SBT.config.paymentModes.map(function (m) {
                  return '<option value="' + U.escape(m) + '"' +
                    (filters.mode === m ? " selected" : "") + ">" + U.escape(m) + "</option>";
                }).join("") +
              "</select>" +
            "</div>" +
            '<div class="sbt-field">' +
              '<label for="payFrom">From</label>' +
              '<input type="date" class="sbt-input" id="payFrom" value="' + U.escape(filters.from) + '">' +
            "</div>" +
            '<div class="sbt-field">' +
              '<label for="payTo">To</label>' +
              '<input type="date" class="sbt-input" id="payTo" value="' + U.escape(filters.to) + '">' +
            "</div>" +
            '<button type="button" class="sbt-btn sbt-btn--ghost" id="payClear">' +
              '<i class="bi bi-x-lg"></i> Clear</button>' +
          "</div>" +
          UI.table({
            columns: [
              { label: "Date", render: function (r) { return U.formatDate(r.date); } },
              { label: "Party", render: function (r) { return UI.partyCell(r.partyName, r.mobile); } },
              { label: "Type", render: function (r) {
                const isIn = r.partyType === "Customer";
                return '<span class="sbt-badge ' + (isIn ? "sbt-badge--success" : "sbt-badge--warning") + '">' +
                  (isIn ? "Received" : "Paid") + "</span>";
              }},
              { label: "Mode", render: function (r) { return U.escape(r.mode || "—"); } },
              { label: "Reference", render: function (r) {
                return r.reference
                  ? '<span class="sbt-mono" style="font-size:.76rem">' + U.escape(r.reference) + "</span>"
                  : '<span class="sbt-muted">—</span>';
              }},
              { label: "Amount", align: "right", render: function (r) {
                const isIn = r.partyType === "Customer";
                return '<span class="sbt-strong ' + (isIn ? "sbt-text-success" : "sbt-text-danger") + '">' +
                  (isIn ? "+" : "−") + U.currency(r.amount) + "</span>";
              }},
              { label: "Actions", className: "actions", render: function (r) {
                return '<button type="button" class="sbt-btn sbt-btn--sm sbt-btn--ghost" data-edit="' +
                    r.id + '" title="Edit"><i class="bi bi-pencil"></i></button>' +
                  '<button type="button" class="sbt-btn sbt-btn--sm sbt-btn--ghost" data-del="' +
                    r.id + '" title="Delete"><i class="bi bi-trash3"></i></button>';
              }}
            ],
            rows: list,
            footer: list.length ?
              "<tr><td colspan='5'>Total (" + list.length + " entries)</td>" +
              '<td class="num">' + U.currency(filteredTotal) + "</td><td></td></tr>" : "",
            empty: { icon: "bi-cash-coin", title: "No payments found", message: "Record a customer receipt or supplier payment." }
          })
      })
    );
  }

  function openForm(record) {
    const isEdit = !!record;
    const r = record || {};

    const modal = UI.modal({
      title: isEdit ? "Edit Payment" : "Record Payment",
      subtitle: "Customer receipt or supplier payment",
      body:
        '<form id="payForm" novalidate>' +
          UI.formGrid([
            { label: "Payment Date", name: "date", type: "date", required: true, value: r.date || U.today() },
            { label: "Party Type", name: "partyType", type: "select", required: true,
              value: r.partyType || "Customer",
              options: [{ value: "Customer", label: "Customer (money in)" },
                        { value: "Supplier", label: "Supplier (money out)" }] },
            { label: "Party Name", name: "partyName", required: true, value: r.partyName,
              placeholder: "Start typing to search" },
            { label: "Mobile Number", name: "mobile", value: r.mobile, placeholder: "10-digit mobile",
              inputmode: "numeric" },
            { label: "Amount", name: "amount", type: "number", step: "0.01", min: 0.01,
              required: true, value: r.amount, prefix: "₹" },
            { label: "Payment Mode", name: "mode", type: "select", required: true,
              value: r.mode || "Cash", options: SBT.config.paymentModes },
            { label: "Reference No.", name: "reference", value: r.reference,
              placeholder: "Cheque / UTR / Txn ID" },
            { label: "Notes", name: "notes", type: "textarea", value: r.notes, full: true,
              placeholder: "Optional remarks" }
          ]) +
          '<p class="sbt-help" style="margin-top:.6rem" id="payBalance"></p>' +
        "</form>",
      footer:
        '<button type="button" class="sbt-btn sbt-btn--outline" data-act="cancel">Cancel</button>' +
        '<button type="button" class="sbt-btn sbt-btn--accent" data-act="save">' +
          '<i class="bi bi-check-lg"></i> ' + (isEdit ? "Update Payment" : "Save Payment") + "</button>",
      onOpen: function (m) {
        const form = m.$("#payForm");
        const typeEl = form.querySelector('[name="partyType"]');
        const nameEl = form.querySelector('[name="partyName"]');
        const mobileEl = form.querySelector('[name="mobile"]');
        const balanceEl = m.$("#payBalance");

        function refreshDatalist() {
          const entity = typeEl.value === "Supplier" ? "suppliers" : "customers";
          const listId = "payPartyList";
          const old = form.querySelector("#" + listId);
          if (old) old.remove();
          nameEl.setAttribute("list", listId);
          nameEl.insertAdjacentHTML("afterend", App.partyDatalist(entity, listId));
          updateBalance();
        }

        function updateBalance() {
          const name = nameEl.value.trim();
          if (!name) { balanceEl.innerHTML = ""; return; }
          if (typeEl.value === "Supplier") {
            const s = SBT.calc.supplierSummary()[name];
            balanceEl.innerHTML = s
              ? "Outstanding payable to this supplier: <strong>" + U.currency(s.balance) + "</strong>"
              : "No purchase records found for this supplier.";
          } else {
            const c = SBT.calc.customerSummary()[name];
            balanceEl.innerHTML = c
              ? "Pending receivable from this customer: <strong>" + U.currency(c.pending) + "</strong>"
              : "No sales records found for this customer.";
          }
        }

        typeEl.addEventListener("change", refreshDatalist);
        nameEl.addEventListener("change", function () {
          const entity = typeEl.value === "Supplier" ? "suppliers" : "customers";
          const mobile = App.findPartyMobile(entity, nameEl.value);
          if (mobile && !mobileEl.value) mobileEl.value = mobile;
          updateBalance();
        });

        refreshDatalist();

        m.$('[data-act="cancel"]').addEventListener("click", m.close);
        m.$('[data-act="save"]').addEventListener("click", function () {
          const data = UI.readForm(form);
          const errors = U.validate({
            date: { value: data.date, label: "Payment date", required: true },
            partyName: { value: data.partyName, label: "Party name", required: true, minLength: 2 },
            mobile: { value: data.mobile, label: "Mobile number", mobile: true },
            amount: { value: data.amount, label: "Amount", required: true, type: "number", min: 0.01 }
          });
          if (!UI.showErrors(form, errors)) return;

          const payload = {
            date: data.date,
            partyType: data.partyType,
            partyName: data.partyName,
            mobile: data.mobile,
            amount: U.num(data.amount),
            mode: data.mode,
            reference: data.reference,
            notes: data.notes,
            direction: data.partyType === "Customer" ? "in" : "out"
          };

          if (isEdit) {
            SBT.store.update("payments", r.id, payload);
            UI.success("Payment updated");
          } else {
            SBT.store.insert("payments", payload);
            UI.success("Payment recorded");
          }

          App.ensureParty(data.partyType === "Supplier" ? "suppliers" : "customers",
            data.partyName, data.mobile);
          m.close();
          refresh();
        });
      }
    });
  }

  async function remove(id) {
    const r = SBT.store.get("payments", id);
    if (!r) return;
    const ok = await UI.confirm({
      title: "Delete Payment",
      message: "Delete " + (r.partyType === "Customer" ? "receipt from " : "payment to ") +
        r.partyName + " of " + U.currency(r.amount) + "?",
      confirmText: "Delete Payment"
    });
    if (!ok) return;
    SBT.store.remove("payments", id);
    UI.success("Payment deleted");
    refresh();
  }

  function exportData() {
    const list = rows().map(function (r) {
      return {
        Date: r.date,
        "Party Type": r.partyType,
        Party: r.partyName,
        Mobile: r.mobile,
        Mode: r.mode,
        Reference: r.reference,
        Amount: r.amount,
        Notes: r.notes
      };
    });
    U.exportExcel("SBT-Payments", list, null, "Payment Register");
    UI.success("Payments exported");
  }

  function mount() {
    const addBtn = document.getElementById("payAdd");
    if (addBtn) addBtn.addEventListener("click", function () { openForm(null); });

    const exportBtn = document.getElementById("payExport");
    if (exportBtn) exportBtn.addEventListener("click", exportData);

    const searchEl = document.getElementById("paySearch");
    if (searchEl) {
      searchEl.addEventListener("input", U.debounce(function () {
        filters.search = searchEl.value;
        refresh();
        const el = document.getElementById("paySearch");
        if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
      }, 220));
    }

    const typeEl = document.getElementById("payType");
    if (typeEl) typeEl.addEventListener("change", function () {
      filters.partyType = typeEl.value;
      refresh();
    });

    const modeEl = document.getElementById("payMode");
    if (modeEl) modeEl.addEventListener("change", function () {
      filters.mode = modeEl.value;
      refresh();
    });

    const fromEl = document.getElementById("payFrom");
    if (fromEl) fromEl.addEventListener("change", function () {
      filters.from = fromEl.value;
      refresh();
    });

    const toEl = document.getElementById("payTo");
    if (toEl) toEl.addEventListener("change", function () {
      filters.to = toEl.value;
      refresh();
    });

    const clearBtn = document.getElementById("payClear");
    if (clearBtn) clearBtn.addEventListener("click", function () {
      filters = { search: "", partyType: "", mode: "", from: "", to: "" };
      refresh();
    });

    const content = document.getElementById("sbtContent");
    U.on(content, "click", "[data-edit]", function (e, el) {
      openForm(SBT.store.get("payments", el.dataset.edit));
    });
    U.on(content, "click", "[data-del]", function (e, el) { remove(el.dataset.del); });
  }

  function refresh() {
    const content = document.getElementById("sbtContent");
    if (!content) return;
    content.innerHTML = render();
    mount();
  }

  App.payments = { render: render, mount: mount, refresh: refresh };
})(window);
