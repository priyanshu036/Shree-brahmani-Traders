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

  function T(key, vars) { return U.t(key, vars); }

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
      : T("common.allTime");

    return (
      App.pageHead(
        T("pl.title"),
        T("pl.subtitle", { period: periodLabel }),
        '<button type="button" class="sbt-btn sbt-btn--outline" id="plExport">' +
          '<i class="bi bi-file-earmark-excel"></i> ' + U.escape(T("common.export")) + '</button>' +
        '<button type="button" class="sbt-btn sbt-btn--primary" id="plPrint">' +
          '<i class="bi bi-printer"></i> ' + U.escape(T("common.print")) + '</button>'
      ) +

      App.card({
        body:
          '<div class="sbt-toolbar" style="margin-bottom:0">' +
            UI.dateRangeToolbar("pl", { defaultPreset: range.preset }) +
          "</div>"
      }) +

      '<div class="sbt-kpi-grid" style="margin-top:1rem">' +
        App.kpi({ label: T("pl.revenue"), variant: "navy", icon: "bi-receipt-cutoff",
          value: U.currency(d.revenue), meta: T("common.invoicesCount", { n: d.salesCount }) }) +
        App.kpi({ label: T("pl.cogs"), variant: "orange", icon: "bi-box-seam-fill",
          value: U.currency(d.cogs) }) +
        App.kpi({ label: T("pl.grossProfit"), variant: d.grossProfit >= 0 ? "green" : "red",
          icon: "bi-graph-up", value: U.currency(d.grossProfit),
          meta: d.revenue > 0 ? T("pl.ofRevenue", { value: U.percent((d.grossProfit / d.revenue) * 100) }) : "—" }) +
        App.kpi({ label: T("pl.operatingExpenses"), variant: "amber", icon: "bi-wallet2",
          value: U.currency(d.totalExpenses), meta: T("common.recordsCount", { n: d.expenseCount }) }) +
        App.kpi({ label: T("pl.netProfit"), variant: d.netProfit >= 0 ? "green" : "red",
          icon: "bi-graph-up-arrow", value: U.currency(d.netProfit),
          meta: T("pl.netMargin", { value: U.percent(d.margin) }) }) +
      "</div>" +

      '<div class="sbt-grid-2" style="margin-bottom:1rem">' +
        App.card({
          title: T("pl.statement"),
          subtitle: periodLabel,
          flush: true,
          body:
            '<div class="sbt-table-wrap"><table class="sbt-table sbt-table--compact">' +
              "<tbody>" +
                '<tr><td class="sbt-strong">' + U.escape(T("pl.salesRevenue")) + '</td>' +
                  '<td class="num sbt-strong">' + U.currency(d.revenue) + "</td></tr>" +
                '<tr><td class="sbt-muted" style="padding-left:1.6rem">' + U.escape(T("pl.lessCogs")) + '</td>' +
                  '<td class="num sbt-text-danger">(' + U.currency(d.cogs) + ")</td></tr>" +
                '<tr style="background:var(--sbt-bg-soft)"><td class="sbt-strong">' +
                  U.escape(T("pl.grossProfit")) + '</td>' +
                  '<td class="num sbt-strong">' + U.currency(d.grossProfit) + "</td></tr>" +
                '<tr><td class="sbt-muted" style="padding-left:1.6rem">' + U.escape(T("pl.lessExpenses")) + '</td>' +
                  '<td class="num sbt-text-danger">(' + U.currency(d.totalExpenses) + ")</td></tr>" +
                d.categories.map(function (c) {
                  return '<tr><td class="sbt-muted" style="padding-left:2.6rem;font-size:.78rem">' +
                    U.escape(U.tv(c.category)) + "</td>" +
                    '<td class="num sbt-muted" style="font-size:.78rem">' + U.currency(c.amount) + "</td></tr>";
                }).join("") +
                '<tr style="background:var(--sbt-bg-soft);border-top:2px solid var(--sbt-border)">' +
                  '<td class="sbt-strong" style="font-size:.95rem">' + U.escape(T("pl.netProfit")) + '</td>' +
                  '<td class="num sbt-strong ' + (d.netProfit >= 0 ? "sbt-text-success" : "sbt-text-danger") +
                    '" style="font-size:1rem">' + U.currency(d.netProfit) + "</td></tr>" +
                '<tr><td class="sbt-muted">' + U.escape(T("pl.netMarginRow")) + '</td>' +
                  '<td class="num sbt-muted">' + U.percent(d.margin) + "</td></tr>" +
              "</tbody></table></div>"
        }) +
        App.card({
          title: T("pl.expenseBreakdown"),
          subtitle: T("pl.whereMoneyWent"),
          body: d.categories.length
            ? '<div class="sbt-chart" id="plExpenseChart"></div>'
            : UI.emptyState("bi-pie-chart", T("pl.noExpenses"), T("pl.noExpensesMsg"))
        }) +
      "</div>" +

      App.card({
        title: T("pl.productProfitability"),
        subtitle: T("pl.productProfitabilitySubtitle"),
        flush: true,
        body: UI.table({
          compact: true,
          columns: [
            { label: U.escape(T("common.material")), render: function (r) {
              return '<div class="sbt-strong">' + U.escape(r.name) + "</div>" +
                '<div class="sbt-muted" style="font-size:.72rem">' + U.escape(U.tv(r.unit)) + "</div>";
            }},
            { label: U.escape(T("pl.qtySold")), align: "right", render: function (r) { return U.qty(r.qty); } },
            { label: U.escape(T("pl.revenue")), align: "right", render: function (r) { return U.currency(r.revenue); } },
            { label: U.escape(T("pl.cost")), align: "right", render: function (r) { return U.currency(r.cost); } },
            { label: U.escape(T("pl.profit")), align: "right", render: function (r) {
              return '<span class="sbt-strong ' + (r.profit >= 0 ? "sbt-text-success" : "sbt-text-danger") + '">' +
                U.currency(r.profit) + "</span>";
            }},
            { label: U.escape(T("pl.margin")), align: "right", render: function (r) {
              return '<span class="' + (r.margin >= 0 ? "sbt-text-success" : "sbt-text-danger") + '">' +
                U.percent(r.margin) + "</span>";
            }}
          ],
          rows: d.products,
          footer: d.products.length ?
            "<tr><td>" + U.escape(T("common.total")) + "</td><td></td>" +
            '<td class="num">' + U.currency(d.revenue) + "</td>" +
            '<td class="num">' + U.currency(d.cogs) + "</td>" +
            '<td class="num">' + U.currency(d.grossProfit) + "</td>" +
            '<td class="num">' + U.percent(d.revenue > 0 ? (d.grossProfit / d.revenue) * 100 : 0) + "</td></tr>" : "",
          empty: { icon: "bi-box-seam", title: T("pl.noSalesInPeriod"), message: T("pl.noSalesInPeriodMsg") }
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
        labels: d.categories.map(function (c) { return U.tv(c.category); }),
        values: d.categories.map(function (c) { return c.amount; }),
        height: 260,
        centerText: T("pl.expenses"),
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
        { [T("pl.item")]: T("pl.salesRevenue"), [T("pl.amount")]: data.revenue },
        { [T("pl.item")]: T("pl.cogs"), [T("pl.amount")]: -data.cogs },
        { [T("pl.item")]: T("pl.grossProfit"), [T("pl.amount")]: data.grossProfit }
      ];
      data.categories.forEach(function (c) {
        rows.push({ [T("pl.item")]: T("pl.expensePrefix", { category: U.tv(c.category) }),
          [T("pl.amount")]: -c.amount });
      });
      rows.push({ [T("pl.item")]: T("pl.netProfit"), [T("pl.amount")]: data.netProfit });
      U.exportExcel("SBT-ProfitLoss", rows, null,
        T("pl.title") + " — " + (range.from ? range.from + " – " + range.to : T("common.allTime")));
      UI.success(T("pl.exported"));
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
