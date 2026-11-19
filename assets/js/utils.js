/* ==========================================================================
   SHREE BRAHMANI TRADERS — Utilities
   ========================================================================== */
(function (global) {
  "use strict";

  const SBT = (global.SBT = global.SBT || {});
  const U = (SBT.utils = {});

  /* ---------- IDs ---------- */
  U.uid = function (prefix) {
    const stamp = Date.now().toString(36);
    const rand = Math.random().toString(36).slice(2, 8);
    return (prefix ? prefix + "_" : "") + stamp + rand;
  };

  /* ---------- Numbers ---------- */
  U.num = function (value, fallback) {
    const n = parseFloat(value);
    return isFinite(n) ? n : (fallback === undefined ? 0 : fallback);
  };

  U.round = function (value, decimals) {
    const d = decimals === undefined ? 2 : decimals;
    const f = Math.pow(10, d);
    return Math.round((U.num(value) + Number.EPSILON) * f) / f;
  };

  U.clamp = function (value, min, max) {
    return Math.min(Math.max(U.num(value), min), max);
  };

  /* ---------- Currency ---------- */
  U.currency = function (value, decimals) {
    const d = decimals === undefined ? 2 : decimals;
    const n = U.num(value);
    const sign = n < 0 ? "-" : "";
    const abs = Math.abs(n);
    const parts = abs.toFixed(d).split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    const symbol = (SBT.store && SBT.store.settings && SBT.store.settings.currency) || "₹";
    return sign + symbol + parts.join(".");
  };

  U.currencyShort = function (value) {
    const n = U.num(value);
    const abs = Math.abs(n);
    const sign = n < 0 ? "-" : "";
    const symbol = (SBT.store && SBT.store.settings && SBT.store.settings.currency) || "₹";
    if (abs >= 10000000) return sign + symbol + U.round(abs / 10000000, 2) + " Cr";
    if (abs >= 100000) return sign + symbol + U.round(abs / 100000, 2) + " L";
    if (abs >= 1000) return sign + symbol + U.round(abs / 1000, 1) + "K";
    return sign + symbol + U.round(abs, 0);
  };

  U.number = function (value, decimals) {
    const d = decimals === undefined ? 2 : decimals;
    const n = U.num(value);
    const parts = n.toFixed(d).split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  };

  U.qty = function (value) {
    const n = U.num(value);
    return Number.isInteger(n) ? String(n) : U.number(n, 2);
  };

  U.percent = function (value, decimals) {
    return U.number(value, decimals === undefined ? 1 : decimals) + "%";
  };

  /* ---------- Dates ---------- */
  U.today = function () {
    return U.toISODate(new Date());
  };

  U.toISODate = function (date) {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  };

  U.parseDate = function (value) {
    if (!value) return null;
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
    const s = String(value).trim();
    // ISO yyyy-mm-dd
    let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    // dd/mm/yyyy or dd-mm-yyyy
    m = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(s);
    if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  };

  U.formatDate = function (value) {
    const d = U.parseDate(value);
    if (!d) return "—";
    const day = String(d.getDate()).padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return day + " " + months[d.getMonth()] + " " + d.getFullYear();
  };

  U.formatDateTime = function (value) {
    const d = U.parseDate(value);
    if (!d) return "—";
    let h = d.getHours();
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    const min = String(d.getMinutes()).padStart(2, "0");
    return U.formatDate(d) + ", " + h + ":" + min + " " + ampm;
  };

  U.monthKey = function (value) {
    const d = U.parseDate(value);
    if (!d) return "";
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
  };

  U.monthLabel = function (key) {
    const parts = String(key).split("-");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const idx = parseInt(parts[1], 10) - 1;
    return (months[idx] || "?") + " " + String(parts[0]).slice(2);
  };

  U.startOfDay = function (d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };

  U.endOfDay = function (d) {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
  };

  U.addDays = function (date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  };

  U.daysBetween = function (a, b) {
    const d1 = U.startOfDay(U.parseDate(a) || new Date());
    const d2 = U.startOfDay(U.parseDate(b) || new Date());
    return Math.round((d2 - d1) / 86400000);
  };

  U.relativeTime = function (value) {
    const d = U.parseDate(value);
    if (!d) return "—";
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return mins + "m ago";
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + "h ago";
    const days = Math.floor(hrs / 24);
    if (days < 30) return days + "d ago";
    return U.formatDate(d);
  };

  /* Date range presets */
  U.rangePreset = function (preset) {
    const now = new Date();
    const today = U.startOfDay(now);
    let from, to;

    switch (preset) {
      case "today":
        from = today; to = today; break;
      case "yesterday":
        from = U.addDays(today, -1); to = U.addDays(today, -1); break;
      case "week":
        from = U.addDays(today, -6); to = today; break;
      case "month":
        from = new Date(now.getFullYear(), now.getMonth(), 1); to = today; break;
      case "last-month":
        from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        to = new Date(now.getFullYear(), now.getMonth(), 0); break;
      case "quarter":
        from = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        to = today; break;
      case "year":
        from = new Date(now.getFullYear(), 0, 1); to = today; break;
      case "last-year":
        from = new Date(now.getFullYear() - 1, 0, 1);
        to = new Date(now.getFullYear() - 1, 11, 31); break;
      case "all":
      default:
        from = null; to = null;
    }

    return {
      from: from ? U.toISODate(from) : "",
      to: to ? U.toISODate(to) : ""
    };
  };

  U.inRange = function (dateValue, from, to) {
    const d = U.parseDate(dateValue);
    if (!d) return false;
    const t = U.startOfDay(d).getTime();
    if (from) {
      const f = U.parseDate(from);
      if (f && t < U.startOfDay(f).getTime()) return false;
    }
    if (to) {
      const e = U.parseDate(to);
      if (e && t > U.endOfDay(e).getTime()) return false;
    }
    return true;
  };

  /* ---------- Strings ---------- */
  U.escape = function (str) {
    return String(str === null || str === undefined ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  U.titleCase = function (str) {
    return String(str || "").replace(/\w\S*/g, function (t) {
      return t.charAt(0).toUpperCase() + t.substr(1).toLowerCase();
    });
  };

  U.initials = function (name) {
    const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  U.slug = function (str) {
    return String(str || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  U.truncate = function (str, len) {
    const s = String(str || "");
    return s.length > len ? s.slice(0, len - 1) + "…" : s;
  };

  U.validMobile = function (value) {
    const digits = String(value || "").replace(/\D/g, "");
    return digits.length >= 10 && digits.length <= 13;
  };

  U.validGST = function (value) {
    if (!value) return true;
    return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(String(value).toUpperCase());
  };

  /* ---------- Arrays ---------- */
  U.sum = function (arr, selector) {
    return (arr || []).reduce(function (total, item) {
      const v = selector ? selector(item) : item;
      return total + U.num(v);
    }, 0);
  };

  U.groupBy = function (arr, keyFn) {
    const out = {};
    (arr || []).forEach(function (item) {
      const key = typeof keyFn === "function" ? keyFn(item) : item[keyFn];
      if (!out[key]) out[key] = [];
      out[key].push(item);
    });
    return out;
  };

  U.sortBy = function (arr, keyFn, desc) {
    const copy = (arr || []).slice();
    copy.sort(function (a, b) {
      const av = typeof keyFn === "function" ? keyFn(a) : a[keyFn];
      const bv = typeof keyFn === "function" ? keyFn(b) : b[keyFn];
      if (av === bv) return 0;
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      const result = av > bv ? 1 : -1;
      return desc ? -result : result;
    });
    return copy;
  };

  U.unique = function (arr) {
    return Array.from(new Set(arr || []));
  };

  U.uniqueBy = function (arr, keyFn) {
    const seen = new Set();
    return (arr || []).filter(function (item) {
      const key = typeof keyFn === "function" ? keyFn(item) : item[keyFn];
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  /* ---------- DOM ---------- */
  U.$ = function (sel, root) {
    return (root || document).querySelector(sel);
  };

  U.$$ = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };

  U.el = function (tag, attrs, html) {
    const node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "class") node.className = attrs[k];
        else if (k === "dataset") Object.assign(node.dataset, attrs[k]);
        else if (k.indexOf("on") === 0 && typeof attrs[k] === "function") {
          node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        } else if (attrs[k] !== null && attrs[k] !== undefined) {
          node.setAttribute(k, attrs[k]);
        }
      });
    }
    if (html !== undefined) node.innerHTML = html;
    return node;
  };

  U.on = function (target, event, selector, handler) {
    if (typeof selector === "function") {
      target.addEventListener(event, selector);
      return;
    }
    target.addEventListener(event, function (e) {
      const match = e.target.closest(selector);
      if (match && target.contains(match)) handler.call(match, e, match);
    });
  };

  U.debounce = function (fn, wait) {
    let timer;
    return function () {
      const args = arguments;
      const ctx = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(ctx, args); }, wait || 250);
    };
  };

  U.throttle = function (fn, limit) {
    let waiting = false;
    return function () {
      if (waiting) return;
      fn.apply(this, arguments);
      waiting = true;
      setTimeout(function () { waiting = false; }, limit || 200);
    };
  };

  /* ---------- Files ---------- */
  U.download = function (filename, content, mime) {
    const blob = content instanceof Blob
      ? content
      : new Blob([content], { type: mime || "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  };

  U.toCSV = function (rows, headers) {
    const cols = headers || (rows.length ? Object.keys(rows[0]) : []);
    const esc = function (v) {
      const s = v === null || v === undefined ? "" : String(v);
      return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const lines = [cols.map(esc).join(",")];
    rows.forEach(function (row) {
      lines.push(cols.map(function (c) { return esc(row[c]); }).join(","));
    });
    return lines.join("\r\n");
  };

  U.exportCSV = function (filename, rows, headers) {
    U.download(filename.replace(/\.csv$/i, "") + ".csv", "\uFEFF" + U.toCSV(rows, headers), "text/csv;charset=utf-8");
  };

  /* Excel-compatible export (SpreadsheetML / HTML table with .xls) */
  U.exportExcel = function (filename, rows, headers, title) {
    const cols = headers || (rows.length ? Object.keys(rows[0]) : []);
    const esc = function (v) {
      return String(v === null || v === undefined ? "" : v)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    };
    let html = '<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8">';
    html += "<style>table{border-collapse:collapse}th,td{border:1px solid #ccc;padding:4px 8px;font-family:Calibri;font-size:11pt}th{background:#1b4b73;color:#fff;font-weight:bold}</style>";
    html += "</head><body>";
    if (title) html += "<h3>" + esc(title) + "</h3>";
    html += "<table><thead><tr>";
    cols.forEach(function (c) { html += "<th>" + esc(c) + "</th>"; });
    html += "</tr></thead><tbody>";
    rows.forEach(function (row) {
      html += "<tr>";
      cols.forEach(function (c) { html += "<td>" + esc(row[c]) + "</td>"; });
      html += "</tr>";
    });
    html += "</tbody></table></body></html>";
    U.download(filename.replace(/\.xlsx?$/i, "") + ".xls", html, "application/vnd.ms-excel");
  };

  /* ---------- Validation ---------- */
  U.validate = function (rules) {
    const errors = {};
    Object.keys(rules).forEach(function (field) {
      const rule = rules[field];
      const value = rule.value;
      const label = rule.label || field;

      if (rule.required && (value === "" || value === null || value === undefined)) {
        errors[field] = label + " is required";
        return;
      }
      if (value === "" || value === null || value === undefined) return;

      if (rule.type === "number" && !isFinite(parseFloat(value))) {
        errors[field] = label + " must be a valid number";
        return;
      }
      if (rule.min !== undefined && U.num(value) < rule.min) {
        errors[field] = label + " must be at least " + rule.min;
        return;
      }
      if (rule.max !== undefined && U.num(value) > rule.max) {
        errors[field] = label + " must not exceed " + rule.max;
        return;
      }
      if (rule.mobile && !U.validMobile(value)) {
        errors[field] = label + " must be a valid 10-digit mobile number";
        return;
      }
      if (rule.gst && !U.validGST(value)) {
        errors[field] = label + " is not a valid GST number";
        return;
      }
      if (rule.minLength && String(value).trim().length < rule.minLength) {
        errors[field] = label + " must be at least " + rule.minLength + " characters";
        return;
      }
      if (rule.pattern && !rule.pattern.test(String(value))) {
        errors[field] = rule.message || label + " is invalid";
      }
    });
    return errors;
  };

  /* ---------- Misc ---------- */
  U.sleep = function (ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  };

  U.clone = function (obj) {
    return JSON.parse(JSON.stringify(obj));
  };

  U.pick = function (obj, keys) {
    const out = {};
    keys.forEach(function (k) {
      if (obj[k] !== undefined) out[k] = obj[k];
    });
    return out;
  };

  U.isEmpty = function (obj) {
    return !obj || Object.keys(obj).length === 0;
  };

  U.paymentBadge = function (status) {
    const map = {
      Paid: "sbt-badge--paid",
      Partial: "sbt-badge--partial",
      Pending: "sbt-badge--pending"
    };
    const cls = map[status] || "sbt-badge--neutral";
    return '<span class="sbt-badge ' + cls + '">' + U.escape(status || "—") + "</span>";
  };

  U.stockBadge = function (qty, min) {
    const q = U.num(qty);
    const m = U.num(min);
    if (q <= 0) return '<span class="sbt-badge sbt-badge--danger">Out of Stock</span>';
    if (m > 0 && q <= m) return '<span class="sbt-badge sbt-badge--warning">Low Stock</span>';
    return '<span class="sbt-badge sbt-badge--success">In Stock</span>';
  };
})(window);
