/* ==========================================================================
   SHREE BRAHMANI TRADERS — Profit & Loss
   ========================================================================== */
(function (global) {
  "use strict";

  const SBT = global.SBT;
  const U = SBT.utils;
  const App = SBT.app;
  const C = SBT.calc;
  const UI = SBT.ui;
  const Charts = SBT.charts;

  /* Seed the range up front so the very first render already matches the
     date inputs (which default to "This Month"). */
  const initialRange = U.rangePreset("month");
  let range = { from: initialRange.from, to: initialRange.to, preset: "month" };
  let chartRefs = [];

  function compute() {
    const sales = SBT.store.list("sales").filter(function (r) {
      return U.inRange(r.date, range.from, range.to);
    });
    const purchases = SBT.store.list("purchases").filter(function (r) {
      return U.inRange(r.date, range.from, range.to);
    });
    const expenses = SBT.store.list("expenses").filter(function (r) {
      return U.inRange(r.date, range.from, range.to);
    });

    /* Revenue excludes GST — GST collected is a liability, not income. */
    const revenue = U.sum(sales, function (r) { return C.salesNetRevenue(r); });
    const cogs = U.sum(sales, function (r) { return U.num(r.quantity) * C.avgPurchaseRate(r.materialName); });
    const grossProfit = U.round(revenue - cogs);
    const totalExpenses = U.sum(expenses, function (r) { return r.amount; });
    const netProfit = U.round(grossProfit - totalExpenses);
    const margin = revenue > 0 ? U.round((netProfit / revenue) * 100, 2) : 0;

    /* Expense breakdown by category */
    const catMap = {};
    expenses.forEach(function (r) {
      const key = r.category || "Miscellaneous";
      catMap[key] = (catMap[key] || 0) + U.num(r.amount);
    });
    const categories = Object.keys(catMap).map(function (k) {
      return { category: k, amount: U.round(catMap[k]) };
    }).sort(function (a, b) { return b.amount - a.amount; });

    /* Product-wise profitability */
    const prodMap = {};
    sales.forEach(function (r) {
      const key = r.materialName || "Unknown";
      if (!prodMap[key]) {
        prodMap[key] = { name: key, unit: r.unit || "", qty: 0, revenue: 0, cost: 0, profit: 0 };
      }
      prodMap[key].qty += U.num(r.quantity);
      prodMap[key].revenue += C.salesNetRevenue(r);
      prodMap[key].cost += U.num(r.quantity) * C.avgPurchaseRate(r.materialName);
    });
    const products = Object.keys(prodMap).map(function (k) {
      const p = prodMap[k];
      p.revenue = U.round(p.revenue);
      p.cost = U.round(p.cost);
      p.profit = U.round(p.revenue - p.cost);
      p.margin = p.revenue > 0 ? U.round((p.profit / p.revenue) * 100, 2) : 0;
      p.qty = U.round(p.qty, 3);
      return p;
    }).sort(function (a, b) { return b.profit - a.profit; });

    return {
      revenue: U.round(revenue),
      cogs: U.round(cogs),
      grossProfit: grossProfit,
      totalExpenses: U.round(totalExpenses),
      netProfit: netProfit,
      margin: margin,
      categories: categories,
      products: products,
      salesCount: sales.length,
      purchaseTotal: U.round(U.sum(purchases, function (r) { return C.purchaseTotal(r); })),
      expenseCount: expenses.length
    };
  }

  function render() {
    const d = compute();
    const periodLabel = range.from
      ? U.formatDate(range.from) + " – " + U.formatDate(range.to)
      : "All time";

    return (
      App.pageHead(
        "Profit & Loss",
        "Period: " + periodLabel,
        '<button type="button" class="sbt-btn sbt-btn--outline" id="plExport">' +
          '<i class="bi bi-file-earmark-excel"></i> Export</button>' +
        '<button type="button" class="sbt-btn sbt-btn--primary" id="plPrint">' +
          '<i class="bi bi-printer"></i> Print</button>'
      ) +

      App.card({
        body:
          '<div class="sbt-toolbar" style="margin-bottom:0">' +
            UI.dateRangeToolbar("pl", { defaultPreset: range.preset }) +
          "</div>"
      }) +

      '<div class="sbt-kpi-grid" style="margin-top:1rem">' +
        App.kpi({ label: "Revenue", variant: "navy", icon: "bi-receipt-cutoff",
          value: U.currency(d.revenue), meta: d.salesCount + " invoices" }) +
        App.kpi({ label: "Cost of Goods Sold", variant: "orange", icon: "bi-box-seam-fill",
          value: U.currency(d.cogs) }) +
        App.kpi({ label: "Gross Profit", variant: d.grossProfit >= 0 ? "green" : "red",
          icon: "bi-graph-up", value: U.currency(d.grossProfit),
          meta: d.revenue > 0 ? U.percent((d.grossProfit / d.revenue) * 100) + " of revenue" : "—" }) +
        App.kpi({ label: "Operating Expenses", variant: "amber", icon: "bi-wallet2",
          value: U.currency(d.totalExpenses), meta: d.expenseCount + " records" }) +
        App.kpi({ label: "Net Profit", variant: d.netProfit >= 0 ? "green" : "red",
          icon: "bi-graph-up-arrow", value: U.currency(d.netProfit),
          meta: U.percent(d.margin) + " net margin" }) +
      "</div>" +

      '<div class="sbt-grid-2" style="margin-bottom:1rem">' +
        App.card({
          title: "Profit & Loss Statement",
          subtitle: periodLabel,
          flush: true,
          body:
            '<div class="sbt-table-wrap"><table class="sbt-table sbt-table--compact">' +
              "<tbody>" +
                '<tr><td class="sbt-strong">Sales Revenue</td>' +
                  '<td class="num sbt-strong">' + U.currency(d.revenue) + "</td></tr>" +
                '<tr><td class="sbt-muted" style="padding-left:1.6rem">Less: Cost of Goods Sold</td>' +
                  '<td class="num sbt-text-danger">(' + U.currency(d.cogs) + ")</td></tr>" +
                '<tr style="background:var(--sbt-bg-soft)"><td class="sbt-strong">Gross Profit</td>' +
                  '<td class="num sbt-strong">' + U.currency(d.grossProfit) + "</td></tr>" +
                '<tr><td class="sbt-muted" style="padding-left:1.6rem">Less: Operating Expenses</td>' +
                  '<td class="num sbt-text-danger">(' + U.currency(d.totalExpenses) + ")</td></tr>" +
                d.categories.map(function (c) {
                  return '<tr><td class="sbt-muted" style="padding-left:2.6rem;font-size:.78rem">' +
                    U.escape(c.category) + "</td>" +
                    '<td class="num sbt-muted" style="font-size:.78rem">' + U.currency(c.amount) + "</td></tr>";
                }).join("") +
                '<tr style="background:var(--sbt-bg-soft);border-top:2px solid var(--sbt-border)">' +
                  '<td class="sbt-strong" style="font-size:.95rem">Net Profit</td>' +
                  '<td class="num sbt-strong ' + (d.netProfit >= 0 ? "sbt-text-success" : "sbt-text-danger") +
                    '" style="font-size:1rem">' + U.currency(d.netProfit) + "</td></tr>" +
                '<tr><td class="sbt-muted">Net Margin</td>' +
                  '<td class="num sbt-muted">' + U.percent(d.margin) + "</td></tr>" +
              "</tbody></table></div>"
        }) +
        App.card({
          title: "Expense Breakdown",
          subtitle: "Where the money went",
          body: d.categories.length
            ? '<div class="sbt-chart" id="plExpenseChart"></div>'
            : UI.emptyState("bi-pie-chart", "No expenses", "No expenses recorded in this period.")
        }) +
      "</div>" +

      App.card({
        title: "Product-wise Profitability",
        subtitle: "Revenue, cost and profit per material",
        flush: true,
        body: UI.table({
          compact: true,
          columns: [
            { label: "Material", render: function (r) {
              return '<div class="sbt-strong">' + U.escape(r.name) + "</div>" +
                '<div class="sbt-muted" style="font-size:.72rem">' + U.escape(r.unit) + "</div>";
            }},
            { label: "Qty Sold", align: "right", render: function (r) { return U.qty(r.qty); } },
            { label: "Revenue", align: "right", render: function (r) { return U.currency(r.revenue); } },
            { label: "Cost", align: "right", render: function (r) { return U.currency(r.cost); } },
            { label: "Profit", align: "right", render: function (r) {
              return '<span class="sbt-strong ' + (r.profit >= 0 ? "sbt-text-success" : "sbt-text-danger") + '">' +
                U.currency(r.profit) + "</span>";
            }},
            { label: "Margin", align: "right", render: function (r) {
              return '<span class="' + (r.margin >= 0 ? "sbt-text-success" : "sbt-text-danger") + '">' +
                U.percent(r.margin) + "</span>";
            }}
          ],
          rows: d.products,
          footer: d.products.length ?
            "<tr><td>Total</td><td></td>" +
            '<td class="num">' + U.currency(d.revenue) + "</td>" +
            '<td class="num">' + U.currency(d.cogs) + "</td>" +
            '<td class="num">' + U.currency(d.grossProfit) + "</td>" +
            '<td class="num">' + U.percent(d.revenue > 0 ? (d.grossProfit / d.revenue) * 100 : 0) + "</td></tr>" : "",
          empty: { icon: "bi-box-seam", title: "No sales in this period", message: "Adjust the date range or record sales." }
        })
      })
    );
  }

  function mount() {
    const d = compute();

    /* Expense doughnut */
    const expEl = document.getElementById("plExpenseChart");
    if (expEl && d.categories.length) {
      Charts.doughnut(expEl, {
        labels: d.categories.map(function (c) { return c.category; }),
        values: d.categories.map(function (c) { return c.amount; }),
        height: 260,
        centerText: "Expenses",
        centerValue: U.currencyShort(d.totalExpenses)
      });
    }

    const rangeApi = UI.bindDateRange("pl", function (r) {
      range = { from: r.from, to: r.to, preset: r.preset };
      refresh();
    }, range.preset);

    /* Seed range from the silently-applied initial range so the first
       render matches what the inputs show. */
    if (rangeApi && rangeApi.initial) {
      range = {
        from: rangeApi.initial.from,
        to: rangeApi.initial.to,
        preset: rangeApi.initial.preset
      };
    }

    const exportBtn = document.getElementById("plExport");
    if (exportBtn) exportBtn.addEventListener("click", function () {
      const data = compute();
      const rows = [
        { Item: "Sales Revenue", Amount: data.revenue },
        { Item: "Cost of Goods Sold", Amount: -data.cogs },
        { Item: "Gross Profit", Amount: data.grossProfit }
      ];
      data.categories.forEach(function (c) {
        rows.push({ Item: "Expense: " + c.category, Amount: -c.amount });
      });
      rows.push({ Item: "Net Profit", Amount: data.netProfit });
      U.exportExcel("SBT-ProfitLoss", rows, null,
        "Profit & Loss — " + (range.from ? range.from + " to " + range.to : "All time"));
      UI.success("P&L exported");
    });

    const printBtn = document.getElementById("plPrint");
    if (printBtn) printBtn.addEventListener("click", function () { window.print(); });
  }

  function refresh() {
    const content = document.getElementById("sbtContent");
    if (!content) return;
    content.innerHTML = render();
    mount();
  }

  App.profitLoss = { render: render, mount: mount, refresh: refresh };
})(window);
