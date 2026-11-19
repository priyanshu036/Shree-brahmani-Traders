/* ==========================================================================
   SHREE BRAHMANI TRADERS — Settings
   ========================================================================== */
(function (global) {
  "use strict";

  const SBT = global.SBT;
  const U = SBT.utils;
  const App = SBT.app;
  const UI = SBT.ui;
  const CFG = SBT.config;

  const API_KEY = CFG.storagePrefix + "api_url";

  function savedApiUrl() {
    try {
      return localStorage.getItem(API_KEY) || CFG.apiUrl || "";
    } catch (e) {
      return CFG.apiUrl || "";
    }
  }

  function render() {
    const s = SBT.store.settings;
    const apiUrl = savedApiUrl();
    const queue = SBT.store.getQueue();
    const counts = CFG.entities.map(function (e) {
      return { entity: e, count: SBT.store.list(e).length };
    });

    return (
      App.pageHead(
        "Settings",
        "Business profile, Google Sheets connection and data management",
        '<button type="button" class="sbt-btn sbt-btn--accent" id="setSave">' +
          '<i class="bi bi-check-lg"></i> Save Settings</button>'
      ) +

      /* Business profile */
      App.card({
        title: "Business Profile",
        subtitle: "Appears on invoices and reports",
        body:
          '<form id="setForm" novalidate>' +
            UI.formGrid([
              { label: "Business Name", name: "businessName", required: true, value: s.businessName, full: true },
              { label: "Owner / Proprietor", name: "ownerName", value: s.ownerName },
              { label: "Mobile Number", name: "mobile", value: s.mobile, inputmode: "numeric" },
              { label: "Email", name: "email", type: "email", value: s.email },
              { label: "GSTIN", name: "gstin", value: s.gstin, placeholder: "24AAAAA0000A1Z5" },
              { label: "PAN", name: "pan", value: s.pan, placeholder: "AAAAA0000A" },
              { label: "Address", name: "address", type: "textarea", value: s.address, full: true },
              { label: "Bank Name", name: "bankName", value: s.bankName },
              { label: "Account Number", name: "bankAccount", value: s.bankAccount },
              { label: "IFSC Code", name: "bankIfsc", value: s.bankIfsc },
              { label: "Currency Symbol", name: "currency", value: s.currency, maxlength: "3" }
            ]) +
          "</form>"
      }) +

      /* Invoice & tax */
      App.card({
        title: "Invoice & Tax",
        subtitle: "Numbering and GST defaults",
        body:
          '<form id="setInvoiceForm" novalidate>' +
            UI.formGrid([
              { label: "Invoice Prefix", name: "invoicePrefix", value: s.invoicePrefix,
                help: "Format: PREFIX/YYYY/0001" },
              { label: "Next Invoice Number", name: "invoiceCounter", type: "number", min: 1,
                value: s.invoiceCounter },
              { label: "Default GST Rate (%)", name: "defaultGstRate", type: "number", step: "0.01",
                min: 0, max: 100, value: s.defaultGstRate },
              { label: "Enable GST by Default", name: "gstEnabled", type: "checkbox", value: s.gstEnabled },
              { label: "Low Stock Alerts", name: "lowStockAlert", type: "checkbox", value: s.lowStockAlert },
              { label: "Invoice Footer Note", name: "footerNote", value: s.footerNote, full: true },
              { label: "Terms & Conditions", name: "termsNote", type: "textarea", value: s.termsNote, full: true }
            ]) +
          "</form>"
      }) +

      /* Google Sheets */
      App.card({
        title: "Google Sheets Connection",
        subtitle: "All data is stored in your Google Sheet — no database required",
        body:
          '<div class="sbt-row" style="margin-bottom:1rem;gap:.5rem">' +
            '<span class="sbt-badge ' + (SBT.sheets.enabled ? "sbt-badge--success" : "sbt-badge--neutral") + '">' +
              '<i class="bi ' + (SBT.sheets.enabled ? "bi-cloud-check" : "bi-cloud-slash") + '"></i> ' +
              (SBT.sheets.enabled ? "Configured" : "Not configured") +
            "</span>" +
            (SBT.sheets.lastSync ?
              '<span class="sbt-muted" style="font-size:.78rem">Last sync: ' +
                U.formatDateTime(SBT.sheets.lastSync) + "</span>" : "") +
            (queue.length ?
              '<span class="sbt-badge sbt-badge--warning">' + queue.length + " pending</span>" : "") +
          "</div>" +

          '<div class="sbt-field sbt-field--full" style="margin-bottom:1rem">' +
            '<label for="setApiUrl">Google Apps Script Web App URL</label>' +
            '<input type="url" class="sbt-input" id="setApiUrl" ' +
              'placeholder="https://script.google.com/macros/s/…/exec" value="' + U.escape(apiUrl) + '">' +
            '<span class="sbt-help">Deploy your Apps Script as a Web App (Execute as: Me, ' +
              "Who has access: Anyone) and paste the /exec URL here.</span>" +
          "</div>" +

          '<div class="sbt-row">' +
            '<button type="button" class="sbt-btn sbt-btn--primary" id="setTest">' +
              '<i class="bi bi-plug"></i> Test Connection</button>' +
            '<button type="button" class="sbt-btn sbt-btn--success" id="setPush">' +
              '<i class="bi bi-cloud-arrow-up"></i> Sync Now (Push All)</button>' +
            '<button type="button" class="sbt-btn sbt-btn--outline" id="setPull">' +
              '<i class="bi bi-cloud-arrow-down"></i> Pull from Sheets</button>' +
            '<button type="button" class="sbt-btn sbt-btn--ghost" id="setFlush">' +
              '<i class="bi bi-arrow-repeat"></i> Retry Queue</button>' +
          "</div>" +

          '<div class="sbt-divider"></div>' +

          '<div class="sbt-table-wrap"><table class="sbt-table sbt-table--compact">' +
            "<thead><tr><th>Sheet / Entity</th><th class='num'>Local Records</th></tr></thead><tbody>" +
            counts.map(function (c) {
              return "<tr><td>" + U.escape(c.entity) + "</td>" +
                '<td class="num">' + c.count + "</td></tr>";
            }).join("") +
            "</tbody></table></div>"
      }) +

      /* Data management */
      App.card({
        title: "Data Management",
        subtitle: "Backup, restore and reset",
        body:
          '<div class="sbt-row">' +
            '<button type="button" class="sbt-btn sbt-btn--outline" id="setBackup">' +
              '<i class="bi bi-download"></i> Download Backup (JSON)</button>' +
            '<button type="button" class="sbt-btn sbt-btn--outline" id="setRestore">' +
              '<i class="bi bi-upload"></i> Restore Backup</button>' +
            '<button type="button" class="sbt-btn sbt-btn--danger" id="setClearTx">' +
              '<i class="bi bi-eraser"></i> Clear All Transactions</button>' +
            '<button type="button" class="sbt-btn sbt-btn--danger" id="setReset">' +
              '<i class="bi bi-arrow-counterclockwise"></i> Factory Reset</button>' +
          "</div>" +
          '<p class="sbt-help" style="margin-top:.85rem">' +
            "Clearing transactions removes purchases, sales, expenses, payments and adjustments " +
            "but keeps products, suppliers and customers. Factory reset wipes everything and " +
            "restores default products.</p>" +
          '<input type="file" id="setFile" accept="application/json,.json" style="display:none">'
      })
    );
  }

  function save() {
    const profileForm = document.getElementById("setForm");
    const invoiceForm = document.getElementById("setInvoiceForm");
    const profile = UI.readForm(profileForm);
    const invoice = UI.readForm(invoiceForm);

    const errors = U.validate({
      businessName: { value: profile.businessName, label: "Business name", required: true, minLength: 2 },
      mobile: { value: profile.mobile, label: "Mobile number", mobile: true },
      gstin: { value: profile.gstin, label: "GSTIN", gst: true }
    });

    if (!UI.showErrors(profileForm, errors)) {
      UI.error("Please fix the highlighted fields");
      return;
    }

    SBT.store.saveSettings(Object.assign({}, profile, invoice, {
      invoiceCounter: U.num(invoice.invoiceCounter, 1),
      defaultGstRate: U.num(invoice.defaultGstRate, 5)
    }));

    /* Persist API URL */
    const apiEl = document.getElementById("setApiUrl");
    if (apiEl) {
      const url = apiEl.value.trim();
      try {
        if (url) localStorage.setItem(API_KEY, url);
        else localStorage.removeItem(API_KEY);
      } catch (e) { /* ignore */ }
      CFG.apiUrl = url;
    }

    UI.success("Settings saved");
    refresh();
  }

  function testConnection() {
    const apiEl = document.getElementById("setApiUrl");
    const url = apiEl ? apiEl.value.trim() : "";
    if (!url || url.indexOf("http") !== 0) {
      UI.error("Enter a valid Apps Script Web App URL first");
      return;
    }

    const btn = document.getElementById("setTest");
    UI.setLoading(btn, true, "Testing…");

    CFG.apiUrl = url;
    SBT.sheets.call("ping", {})
      .then(function (res) {
        UI.setLoading(btn, false);
        if (res && res.ok) {
          UI.success("Connection successful — Google Sheets is reachable");
          try { localStorage.setItem(API_KEY, url); } catch (e) { /* ignore */ }
        } else {
          UI.error("Unexpected response from the Web App");
        }
      })
      .catch(function (err) {
        UI.setLoading(btn, false);
        UI.error("Connection failed: " + err.message);
      });
  }

  function pushAll() {
    const apiEl = document.getElementById("setApiUrl");
    const url = apiEl ? apiEl.value.trim() : "";
    if (!url || url.indexOf("http") !== 0) {
      UI.error("Configure the Apps Script URL first");
      return;
    }
    CFG.apiUrl = url;
    try { localStorage.setItem(API_KEY, url); } catch (e) { /* ignore */ }

    const btn = document.getElementById("setPush");
    UI.setLoading(btn, true, "Syncing…");
    SBT.sheets.pushAll().then(function (ok) {
      UI.setLoading(btn, false);
      if (ok) UI.success("All data pushed to Google Sheets");
      else UI.error("Sync failed: " + (SBT.sheets.lastError || "Unknown error"));
      refresh();
    });
  }

  function pullAll() {
    const apiEl = document.getElementById("setApiUrl");
    const url = apiEl ? apiEl.value.trim() : "";
    if (!url || url.indexOf("http") !== 0) {
      UI.error("Configure the Apps Script URL first");
      return;
    }
    CFG.apiUrl = url;
    try { localStorage.setItem(API_KEY, url); } catch (e) { /* ignore */ }

    const btn = document.getElementById("setPull");
    UI.setLoading(btn, true, "Pulling…");
    SBT.sheets.pull().then(function (ok) {
      UI.setLoading(btn, false);
      if (ok) {
        UI.success("Data pulled from Google Sheets");
        refresh();
      } else {
        UI.error("Pull failed: " + (SBT.sheets.lastError || "Unknown error"));
      }
    });
  }

  function flushQueue() {
    const queue = SBT.store.getQueue();
    if (!queue.length) { UI.info("Sync queue is empty"); return; }
    const btn = document.getElementById("setFlush");
    UI.setLoading(btn, true, "Retrying…");
    SBT.sheets.flushQueue().then(function (ok) {
      UI.setLoading(btn, false);
      if (ok) UI.success("Queued changes synced");
      else UI.error("Retry failed: " + (SBT.sheets.lastError || "Unknown error"));
      refresh();
    });
  }

  function backup() {
    const json = SBT.store.exportJSON();
    const stamp = U.today();
    U.download("SBT-Backup-" + stamp + ".json", json, "application/json");
    UI.success("Backup downloaded");
  }

  function restore() {
    const fileEl = document.getElementById("setFile");
    if (fileEl) fileEl.click();
  }

  function handleFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        SBT.store.importJSON(e.target.result);
        UI.success("Backup restored successfully");
        refresh();
      } catch (err) {
        UI.error("Restore failed: " + err.message);
      }
    };
    reader.readAsText(file);
  }

  async function clearTransactions() {
    const ok = await UI.confirm({
      title: "Clear All Transactions",
      message: "This will permanently delete all purchases, sales, expenses, payments and " +
        "stock adjustments. Products, suppliers and customers will be kept. Continue?",
      confirmText: "Clear Transactions"
    });
    if (!ok) return;
    SBT.store.clearTransactions();
    UI.success("All transactions cleared");
    refresh();
  }

  async function factoryReset() {
    const ok = await UI.confirm({
      title: "Factory Reset",
      message: "This will erase ALL data including products, suppliers, customers and settings, " +
        "and restore the default product list. This cannot be undone. Continue?",
      confirmText: "Reset Everything"
    });
    if (!ok) return;
    SBT.store.resetAll();
    UI.success("All data reset to defaults");
    refresh();
  }

  function mount() {
    const saveBtn = document.getElementById("setSave");
    if (saveBtn) saveBtn.addEventListener("click", save);

    const testBtn = document.getElementById("setTest");
    if (testBtn) testBtn.addEventListener("click", testConnection);

    const pushBtn = document.getElementById("setPush");
    if (pushBtn) pushBtn.addEventListener("click", pushAll);

    const pullBtn = document.getElementById("setPull");
    if (pullBtn) pullBtn.addEventListener("click", pullAll);

    const flushBtn = document.getElementById("setFlush");
    if (flushBtn) flushBtn.addEventListener("click", flushQueue);

    const backupBtn = document.getElementById("setBackup");
    if (backupBtn) backupBtn.addEventListener("click", backup);

    const restoreBtn = document.getElementById("setRestore");
    if (restoreBtn) restoreBtn.addEventListener("click", restore);

    const fileEl = document.getElementById("setFile");
    if (fileEl) fileEl.addEventListener("change", function () {
      handleFile(fileEl.files && fileEl.files[0]);
      fileEl.value = "";
    });

    const clearBtn = document.getElementById("setClearTx");
    if (clearBtn) clearBtn.addEventListener("click", clearTransactions);

    const resetBtn = document.getElementById("setReset");
    if (resetBtn) resetBtn.addEventListener("click", factoryReset);
  }

  function refresh() {
    const content = document.getElementById("sbtContent");
    if (!content) return;
    content.innerHTML = render();
    mount();
  }

  App.settings = { render: render, mount: mount, refresh: refresh };
})(window);
