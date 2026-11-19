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

  const REPORTS = [
    { id: "purchase", label: "Purchase Register", icon: "bi-cart-plus-fill" },
    { id: "sales", label: "Sales Register", icon: "bi-receipt-cutoff" },
    { id: "profit-loss", label: "Profit & Loss", icon: "bi-graph-up-arrow" },
    { id: "supplier-ledger", label: "Supplier Ledger", icon: "bi-truck" },
    { id: "customer-ledger", label: "Customer Ledger", icon: "bi-people-fill" },
    { id: "stock", label: "Stock Register", icon: "bi-boxes" },
    { id: "payments", label: "Payment Register", icon: "bi-cash-coin" },
    { id: "expenses", label: "Expense Register", icon: "bi-wallet2" }
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
      title: "Purchase Register",
      columns: [
        { label: "Date", render: function (r) { return U.formatDate(r.date); } },
        { label: "Supplier", render: function (r) { return U.escape(r.supplierName || "—"); } },
        { label: "Material", render: function (r) { return U.escape(r.materialName || "—"); } },
        { label: "Qty", align: "right", render: function (r) {
          return U.qty(r.quantity) + " " + U.escape(r.unit || "");
        }},
        { label: "Rate", align: "right", render: function (r) { return U.currency(r.purchaseRate); } },
        { label: "Base", align: "right", render: function (r) { return U.currency(C.purchaseBase(r)); } },
        { label: "Expenses", align: "right", render: function (r) { return U.currency(C.purchaseExpenses(r)); } },
        { label: "Total", align: "right", render: function (r) {
          return "<strong>" + U.currency(C.purchaseTotal(r)) + "</strong>";
        }},
        { label: "Paid", align: "right", render: function (r) { return U.currency(C.purchasePaid(r)); } },
        { label: "Due", align: "right", render: function (r) {
          const d = C.purchaseDue(r);
          return d > 0 ? '<span class="sbt-text-danger">' + U.currency(d) + "</span>" : "—";
        }},
        { label: "Status", render: function (r) { return U.paymentBadge(r.paymentStatus); } }
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
      title: "Sales Register",
      columns: [
        { label: "Date", render: function (r) { return U.formatDate(r.date); } },
        { label: "Invoice", render: function (r) {
          return '<span class="sbt-mono">' + U.escape(r.invoiceNo || "—") + "</span>";
        }},
        { label: "Customer", render: function (r) { return U.escape(r.customerName || "—"); } },
        { label: "Material", render: function (r) { return U.escape(r.materialName || "—"); } },
        { label: "Qty", align: "right", render: function (r) {
          return U.qty(r.quantity) + " " + U.escape(r.unit || "");
        }},
        { label: "Rate", align: "right", render: function (r) { return U.currency(r.sellingRate); } },
        { label: "Gross", align: "right", render: function (r) { return U.currency(C.salesGross(r)); } },
        { label: "GST", align: "right", render: function (r) { return U.currency(C.salesGst(r)); } },
        { label: "Final", align: "right", render: function (r) {
          return "<strong>" + U.currency(C.salesFinal(r)) + "</strong>";
        }},
        { label: "Paid", align: "right", render: function (r) { return U.currency(C.salesPaid(r)); } },
        { label: "Due", align: "right", render: function (r) {
          const d = C.salesDue(r);
          return d > 0 ? '<span class="sbt-text-danger">' + U.currency(d) + "</span>" : "—";
        }},
        { label: "Profit", align: "right", render: function (r) {
          const p = C.saleNetProfit(r);
          return '<span class="' + (p >= 0 ? "sbt-text-success" : "sbt-text-danger") + '">' +
            U.currency(p) + "</span>";
        }},
        { label: "Status", render: function (r) { return U.paymentBadge(r.paymentStatus); } }
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
      { item: "Sales Revenue", amount: t.totalSales, kind: "head" },
      { item: "Less: Cost of Goods Sold", amount: -U.round(t.totalSales - t.grossProfit), kind: "sub" },
      { item: "Gross Profit", amount: t.grossProfit, kind: "total" },
      { item: "Less: Operating Expenses", amount: -t.totalExpenses, kind: "sub" }
    ];
    Object.keys(catMap).sort(function (a, b) { return catMap[b] - catMap[a]; }).forEach(function (k) {
      rows.push({ item: "   " + k, amount: -U.round(catMap[k]), kind: "detail" });
    });
    rows.push({ item: "Net Profit", amount: t.netProfit, kind: "grand" });

    return {
      title: "Profit & Loss Statement",
      columns: [
        { label: "Particulars", render: function (r) {
          const cls = r.kind === "grand" || r.kind === "total" ? "sbt-strong" :
            (r.kind === "detail" ? "sbt-muted" : "");
          return '<span class="' + cls + '">' + U.escape(r.item) + "</span>";
        }},
        { label: "Amount", align: "right", render: function (r) {
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
      title: "Supplier Ledger — " + (name || "No supplier"),
      columns: [
        { label: "Date", render: function (r) { return U.formatDate(r.date); } },
        { label: "Type", render: function (r) { return U.escape(r.type); } },
        { label: "Description", render: function (r) {
          return '<span class="sbt-muted">' + U.escape(r.description || "—") + "</span>";
        }},
        { label: "Purchase", align: "right", render: function (r) {
          return r.credit ? U.currency(r.credit) : "—";
        }},
        { label: "Paid", align: "right", render: function (r) {
          return r.debit ? U.currency(r.debit) : "—";
        }},
        { label: "Balance", align: "right", render: function (r) {
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
      title: "Customer Ledger — " + (name || "No customer"),
      columns: [
        { label: "Date", render: function (r) { return U.formatDate(r.date); } },
        { label: "Type", render: function (r) { return U.escape(r.type); } },
        { label: "Description", render: function (r) {
          return '<span class="sbt-muted">' + U.escape(r.description || "—") + "</span>";
        }},
        { label: "Sale", align: "right", render: function (r) {
          return r.debit ? U.currency(r.debit) : "—";
        }},
        { label: "Received", align: "right", render: function (r) {
          return r.credit ? U.currency(r.credit) : "—";
        }},
        { label: "Balance", align: "right", render: function (r) {
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
      title: "Stock Register",
      columns: [
        { label: "Material", render: function (r) { return U.escape(r.name); } },
        { label: "Unit", render: function (r) { return U.escape(r.unit); } },
        { label: "Purchased", align: "right", render: function (r) { return U.qty(r.purchased); } },
        { label: "Sold", align: "right", render: function (r) { return U.qty(r.sold); } },
        { label: "Adjusted", align: "right", render: function (r) { return U.qty(r.adjusted); } },
        { label: "In Stock", align: "right", render: function (r) {
          return '<span class="sbt-strong">' + U.qty(r.stock) + "</span>";
        }},
        { label: "Min", align: "right", render: function (r) { return U.qty(r.minStock); } },
        { label: "Avg Rate", align: "right", render: function (r) { return U.currency(r.avgRate); } },
        { label: "Value", align: "right", render: function (r) { return U.currency(r.stockValue); } },
        { label: "Status", render: function (r) { return U.stockBadge(r.stock, r.minStock); } }
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
      title: "Payment Register",
      columns: [
        { label: "Date", render: function (r) { return U.formatDate(r.date); } },
        { label: "Party Type", render: function (r) { return U.escape(r.partyType); } },
        { label: "Party", render: function (r) { return U.escape(r.partyName); } },
        { label: "Mode", render: function (r) { return U.escape(r.mode || "—"); } },
        { label: "Reference", render: function (r) { return U.escape(r.reference || "—"); } },
        { label: "Amount", align: "right", render: function (r) {
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
      title: "Expense Register",
      columns: [
        { label: "Date", render: function (r) { return U.formatDate(r.date); } },
        { label: "Category", render: function (r) { return U.escape(r.category || "—"); } },
        { label: "Description", render: function (r) { return U.escape(r.description || "—"); } },
        { label: "Paid To", render: function (r) { return U.escape(r.paidTo || "—"); } },
        { label: "Mode", render: function (r) { return U.escape(r.paymentMode || "—"); } },
        { label: "Amount", align: "right", render: function (r) {
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
      : "All time";

    return (
      App.pageHead(
        "Reports",
        "Generate and export business reports",
        '<button type="button" class="sbt-btn sbt-btn--outline" id="repCSV">' +
          '<i class="bi bi-filetype-csv"></i> CSV</button>' +
        '<button type="button" class="sbt-btn sbt-btn--outline" id="repExcel">' +
          '<i class="bi bi-file-earmark-excel"></i> Excel</button>' +
        '<button type="button" class="sbt-btn sbt-btn--primary" id="repPrint">' +
          '<i class="bi bi-printer"></i> Print</button>'
      ) +

      App.card({
        body:
          '<div class="sbt-toolbar" style="margin-bottom:0">' +
            '<div class="sbt-field">' +
              '<label for="repType">Report Type</label>' +
              '<select class="sbt-select" id="repType">' +
                REPORTS.map(function (r) {
                  return '<option value="' + r.id + '"' +
                    (state.type === r.id ? " selected" : "") + ">" + U.escape(r.label) + "</option>";
                }).join("") +
              "</select>" +
            "</div>" +
            (needsParty ?
              '<div class="sbt-field">' +
                '<label for="repParty">Party</label>' +
                '<select class="sbt-select" id="repParty">' +
                  (parties.length
                    ? parties.map(function (p) {
                        return '<option value="' + U.escape(p) + '"' +
                          (state.party === p ? " selected" : "") + ">" + U.escape(p) + "</option>";
                      }).join("")
                    : '<option value="">No records</option>') +
                "</select>" +
              "</div>" : "") +
            UI.dateRangeToolbar("rep", { defaultPreset: state.preset }) +
          "</div>"
      }) +

      '<div style="margin-top:1rem">' +
        App.card({
          title: report.title,
          subtitle: periodLabel + " · " + report.rows.length + " rows",
          flush: true,
          body: UI.table({
            compact: true,
            columns: report.columns,
            rows: report.rows,
            empty: { icon: "bi-file-earmark-bar-graph", title: "No data for this report",
              message: "Adjust the date range or add transactions." }
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
      if (!data.rows.length) { UI.warn("Nothing to export"); return; }
      U.exportCSV("SBT-" + U.slug(current.title), data.rows, data.headers);
      UI.success("CSV exported");
    });

    const excelBtn = document.getElementById("repExcel");
    if (excelBtn) excelBtn.addEventListener("click", function () {
      const data = exportRows();
      if (!data.rows.length) { UI.warn("Nothing to export"); return; }
      U.exportExcel("SBT-" + U.slug(current.title), data.rows, data.headers, current.title);
      UI.success("Excel exported");
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
