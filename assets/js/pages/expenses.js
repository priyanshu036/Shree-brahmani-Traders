/* ==========================================================================
   SHREE BRAHMANI TRADERS — Expenses
   ========================================================================== */
(function (global) {
  "use strict";

  const SBT = global.SBT;
  const U = SBT.utils;
  const App = SBT.app;
  const UI = SBT.ui;

  function T(key, vars) { return U.t(key, vars); }

  let filters = { search: "", category: "", from: "", to: "" };

  function rows() {
    let list = SBT.store.list("expenses");

    if (filters.from || filters.to) {
      list = list.filter(function (r) { return U.inRange(r.date, filters.from, filters.to); });
    }
    if (filters.category) {
      list = list.filter(function (r) { return r.category === filters.category; });
    }
    if (filters.search) {
      list = UI.filterRows(list, filters.search, ["description", "paidTo", "category", "notes", "reference"]);
    }

    return U.sortBy(list, "date", true);
  }

  function categoryTotals(list) {
    const map = {};
    list.forEach(function (r) {
      const key = r.category || "Miscellaneous";
      map[key] = (map[key] || 0) + U.num(r.amount);
    });
    return Object.keys(map).map(function (k) {
      return { category: k, amount: U.round(map[k]) };
    }).sort(function (a, b) { return b.amount - a.amount; });
  }

  function render() {
    const list = rows();
    const all = SBT.store.list("expenses");
    const total = U.sum(list, function (r) { return r.amount; });
    const monthRange = U.rangePreset("month");
    const monthTotal = U.sum(all.filter(function (r) {
      return U.inRange(r.date, monthRange.from, monthRange.to);
    }), function (r) { return r.amount; });
    const todayTotal = U.sum(all.filter(function (r) {
      return U.inRange(r.date, U.today(), U.today());
    }), function (r) { return r.amount; });
    const cats = categoryTotals(list);
    const topCat = cats.length ? cats[0] : null;

    return (
      App.pageHead(
        T("exp.title"),
        T("exp.subtitle"),
        '<button type="button" class="sbt-btn sbt-btn--outline" id="expExport">' +
          '<i class="bi bi-file-earmark-excel"></i> ' + U.escape(T("common.export")) + '</button>' +
        '<button type="button" class="sbt-btn sbt-btn--accent" id="expAdd">' +
          '<i class="bi bi-plus-lg"></i> ' + U.escape(T("exp.addExpense")) + '</button>'
      ) +

      '<div class="sbt-kpi-grid">' +
        App.kpi({ label: T("exp.filteredTotal"), variant: "navy", icon: "bi-wallet2",
          value: U.currency(total), meta: U.escape(T("common.recordsCount", { n: list.length })) }) +
        App.kpi({ label: T("exp.thisMonth"), variant: "orange", icon: "bi-calendar-month",
          value: U.currency(monthTotal) }) +
        App.kpi({ label: T("exp.today"), variant: "amber", icon: "bi-calendar-day",
          value: U.currency(todayTotal) }) +
        App.kpi({ label: T("exp.topCategory"), variant: "red", icon: "bi-pie-chart-fill",
          value: topCat ? U.currency(topCat.amount) : "—",
          meta: topCat ? U.escape(U.tv(topCat.category)) : U.escape(T("common.noData")) }) +
      "</div>" +

      App.card({
        flush: true,
        body:
          '<div class="sbt-toolbar">' +
            '<div class="sbt-field sbt-field--grow">' +
              '<label for="expSearch">' + U.escape(T("common.search")) + '</label>' +
              '<input type="search" class="sbt-input" id="expSearch" placeholder="' +
                U.escape(T("exp.searchPlaceholder")) + '" value="' +
                U.escape(filters.search) + '">' +
            "</div>" +
            '<div class="sbt-field">' +
              '<label for="expCategory">' + U.escape(T("common.category")) + '</label>' +
              '<select class="sbt-select" id="expCategory">' +
                '<option value="">' + U.escape(T("common.all")) + '</option>' +
                SBT.config.expenseCategories.map(function (c) {
                  return '<option value="' + U.escape(c) + '"' +
                    (filters.category === c ? " selected" : "") + ">" + U.escape(U.tv(c)) + "</option>";
                }).join("") +
              "</select>" +
            "</div>" +
            '<div class="sbt-field">' +
              '<label for="expFrom">' + U.escape(T("common.from")) + '</label>' +
              '<input type="date" class="sbt-input" id="expFrom" value="' + U.escape(filters.from) + '">' +
            "</div>" +
            '<div class="sbt-field">' +
              '<label for="expTo">' + U.escape(T("common.to")) + '</label>' +
              '<input type="date" class="sbt-input" id="expTo" value="' + U.escape(filters.to) + '">' +
            "</div>" +
            '<button type="button" class="sbt-btn sbt-btn--ghost" id="expClear">' +
              '<i class="bi bi-x-lg"></i> ' + U.escape(T("common.clear")) + '</button>' +
          "</div>" +
          UI.table({
            columns: [
              { label: U.escape(T("common.date")), render: function (r) { return U.formatDate(r.date); } },
              { label: U.escape(T("common.category")), render: function (r) {
                return '<span class="sbt-badge sbt-badge--info">' + U.escape(U.tv(r.category) || "—") + "</span>";
              }},
              { label: U.escape(T("common.description")), render: function (r) {
                return '<div class="sbt-strong">' + U.escape(r.description || "—") + "</div>" +
                  (r.notes ? '<div class="sbt-muted" style="font-size:.72rem">' +
                    U.escape(U.truncate(r.notes, 60)) + "</div>" : "");
              }},
              { label: U.escape(T("exp.paidTo")), render: function (r) {
                return r.paidTo ? U.escape(r.paidTo) : '<span class="sbt-muted">—</span>';
              }},
              { label: U.escape(T("common.purchase")), render: function (r) { return App.purchaseRefCell(r.purchaseId); } },
              { label: U.escape(T("common.mode")), render: function (r) {
                return r.paymentMode ? U.escape(U.tv(r.paymentMode)) : '<span class="sbt-muted">—</span>';
              }},
              { label: U.escape(T("common.amount")), align: "right", render: function (r) {
                return '<span class="sbt-strong sbt-text-danger">' + U.currency(r.amount) + "</span>";
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
              "<tr><td colspan='6'>" + U.escape(T("common.total")) + " (" +
                U.escape(T("common.recordsCount", { n: list.length })) + ")</td>" +
              '<td class="num">' + U.currency(total) + "</td><td></td></tr>" : "",
            empty: { icon: "bi-wallet2", title: T("exp.noExpensesFound"), message: T("exp.noExpensesFoundMsg") }
          })
      })
    );
  }

  function openForm(record) {
    const isEdit = !!record;
    const r = record || {};

    const modal = UI.modal({
      title: isEdit ? T("exp.editExpense") : T("exp.addExpenseTitle"),
      subtitle: T("exp.formSubtitle"),
      body:
        '<form id="expForm" novalidate>' +
          UI.formGrid([
            { label: T("exp.expenseDate"), name: "date", type: "date", required: true, value: r.date || U.today() },
            { label: T("common.category"), name: "category", type: "select", required: true,
              value: r.category || "Transportation", options: SBT.config.expenseCategories },
            { label: T("common.amount"), name: "amount", type: "number", step: "0.01", min: 0.01,
              required: true, value: r.amount, prefix: SBT.store.settings.currency || "₹" },
            { label: T("exp.paymentMode"), name: "paymentMode", type: "select", required: true,
              value: r.paymentMode || "Cash", options: SBT.config.paymentModes },
            { label: T("exp.paidTo"), name: "paidTo", value: r.paidTo, placeholder: T("exp.paidToPlaceholder") },
            { label: T("sales.linkedPurchase"), name: "purchaseId", type: "select",
              value: r.purchaseId || "", options: [],
              help: T("exp.linkedPurchaseHelp") },
            { label: T("common.reference"), name: "reference", value: r.reference,
              placeholder: T("exp.referencePlaceholder") },
            { label: T("common.description"), name: "description", required: true, value: r.description,
              full: true, placeholder: T("exp.descriptionPlaceholder") },
            { label: T("common.notes"), name: "notes", type: "textarea", value: r.notes, full: true,
              placeholder: T("sales.notesPlaceholder") }
          ]) +
        "</form>",
      footer:
        '<button type="button" class="sbt-btn sbt-btn--outline" data-act="cancel">' +
          U.escape(T("common.cancel")) + '</button>' +
        '<button type="button" class="sbt-btn sbt-btn--accent" data-act="save">' +
          '<i class="bi bi-check-lg"></i> ' +
          U.escape(isEdit ? T("exp.updateExpense") : T("exp.saveExpense")) + "</button>",
      onOpen: function (m) {
        const form = m.$("#expForm");
        form.querySelector('[name="purchaseId"]').innerHTML = App.purchaseOptions(r.purchaseId);
        m.$('[data-act="cancel"]').addEventListener("click", m.close);
        m.$('[data-act="save"]').addEventListener("click", function () {
          const data = UI.readForm(form);
          const errors = U.validate({
            date: { value: data.date, label: T("exp.expenseDateLabel"), required: true, type: "date" },
            category: { value: data.category, label: T("exp.categoryLabel"), required: true },
            description: { value: data.description, label: T("exp.descriptionLabel"), required: true, minLength: 2, maxLength: 200 },
            amount: { value: data.amount, label: T("exp.amountLabel"), required: true, type: "number", min: 0.01 }
          });
          if (!UI.showErrors(form, errors)) return;

          const payload = {
            date: data.date,
            category: data.category,
            description: data.description,
            amount: U.num(data.amount),
            paymentMode: data.paymentMode,
            paidTo: data.paidTo,
            purchaseId: data.purchaseId || "",
            reference: data.reference,
            notes: data.notes
          };

          if (isEdit) {
            SBT.store.update("expenses", r.id, payload);
            UI.success(T("exp.expenseUpdated"));
          } else {
            SBT.store.insert("expenses", payload);
            UI.success(T("exp.expenseRecorded"));
          }
          m.close();
          refresh();
        });
      }
    });
  }

  async function remove(id) {
    const r = SBT.store.get("expenses", id);
    if (!r) return;
    const ok = await UI.confirm({
      title: T("exp.deleteExpense"),
      message: T("exp.deleteMessage", {
        description: r.description || U.tv(r.category),
        amount: U.currency(r.amount)
      }),
      confirmText: T("exp.deleteExpense")
    });
    if (!ok) return;
    SBT.store.remove("expenses", id);
    UI.success(T("exp.expenseDeleted"));
    refresh();
  }

  function exportData() {
    const list = rows().map(function (r) {
      return {
        [T("common.date")]: r.date,
        [T("common.category")]: U.tv(r.category),
        [T("common.description")]: r.description,
        [T("exp.paidTo")]: r.paidTo,
        [T("common.purchase")]: r.purchaseId ? App.purchaseLabel(SBT.store.list("purchases").find(function (p) {
          return String(p.purchaseId || p.id) === String(r.purchaseId);
        })) : "",
        [T("common.mode")]: U.tv(r.paymentMode),
        [T("common.reference")]: r.reference,
        [T("common.amount")]: r.amount,
        [T("common.notes")]: r.notes
      };
    });
    if (!list.length) { UI.warn(T("common.nothingToExport")); return; }
    U.exportExcel("SBT-Expenses", list, null, T("exp.reportTitle"));
    UI.success(T("exp.exported"));
  }

  function mount() {
    const addBtn = document.getElementById("expAdd");
    if (addBtn) addBtn.addEventListener("click", function () { openForm(null); });

    const exportBtn = document.getElementById("expExport");
    if (exportBtn) exportBtn.addEventListener("click", exportData);

    const searchEl = document.getElementById("expSearch");
    if (searchEl) {
      searchEl.addEventListener("input", U.debounce(function () {
        filters.search = searchEl.value;
        refresh();
        const el = document.getElementById("expSearch");
        if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
      }, 220));
    }

    const catEl = document.getElementById("expCategory");
    if (catEl) catEl.addEventListener("change", function () {
      filters.category = catEl.value;
      refresh();
    });

    const fromEl = document.getElementById("expFrom");
    if (fromEl) fromEl.addEventListener("change", function () {
      filters.from = fromEl.value;
      refresh();
    });

    const toEl = document.getElementById("expTo");
    if (toEl) toEl.addEventListener("change", function () {
      filters.to = toEl.value;
      refresh();
    });

    const clearBtn = document.getElementById("expClear");
    if (clearBtn) clearBtn.addEventListener("click", function () {
      filters = { search: "", category: "", from: "", to: "" };
      refresh();
    });

    const content = document.getElementById("sbtContent");
    U.on(content, "click", "[data-edit]", function (e, el) {
      openForm(SBT.store.get("expenses", el.dataset.edit));
    });
    U.on(content, "click", "[data-del]", function (e, el) { remove(el.dataset.del); });
  }

  function refresh() {
    const content = document.getElementById("sbtContent");
    if (!content) return;
    content.innerHTML = render();
    mount();
  }

  App.expenses = { render: render, mount: mount, refresh: refresh };
})(window);
