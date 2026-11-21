/* ==========================================================================
   SHREE BRAHMANI TRADERS — Payments
   ========================================================================== */
(function (global) {
  "use strict";

  const SBT = global.SBT;
  const U = SBT.utils;
  const App = SBT.app;
  const UI = SBT.ui;

  function T(key, vars) { return U.t(key, vars); }

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
        T("pay.title"),
        T("pay.subtitle"),
        '<button type="button" class="sbt-btn sbt-btn--outline" id="payExport">' +
          '<i class="bi bi-file-earmark-excel"></i> ' + U.escape(T("common.export")) + '</button>' +
        '<button type="button" class="sbt-btn sbt-btn--accent" id="payAdd">' +
          '<i class="bi bi-plus-lg"></i> ' + U.escape(T("pay.recordPayment")) + '</button>'
      ) +

      '<div class="sbt-kpi-grid">' +
        App.kpi({ label: T("pay.totalReceived"), variant: "green", icon: "bi-arrow-down-circle-fill",
          value: U.currency(received) }) +
        App.kpi({ label: T("pay.totalPaid"), variant: "red", icon: "bi-arrow-up-circle-fill",
          value: U.currency(paid) }) +
        App.kpi({ label: T("pay.netCashFlow"), variant: received - paid >= 0 ? "navy" : "red",
          icon: "bi-cash-stack", value: U.currency(received - paid) }) +
        App.kpi({ label: T("pay.filteredTotal"), variant: "orange", icon: "bi-funnel-fill",
          value: U.currency(filteredTotal), meta: U.escape(T("common.entriesCount", { n: list.length })) }) +
      "</div>" +

      App.card({
        flush: true,
        body:
          '<div class="sbt-toolbar">' +
            '<div class="sbt-field sbt-field--grow">' +
              '<label for="paySearch">' + U.escape(T("common.search")) + '</label>' +
              '<input type="search" class="sbt-input" id="paySearch" placeholder="' +
                U.escape(T("pay.searchPlaceholder")) + '" value="' +
                U.escape(filters.search) + '">' +
            "</div>" +
            '<div class="sbt-field">' +
              '<label for="payType">' + U.escape(T("pay.partyType")) + '</label>' +
              '<select class="sbt-select" id="payType">' +
                '<option value="">' + U.escape(T("common.all")) + '</option>' +
                '<option value="Customer"' + (filters.partyType === "Customer" ? " selected" : "") + ">" +
                  U.escape(U.tv("Customer")) + "</option>" +
                '<option value="Supplier"' + (filters.partyType === "Supplier" ? " selected" : "") + ">" +
                  U.escape(U.tv("Supplier")) + "</option>" +
              "</select>" +
            "</div>" +
            '<div class="sbt-field">' +
              '<label for="payMode">' + U.escape(T("common.mode")) + '</label>' +
              '<select class="sbt-select" id="payMode">' +
                '<option value="">' + U.escape(T("common.all")) + '</option>' +
                SBT.config.paymentModes.map(function (m) {
                  return '<option value="' + U.escape(m) + '"' +
                    (filters.mode === m ? " selected" : "") + ">" + U.escape(U.tv(m)) + "</option>";
                }).join("") +
              "</select>" +
            "</div>" +
            '<div class="sbt-field">' +
              '<label for="payFrom">' + U.escape(T("common.from")) + '</label>' +
              '<input type="date" class="sbt-input" id="payFrom" value="' + U.escape(filters.from) + '">' +
            "</div>" +
            '<div class="sbt-field">' +
              '<label for="payTo">' + U.escape(T("common.to")) + '</label>' +
              '<input type="date" class="sbt-input" id="payTo" value="' + U.escape(filters.to) + '">' +
            "</div>" +
            '<button type="button" class="sbt-btn sbt-btn--ghost" id="payClear">' +
              '<i class="bi bi-x-lg"></i> ' + U.escape(T("common.clear")) + '</button>' +
          "</div>" +
          UI.table({
            columns: [
              { label: U.escape(T("common.date")), render: function (r) { return U.formatDate(r.date); } },
              { label: U.escape(T("common.party")), render: function (r) { return UI.partyCell(r.partyName, r.mobile); } },
              { label: U.escape(T("common.type")), render: function (r) {
                const isIn = r.partyType === "Customer";
                return '<span class="sbt-badge ' + (isIn ? "sbt-badge--success" : "sbt-badge--warning") + '">' +
                  U.escape(isIn ? T("badge.received") : T("badge.paidOut")) + "</span>";
              }},
              { label: U.escape(T("common.mode")), render: function (r) { return U.escape(U.tv(r.mode) || "—"); } },
              { label: U.escape(T("common.reference")), render: function (r) {
                return r.reference
                  ? '<span class="sbt-mono" style="font-size:.76rem">' + U.escape(r.reference) + "</span>"
                  : '<span class="sbt-muted">—</span>';
              }},
              { label: U.escape(T("common.amount")), align: "right", render: function (r) {
                const isIn = r.partyType === "Customer";
                return '<span class="sbt-strong ' + (isIn ? "sbt-text-success" : "sbt-text-danger") + '">' +
                  (isIn ? "+" : "−") + U.currency(r.amount) + "</span>";
              }},
              { label: U.escape(T("common.actions")), className: "actions", render: function (r) {
                return '<button type="button" class="sbt-btn sbt-btn--sm sbt-btn--ghost" data-edit="' +
                    r.id + '" title="' + U.escape(T("common.edit")) + '"><i class="bi bi-pencil"></i></button>' +
                  '<button type="button" class="sbt-btn sbt-btn--sm sbt-btn--ghost" data-del="' +
                    r.id + '" title="' + U.escape(T("common.delete")) + '"><i class="bi bi-trash3"></i></button>';
              }}
            ],
            rows: list,
            footer: list.length ?
              "<tr><td colspan='5'>" + U.escape(T("common.total")) + " (" +
                U.escape(T("common.entriesCount", { n: list.length })) + ")</td>" +
              '<td class="num">' + U.currency(filteredTotal) + "</td><td></td></tr>" : "",
            empty: { icon: "bi-cash-coin", title: T("pay.noPaymentsFound"), message: T("pay.noPaymentsFoundMsg") }
          })
      })
    );
  }

  function openForm(record) {
    const isEdit = !!record;
    const r = record || {};

    const modal = UI.modal({
      title: isEdit ? T("pay.editPayment") : T("pay.recordPaymentTitle"),
      subtitle: T("pay.formSubtitle"),
      body:
        '<form id="payForm" novalidate>' +
          UI.formGrid([
            { label: T("pay.paymentDate"), name: "date", type: "date", required: true, value: r.date || U.today() },
            { label: T("pay.partyType"), name: "partyType", type: "select", required: true,
              value: r.partyType || "Customer",
              options: [{ value: "Customer", label: T("pay.customerIn") },
                        { value: "Supplier", label: T("pay.supplierOut") }] },
            { label: T("pay.partyName"), name: "partyName", required: true, value: r.partyName,
              placeholder: T("pay.partyNamePlaceholder") },
            { label: T("common.mobile"), name: "mobile", value: r.mobile,
              placeholder: T("common.mobilePlaceholder"), inputmode: "numeric" },
            { label: T("common.amount"), name: "amount", type: "number", step: "0.01", min: 0.01,
              required: true, value: r.amount, prefix: SBT.store.settings.currency || "₹" },
            { label: T("exp.paymentMode"), name: "mode", type: "select", required: true,
              value: r.mode || "Cash", options: SBT.config.paymentModes },
            { label: T("common.reference"), name: "reference", value: r.reference,
              placeholder: T("pay.referencePlaceholder") },
            { label: T("common.notes"), name: "notes", type: "textarea", value: r.notes, full: true,
              placeholder: T("sales.notesPlaceholder") }
          ]) +
          '<p class="sbt-help" style="margin-top:.6rem" id="payBalance"></p>' +
        "</form>",
      footer:
        '<button type="button" class="sbt-btn sbt-btn--outline" data-act="cancel">' +
          U.escape(T("common.cancel")) + '</button>' +
        '<button type="button" class="sbt-btn sbt-btn--accent" data-act="save">' +
          '<i class="bi bi-check-lg"></i> ' +
          U.escape(isEdit ? T("pay.updatePayment") : T("pay.savePayment")) + "</button>",
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
              ? T("pay.outstandingPayable", { amount: U.currency(s.balance) })
              : U.escape(T("pay.noPurchaseRecords"));
          } else {
            const c = SBT.calc.customerSummary()[name];
            balanceEl.innerHTML = c
              ? T("pay.pendingReceivable", { amount: U.currency(c.pending) })
              : U.escape(T("pay.noSalesRecords"));
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
            date: { value: data.date, label: T("pay.paymentDateLabel"), required: true, type: "date" },
            partyName: { value: data.partyName, label: T("pay.partyNameLabel"), required: true, minLength: 2, maxLength: 120 },
            mobile: { value: data.mobile, label: T("pay.mobileLabel"), mobile: true },
            amount: { value: data.amount, label: T("pay.amountLabel"), required: true, type: "number", min: 0.01 }
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
            UI.success(T("pay.paymentUpdated"));
          } else {
            SBT.store.insert("payments", payload);
            UI.success(T("pay.paymentRecorded"));
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
      title: T("pay.deletePayment"),
      message: T("pay.deleteMessage", {
        kind: r.partyType === "Customer" ? T("pay.receiptFrom") : T("pay.paymentTo"),
        party: r.partyName,
        amount: U.currency(r.amount)
      }),
      confirmText: T("pay.deletePayment")
    });
    if (!ok) return;
    SBT.store.remove("payments", id);
    UI.success(T("pay.paymentDeleted"));
    refresh();
  }

  function exportData() {
    const list = rows().map(function (r) {
      return {
        [T("common.date")]: r.date,
        [T("pay.partyType")]: U.tv(r.partyType),
        [T("common.party")]: r.partyName,
        [T("common.mobile")]: r.mobile,
        [T("common.mode")]: U.tv(r.mode),
        [T("common.reference")]: r.reference,
        [T("common.amount")]: r.amount,
        [T("common.notes")]: r.notes
      };
    });
    if (!list.length) { UI.warn(T("common.nothingToExport")); return; }
    U.exportExcel("SBT-Payments", list, null, T("pay.registerTitle"));
    UI.success(T("pay.exported"));
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
