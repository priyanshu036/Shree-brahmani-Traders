/* ==========================================================================
   SHREE BRAHMANI TRADERS — Expenses
   ========================================================================== */
(function (global) {
  "use strict";

  const SBT = global.SBT;
  const U = SBT.utils;
  const App = SBT.app;
  const UI = SBT.ui;

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
        "Expenses",
        "Track all business running costs",
        '<button type="button" class="sbt-btn sbt-btn--outline" id="expExport">' +
          '<i class="bi bi-file-earmark-excel"></i> Export</button>' +
        '<button type="button" class="sbt-btn sbt-btn--accent" id="expAdd">' +
          '<i class="bi bi-plus-lg"></i> Add Expense</button>'
      ) +

      '<div class="sbt-kpi-grid">' +
        App.kpi({ label: "Filtered Total", variant: "navy", icon: "bi-wallet2",
          value: U.currency(total), meta: list.length + " records" }) +
        App.kpi({ label: "This Month", variant: "orange", icon: "bi-calendar-month",
          value: U.currency(monthTotal) }) +
        App.kpi({ label: "Today", variant: "amber", icon: "bi-calendar-day",
          value: U.currency(todayTotal) }) +
        App.kpi({ label: "Top Category", variant: "red", icon: "bi-pie-chart-fill",
          value: topCat ? U.currency(topCat.amount) : "—",
          meta: topCat ? U.escape(topCat.category) : "No data" }) +
      "</div>" +

      App.card({
        flush: true,
        body:
          '<div class="sbt-toolbar">' +
            '<div class="sbt-field sbt-field--grow">' +
              '<label for="expSearch">Search</label>' +
              '<input type="search" class="sbt-input" id="expSearch" placeholder="Description, paid to…" value="' +
                U.escape(filters.search) + '">' +
            "</div>" +
            '<div class="sbt-field">' +
              '<label for="expCategory">Category</label>' +
              '<select class="sbt-select" id="expCategory">' +
                '<option value="">All</option>' +
                SBT.config.expenseCategories.map(function (c) {
                  return '<option value="' + U.escape(c) + '"' +
                    (filters.category === c ? " selected" : "") + ">" + U.escape(c) + "</option>";
                }).join("") +
              "</select>" +
            "</div>" +
            '<div class="sbt-field">' +
              '<label for="expFrom">From</label>' +
              '<input type="date" class="sbt-input" id="expFrom" value="' + U.escape(filters.from) + '">' +
            "</div>" +
            '<div class="sbt-field">' +
              '<label for="expTo">To</label>' +
              '<input type="date" class="sbt-input" id="expTo" value="' + U.escape(filters.to) + '">' +
            "</div>" +
            '<button type="button" class="sbt-btn sbt-btn--ghost" id="expClear">' +
              '<i class="bi bi-x-lg"></i> Clear</button>' +
          "</div>" +
          UI.table({
            columns: [
              { label: "Date", render: function (r) { return U.formatDate(r.date); } },
              { label: "Category", render: function (r) {
                return '<span class="sbt-badge sbt-badge--info">' + U.escape(r.category || "—") + "</span>";
              }},
              { label: "Description", render: function (r) {
                return '<div class="sbt-strong">' + U.escape(r.description || "—") + "</div>" +
                  (r.notes ? '<div class="sbt-muted" style="font-size:.72rem">' +
                    U.escape(U.truncate(r.notes, 60)) + "</div>" : "");
              }},
              { label: "Paid To", render: function (r) {
                return r.paidTo ? U.escape(r.paidTo) : '<span class="sbt-muted">—</span>';
              }},
              { label: "Mode", render: function (r) {
                return r.paymentMode ? U.escape(r.paymentMode) : '<span class="sbt-muted">—</span>';
              }},
              { label: "Amount", align: "right", render: function (r) {
                return '<span class="sbt-strong sbt-text-danger">' + U.currency(r.amount) + "</span>";
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
              "<tr><td colspan='5'>Total (" + list.length + " records)</td>" +
              '<td class="num">' + U.currency(total) + "</td><td></td></tr>" : "",
            empty: { icon: "bi-wallet2", title: "No expenses found", message: "Record your first business expense." }
          })
      })
    );
  }

  function openForm(record) {
    const isEdit = !!record;
    const r = record || {};

    const modal = UI.modal({
      title: isEdit ? "Edit Expense" : "Add Expense",
      subtitle: "Record a business running cost",
      body:
        '<form id="expForm" novalidate>' +
          UI.formGrid([
            { label: "Expense Date", name: "date", type: "date", required: true, value: r.date || U.today() },
            { label: "Category", name: "category", type: "select", required: true,
              value: r.category || "Transportation", options: SBT.config.expenseCategories },
            { label: "Amount", name: "amount", type: "number", step: "0.01", min: 0.01,
              required: true, value: r.amount, prefix: "₹" },
            { label: "Payment Mode", name: "paymentMode", type: "select", required: true,
              value: r.paymentMode || "Cash", options: SBT.config.paymentModes },
            { label: "Paid To", name: "paidTo", value: r.paidTo, placeholder: "Vendor / person name" },
            { label: "Reference No.", name: "reference", value: r.reference,
              placeholder: "Bill / voucher number" },
            { label: "Description", name: "description", required: true, value: r.description,
              full: true, placeholder: "What was this expense for?" },
            { label: "Notes", name: "notes", type: "textarea", value: r.notes, full: true,
              placeholder: "Optional remarks" }
          ]) +
        "</form>",
      footer:
        '<button type="button" class="sbt-btn sbt-btn--outline" data-act="cancel">Cancel</button>' +
        '<button type="button" class="sbt-btn sbt-btn--accent" data-act="save">' +
          '<i class="bi bi-check-lg"></i> ' + (isEdit ? "Update Expense" : "Save Expense") + "</button>",
      onOpen: function (m) {
        const form = m.$("#expForm");
        m.$('[data-act="cancel"]').addEventListener("click", m.close);
        m.$('[data-act="save"]').addEventListener("click", function () {
          const data = UI.readForm(form);
          const errors = U.validate({
            date: { value: data.date, label: "Expense date", required: true },
            category: { value: data.category, label: "Category", required: true },
            description: { value: data.description, label: "Description", required: true, minLength: 2 },
            amount: { value: data.amount, label: "Amount", required: true, type: "number", min: 0.01 }
          });
          if (!UI.showErrors(form, errors)) return;

          const payload = {
            date: data.date,
            category: data.category,
            description: data.description,
            amount: U.num(data.amount),
            paymentMode: data.paymentMode,
            paidTo: data.paidTo,
            reference: data.reference,
            notes: data.notes
          };

          if (isEdit) {
            SBT.store.update("expenses", r.id, payload);
            UI.success("Expense updated");
          } else {
            SBT.store.insert("expenses", payload);
            UI.success("Expense recorded");
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
      title: "Delete Expense",
      message: 'Delete expense "' + (r.description || r.category) + '" of ' +
        U.currency(r.amount) + "?",
      confirmText: "Delete Expense"
    });
    if (!ok) return;
    SBT.store.remove("expenses", id);
    UI.success("Expense deleted");
    refresh();
  }

  function exportData() {
    const list = rows().map(function (r) {
      return {
        Date: r.date,
        Category: r.category,
        Description: r.description,
        "Paid To": r.paidTo,
        Mode: r.paymentMode,
        Reference: r.reference,
        Amount: r.amount,
        Notes: r.notes
      };
    });
    U.exportExcel("SBT-Expenses", list, null, "Expense Report");
    UI.success("Expenses exported");
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
