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
        "Dashboard",
        "Business overview for " + (range.from ? U.formatDate(range.from) + " – " + U.formatDate(range.to) : "all time"),
        '<button type="button" class="sbt-btn sbt-btn--outline" id="dashExport">' +
          '<i class="bi bi-download"></i> Export Summary</button>' +
        '<a class="sbt-btn sbt-btn--accent" href="sales.html">' +
          '<i class="bi bi-plus-lg"></i> New Sale</a>'
      ) +

      /* KPI grid */
      '<div class="sbt-kpi-grid">' +
        App.kpi({
          label: "Total Sales", variant: "navy", icon: "bi-receipt-cutoff",
          value: U.currency(t.totalSales),
          meta: '<i class="bi bi-arrow-up-right"></i> ' + t.salesCount + " invoices"
        }) +
        App.kpi({
          label: "Total Purchase", variant: "orange", icon: "bi-cart-plus-fill",
          value: U.currency(t.totalPurchase),
          meta: '<i class="bi bi-box-arrow-in-down"></i> ' + t.purchaseCount + " entries"
        }) +
        App.kpi({
          label: "Total Expenses", variant: "amber", icon: "bi-wallet2",
          value: U.currency(t.totalExpenses),
          meta: '<i class="bi bi-journal-text"></i> ' + t.expenseCount + " records"
        }) +
        App.kpi({
          label: "Gross Profit", variant: "blue", icon: "bi-graph-up",
          value: U.currency(t.grossProfit),
          meta: "Sales − purchase cost"
        }) +
        App.kpi({
          label: "Net Profit", variant: t.netProfit >= 0 ? "green" : "red",
          icon: "bi-graph-up-arrow",
          value: U.currency(t.netProfit),
          meta: '<span class="' + (t.netProfit >= 0 ? "up" : "down") + '">' +
            U.percent(t.margin) + "</span> margin"
        }) +
        App.kpi({
          label: "Stock Value", variant: "navy", icon: "bi-boxes",
          value: U.currency(t.stockValue),
          meta: stock.length + " products tracked"
        }) +
        App.kpi({
          label: "Customer Pending", variant: "red", icon: "bi-person-dash-fill",
          value: U.currency(t.customerPending),
          meta: customers.filter(function (c) { return c.pending > 0; }).length + " customers due"
        }) +
        App.kpi({
          label: "Supplier Outstanding", variant: "amber", icon: "bi-truck",
          value: U.currency(t.supplierOutstanding),
          meta: suppliers.filter(function (s) { return s.balance > 0; }).length + " suppliers due"
        }) +
      "</div>" +

      /* Charts row 1 */
      '<div class="sbt-grid-2" style="margin-bottom:1rem">' +
        App.card({
          title: "Monthly Sales vs Purchases",
          subtitle: "Last 6 months performance",
          body: '<div class="sbt-chart" id="chartSalesPurchase"></div>' +
            '<div class="sbt-chart__legend">' +
              '<span><i style="background:' + SBT.config.palette.navy + '"></i> Sales</span>' +
              '<span><i style="background:' + SBT.config.palette.orange + '"></i> Purchases</span>' +
            "</div>"
        }) +
        App.card({
          title: "Monthly Profit Trend",
          subtitle: "Net profit after expenses",
          body: '<div class="sbt-chart" id="chartProfit"></div>' +
            '<div class="sbt-chart__legend">' +
              '<span><i style="background:' + SBT.config.palette.green + '"></i> Net Profit</span>' +
            "</div>"
        }) +
      "</div>" +

      /* Charts row 2 */
      '<div class="sbt-grid-2" style="margin-bottom:1rem">' +
        App.card({
          title: "Product-wise Sales",
          subtitle: "Revenue share by material",
          body: '<div class="sbt-chart" id="chartProductSales"></div>'
        }) +
        App.card({
          title: "Current Stock Levels",
          subtitle: "Available quantity by product",
          body: '<div class="sbt-chart" id="chartStock"></div>'
        }) +
      "</div>" +

      /* Low stock alert */
      (lowStock.length ?
        App.card({
          title: "Low Stock Alerts",
          subtitle: lowStock.length + " product(s) need restocking",
          actions: '<a class="sbt-btn sbt-btn--sm sbt-btn--outline" href="stock.html">Manage Stock</a>',
          flush: true,
          body: SBT.ui.table({
            compact: true,
            columns: [
              { label: "Product", render: function (r) { return "<strong>" + U.escape(r.name) + "</strong>"; } },
              { label: "Available", align: "right", render: function (r) { return U.qty(r.stock) + " " + U.escape(r.unit); } },
              { label: "Minimum", align: "right", render: function (r) { return U.qty(r.minStock) + " " + U.escape(r.unit); } },
              { label: "Status", render: function (r) { return U.stockBadge(r.stock, r.minStock); } }
            ],
            rows: lowStock
          })
        }) + '<div style="height:1rem"></div>' : "") +

      /* Recent activity */
      '<div class="sbt-grid-2">' +
        App.card({
          title: "Recent Sales",
          subtitle: "Latest customer invoices",
          actions: '<a class="sbt-btn sbt-btn--sm sbt-btn--ghost" href="sales.html">View all</a>',
          flush: true,
          body: SBT.ui.table({
            compact: true,
            columns: [
              { label: "Invoice", render: function (r) {
                return '<span class="sbt-mono sbt-strong">' + U.escape(r.invoiceNo || "—") + "</span>";
              }},
              { label: "Customer", render: function (r) { return U.escape(r.customerName || "—"); } },
              { label: "Date", render: function (r) { return U.formatDate(r.date); } },
              { label: "Amount", align: "right", render: function (r) {
                return "<strong>" + U.currency(C.salesFinal(r)) + "</strong>";
              }},
              { label: "Status", render: function (r) { return U.paymentBadge(r.paymentStatus); } }
            ],
            rows: recentSales,
            empty: { icon: "bi-receipt", title: "No sales yet", message: "Create your first sales entry." }
          })
        }) +
        App.card({
          title: "Recent Purchases",
          subtitle: "Latest supplier entries",
          actions: '<a class="sbt-btn sbt-btn--sm sbt-btn--ghost" href="purchases.html">View all</a>',
          flush: true,
          body: SBT.ui.table({
            compact: true,
            columns: [
              { label: "Supplier", render: function (r) { return U.escape(r.supplierName || "—"); } },
              { label: "Material", render: function (r) { return U.escape(r.materialName || "—"); } },
              { label: "Date", render: function (r) { return U.formatDate(r.date); } },
              { label: "Amount", align: "right", render: function (r) {
                return "<strong>" + U.currency(C.purchaseTotal(r)) + "</strong>";
              }},
              { label: "Status", render: function (r) { return U.paymentBadge(r.paymentStatus); } }
            ],
            rows: recentPurchases,
            empty: { icon: "bi-cart", title: "No purchases yet", message: "Add your first purchase entry." }
          })
        }) +
      "</div>" +

      /* Top parties */
      '<div class="sbt-grid-2" style="margin-top:1rem">' +
        App.card({
          title: "Top Customers",
          subtitle: "By total sales value",
          flush: true,
          body: SBT.ui.table({
            compact: true,
            columns: [
              { label: "Customer", render: function (r) { return SBT.ui.partyCell(r.name, r.mobile); } },
              { label: "Sales", align: "right", render: function (r) { return U.currency(r.totalSales); } },
              { label: "Pending", align: "right", render: function (r) {
                return r.pending > 0
                  ? '<span class="sbt-text-danger sbt-strong">' + U.currency(r.pending) + "</span>"
                  : '<span class="sbt-text-success">Clear</span>';
              }}
            ],
            rows: topCustomers,
            empty: { icon: "bi-people", title: "No customers yet", message: "Customers appear after your first sale." }
          })
        }) +
        App.card({
          title: "Top Suppliers",
          subtitle: "By total purchase value",
          flush: true,
          body: SBT.ui.table({
            compact: true,
            columns: [
              { label: "Supplier", render: function (r) { return SBT.ui.partyCell(r.name, r.mobile); } },
              { label: "Purchases", align: "right", render: function (r) { return U.currency(r.totalPurchase); } },
              { label: "Balance", align: "right", render: function (r) {
                return r.balance > 0
                  ? '<span class="sbt-text-warning sbt-strong">' + U.currency(r.balance) + "</span>"
                  : '<span class="sbt-text-success">Clear</span>';
              }}
            ],
            rows: topSuppliers,
            empty: { icon: "bi-truck", title: "No suppliers yet", message: "Suppliers appear after your first purchase." }
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
            { name: "Sales", data: monthly.map(function (m) { return m.sales; }), color: SBT.config.palette.navy },
            { name: "Purchases", data: monthly.map(function (m) { return m.purchase; }), color: SBT.config.palette.orange }
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
            { name: "Net Profit", data: monthly.map(function (m) { return m.profit; }), color: SBT.config.palette.green }
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
          productEl.innerHTML = SBT.ui.emptyState("bi-pie-chart", "No sales data", "Product sales appear here once you record sales.");
          return;
        }
        Charts.doughnut(productEl, {
          labels: productSales.map(function (p) { return p.name; }),
          values: productSales.map(function (p) { return p.amount; }),
          height: 250,
          centerText: "Total Sales"
        });
      });
    }

    const stockEl = document.getElementById("chartStock");
    if (stockEl) {
      const stock = C.stockList().filter(function (s) { return s.stock > 0; });
      Charts.register(stockEl, function () {
        if (!stock.length) {
          stockEl.innerHTML = SBT.ui.emptyState("bi-boxes", "No stock available", "Record purchases to build stock.");
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
      { Metric: "Total Sales", Value: t.totalSales },
      { Metric: "Total Purchase", Value: t.totalPurchase },
      { Metric: "Total Expenses", Value: t.totalExpenses },
      { Metric: "Gross Profit", Value: t.grossProfit },
      { Metric: "Net Profit", Value: t.netProfit },
      { Metric: "Profit Margin %", Value: t.margin },
      { Metric: "Stock Value", Value: t.stockValue },
      { Metric: "Customer Pending", Value: t.customerPending },
      { Metric: "Supplier Outstanding", Value: t.supplierOutstanding }
    ];
    U.exportExcel("SBT-Dashboard-Summary", rows, ["Metric", "Value"], "Dashboard Summary");
    SBT.ui.success("Summary exported");
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
