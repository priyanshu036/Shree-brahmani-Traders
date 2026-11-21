/* ==========================================================================
   SHREE BRAHMANI TRADERS — App Shell
   Sidebar, topbar, auth guard, page bootstrap
   ========================================================================== */
(function (global) {
  "use strict";

  const SBT = (global.SBT = global.SBT || {});
  const U = SBT.utils;
  const CFG = SBT.config;

  const App = (SBT.app = {});

  function t(key, vars) { return U.t(key, vars); }

  /* ==========================================================================
     AUTH
     ========================================================================== */
  App.isLoggedIn = function () {
    try {
      const raw = localStorage.getItem(CFG.auth.sessionKey);
      if (!raw) return false;
      const session = JSON.parse(raw);
      if (!session || !session.user) return false;
      /* 12-hour session */
      if (session.expires && Date.now() > session.expires) {
        localStorage.removeItem(CFG.auth.sessionKey);
        return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  };

  App.login = function (username, password, remember) {
    if (username !== CFG.auth.username || password !== CFG.auth.password) {
      return { ok: false, error: t("auth.errInvalid") };
    }
    const session = {
      user: username,
      name: t("shell.administrator"),
      loginAt: Date.now(),
      expires: Date.now() + (remember ? 30 * 24 * 3600 * 1000 : 12 * 3600 * 1000)
    };
    try {
      localStorage.setItem(CFG.auth.sessionKey, JSON.stringify(session));
    } catch (e) { /* ignore */ }
    return { ok: true, session: session };
  };

  App.logout = function () {
    try {
      localStorage.removeItem(CFG.auth.sessionKey);
    } catch (e) { /* ignore */ }
    window.location.href = "login.html";
  };

  App.requireAuth = function () {
    if (!App.isLoggedIn()) {
      window.location.replace("login.html");
      return false;
    }
    return true;
  };

  App.session = function () {
    try {
      return JSON.parse(localStorage.getItem(CFG.auth.sessionKey) || "null");
    } catch (e) {
      return null;
    }
  };

  /* ==========================================================================
     SIDEBAR
     ========================================================================== */
  function buildSidebar(activeId) {
    const session = App.session() || {};
    const settings = SBT.store.settings;

    let navHtml = "";
    SBT.nav.forEach(function (group) {
      navHtml += '<div class="sbt-nav-label">' + U.escape(t(group.group)) + "</div>";
      group.items.forEach(function (item) {
        const active = item.id === activeId ? " active" : "";
        navHtml +=
          '<a class="sbt-nav-link' + active + '" href="' + item.href + '"' +
            (active ? ' aria-current="page"' : "") + ">" +
            '<i class="bi ' + item.icon + '"></i>' +
            "<span>" + U.escape(t(item.label)) + "</span>" +
          "</a>";
      });
    });

    return (
      '<aside class="sbt-sidebar" id="sbtSidebar">' +
        '<div class="sbt-sidebar__brand">' +
          '<div class="sbt-sidebar__logo">' +
            '<img src="assets/img/logo-mark.svg" alt="' + U.escape(t("shell.logoAlt")) + '" ' +
              'onerror="this.style.display=\'none\';this.parentNode.classList.add(\'sbt-sidebar__logo--text\');this.parentNode.textContent=\'SB\';" />' +
          "</div>" +
          '<div class="sbt-sidebar__brand-text">' +
            "<strong>SHREE BRAHMANI</strong>" +
            "<span>Traders</span>" +
          "</div>" +
        "</div>" +
        '<nav class="sbt-sidebar__nav" aria-label="' + U.escape(t("shell.mainNav")) + '">' + navHtml + "</nav>" +
        '<div class="sbt-sidebar__footer">' +
          '<div class="sbt-sidebar__user">' +
            '<div class="sbt-sidebar__avatar">' + U.escape(U.initials(session.name || "Admin")) + "</div>" +
            '<div class="sbt-sidebar__user-meta">' +
              "<strong>" + U.escape(session.name || t("shell.administrator")) + "</strong>" +
              "<span>" + U.escape(settings.businessName || t("shell.adminPortal")) + "</span>" +
            "</div>" +
            '<button type="button" class="sbt-sidebar__logout" id="sbtLogout" title="' +
              U.escape(t("shell.signOut")) + '" aria-label="' + U.escape(t("shell.signOut")) + '">' +
              '<i class="bi bi-box-arrow-right"></i>' +
            "</button>" +
          "</div>" +
        "</div>" +
      "</aside>"
    );
  }

  /* Language switcher — a compact EN | ગુ toggle */
  function buildLangSwitch() {
    const current = U.lang();
    return (
      '<div class="sbt-lang" role="group" aria-label="' + U.escape(t("shell.language")) + '">' +
        CFG.languages.map(function (l) {
          const active = l.code === current ? " is-active" : "";
          return '<button type="button" class="sbt-lang__btn' + active + '" data-lang="' + l.code + '"' +
            ' title="' + U.escape(l.label) + '" aria-pressed="' + (l.code === current ? "true" : "false") + '">' +
            U.escape(l.short) + "</button>";
        }).join("") +
      "</div>"
    );
  }

  /* Page titles may be passed as i18n keys so they re-resolve on language change. */
  function resolveText(value) {
    if (!value) return "";
    const translated = t(value);
    return translated === value ? value : translated;
  }

  function buildTopbar(page) {
    const today = U.formatDate(new Date());
    return (
      '<header class="sbt-topbar">' +
        '<button type="button" class="sbt-icon-btn" id="sbtSidebarToggle" aria-label="' +
          U.escape(t("shell.toggleNav")) + '">' +
          '<i class="bi bi-list"></i>' +
        "</button>" +
        '<div class="sbt-topbar__title">' +
          "<h1>" + U.escape(resolveText(page.title)) + "</h1>" +
          "<p>" + U.escape(resolveText(page.subtitle)) + "</p>" +
        "</div>" +
        '<div class="sbt-topbar__spacer"></div>' +
        '<div class="sbt-topbar__actions">' +
          '<div class="sbt-search">' +
            '<i class="bi bi-search"></i>' +
            '<input type="search" id="sbtGlobalSearch" placeholder="' + U.escape(t("shell.searchPlaceholder")) +
              '" aria-label="' + U.escape(t("shell.search")) + '">' +
          "</div>" +
          '<span class="sbt-topbar__date"><i class="bi bi-calendar3"></i>' + today + "</span>" +
          buildLangSwitch() +
          '<button type="button" class="sbt-icon-btn" id="sbtSyncBtn" title="' +
            U.escape(t("shell.sync")) + '" aria-label="' + U.escape(t("shell.syncAria")) + '">' +
            '<i class="bi bi-cloud-arrow-up"></i>' +
          "</button>" +
        "</div>" +
      "</header>"
    );
  }

  /* ==========================================================================
     LAYOUT
     ========================================================================== */
  App.layout = function (page) {
    const p = page || {};
    const app = document.getElementById("sbtApp");
    if (!app) return;

    App.currentPage = p;

    document.title = (resolveText(p.title) || t("app.name")) + " — " + t("app.name");

    app.innerHTML =
      buildSidebar(p.active) +
      '<div class="sbt-overlay" id="sbtOverlay"></div>' +
      '<div class="sbt-main">' +
        buildTopbar(p) +
        '<main class="sbt-content" id="sbtContent"></main>' +
      "</div>";

    wireShell();
    updateSyncIndicator();
  };

  /* Re-render the whole shell + page content in the active language. */
  App.relayout = function () {
    const p = App.currentPage || {};
    App.layout(p);
    const content = document.getElementById("sbtContent");
    if (content && App.currentRender) {
      content.innerHTML = App.currentRender();
      if (typeof App.currentMount === "function") App.currentMount(content);
    }
  };

  function wireShell() {
    const app = document.getElementById("sbtApp");
    const toggle = document.getElementById("sbtSidebarToggle");
    const overlay = document.getElementById("sbtOverlay");
    const logout = document.getElementById("sbtLogout");
    const syncBtn = document.getElementById("sbtSyncBtn");

    /* Collapse on desktop, slide on mobile */
    if (toggle) {
      toggle.addEventListener("click", function () {
        if (window.innerWidth < 992) {
          app.classList.toggle("is-mobile-open");
          if (overlay) overlay.classList.toggle("is-open", app.classList.contains("is-mobile-open"));
        } else {
          app.classList.toggle("is-collapsed");
          try {
            localStorage.setItem(CFG.storagePrefix + "sidebar_collapsed",
              app.classList.contains("is-collapsed") ? "1" : "0");
          } catch (e) { /* ignore */ }
        }
      });
    }

    if (overlay) {
      overlay.addEventListener("click", function () {
        app.classList.remove("is-mobile-open");
        overlay.classList.remove("is-open");
      });
    }

    /* Language switcher */
    U.$$(".sbt-lang__btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const next = btn.dataset.lang;
        if (next === U.lang()) return;
        if (SBT.i18n) SBT.i18n.setLang(next);
      });
    });

    if (logout) {
      logout.addEventListener("click", async function () {
        const ok = await SBT.ui.confirm({
          title: t("shell.signOutTitle"),
          message: t("shell.signOutMessage"),
          confirmText: t("shell.signOut")
        });
        if (ok) App.logout();
      });
    }

    if (syncBtn) {
      syncBtn.addEventListener("click", async function () {
        if (!SBT.sheets.enabled) {
          SBT.ui.warn(t("shell.syncNotConfiguredToast"));
          return;
        }
        SBT.ui.setLoading(syncBtn, true, "");
        const ok = await SBT.sheets.pushAll();
        SBT.ui.setLoading(syncBtn, false);
        updateSyncIndicator();
        if (ok) SBT.ui.success(t("shell.syncDone"));
        else SBT.ui.error(t("shell.syncFailed", { error: SBT.sheets.lastError || t("common.unknownError") }));
      });
    }

    /* Restore collapsed state */
    try {
      if (localStorage.getItem(CFG.storagePrefix + "sidebar_collapsed") === "1" && window.innerWidth >= 992) {
        app.classList.add("is-collapsed");
      }
    } catch (e) { /* ignore */ }

    /* Close mobile sidebar on nav */
    U.$$(".sbt-nav-link").forEach(function (link) {
      link.addEventListener("click", function () {
        app.classList.remove("is-mobile-open");
        if (overlay) overlay.classList.remove("is-open");
      });
    });
  }

  function updateSyncIndicator() {
    const btn = document.getElementById("sbtSyncBtn");
    if (!btn) return;
    const icon = btn.querySelector("i");
    if (!icon) return;

    if (!SBT.sheets.enabled) {
      icon.className = "bi bi-cloud-slash";
      btn.title = t("shell.syncNotConfigured");
    } else if (SBT.sheets.online) {
      icon.className = "bi bi-cloud-check";
      btn.title = t("shell.syncConnected");
    } else {
      icon.className = "bi bi-cloud-arrow-up";
      btn.title = t("shell.sync");
    }
  }

  /* ==========================================================================
     PAGE BOOTSTRAP
     ========================================================================== */
  App.page = function (config) {
    const cfg = config || {};

    if (!App.requireAuth()) return;

    App.currentRender = cfg.render;
    App.currentMount = cfg.mount;
    App.currentRefresh = cfg.refresh;

    App.layout({
      active: cfg.active,
      title: cfg.title,
      subtitle: cfg.subtitle
    });

    const content = document.getElementById("sbtContent");
    if (content && cfg.render) {
      content.innerHTML = cfg.render();
    }

    if (typeof cfg.mount === "function") {
      cfg.mount(content);
    }

    /* Pull latest from Google Sheets in the background */
    if (SBT.sheets.enabled) {
      SBT.sheets.pull().then(function (ok) {
        updateSyncIndicator();
        if (ok && typeof cfg.refresh === "function") cfg.refresh();
      });
    }

    /* Re-render on data change */
    SBT.store.on("change", function () {
      if (typeof cfg.refresh === "function") cfg.refresh();
    });

    /* Re-render the shell and page when the language changes */
    if (SBT.i18n && typeof SBT.i18n.on === "function") {
      SBT.i18n.on(function () {
        App.relayout();
      });
    }

    return content;
  };

  /* ==========================================================================
     SHARED HELPERS
     ========================================================================== */
  App.pageHead = function (title, subtitle, actionsHtml) {
    return (
      '<div class="sbt-page-head">' +
        "<div>" +
          "<h2>" + U.escape(title) + "</h2>" +
          (subtitle ? "<p>" + U.escape(subtitle) + "</p>" : "") +
        "</div>" +
        (actionsHtml ? '<div class="sbt-page-head__actions">' + actionsHtml + "</div>" : "") +
      "</div>"
    );
  };

  App.kpi = function (config) {
    const c = config || {};
    return (
      '<div class="sbt-kpi sbt-kpi--' + (c.variant || "navy") + '">' +
        '<div class="sbt-kpi__top">' +
          '<span class="sbt-kpi__label">' + U.escape(c.label || "") + "</span>" +
          '<span class="sbt-kpi__icon"><i class="bi ' + (c.icon || "bi-graph-up") + '"></i></span>' +
        "</div>" +
        '<div class="sbt-kpi__value">' + (c.value || "—") + "</div>" +
        (c.meta ? '<div class="sbt-kpi__meta">' + c.meta + "</div>" : "") +
      "</div>"
    );
  };

  App.card = function (config) {
    const c = config || {};
    return (
      '<section class="sbt-card' + (c.className ? " " + c.className : "") + '">' +
        (c.title ?
          '<div class="sbt-card__head">' +
            "<div>" +
              "<h3>" + U.escape(c.title) + "</h3>" +
              (c.subtitle ? "<p>" + U.escape(c.subtitle) + "</p>" : "") +
            "</div>" +
            (c.actions || "") +
          "</div>" : "") +
        '<div class="sbt-card__body' + (c.flush ? " sbt-card__body--flush" : "") + '">' +
          (c.body || "") +
        "</div>" +
      "</section>"
    );
  };

  /* Product options helper */
  App.productOptions = function (includeBlank) {
    const products = SBT.store.list("products").filter(function (p) { return p.active !== false; });
    let html = includeBlank ? '<option value="">' + U.escape(t("common.selectMaterial")) + "</option>" : "";
    products.forEach(function (p) {
      html += '<option value="' + U.escape(p.name) + '" data-unit="' + U.escape(p.unit) +
        '" data-rate="' + U.num(p.purchaseRate) + '" data-sell="' + U.num(p.sellingRate) +
        '" data-gst="' + U.num(p.gst) + '">' + U.escape(p.name) + "</option>";
    });
    return html;
  };

  App.unitOptions = function (selected) {
    return CFG.units.map(function (u) {
      return '<option value="' + U.escape(u) + '"' + (u === selected ? " selected" : "") + ">" +
        U.escape(U.tv(u)) + "</option>";
    }).join("");
  };

  App.statusOptions = function (selected) {
    return CFG.paymentStatuses.map(function (s) {
      return '<option value="' + U.escape(s) + '"' + (s === selected ? " selected" : "") + ">" +
        U.escape(U.tv(s)) + "</option>";
    }).join("");
  };

  App.modeOptions = function (selected) {
    return CFG.paymentModes.map(function (m) {
      return '<option value="' + U.escape(m) + '"' + (m === selected ? " selected" : "") + ">" +
        U.escape(U.tv(m)) + "</option>";
    }).join("");
  };

  App.categoryOptions = function (selected) {
    return CFG.expenseCategories.map(function (c) {
      return '<option value="' + U.escape(c) + '"' + (c === selected ? " selected" : "") + ">" +
        U.escape(U.tv(c)) + "</option>";
    }).join("");
  };

  /* Supplier / customer datalist */
  App.partyDatalist = function (entity, id) {
    const rows = SBT.store.list(entity);
    const seen = {};
    let html = '<datalist id="' + id + '">';
    rows.forEach(function (r) {
      if (!r.name || seen[r.name]) return;
      seen[r.name] = true;
      html += '<option value="' + U.escape(r.name) + '">' + U.escape(r.mobile || "") + "</option>";
    });
    /* Also include names from transactions */
    const txEntity = entity === "suppliers" ? "purchases" : "sales";
    const nameKey = entity === "suppliers" ? "supplierName" : "customerName";
    SBT.store.list(txEntity).forEach(function (r) {
      const name = r[nameKey];
      if (!name || seen[name]) return;
      seen[name] = true;
      html += '<option value="' + U.escape(name) + '">' + U.escape(r[nameKey.replace("Name", "Mobile")] || "") + "</option>";
    });
    html += "</datalist>";
    return html;
  };

  /* Look up mobile for a party name */
  App.findPartyMobile = function (entity, name) {
    if (!name) return "";
    const direct = SBT.store.list(entity).find(function (r) { return r.name === name; });
    if (direct && direct.mobile) return direct.mobile;

    const txEntity = entity === "suppliers" ? "purchases" : "sales";
    const nameKey = entity === "suppliers" ? "supplierName" : "customerName";
    const mobileKey = entity === "suppliers" ? "supplierMobile" : "customerMobile";
    const tx = SBT.store.list(txEntity).find(function (r) { return r[nameKey] === name; });
    return tx ? (tx[mobileKey] || "") : "";
  };

  /* ==========================================================================
     PURCHASE LINKING
     A purchase, its sales and its expenses all share one purchaseId.
     ========================================================================== */

  /* Human readable label for a purchase row */
  App.purchaseLabel = function (purchase) {
    if (!purchase) return "";
    return [
      U.formatDate(purchase.date),
      purchase.supplierName,
      purchase.materialName
    ].filter(Boolean).join(" · ");
  };

  /* <option> list of purchases for the Sales / Expense forms */
  App.purchaseOptions = function (selectedId) {
    const list = U.sortBy(SBT.store.list("purchases"), "date", true);
    const selected = selectedId === undefined || selectedId === null ? "" : String(selectedId);
    let html = '<option value="">' + U.escape(t("common.notLinked")) + "</option>";
    list.forEach(function (p) {
      const key = String(p.purchaseId || p.id);
      const label = App.purchaseLabel(p) + " (" + U.qty(p.quantity) + " " + (p.unit || "") + ")";
      html += '<option value="' + U.escape(key) + '"' +
        (key === selected ? " selected" : "") + ">" +
        U.escape(label) + "</option>";
    });
    return html;
  };

  /* Sales and expenses that point at the given purchaseId */
  App.linkedRecords = function (purchaseId) {
    if (!purchaseId) return { sales: [], expenses: [] };
    const key = String(purchaseId);
    return {
      sales: SBT.store.list("sales").filter(function (r) { return String(r.purchaseId) === key; }),
      expenses: SBT.store.list("expenses").filter(function (r) { return String(r.purchaseId) === key; })
    };
  };

  /* Table cell showing the linked purchase */
  App.purchaseRefCell = function (purchaseId) {
    if (!purchaseId) return '<span class="sbt-muted">—</span>';
    const key = String(purchaseId);
    const purchase = SBT.store.list("purchases").find(function (p) {
      return String(p.purchaseId || p.id) === key;
    });
    if (!purchase) return '<span class="sbt-muted">—</span>';
    const label = App.purchaseLabel(purchase);
    return '<span class="sbt-badge sbt-badge--info" title="' + U.escape(label) + '">' +
      U.escape(U.truncate(label, 26)) + "</span>";
  };

  /* Ensure a party master record exists */
  App.ensureParty = function (entity, name, mobile, extra) {
    if (!name) return null;
    const existing = SBT.store.list(entity).find(function (r) {
      return String(r.name).toLowerCase() === String(name).toLowerCase();
    });
    if (existing) {
      if (mobile && !existing.mobile) {
        SBT.store.update(entity, existing.id, { mobile: mobile });
      }
      return existing;
    }
    return SBT.store.insert(entity, Object.assign({
      name: name,
      mobile: mobile || "",
      address: "",
      gstin: "",
      notes: ""
    }, extra || {}));
  };
})(window);
