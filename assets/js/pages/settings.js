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

  function T(key, vars) { return U.t(key, vars); }

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
        T("set.title"),
        T("set.subtitle"),
        '<button type="button" class="sbt-btn sbt-btn--accent" id="setSave">' +
          '<i class="bi bi-check-lg"></i> ' + U.escape(T("set.saveSettings")) + '</button>'
      ) +

      /* Business profile */
      App.card({
        title: T("set.businessProfile"),
        subtitle: T("set.businessProfileSubtitle"),
        body:
          '<form id="setForm" novalidate>' +
            UI.formGrid([
              { label: T("set.businessName"), name: "businessName", required: true, value: s.businessName, full: true },
              { label: T("set.ownerName"), name: "ownerName", value: s.ownerName },
              { label: T("common.mobile"), name: "mobile", value: s.mobile, inputmode: "numeric" },
              { label: T("set.email"), name: "email", type: "email", value: s.email },
              { label: T("common.gstin"), name: "gstin", value: s.gstin, placeholder: T("sup.gstPlaceholder") },
              { label: T("set.pan"), name: "pan", value: s.pan, placeholder: T("set.panPlaceholder") },
              { label: T("common.address"), name: "address", type: "textarea", value: s.address, full: true },
              { label: T("set.bankName"), name: "bankName", value: s.bankName },
              { label: T("set.bankAccount"), name: "bankAccount", value: s.bankAccount },
              { label: T("set.bankIfsc"), name: "bankIfsc", value: s.bankIfsc },
              { label: T("set.currency"), name: "currency", value: s.currency, maxlength: "3" }
            ]) +
          "</form>"
      }) +

      /* Invoice & tax */
      App.card({
        title: T("set.invoiceTax"),
        subtitle: T("set.invoiceTaxSubtitle"),
        body:
          '<form id="setInvoiceForm" novalidate>' +
            UI.formGrid([
              { label: T("set.invoicePrefix"), name: "invoicePrefix", value: s.invoicePrefix,
                help: T("set.invoicePrefixHelp") },
              { label: T("set.nextInvoiceNumber"), name: "invoiceCounter", type: "number", min: 1,
                value: s.invoiceCounter },
              { label: T("set.defaultGstRate"), name: "defaultGstRate", type: "number", step: "0.01",
                min: 0, max: 100, value: s.defaultGstRate },
              { label: T("set.gstEnabled"), name: "gstEnabled", type: "checkbox", value: s.gstEnabled },
              { label: T("set.lowStockAlerts"), name: "lowStockAlert", type: "checkbox", value: s.lowStockAlert },
              { label: T("set.footerNote"), name: "footerNote", value: s.footerNote, full: true },
              { label: T("set.termsNote"), name: "termsNote", type: "textarea", value: s.termsNote, full: true }
            ]) +
          "</form>"
      }) +

      /* Google Sheets */
      App.card({
        title: T("set.sheets"),
        subtitle: T("set.sheetsSubtitle"),
        body:
          '<div class="sbt-row" style="margin-bottom:1rem;gap:.5rem">' +
            '<span class="sbt-badge ' + (SBT.sheets.enabled ? "sbt-badge--success" : "sbt-badge--neutral") + '">' +
              '<i class="bi ' + (SBT.sheets.enabled ? "bi-cloud-check" : "bi-cloud-slash") + '"></i> ' +
              U.escape(SBT.sheets.enabled ? T("badge.configured") : T("badge.notConfigured")) +
            "</span>" +
            (SBT.sheets.lastSync ?
              '<span class="sbt-muted" style="font-size:.78rem">' +
                U.escape(T("set.lastSync", { when: U.formatDateTime(SBT.sheets.lastSync) })) + "</span>" : "") +
            (queue.length ?
              '<span class="sbt-badge sbt-badge--warning">' +
                U.escape(T("badge.pendingCount", { count: queue.length })) + "</span>" : "") +
          "</div>" +

          '<div class="sbt-field sbt-field--full" style="margin-bottom:1rem">' +
            '<label for="setApiUrl">' + U.escape(T("set.apiUrl")) + '</label>' +
            '<input type="url" class="sbt-input" id="setApiUrl" ' +
              'placeholder="https://script.google.com/macros/s/…/exec" value="' + U.escape(apiUrl) + '">' +
            '<span class="sbt-help">' + U.escape(T("set.apiUrlHelp")) + "</span>" +
          "</div>" +

          '<div class="sbt-row">' +
            '<button type="button" class="sbt-btn sbt-btn--primary" id="setTest">' +
              '<i class="bi bi-plug"></i> ' + U.escape(T("set.testConnection")) + '</button>' +
            '<button type="button" class="sbt-btn sbt-btn--success" id="setPush">' +
              '<i class="bi bi-cloud-arrow-up"></i> ' + U.escape(T("set.syncNow")) + '</button>' +
            '<button type="button" class="sbt-btn sbt-btn--outline" id="setPull">' +
              '<i class="bi bi-cloud-arrow-down"></i> ' + U.escape(T("set.pullFromSheets")) + '</button>' +
            '<button type="button" class="sbt-btn sbt-btn--ghost" id="setFlush">' +
              '<i class="bi bi-arrow-repeat"></i> ' + U.escape(T("set.retryQueue")) + '</button>' +
          "</div>" +

          '<div class="sbt-divider"></div>' +

          '<div class="sbt-table-wrap"><table class="sbt-table sbt-table--compact">' +
            "<thead><tr><th>" + U.escape(T("set.sheetEntity")) + "</th><th class='num'>" +
              U.escape(T("set.localRecords")) + "</th></tr></thead><tbody>" +
            counts.map(function (c) {
              return "<tr><td>" + U.escape(c.entity) + "</td>" +
                '<td class="num">' + c.count + "</td></tr>";
            }).join("") +
            "</tbody></table></div>"
      }) +

      /* Data management */
      App.card({
        title: T("set.dataManagement"),
        subtitle: T("set.dataManagementSubtitle"),
        body:
          '<div class="sbt-row">' +
            '<button type="button" class="sbt-btn sbt-btn--outline" id="setBackup">' +
              '<i class="bi bi-download"></i> ' + U.escape(T("set.downloadBackup")) + '</button>' +
            '<button type="button" class="sbt-btn sbt-btn--outline" id="setRestore">' +
              '<i class="bi bi-upload"></i> ' + U.escape(T("set.restoreBackup")) + '</button>' +
            '<button type="button" class="sbt-btn sbt-btn--danger" id="setClearTx">' +
              '<i class="bi bi-eraser"></i> ' + U.escape(T("set.clearTransactions")) + '</button>' +
            '<button type="button" class="sbt-btn sbt-btn--danger" id="setReset">' +
              '<i class="bi bi-arrow-counterclockwise"></i> ' + U.escape(T("set.factoryReset")) + '</button>' +
          "</div>" +
          '<p class="sbt-help" style="margin-top:.85rem">' + U.escape(T("set.dataHelp")) + "</p>" +
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
      businessName: { value: profile.businessName, label: T("set.businessNameLabel"),
        required: true, minLength: 2, maxLength: 120 },
      mobile: { value: profile.mobile, label: T("set.mobileLabel"), mobile: true },
      email: { value: profile.email, label: T("set.emailLabel"), email: true, maxLength: 120 },
      gstin: { value: profile.gstin, label: T("set.gstinLabel"), gst: true },
      currency: { value: profile.currency, label: T("set.currencyLabel"), maxLength: 3 }
    });

    const invoiceErrors = U.validate({
      invoiceCounter: { value: invoice.invoiceCounter, label: T("set.invoiceCounterLabel"),
        required: true, type: "integer", min: 1, max: 999999 },
      defaultGstRate: { value: invoice.defaultGstRate, label: T("set.defaultGstRateLabel"),
        type: "number", min: 0, max: 100 },
      invoicePrefix: { value: invoice.invoicePrefix, label: T("set.invoicePrefixLabel"), maxLength: 12 }
    });

    Object.keys(invoiceErrors).forEach(function (k) { errors[k] = invoiceErrors[k]; });

    const okProfile = UI.showErrors(profileForm, errors);
    const okInvoice = UI.showErrors(invoiceForm, errors);
    if (!okProfile || !okInvoice) {
      UI.error(T("set.fixFields"));
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

    UI.success(T("set.settingsSaved"));
    refresh();
  }

  function testConnection() {
    const apiEl = document.getElementById("setApiUrl");
    const url = apiEl ? apiEl.value.trim() : "";
    if (!url || url.indexOf("http") !== 0) {
      UI.error(T("set.enterValidUrl"));
      return;
    }

    const btn = document.getElementById("setTest");
    UI.setLoading(btn, true, T("set.testing"));

    CFG.apiUrl = url;
    SBT.sheets.call("ping", {})
      .then(function (res) {
        UI.setLoading(btn, false);
        if (res && res.ok) {
          UI.success(T("set.connectionOk"));
          try { localStorage.setItem(API_KEY, url); } catch (e) { /* ignore */ }
        } else {
          UI.error(T("set.unexpectedResponse"));
        }
      })
      .catch(function (err) {
        UI.setLoading(btn, false);
        UI.error(T("set.connectionFailed", { error: err.message }));
      });
  }

  function pushAll() {
    const apiEl = document.getElementById("setApiUrl");
    const url = apiEl ? apiEl.value.trim() : "";
    if (!url || url.indexOf("http") !== 0) {
      UI.error(T("set.configureUrl"));
      return;
    }
    CFG.apiUrl = url;
    try { localStorage.setItem(API_KEY, url); } catch (e) { /* ignore */ }

    const btn = document.getElementById("setPush");
    UI.setLoading(btn, true, T("set.syncing"));
    SBT.sheets.pushAll().then(function (ok) {
      UI.setLoading(btn, false);
      if (ok) UI.success(T("set.allPushed"));
      else UI.error(T("set.syncFailed", { error: SBT.sheets.lastError || T("common.unknownError") }));
      refresh();
    });
  }

  function pullAll() {
    const apiEl = document.getElementById("setApiUrl");
    const url = apiEl ? apiEl.value.trim() : "";
    if (!url || url.indexOf("http") !== 0) {
      UI.error(T("set.configureUrl"));
      return;
    }
    CFG.apiUrl = url;
    try { localStorage.setItem(API_KEY, url); } catch (e) { /* ignore */ }

    const btn = document.getElementById("setPull");
    UI.setLoading(btn, true, T("set.pulling"));
    SBT.sheets.pull().then(function (ok) {
      UI.setLoading(btn, false);
      if (ok) {
        UI.success(T("set.dataPulled"));
        refresh();
      } else {
        UI.error(T("set.pullFailed", { error: SBT.sheets.lastError || T("common.unknownError") }));
      }
    });
  }

  function flushQueue() {
    const queue = SBT.store.getQueue();
    if (!queue.length) { UI.info(T("set.queueEmpty")); return; }
    const btn = document.getElementById("setFlush");
    UI.setLoading(btn, true, T("set.retrying"));
    SBT.sheets.flushQueue().then(function (ok) {
      UI.setLoading(btn, false);
      if (ok) UI.success(T("set.queueSynced"));
      else UI.error(T("set.retryFailed", { error: SBT.sheets.lastError || T("common.unknownError") }));
      refresh();
    });
  }

  function backup() {
    const json = SBT.store.exportJSON();
    const stamp = U.today();
    U.download("SBT-Backup-" + stamp + ".json", json, "application/json");
    UI.success(T("set.backupDownloaded"));
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
        UI.success(T("set.backupRestored"));
        refresh();
      } catch (err) {
        UI.error(T("set.restoreFailed", { error: err.message }));
      }
    };
    reader.readAsText(file);
  }

  async function clearTransactions() {
    const ok = await UI.confirm({
      title: T("set.clearTitle"),
      message: T("set.clearMessage"),
      confirmText: T("set.clearConfirm")
    });
    if (!ok) return;
    SBT.store.clearTransactions();
    UI.success(T("set.cleared"));
    refresh();
  }

  async function factoryReset() {
    const ok = await UI.confirm({
      title: T("set.resetTitle"),
      message: T("set.resetMessage"),
      confirmText: T("set.resetConfirm")
    });
    if (!ok) return;
    SBT.store.resetAll();
    UI.success(T("set.resetDone"));
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
