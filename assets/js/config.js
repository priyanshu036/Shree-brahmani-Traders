/* ==========================================================================
   SHREE BRAHMANI TRADERS — Global Configuration
   ========================================================================== */
(function (global) {
  "use strict";

  const SBT = (global.SBT = global.SBT || {});

  SBT.config = {
    appName: "Shree Brahmani Traders",
    appShort: "SBT",
    tagline: "Construction Material Management",
    version: "1.0.0",

    /* Interface language: "en" (English) or "gu" (Gujarati).
       The user's choice is persisted in localStorage under sbt_v1_lang. */
    defaultLang: "en",
    languages: [
      { code: "en", label: "English", short: "EN" },
      { code: "gu", label: "ગુજરાતી", short: "ગુ" }
    ],

    /* LocalStorage keys */
    storagePrefix: "sbt_v1_",

    /* Auth */
    auth: {
      username: "admin",
      password: "admin",
      sessionKey: "sbt_v1_session"
    },

    /* Google Apps Script Web App URL.
       This is the deployed /exec endpoint that stores all data in Google Sheets.
       Leave empty to work fully offline with LocalStorage only. */
    apiUrl: "https://script.google.com/macros/s/AKfycbwe-nLPFnK65GbcAFaGlhIh7iKUB-5j2foLj2Te3uvwKgcbYVuNzYvGm8opGTeR7iM/exec",

    /* Master material list (editable in Settings) */
    defaultProducts: [
      { name: "Bricks", unit: "Piece", purchaseRate: 7, sellingRate: 9, minStock: 5000, hsn: "6904", gst: 5 },
      { name: "Sand (Ret)", unit: "Brass", purchaseRate: 3200, sellingRate: 3900, minStock: 20, hsn: "2505", gst: 5 },
      { name: "Kapchi", unit: "Brass", purchaseRate: 2800, sellingRate: 3400, minStock: 20, hsn: "2517", gst: 5 },
      { name: "Grit", unit: "Brass", purchaseRate: 3000, sellingRate: 3650, minStock: 20, hsn: "2517", gst: 5 },
      { name: "Cement", unit: "Bag", purchaseRate: 340, sellingRate: 395, minStock: 100, hsn: "2523", gst: 28 }
    ],

    units: ["Piece", "Brass", "Ton", "Bag", "Cft", "Kg", "Truck", "Trip", "Sq.Ft"],

    paymentStatuses: ["Paid", "Partial", "Pending"],

    paymentModes: ["Cash", "UPI", "Bank Transfer", "Cheque", "Credit"],

    expenseCategories: [
      "Transportation",
      "Loading / Unloading",
      "Fuel",
      "Salary",
      "Rent",
      "Electricity",
      "Office",
      "Repair & Maintenance",
      "GST / Tax",
      "Miscellaneous"
    ],

    /* Default business profile (editable in Settings) */
    defaultSettings: {
      businessName: "SHREE BRAHMANI TRADERS",
      ownerName: "Administrator",
      mobile: "",
      email: "",
      address: "",
      gstin: "",
      pan: "",
      bankName: "",
      bankAccount: "",
      bankIfsc: "",
      invoicePrefix: "SBT",
      invoiceCounter: 1,
      currency: "₹",
      lowStockAlert: true,
      gstEnabled: true,
      defaultGstRate: 5,
      footerNote: "Thank you for your business!",
      termsNote: "Goods once sold will not be taken back. Subject to local jurisdiction."
    },

    /* Chart palette — sampled from assets/img/logo.svg */
    palette: {
      navy: "#123f69",
      navyLight: "#4a86b8",
      orange: "#f7941d",
      orangeLight: "#f9a94a",
      green: "#16a34a",
      greenLight: "#4ade80",
      red: "#dc2626",
      amber: "#d97706",
      blue: "#0284c7",
      purple: "#7c3aed",
      teal: "#0d9488",
      slate: "#64748b"
    },

    chartColors: [
      "#123f69", "#f7941d", "#16a34a", "#0284c7",
      "#7c3aed", "#d97706", "#0d9488", "#dc2626",
      "#64748b", "#db2777"
    ]
  };

  /* Navigation definition — single source of truth for the sidebar.
     `label` and `group` are i18n keys resolved at render time so the sidebar
     follows the active language. */
  SBT.nav = [
    { group: "nav.group.overview", items: [
      { id: "dashboard", label: "nav.dashboard", icon: "bi-grid-1x2-fill", href: "dashboard.html" }
    ]},
    { group: "nav.group.transactions", items: [
      { id: "purchases", label: "nav.purchases", icon: "bi-cart-plus-fill", href: "purchases.html" },
      { id: "sales", label: "nav.sales", icon: "bi-receipt-cutoff", href: "sales.html" },
      { id: "expenses", label: "nav.expenses", icon: "bi-wallet2", href: "expenses.html" },
      { id: "payments", label: "nav.payments", icon: "bi-cash-coin", href: "payments.html" }
    ]},
    { group: "nav.group.masters", items: [
      { id: "products", label: "nav.products", icon: "bi-box-seam-fill", href: "products.html" },
      { id: "suppliers", label: "nav.suppliers", icon: "bi-truck", href: "suppliers.html" },
      { id: "customers", label: "nav.customers", icon: "bi-people-fill", href: "customers.html" },
      { id: "stock", label: "nav.stock", icon: "bi-boxes", href: "stock.html" }
    ]},
    { group: "nav.group.analytics", items: [
      { id: "profit-loss", label: "nav.profitLoss", icon: "bi-graph-up-arrow", href: "profit-loss.html" },
      { id: "reports", label: "nav.reports", icon: "bi-file-earmark-bar-graph-fill", href: "reports.html" }
    ]},
    { group: "nav.group.system", items: [
      { id: "settings", label: "nav.settings", icon: "bi-gear-fill", href: "settings.html" }
    ]}
  ];

  /* Entity names used by the store */
  SBT.entities = [
    "products", "suppliers", "customers",
    "purchases", "sales", "expenses",
    "payments", "adjustments"
  ];

  /* Alias so modules that destructure `const CFG = SBT.config` can use
     CFG.entities as well as SBT.entities. */
  SBT.config.entities = SBT.entities;
})(window);
