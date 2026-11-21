/* ==========================================================================
   SHREE BRAHMANI TRADERS — Reports
   ========================================================================== */
(function (global) {
  "use strict";

  const SBT = global.SBT;
  const U = SBT.utils;
  const App = SBT.app;
  const C = SBT.calc;
  const UI = SBT.ui;

  function T(key, vars) { return U.t(key, vars); }

  const REPORTS = [
    { id: "purchase", labelKey: "rep.purchaseRegister", icon: "bi-cart-plus-fill" },
    { id: "sales", labelKey: "rep.salesRegister", icon: "bi-receipt-cutoff" },
    { id: "profit-loss", labelKey: "rep.profitLoss", icon: "bi-graph-up-arrow" },
    { id: "supplier-ledger", labelKey: "rep.supplierLedger", icon: "bi-truck" },
    { id: "customer-ledger", labelKey: "rep.customerLedger", icon: "bi-people-fill" },
    { id: "stock", labelKey: "rep.stockRegister", icon: "bi-boxes" },
    { id: "payments", labelKey: "rep.paymentRegister", icon: "bi-cash-coin" },
    { id: "expenses", labelKey: "rep.expenseRegister", icon: "bi-wallet2" }
  ];

  /* Seed the range up front so the very first render already matches the
     date inputs (which default to "This Month"). */
  const initialRange = U.rangePreset("month");

  let state = {
    type: "sales",
    from: initialRange.from,
    to: initialRange.to,
    preset: "month",
    party: ""
  };

  let current = { columns: [], rows: [], title: "" };

  /* ---------- Report builders ---------- */
  function buildPurchase() {
    const list = U.sortBy(SBT.store.list("purchases").filter(function (r) {
      return U.inRange(r.date, state.from, state.to);
    }), "date", true);

    return {
      title: T("rep.purchaseRegister"),
      columns: [
        { label: U.escape(T("common.date")), render: function (r) { return U.formatDate(r.date); } },
        { label: U.escape(T("common.supplier")), render: function (r) { return U.escape(r.supplierName || "—"); } },
        { label: U.escape(T("common.material")), render: function (r) { return U.escape(r.materialName || "—"); } },
        { label: U.escape(T("stk.qty")), align: "right", render: function (r) {
          return U.qty(r.quantity) + " " + U.escape(U.tv(r.unit) || "");
        }},
        { label: U.escape(T("common.rate")), align: "right", render: function (r) { return U.currency(r.purchaseRate); } },
        { label: U.escape(T("pur.baseAmount")), align: "right", render: function (r) { return U.currency(C.purchaseBase(r)); } },
        { label: U.escape(T("pl.expenses")), align: "right", render: function (r) { return U.currency(C.purchaseExpenses(r)); } },
        { label: U.escape(T("common.total")), align: "right", render: function (r) {
          return "<strong>" + U.currency(C.purchaseTotal(r)) + "</strong>";
        }},
        { label: U.escape(T("common.paid")), align: "right", render: function (r) { return U.currency(C.purchasePaid(r)); } },
        { label: U.escape(T("common.due")), align: "right", render: function (r) {
          const d = C.purchaseDue(r);
          return d > 0 ? '<span class="sbt-text-danger">' + U.currency(d) + "</span>" : "—";
        }},
        { label: U.escape(T("pur.linkedRecords")), render: function (r) {
          const linked = App.linkedRecords(r.purchaseId || r.id);
          const n = linked.sales.length + linked.expenses.length;
          return n ? '<span class="sbt-badge sbt-badge--info">' + n + "</span>" : "—";
        }},
        { label: U.escape(T("common.status")), render: function (r) { return U.paymentBadge(r.paymentStatus); } }
      ],
      rows: list,
      totals: {
        total: U.sum(list, function (r) { return C.purchaseTotal(r); }),
        paid: U.sum(list, function (r) { return C.purchasePaid(r); }),
        due: U.sum(list, function (r) { return C.purchaseDue(r); })
      }
    };
  }

  function buildSales() {
    const list = U.sortBy(SBT.store.list("sales").filter(function (r) {
      return U.inRange(r.date, state.from, state.to);
    }), "date", true);

    return {
      title: T("rep.salesRegister"),
      columns: [
        { label: U.escape(T("common.date")), render: function (r) { return U.formatDate(r.date); } },
        { label: U.escape(T("common.invoice")), render: function (r) {
          return '<span class="sbt-mono">' + U.escape(r.invoiceNo || "—") + "</span>";
        }},
        { label: U.escape(T("common.customer")), render: function (r) { return U.escape(r.customerName || "—"); } },
        { label: U.escape(T("common.purchase")), render: function (r) { return App.purchaseRefCell(r.purchaseId); } },
        { label: U.escape(T("common.material")), render: function (r) { return U.escape(r.materialName || "—"); } },
        { label: U.escape(T("stk.qty")), align: "right", render: function (r) {
          return U.qty(r.quantity) + " " + U.escape(U.tv(r.unit) || "");
        }},
        { label: U.escape(T("common.rate")), align: "right", render: function (r) { return U.currency(r.sellingRate); } },
        { label: U.escape(T("sales.gross")), align: "right", render: function (r) { return U.currency(C.salesGross(r)); } },
        { label: U.escape(T("sales.gst")), align: "right", render: function (r) { return U.currency(C.salesGst(r)); } },
        { label: U.escape(T("sales.final")), align: "right", render: function (r) {
          return "<strong>" + U.currency(C.salesFinal(r)) + "</strong>";
        }},
        { label: U.escape(T("common.paid")), align: "right", render: function (r) { return U.currency(C.salesPaid(r)); } },
        { label: U.escape(T("common.due")), align: "right", render: function (r) {
          const d = C.salesDue(r);
          return d > 0 ? '<span class="sbt-text-danger">' + U.currency(d) + "</span>" : "—";
        }},
        { label: U.escape(T("pl.profit")), align: "right", render: function (r) {
          const p = C.saleNetProfit(r);
          return '<span class="' + (p >= 0 ? "sbt-text-success" : "sbt-text-danger") + '">' +
            U.currency(p) + "</span>";
        }},
        { label: U.escape(T("common.status")), render: function (r) { return U.paymentBadge(r.paymentStatus); } }
      ],
      rows: list,
      totals: {
        total: U.sum(list, function (r) { return C.salesFinal(r); }),
        paid: U.sum(list, function (r) { return C.salesPaid(r); }),
        due: U.sum(list, function (r) { return C.salesDue(r); }),
        profit: U.sum(list, function (r) { return C.saleNetProfit(r); })
      }
    };
  }

  function buildProfitLoss() {
    const t = C.totals({ from: state.from, to: state.to });
    const expenses = SBT.store.list("expenses").filter(function (r) {
      return U.inRange(r.date, state.from, state.to);
    });
    const catMap = {};
    expenses.forEach(function (r) {
      const k = r.category || "Miscellaneous";
      catMap[k] = (catMap[k] || 0) + U.num(r.amount);
    });

    const rows = [
      { item: T("pl.salesRevenue"), amount: t.totalSales, kind: "head" },
      { item: T("pl.lessCogs"), amount: -U.round(t.totalSales - t.grossProfit), kind: "sub" },
      { item: T("pl.grossProfit"), amount: t.grossProfit, kind: "total" },
      { item: T("pl.lessExpenses"), amount: -t.totalExpenses, kind: "sub" }
    ];
    Object.keys(catMap).sort(function (a, b) { return catMap[b] - catMap[a]; }).forEach(function (k) {
      rows.push({ item: "   " + U.tv(k), amount: -U.round(catMap[k]), kind: "detail" });
    });
    rows.push({ item: T("pl.netProfit"), amount: t.netProfit, kind: "grand" });

    return {
      title: T("rep.profitLossStatement"),
      columns: [
        { label: U.escape(T("rep.particulars")), render: function (r) {
          const cls = r.kind === "grand" || r.kind === "total" ? "sbt-strong" :
            (r.kind === "detail" ? "sbt-muted" : "");
          return '<span class="' + cls + '">' + U.escape(r.item) + "</span>";
        }},
        { label: U.escape(T("pl.amount")), align: "right", render: function (r) {
          const cls = r.amount < 0 ? "sbt-text-danger" : (r.kind === "grand" ? "sbt-text-success" : "");
          return '<span class="' + cls + ' sbt-strong">' + U.currency(Math.abs(r.amount)) + "</span>";
        }}
      ],
      rows: rows,
      totals: { net: t.netProfit, margin: t.margin }
    };
  }

  function buildSupplierLedger() {
    const parties = C.supplierList();
    const name = state.party || (parties[0] ? parties[0].name : "");
    const ledger = name ? C.supplierLedger(name) : [];

    return {
      title: T("rep.supplierLedgerTitle", { name: name || T("rep.noSupplier") }),
      columns: [
        { label: U.escape(T("common.date")), render: function (r) { return U.formatDate(r.date); } },
        { label: U.escape(T("common.type")), render: function (r) { return U.escape(U.tv(r.type)); } },
        { label: U.escape(T("common.description")), render: function (r) {
          return '<span class="sbt-muted">' + U.escape(r.description || "—") + "</span>";
        }},
        { label: U.escape(T("common.purchase")), align: "right", render: function (r) {
          return r.credit ? U.currency(r.credit) : "—";
        }},
        { label: U.escape(T("common.paid")), align: "right", render: function (r) {
          return r.debit ? U.currency(r.debit) : "—";
        }},
        { label: U.escape(T("common.balance")), align: "right", render: function (r) {
          return '<span class="sbt-strong">' + U.currency(r.balance) + "</span>";
        }}
      ],
      rows: ledger,
      totals: { balance: ledger.length ? ledger[ledger.length - 1].balance : 0 }
    };
  }

  function buildCustomerLedger() {
    const parties = C.customerList();
    const name = state.party || (parties[0] ? parties[0].name : "");
    const ledger = name ? C.customerLedger(name) : [];

    return {
      title: T("rep.customerLedgerTitle", { name: name || T("rep.noCustomer") }),
      columns: [
        { label: U.escape(T("common.date")), render: function (r) { return U.formatDate(r.date); } },
        { label: U.escape(T("common.type")), render: function (r) { return U.escape(U.tv(r.type)); } },
        { label: U.escape(T("common.description")), render: function (r) {
          return '<span class="sbt-muted">' + U.escape(r.description || "—") + "</span>";
        }},
        { label: U.escape(T("common.sale")), align: "right", render: function (r) {
          return r.debit ? U.currency(r.debit) : "—";
        }},
        { label: U.escape(T("common.received")), align: "right", render: function (r) {
          return r.credit ? U.currency(r.credit) : "—";
        }},
        { label: U.escape(T("common.balance")), align: "right", render: function (r) {
          return '<span class="sbt-strong">' + U.currency(r.balance) + "</span>";
        }}
      ],
      rows: ledger,
      totals: { balance: ledger.length ? ledger[ledger.length - 1].balance : 0 }
    };
  }

  function buildStock() {
    const list = C.stockList().map(function (item) {
      const rate = C.avgPurchaseRate(item.name);
      return Object.assign({}, item, {
        avgRate: U.round(rate, 2),
        stockValue: U.round(item.stock * rate)
      });
    });

    return {
      title: T("rep.stockRegister"),
      columns: [
        { label: U.escape(T("common.material")), render: function (r) { return U.escape(r.name); } },
        { label: U.escape(T("common.unit")), render: function (r) { return U.escape(U.tv(r.unit)); } },
        { label: U.escape(T("stk.purchased")), align: "right", render: function (r) { return U.qty(r.purchased); } },
        { label: U.escape(T("stk.sold")), align: "right", render: function (r) { return U.qty(r.sold); } },
        { label: U.escape(T("stk.adjusted")), align: "right", render: function (r) { return U.qty(r.adjusted); } },
        { label: U.escape(T("stk.inStock")), align: "right", render: function (r) {
          return '<span class="sbt-strong">' + U.qty(r.stock) + "</span>";
        }},
        { label: U.escape(T("stk.minLevel")), align: "right", render: function (r) { return U.qty(r.minStock); } },
        { label: U.escape(T("stk.avgRate")), align: "right", render: function (r) { return U.currency(r.avgRate); } },
        { label: U.escape(T("stk.value")), align: "right", render: function (r) { return U.currency(r.stockValue); } },
        { label: U.escape(T("common.status")), render: function (r) { return U.stockBadge(r.stock, r.minStock); } }
      ],
      rows: list,
      totals: { value: U.sum(list, function (r) { return r.stockValue; }) }
    };
  }

  function buildPayments() {
    const list = U.sortBy(SBT.store.list("payments").filter(function (r) {
      return U.inRange(r.date, state.from, state.to);
    }), "date", true);

    return {
      title: T("rep.paymentRegister"),
      columns: [
        { label: U.escape(T("common.date")), render: function (r) { return U.formatDate(r.date); } },
        { label: U.escape(T("rep.partyType")), render: function (r) { return U.escape(U.tv(r.partyType)); } },
        { label: U.escape(T("common.party")), render: function (r) { return U.escape(r.partyName); } },
        { label: U.escape(T("common.mode")), render: function (r) { return U.escape(U.tv(r.mode) || "—"); } },
        { label: U.escape(T("common.reference")), render: function (r) { return U.escape(r.reference || "—"); } },
        { label: U.escape(T("common.amount")), align: "right", render: function (r) {
          const isIn = r.partyType === "Customer";
          return '<span class="' + (isIn ? "sbt-text-success" : "sbt-text-danger") + ' sbt-strong">' +
            (isIn ? "+" : "−") + U.currency(r.amount) + "</span>";
        }}
      ],
      rows: list,
      totals: {
        received: U.sum(list.filter(function (r) { return r.partyType === "Customer"; }),
          function (r) { return r.amount; }),
        paid: U.sum(list.filter(function (r) { return r.partyType === "Supplier"; }),
          function (r) { return r.amount; })
      }
    };
  }

  function buildExpenses() {
    const list = U.sortBy(SBT.store.list("expenses").filter(function (r) {
      return U.inRange(r.date, state.from, state.to);
    }), "date", true);

    return {
      title: T("rep.expenseRegister"),
      columns: [
        { label: U.escape(T("common.date")), render: function (r) { return U.formatDate(r.date); } },
        { label: U.escape(T("common.category")), render: function (r) { return U.escape(U.tv(r.category) || "—"); } },
        { label: U.escape(T("common.description")), render: function (r) { return U.escape(r.description || "—"); } },
        { label: U.escape(T("exp.paidTo")), render: function (r) { return U.escape(r.paidTo || "—"); } },
        { label: U.escape(T("common.purchase")), render: function (r) { return App.purchaseRefCell(r.purchaseId); } },
        { label: U.escape(T("common.mode")), render: function (r) { return U.escape(U.tv(r.paymentMode) || "—"); } },
        { label: U.escape(T("common.amount")), align: "right", render: function (r) {
          return '<span class="sbt-strong sbt-text-danger">' + U.currency(r.amount) + "</span>";
        }}
      ],
      rows: list,
      totals: { total: U.sum(list, function (r) { return r.amount; }) }
    };
  }

  function build() {
    switch (state.type) {
      case "purchase": return buildPurchase();
      case "sales": return buildSales();
      case "profit-loss": return buildProfitLoss();
      case "supplier-ledger": return buildSupplierLedger();
      case "customer-ledger": return buildCustomerLedger();
      case "stock": return buildStock();
      case "payments": return buildPayments();
      case "expenses": return buildExpenses();
      default: return buildSales();
    }
  }

  function partyOptions() {
    if (state.type === "supplier-ledger") {
      return C.supplierList().map(function (s) { return s.name; });
    }
    if (state.type === "customer-ledger") {
      return C.customerList().map(function (c) { return c.name; });
    }
    return [];
  }

  function render() {
    const report = build();
    current = report;
    const needsParty = state.type === "supplier-ledger" || state.type === "customer-ledger";
    const parties = partyOptions();
    const periodLabel = state.from
      ? U.formatDate(state.from) + " – " + U.formatDate(state.to)
      : T("common.allTime");

    return (
      App.pageHead(
        T("rep.title"),
        T("rep.subtitle"),
        '<button type="button" class="sbt-btn sbt-btn--outline" id="repCSV">' +
          '<i class="bi bi-filetype-csv"></i> CSV</button>' +
        '<button type="button" class="sbt-btn sbt-btn--outline" id="repExcel">' +
          '<i class="bi bi-file-earmark-excel"></i> Excel</button>' +
        '<button type="button" class="sbt-btn sbt-btn--primary" id="repPrint">' +
          '<i class="bi bi-printer"></i> ' + U.escape(T("common.print")) + '</button>'
      ) +

      App.card({
        body:
          '<div class="sbt-toolbar" style="margin-bottom:0">' +
            '<div class="sbt-field">' +
              '<label for="repType">' + U.escape(T("rep.reportType")) + '</label>' +
              '<select class="sbt-select" id="repType">' +
                REPORTS.map(function (r) {
                  return '<option value="' + r.id + '"' +
                    (state.type === r.id ? " selected" : "") + ">" + U.escape(T(r.labelKey)) + "</option>";
                }).join("") +
              "</select>" +
            "</div>" +
            (needsParty ?
              '<div class="sbt-field">' +
                '<label for="repParty">' + U.escape(T("rep.party")) + '</label>' +
                '<select class="sbt-select" id="repParty">' +
                  (parties.length
                    ? parties.map(function (p) {
                        return '<option value="' + U.escape(p) + '"' +
                          (state.party === p ? " selected" : "") + ">" + U.escape(p) + "</option>";
                      }).join("")
                    : '<option value="">' + U.escape(T("rep.noRecords")) + "</option>") +
                "</select>" +
              "</div>" : "") +
            UI.dateRangeToolbar("rep", { defaultPreset: state.preset }) +
          "</div>"
      }) +

      '<div style="margin-top:1rem">' +
        App.card({
          title: report.title,
          subtitle: periodLabel + " · " + T("common.rowsCount", { n: report.rows.length }),
          flush: true,
          body: UI.table({
            compact: true,
            columns: report.columns,
            rows: report.rows,
            empty: { icon: "bi-file-earmark-bar-graph", title: T("rep.noData"),
              message: T("rep.noDataMsg") }
          })
        }) +
      "</div>"
    );
  }

  function exportRows() {
    const report = current;
    const headers = report.columns.map(function (c) { return c.label; });
    const rows = report.rows.map(function (row) {
      const obj = {};
      report.columns.forEach(function (col) {
        /* Use plain text extraction from rendered HTML */
        const html = typeof col.render === "function" ? col.render(row) : U.escape(row[col.key]);
        obj[col.label] = String(html).replace(/<[^>]*>/g, "").replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'").trim();
      });
      return obj;
    });
    return { headers: headers, rows: rows };
  }

  function mount() {
    const typeEl = document.getElementById("repType");
    if (typeEl) typeEl.addEventListener("change", function () {
      state.type = typeEl.value;
      state.party = "";
      refresh();
    });

    const partyEl = document.getElementById("repParty");
    if (partyEl) partyEl.addEventListener("change", function () {
      state.party = partyEl.value;
      refresh();
    });

    const rangeApi = UI.bindDateRange("rep", function (r) {
      state.from = r.from;
      state.to = r.to;
      state.preset = r.preset;
      refresh();
    }, state.preset);

    /* Seed state from the silently-applied initial range so the first
       render matches what the inputs show. */
    if (rangeApi && rangeApi.initial) {
      state.from = rangeApi.initial.from;
      state.to = rangeApi.initial.to;
      state.preset = rangeApi.initial.preset;
    }

    const csvBtn = document.getElementById("repCSV");
    if (csvBtn) csvBtn.addEventListener("click", function () {
      const data = exportRows();
      if (!data.rows.length) { UI.warn(T("common.nothingToExport")); return; }
      U.exportCSV("SBT-" + U.slug(current.title), data.rows, data.headers);
      UI.success(T("rep.csvExported"));
    });

    const excelBtn = document.getElementById("repExcel");
    if (excelBtn) excelBtn.addEventListener("click", function () {
      const data = exportRows();
      if (!data.rows.length) { UI.warn(T("common.nothingToExport")); return; }
      U.exportExcel("SBT-" + U.slug(current.title), data.rows, data.headers, current.title);
      UI.success(T("rep.excelExported"));
    });

    const printBtn = document.getElementById("repPrint");
    if (printBtn) printBtn.addEventListener("click", function () { window.print(); });
  }

  function refresh() {
    const content = document.getElementById("sbtContent");
    if (!content) return;
    content.innerHTML = render();
    mount();
  }

  App.reports = { render: render, mount: mount, refresh: refresh };
})(window);
