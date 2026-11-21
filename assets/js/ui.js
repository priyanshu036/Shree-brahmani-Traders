/* ==========================================================================
   SHREE BRAHMANI TRADERS — UI Helpers
   Toasts, modals, confirm dialogs, table rendering, form helpers
   ========================================================================== */
(function (global) {
  "use strict";

  const SBT = (global.SBT = global.SBT || {});
  const U = SBT.utils;
  const UI = (SBT.ui = {});

  function t(key, vars) { return U.t(key, vars); }

  /* ==========================================================================
     TOASTS
     ========================================================================== */
  let toastHost = null;

  function ensureToastHost() {
    if (!toastHost) {
      toastHost = U.el("div", { class: "sbt-toasts", "aria-live": "polite", "aria-atomic": "true" });
      document.body.appendChild(toastHost);
    }
    return toastHost;
  }

  const TOAST_ICONS = {
    success: "bi-check-circle-fill",
    error: "bi-x-circle-fill",
    warning: "bi-exclamation-triangle-fill",
    info: "bi-info-circle-fill"
  };

  UI.toast = function (message, type, duration) {
    const kind = type || "info";
    const host = ensureToastHost();
    const node = U.el("div", { class: "sbt-toast sbt-toast--" + kind, role: "status" },
      '<i class="bi ' + (TOAST_ICONS[kind] || TOAST_ICONS.info) + '"></i>' +
      '<div>' + U.escape(message) + "</div>"
    );
    host.appendChild(node);

    const ttl = duration === undefined ? 3200 : duration;
    if (ttl > 0) {
      setTimeout(function () {
        node.classList.add("is-out");
        setTimeout(function () {
          if (node.parentNode) node.parentNode.removeChild(node);
        }, 240);
      }, ttl);
    }
    return node;
  };

  UI.success = function (m) { return UI.toast(m, "success"); };
  UI.error = function (m) { return UI.toast(m, "error"); };
  UI.warn = function (m) { return UI.toast(m, "warning"); };
  UI.info = function (m) { return UI.toast(m, "info"); };

  /* ==========================================================================
     MODAL
     ========================================================================== */
  UI.modal = function (options) {
    const opts = options || {};
    const id = "sbtModal_" + U.uid();

    const overlay = U.el("div", { class: "sbt-modal", id: id, role: "dialog", "aria-modal": "true" });
    const sizeClass = opts.size ? " sbt-modal__dialog--" + opts.size : "";

    overlay.innerHTML =
      '<div class="sbt-modal__dialog' + sizeClass + '">' +
        '<div class="sbt-modal__head">' +
          "<div>" +
            "<h3>" + U.escape(opts.title || "") + "</h3>" +
            (opts.subtitle ? "<p>" + U.escape(opts.subtitle) + "</p>" : "") +
          "</div>" +
          '<button type="button" class="sbt-modal__close" aria-label="' + U.escape(t("common.close")) + '">&times;</button>' +
        "</div>" +
        '<div class="sbt-modal__body">' + (opts.body || "") + "</div>" +
        (opts.footer === false ? "" :
          '<div class="sbt-modal__foot">' + (opts.footer || "") + "</div>") +
      "</div>";

    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";

    const dialog = overlay.querySelector(".sbt-modal__dialog");
    const closeBtn = overlay.querySelector(".sbt-modal__close");
    let closed = false;

    function close() {
      closed = true;
      overlay.classList.remove("is-open");
      document.body.style.overflow = "";
      setTimeout(function () {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }, 200);
      if (typeof opts.onClose === "function") opts.onClose();
    }

    closeBtn.addEventListener("click", close);
    overlay.addEventListener("mousedown", function (e) {
      if (e.target === overlay) close();
    });
    document.addEventListener("keydown", function escHandler(e) {
      if (e.key === "Escape") {
        close();
        document.removeEventListener("keydown", escHandler);
      }
    });

    /* Open on the next frame so the CSS transition runs. Fall back to a
       timeout because requestAnimationFrame is paused in background tabs,
       which would otherwise leave the modal invisible. */
    let opened = false;
    function openNow() {
      if (opened || closed) return;
      opened = true;
      overlay.classList.add("is-open");
      if (typeof opts.onOpen === "function") opts.onOpen(api);
    }
    requestAnimationFrame(openNow);
    setTimeout(openNow, 50);

    const api = {
      el: overlay,
      dialog: dialog,
      body: overlay.querySelector(".sbt-modal__body"),
      footer: overlay.querySelector(".sbt-modal__foot"),
      close: close,
      $: function (sel) { return overlay.querySelector(sel); },
      $$: function (sel) { return Array.prototype.slice.call(overlay.querySelectorAll(sel)); }
    };

    return api;
  };

  /* ==========================================================================
     CONFIRM
     ========================================================================== */
  UI.confirm = function (options) {
    const opts = typeof options === "string" ? { message: options } : (options || {});
    return new Promise(function (resolve) {
      let settled = false;

      const modal = UI.modal({
        title: opts.title || t("common.confirmTitle"),
        size: "sm",
        body:
          '<div class="sbt-row" style="align-items:flex-start;gap:.85rem">' +
            '<div style="display:grid;place-items:center;width:42px;height:42px;flex:0 0 auto;border-radius:12px;background:' +
              (opts.danger === false ? "var(--sbt-info-bg)" : "var(--sbt-danger-bg)") + ";color:" +
              (opts.danger === false ? "var(--sbt-info)" : "var(--sbt-danger)") + ';font-size:1.15rem">' +
              '<i class="bi ' + (opts.danger === false ? "bi-question-circle-fill" : "bi-exclamation-triangle-fill") + '"></i>' +
            "</div>" +
            '<div style="flex:1 1 auto;min-width:0">' +
              '<p style="margin:0;font-size:.88rem;color:var(--sbt-text-soft);line-height:1.55">' +
                U.escape(opts.message || t("common.confirmMessage")) +
              "</p>" +
            "</div>" +
          "</div>",
        footer:
          '<button type="button" class="sbt-btn sbt-btn--outline" data-act="cancel">' +
            U.escape(opts.cancelText || t("common.cancel")) +
          "</button>" +
          '<button type="button" class="sbt-btn ' +
            (opts.danger === false ? "sbt-btn--primary" : "sbt-btn--danger") +
            '" data-act="ok">' +
            U.escape(opts.confirmText || t("common.yesContinue")) +
          "</button>",
        onClose: function () {
          if (!settled) { settled = true; resolve(false); }
        }
      });

      modal.$('[data-act="cancel"]').addEventListener("click", function () {
        settled = true;
        modal.close();
        resolve(false);
      });

      modal.$('[data-act="ok"]').addEventListener("click", function () {
        settled = true;
        modal.close();
        resolve(true);
      });

      setTimeout(function () {
        const ok = modal.$('[data-act="ok"]');
        if (ok) ok.focus();
      }, 60);
    });
  };

  /* ==========================================================================
     TABLE RENDERER
     ========================================================================== */
  UI.table = function (options) {
    const opts = options || {};
    const columns = opts.columns || [];
    const rows = opts.rows || [];
    const empty = opts.empty || {};

    if (!rows.length) {
      return (
        '<div class="sbt-empty">' +
          '<i class="bi ' + (empty.icon || "bi-inbox") + '"></i>' +
          "<strong>" + U.escape(empty.title || t("common.noRecords")) + "</strong>" +
          "<span>" + U.escape(empty.message || t("common.noRecordsMsg")) + "</span>" +
        "</div>"
      );
    }

    let html = '<div class="sbt-table-wrap"><table class="sbt-table' +
      (opts.compact ? " sbt-table--compact" : "") + '">';

    html += "<thead><tr>";
    columns.forEach(function (col) {
      const cls = [col.align === "right" ? "num" : "", col.className || ""].filter(Boolean).join(" ");
      html += '<th' + (cls ? ' class="' + cls + '"' : "") + ">" + (col.label || "") + "</th>";
    });
    html += "</tr></thead><tbody>";

    rows.forEach(function (row, index) {
      html += "<tr" + (opts.rowAttrs ? " " + opts.rowAttrs(row, index) : "") + ">";
      columns.forEach(function (col) {
        const cls = [col.align === "right" ? "num" : "", col.className || ""].filter(Boolean).join(" ");
        let value;
        if (typeof col.render === "function") {
          value = col.render(row, index);
        } else {
          value = U.escape(row[col.key]);
        }
        html += "<td" + (cls ? ' class="' + cls + '"' : "") + ">" + value + "</td>";
      });
      html += "</tr>";
    });

    html += "</tbody>";

    if (opts.footer) {
      html += "<tfoot>" + opts.footer + "</tfoot>";
    }

    html += "</table></div>";
    return html;
  };

  /* ==========================================================================
     FORM HELPERS
     ========================================================================== */
  UI.field = function (config) {
    const c = config || {};
    const id = c.id || U.uid("f");
    const required = c.required ? '<span class="req">*</span>' : "";
    const full = c.full ? " sbt-field--full" : "";
    const help = c.help ? '<span class="sbt-help">' + U.escape(c.help) + "</span>" : "";
    const value = c.value === undefined || c.value === null ? "" : c.value;

    let control = "";

    if (c.type === "select") {
      let options = "";
      (c.options || []).forEach(function (opt) {
        const val = typeof opt === "object" ? opt.value : opt;
        const label = typeof opt === "object" ? opt.label : U.tv(opt);
        const selected = String(val) === String(value) ? " selected" : "";
        options += '<option value="' + U.escape(val) + '"' + selected + ">" + U.escape(label) + "</option>";
      });
      control = '<select class="sbt-select" id="' + id + '" name="' + (c.name || id) + '"' +
        (c.required ? " required" : "") + (c.disabled ? " disabled" : "") + ">" + options + "</select>";
    } else if (c.type === "textarea") {
      control = '<textarea class="sbt-textarea" id="' + id + '" name="' + (c.name || id) + '"' +
        ' placeholder="' + U.escape(c.placeholder || "") + '"' +
        (c.required ? " required" : "") + (c.rows ? ' rows="' + c.rows + '"' : "") + ">" +
        U.escape(value) + "</textarea>";
    } else if (c.type === "checkbox") {
      return (
        '<div class="sbt-field' + full + '">' +
          '<label class="sbt-row" style="text-transform:none;letter-spacing:0;font-size:.84rem;font-weight:600;cursor:pointer;gap:.5rem">' +
            '<input type="checkbox" id="' + id + '" name="' + (c.name || id) + '"' +
              (value ? " checked" : "") + ' style="width:17px;height:17px;accent-color:var(--sbt-navy-600)">' +
            "<span>" + U.escape(c.label || "") + "</span>" +
          "</label>" +
          help +
        "</div>"
      );
    } else {
      const inputType = c.type || "text";
      const attrs = [
        'type="' + inputType + '"',
        'class="sbt-input"',
        'id="' + id + '"',
        'name="' + (c.name || id) + '"',
        'placeholder="' + U.escape(c.placeholder || "") + '"',
        'value="' + U.escape(value) + '"'
      ];
      if (c.required) attrs.push("required");
      if (c.readonly) attrs.push("readonly");
      if (c.disabled) attrs.push("disabled");
      if (c.min !== undefined) attrs.push('min="' + c.min + '"');
      if (c.max !== undefined) attrs.push('max="' + c.max + '"');
      if (c.step !== undefined) attrs.push('step="' + c.step + '"');
      if (c.autocomplete) attrs.push('autocomplete="' + c.autocomplete + '"');
      if (c.inputmode) attrs.push('inputmode="' + c.inputmode + '"');

      if (c.prefix) {
        control =
          '<div class="sbt-input-group">' +
            '<span class="sbt-input-group__prefix">' + U.escape(c.prefix) + "</span>" +
            "<input " + attrs.join(" ") + ">" +
          "</div>";
      } else {
        control = "<input " + attrs.join(" ") + ">";
      }
    }

    return (
      '<div class="sbt-field' + full + '">' +
        '<label for="' + id + '">' + U.escape(c.label || "") + required + "</label>" +
        control +
        help +
        '<span class="sbt-error-text" data-error-for="' + (c.name || id) + '"></span>' +
      "</div>"
    );
  };

  UI.formGrid = function (fields) {
    return '<div class="sbt-form-grid">' + (fields || []).map(UI.field).join("") + "</div>";
  };

  /* Read a form into a plain object */
  UI.readForm = function (formEl) {
    const data = {};
    U.$$("input, select, textarea", formEl).forEach(function (input) {
      if (!input.name) return;
      if (input.type === "checkbox") {
        data[input.name] = input.checked;
      } else if (input.type === "number") {
        data[input.name] = input.value === "" ? "" : U.num(input.value);
      } else {
        data[input.name] = input.value.trim();
      }
    });
    return data;
  };

  /* Show validation errors on a form */
  UI.showErrors = function (formEl, errors) {
    U.$$(".sbt-error-text", formEl).forEach(function (node) {
      node.textContent = "";
    });
    U.$$(".sbt-input, .sbt-select, .sbt-textarea", formEl).forEach(function (node) {
      node.classList.remove("is-invalid");
    });

    const keys = Object.keys(errors || {});
    keys.forEach(function (key) {
      const errNode = formEl.querySelector('[data-error-for="' + key + '"]');
      if (errNode) errNode.textContent = errors[key];
      const input = formEl.querySelector('[name="' + key + '"]');
      if (input) input.classList.add("is-invalid");
    });

    if (keys.length) {
      const first = formEl.querySelector('[name="' + keys[0] + '"]');
      if (first) first.focus();
    }
    return keys.length === 0;
  };

  UI.clearErrors = function (formEl) {
    UI.showErrors(formEl, {});
  };

  /* ==========================================================================
     MISC HELPERS
     ========================================================================== */
  UI.setLoading = function (button, isLoading, loadingText) {
    if (!button) return;
    if (isLoading) {
      button.dataset.originalHtml = button.innerHTML;
      button.disabled = true;
      button.innerHTML =
        '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> ' +
        U.escape(loadingText || t("common.pleaseWait"));
    } else {
      button.disabled = false;
      if (button.dataset.originalHtml) {
        button.innerHTML = button.dataset.originalHtml;
        delete button.dataset.originalHtml;
      }
    }
  };

  UI.emptyState = function (icon, title, message) {
    return (
      '<div class="sbt-empty">' +
        '<i class="bi ' + (icon || "bi-inbox") + '"></i>' +
        "<strong>" + U.escape(title || t("common.noRecords")) + "</strong>" +
        "<span>" + U.escape(message || "") + "</span>" +
      "</div>"
    );
  };

  UI.progress = function (value, variant) {
    const pct = U.clamp(value, 0, 100);
    return (
      '<div class="sbt-progress">' +
        '<div class="sbt-progress__bar' + (variant ? " sbt-progress__bar--" + variant : "") +
        '" style="width:' + pct + '%"></div>' +
      "</div>"
    );
  };

  UI.avatar = function (name, size) {
    const s = size || 34;
    return (
      '<span style="display:inline-grid;place-items:center;width:' + s + "px;height:" + s +
      "px;border-radius:50%;font-size:" + Math.round(s * 0.36) +
      'px;font-weight:700;color:#fff;background:linear-gradient(140deg,var(--sbt-navy-500),var(--sbt-navy-700));flex:0 0 auto">' +
      U.escape(U.initials(name)) +
      "</span>"
    );
  };

  UI.partyCell = function (name, mobile) {
    return (
      '<div class="sbt-row" style="gap:.55rem;flex-wrap:nowrap">' +
        UI.avatar(name, 32) +
        '<div style="min-width:0">' +
          '<div class="sbt-strong" style="font-size:.83rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' +
            U.escape(name || "—") +
          "</div>" +
          (mobile ? '<div class="sbt-muted" style="font-size:.72rem">' + U.escape(mobile) + "</div>" : "") +
        "</div>" +
      "</div>"
    );
  };

  /* Date range toolbar */
  UI.dateRangeToolbar = function (prefix, options) {
    const opts = options || {};
    const presets = [
      { value: "today", label: t("range.today") },
      { value: "week", label: t("range.week") },
      { value: "month", label: t("range.month") },
      { value: "last-month", label: t("range.lastMonth") },
      { value: "quarter", label: t("range.quarter") },
      { value: "year", label: t("range.year") },
      { value: "all", label: t("range.allTime") }
    ];

    return (
      '<div class="sbt-field">' +
        '<label for="' + prefix + 'Preset">' + U.escape(t("range.period")) + "</label>" +
        '<select class="sbt-select" id="' + prefix + 'Preset">' +
          presets.map(function (p) {
            return '<option value="' + p.value + '"' +
              (p.value === (opts.defaultPreset || "month") ? " selected" : "") + ">" +
              U.escape(p.label) + "</option>";
          }).join("") +
        "</select>" +
      "</div>" +
      '<div class="sbt-field">' +
        '<label for="' + prefix + 'From">' + U.escape(t("range.from")) + "</label>" +
        '<input type="date" class="sbt-input" id="' + prefix + 'From">' +
      "</div>" +
      '<div class="sbt-field">' +
        '<label for="' + prefix + 'To">' + U.escape(t("range.to")) + "</label>" +
        '<input type="date" class="sbt-input" id="' + prefix + 'To">' +
      "</div>"
    );
  };

  /* Wire a date range toolbar; calls onChange({from,to,preset}) on user input.
     The initial preset is applied to the inputs WITHOUT firing onChange, so
     callers that re-render inside onChange do not loop forever. The applied
     range is returned so the caller can seed its own state. */
  UI.bindDateRange = function (prefix, onChange, defaultPreset) {
    const presetEl = document.getElementById(prefix + "Preset");
    const fromEl = document.getElementById(prefix + "From");
    const toEl = document.getElementById(prefix + "To");
    if (!presetEl || !fromEl || !toEl) return null;

    function applyPreset(preset, silent) {
      const range = U.rangePreset(preset);
      fromEl.value = range.from;
      toEl.value = range.to;
      fromEl.disabled = preset === "all";
      toEl.disabled = preset === "all";
      if (!silent) {
        onChange({ from: range.from, to: range.to, preset: preset });
      }
      return { from: range.from, to: range.to, preset: preset };
    }

    presetEl.addEventListener("change", function () { applyPreset(presetEl.value); });
    fromEl.addEventListener("change", function () {
      presetEl.value = "custom";
      onChange({ from: fromEl.value, to: toEl.value, preset: "custom" });
    });
    toEl.addEventListener("change", function () {
      presetEl.value = "custom";
      onChange({ from: fromEl.value, to: toEl.value, preset: "custom" });
    });

    /* Seed the inputs silently — no onChange, no re-render loop. */
    const initial = applyPreset(defaultPreset || presetEl.value || "month", true);

    return {
      initial: initial,
      get: function () { return { from: fromEl.value, to: toEl.value }; },
      set: function (preset) { return applyPreset(preset); }
    };
  };

  /* Simple search + filter helper for tables */
  UI.filterRows = function (rows, search, fields) {
    const term = String(search || "").trim().toLowerCase();
    if (!term) return rows;
    const keys = fields || Object.keys(rows[0] || {});
    return rows.filter(function (row) {
      return keys.some(function (key) {
        return String(row[key] === null || row[key] === undefined ? "" : row[key])
          .toLowerCase()
          .indexOf(term) !== -1;
      });
    });
  };
})(window);
