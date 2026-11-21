/* ==========================================================================
   SHREE BRAHMANI TRADERS — Dashboard
   ========================================================================== */
(function (global) {
  "use strict";

  const SBT = global.SBT;
  const U = SBT.utils;
  const App = SBT.app;
  const C = SBT.calc;
  const Charts = SBT.charts;

  function T(key, vars) { return U.t(key, vars); }

  let range = { from: "", to: "" };
  let chartRefs = [];

  function render() {
    const t = C.totals(range);
    const stock = C.stockList();
    const lowStock = C.lowStockItems();
    const customers = C.customerList();
    const suppliers = C.supplierList();

    const topCustomers = U.sortBy(customers, "totalSales", true).slice(0, 5);
    const topSuppliers = U.sortBy(suppliers, "totalPurchase", true).slice(0, 5);
    const recentSales = U.sortBy(SBT.store.list("sales"), "date", true).slice(0, 6);
    const recentPurchases = U.sortBy(SBT.store.list("purchases"), "date", true).slice(0, 6);

    return (
      App.pageHead(
        T("nav.dashboard"),
        T("dash.overviewFor", {
          period: range.from
            ? U.formatDate(range.from) + " – " + U.formatDate(range.to)
            : T("range.allTime")
        }),
        '<button type="button" class="sbt-btn sbt-btn--outline" id="dashExport">' +
          '<i class="bi bi-download"></i> ' + U.escape(T("dash.exportSummary")) + '</button>' +
        '<a class="sbt-btn sbt-btn--accent" href="sales.html">' +
          '<i class="bi bi-plus-lg"></i> ' + U.escape(T("dash.newSale")) + '</a>'
      ) +

      /* KPI grid */
      '<div class="sbt-kpi-grid">' +
        App.kpi({
          label: T("dash.totalSales"), variant: "navy", icon: "bi-receipt-cutoff",
          value: U.currency(t.totalSales),
          meta: '<i class="bi bi-arrow-up-right"></i> ' + U.escape(T("common.invoicesCount", { n: t.salesCount }))
        }) +
        App.kpi({
          label: T("dash.totalPurchase"), variant: "orange", icon: "bi-cart-plus-fill",
          value: U.currency(t.totalPurchase),
          meta: '<i class="bi bi-box-arrow-in-down"></i> ' + U.escape(T("common.entriesCount", { n: t.purchaseCount }))
        }) +
        App.kpi({
          label: T("dash.totalExpenses"), variant: "amber", icon: "bi-wallet2",
          value: U.currency(t.totalExpenses),
          meta: '<i class="bi bi-journal-text"></i> ' + U.escape(T("common.recordsCount", { n: t.expenseCount }))
        }) +
        App.kpi({
          label: T("dash.grossProfit"), variant: "blue", icon: "bi-graph-up",
          value: U.currency(t.grossProfit),
          meta: U.escape(T("dash.salesMinusPurchase"))
        }) +
        App.kpi({
          label: T("dash.netProfit"), variant: t.netProfit >= 0 ? "green" : "red",
          icon: "bi-graph-up-arrow",
          value: U.currency(t.netProfit),
          meta: '<span class="' + (t.netProfit >= 0 ? "up" : "down") + '">' +
            U.percent(t.margin) + "</span> " + U.escape(T("dash.margin"))
        }) +
        App.kpi({
          label: T("dash.stockValue"), variant: "navy", icon: "bi-boxes",
          value: U.currency(t.stockValue),
          meta: U.escape(T("dash.productsTracked", { count: stock.length }))
        }) +
        App.kpi({
          label: T("dash.customerPending"), variant: "red", icon: "bi-person-dash-fill",
          value: U.currency(t.customerPending),
          meta: U.escape(T("dash.customersDue", {
            count: customers.filter(function (c) { return c.pending > 0; }).length
          }))
        }) +
        App.kpi({
          label: T("dash.supplierOutstanding"), variant: "amber", icon: "bi-truck",
          value: U.currency(t.supplierOutstanding),
          meta: U.escape(T("dash.suppliersDue", {
            count: suppliers.filter(function (s) { return s.balance > 0; }).length
          }))
        }) +
      "</div>" +

      /* Charts row 1 */
      '<div class="sbt-grid-2" style="margin-bottom:1rem">' +
        App.card({
          title: T("dash.monthlySalesVsPurchases"),
          subtitle: T("dash.last6Months"),
          body: '<div class="sbt-chart" id="chartSalesPurchase"></div>' +
            '<div class="sbt-chart__legend">' +
              '<span><i style="background:' + SBT.config.palette.navy + '"></i> ' + U.escape(T("dash.sales")) + '</span>' +
              '<span><i style="background:' + SBT.config.palette.orange + '"></i> ' + U.escape(T("dash.purchases")) + '</span>' +
            "</div>"
        }) +
        App.card({
          title: T("dash.monthlyProfitTrend"),
          subtitle: T("dash.netProfitAfterExpenses"),
          body: '<div class="sbt-chart" id="chartProfit"></div>' +
            '<div class="sbt-chart__legend">' +
              '<span><i style="background:' + SBT.config.palette.green + '"></i> ' + U.escape(T("dash.netProfit")) + '</span>' +
            "</div>"
        }) +
      "</div>" +

      /* Charts row 2 */
      '<div class="sbt-grid-2" style="margin-bottom:1rem">' +
        App.card({
          title: T("dash.productWiseSales"),
          subtitle: T("dash.revenueShare"),
          body: '<div class="sbt-chart" id="chartProductSales"></div>'
        }) +
        App.card({
          title: T("dash.currentStockLevels"),
          subtitle: T("dash.availableQty"),
          body: '<div class="sbt-chart" id="chartStock"></div>'
        }) +
      "</div>" +

      /* Low stock alert */
      (lowStock.length ?
        App.card({
          title: T("dash.lowStockAlerts"),
          subtitle: T("dash.needRestocking", { count: lowStock.length }),
          actions: '<a class="sbt-btn sbt-btn--sm sbt-btn--outline" href="stock.html">' +
            U.escape(T("dash.manageStock")) + '</a>',
          flush: true,
          body: SBT.ui.table({
            compact: true,
            columns: [
              { label: U.escape(T("dash.product")), render: function (r) { return "<strong>" + U.escape(r.name) + "</strong>"; } },
              { label: U.escape(T("dash.available")), align: "right", render: function (r) { return U.qty(r.stock) + " " + U.escape(U.tv(r.unit)); } },
              { label: U.escape(T("dash.minimum")), align: "right", render: function (r) { return U.qty(r.minStock) + " " + U.escape(U.tv(r.unit)); } },
              { label: U.escape(T("common.status")), render: function (r) { return U.stockBadge(r.stock, r.minStock); } }
            ],
            rows: lowStock
          })
        }) + '<div style="height:1rem"></div>' : "") +

      /* Recent activity */
      '<div class="sbt-grid-2">' +
        App.card({
          title: T("dash.recentSales"),
          subtitle: T("dash.latestInvoices"),
          actions: '<a class="sbt-btn sbt-btn--sm sbt-btn--ghost" href="sales.html">' +
            U.escape(T("dash.viewAll")) + '</a>',
          flush: true,
          body: SBT.ui.table({
            compact: true,
            columns: [
              { label: U.escape(T("common.invoice")), render: function (r) {
                return '<span class="sbt-mono sbt-strong">' + U.escape(r.invoiceNo || "—") + "</span>";
              }},
              { label: U.escape(T("common.customer")), render: function (r) { return U.escape(r.customerName || "—"); } },
              { label: U.escape(T("common.date")), render: function (r) { return U.formatDate(r.date); } },
              { label: U.escape(T("common.amount")), align: "right", render: function (r) {
                return "<strong>" + U.currency(C.salesFinal(r)) + "</strong>";
              }},
              { label: U.escape(T("common.status")), render: function (r) { return U.paymentBadge(r.paymentStatus); } }
            ],
            rows: recentSales,
            empty: { icon: "bi-receipt", title: T("dash.noSalesYet"), message: T("dash.noSalesYetMsg") }
          })
        }) +
        App.card({
          title: T("dash.recentPurchases"),
          subtitle: T("dash.latestSupplierEntries"),
          actions: '<a class="sbt-btn sbt-btn--sm sbt-btn--ghost" href="purchases.html">' +
            U.escape(T("dash.viewAll")) + '</a>',
          flush: true,
          body: SBT.ui.table({
            compact: true,
            columns: [
              { label: U.escape(T("common.supplier")), render: function (r) { return U.escape(r.supplierName || "—"); } },
              { label: U.escape(T("common.material")), render: function (r) { return U.escape(r.materialName || "—"); } },
              { label: U.escape(T("common.date")), render: function (r) { return U.formatDate(r.date); } },
              { label: U.escape(T("common.amount")), align: "right", render: function (r) {
                return "<strong>" + U.currency(C.purchaseTotal(r)) + "</strong>";
              }},
              { label: U.escape(T("common.status")), render: function (r) { return U.paymentBadge(r.paymentStatus); } }
            ],
            rows: recentPurchases,
            empty: { icon: "bi-cart", title: T("dash.noPurchasesYet"), message: T("dash.noPurchasesYetMsg") }
          })
        }) +
      "</div>" +

      /* Top parties */
      '<div class="sbt-grid-2" style="margin-top:1rem">' +
        App.card({
          title: T("dash.topCustomers"),
          subtitle: T("dash.byTotalSales"),
          flush: true,
          body: SBT.ui.table({
            compact: true,
            columns: [
              { label: U.escape(T("common.customer")), render: function (r) { return SBT.ui.partyCell(r.name, r.mobile); } },
              { label: U.escape(T("dash.sales")), align: "right", render: function (r) { return U.currency(r.totalSales); } },
              { label: U.escape(T("common.due")), align: "right", render: function (r) {
                return r.pending > 0
                  ? '<span class="sbt-text-danger sbt-strong">' + U.currency(r.pending) + "</span>"
                  : '<span class="sbt-text-success">' + U.escape(T("badge.settled")) + "</span>";
              }}
            ],
            rows: topCustomers,
            empty: { icon: "bi-people", title: T("dash.noCustomersYet"), message: T("dash.noCustomersYetMsg") }
          })
        }) +
        App.card({
          title: T("dash.topSuppliers"),
          subtitle: T("dash.byTotalPurchase"),
          flush: true,
          body: SBT.ui.table({
            compact: true,
            columns: [
              { label: U.escape(T("common.supplier")), render: function (r) { return SBT.ui.partyCell(r.name, r.mobile); } },
              { label: U.escape(T("dash.purchases")), align: "right", render: function (r) { return U.currency(r.totalPurchase); } },
              { label: U.escape(T("common.balance")), align: "right", render: function (r) {
                return r.balance > 0
                  ? '<span class="sbt-text-warning sbt-strong">' + U.currency(r.balance) + "</span>"
                  : '<span class="sbt-text-success">' + U.escape(T("badge.settled")) + "</span>";
              }}
            ],
            rows: topSuppliers,
            empty: { icon: "bi-truck", title: T("dash.noSuppliersYet"), message: T("dash.noSuppliersYetMsg") }
          })
        }) +
      "</div>"
    );
  }

  function drawCharts() {
    chartRefs = [];
    const monthly = C.monthlySeries(6);
    const labels = monthly.map(function (m) { return m.label; });

    const salesEl = document.getElementById("chartSalesPurchase");
    if (salesEl) {
      Charts.register(salesEl, function () {
        Charts.bar(salesEl, {
          labels: labels,
          series: [
            { name: T("dash.sales"), data: monthly.map(function (m) { return m.sales; }), color: SBT.config.palette.navy },
            { name: T("dash.purchases"), data: monthly.map(function (m) { return m.purchase; }), color: SBT.config.palette.orange }
          ],
          height: 250
        });
      });
    }

    const profitEl = document.getElementById("chartProfit");
    if (profitEl) {
      Charts.register(profitEl, function () {
        Charts.line(profitEl, {
          labels: labels,
          series: [
            { name: T("dash.netProfit"), data: monthly.map(function (m) { return m.profit; }), color: SBT.config.palette.green }
          ],
          height: 250
        });
      });
    }

    const productEl = document.getElementById("chartProductSales");
    if (productEl) {
      const productSales = C.productSales(range);
      Charts.register(productEl, function () {
        if (!productSales.length) {
          productEl.innerHTML = SBT.ui.emptyState("bi-pie-chart", T("dash.noSalesData"), T("dash.noSalesDataMsg"));
          return;
        }
        Charts.doughnut(productEl, {
          labels: productSales.map(function (p) { return p.name; }),
          values: productSales.map(function (p) { return p.amount; }),
          height: 250,
          centerText: T("dash.totalSales")
        });
      });
    }

    const stockEl = document.getElementById("chartStock");
    if (stockEl) {
      const stock = C.stockList().filter(function (s) { return s.stock > 0; });
      Charts.register(stockEl, function () {
        if (!stock.length) {
          stockEl.innerHTML = SBT.ui.emptyState("bi-boxes", T("dash.noStockAvailable"), T("dash.noStockAvailableMsg"));
          return;
        }
        Charts.hbar(stockEl, {
          labels: stock.map(function (s) { return s.name; }),
          values: stock.map(function (s) { return s.stock; }),
          formatValue: function (v) { return U.qty(v); },
          rowHeight: 36
        });
      });
    }
  }

  function exportSummary() {
    const t = C.totals(range);
    const rows = [
      { Metric: T("dash.totalSales"), Value: t.totalSales },
      { Metric: T("dash.totalPurchase"), Value: t.totalPurchase },
      { Metric: T("dash.totalExpenses"), Value: t.totalExpenses },
      { Metric: T("dash.grossProfit"), Value: t.grossProfit },
      { Metric: T("dash.netProfit"), Value: t.netProfit },
      { Metric: T("dash.profitMargin"), Value: t.margin },
      { Metric: T("dash.stockValue"), Value: t.stockValue },
      { Metric: T("dash.customerPending"), Value: t.customerPending },
      { Metric: T("dash.supplierOutstanding"), Value: t.supplierOutstanding }
    ];
    U.exportExcel("SBT-Dashboard-Summary", rows,
      [T("dash.metric"), T("dash.value")], T("dash.dashboardSummary"));
    SBT.ui.success(T("dash.summaryExported"));
  }

  function mount() {
    drawCharts();
    const btn = document.getElementById("dashExport");
    if (btn) btn.addEventListener("click", exportSummary);
  }

  function refresh() {
    const content = document.getElementById("sbtContent");
    if (!content) return;
    content.innerHTML = render();
    mount();
  }

  App.dashboard = { render: render, mount: mount, refresh: refresh };
})(window);
