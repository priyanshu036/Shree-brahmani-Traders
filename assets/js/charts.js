/* ==========================================================================
   SHREE BRAHMANI TRADERS — Lightweight Canvas Charts
   Line, Bar, Grouped Bar, Doughnut, Area — no external dependencies
   ========================================================================== */
(function (global) {
  "use strict";

  const SBT = (global.SBT = global.SBT || {});
  const U = SBT.utils;
  const Charts = (SBT.charts = {});

  const DEFAULTS = {
    height: 260,
    padding: { top: 18, right: 16, bottom: 34, left: 56 },
    gridLines: 4,
    font: '11px "Inter", "Segoe UI", system-ui, sans-serif',
    fontBold: '600 11px "Inter", "Segoe UI", system-ui, sans-serif',
    textColor: "#8496a9",
    gridColor: "#eef2f7",
    axisColor: "#e4e9f0",
    animate: true,
    duration: 620
  };

  /* ---------- Setup canvas with DPR scaling ---------- */
  function setupCanvas(container, height) {
    container.innerHTML = "";
    container.style.position = "relative";

    const canvas = document.createElement("canvas");
    const tooltip = document.createElement("div");
    tooltip.className = "sbt-chart__tooltip";
    container.appendChild(canvas);
    container.appendChild(tooltip);

    const dpr = window.devicePixelRatio || 1;
    const width = container.clientWidth || 600;
    const h = height || DEFAULTS.height;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = "100%";
    canvas.style.height = h + "px";

    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    return { canvas: canvas, ctx: ctx, width: width, height: h, tooltip: tooltip };
  }

  /* ---------- Nice axis scale ---------- */
  function niceScale(max, ticks) {
    const count = ticks || DEFAULTS.gridLines;
    if (max <= 0) return { max: 10, step: 2.5 };
    const rough = max / count;
    const mag = Math.pow(10, Math.floor(Math.log10(rough)));
    const norm = rough / mag;
    let step;
    if (norm <= 1) step = 1;
    else if (norm <= 2) step = 2;
    else if (norm <= 2.5) step = 2.5;
    else if (norm <= 5) step = 5;
    else step = 10;
    step *= mag;
    return { max: Math.ceil(max / step) * step, step: step };
  }

  function formatAxis(value) {
    const n = U.num(value);
    const abs = Math.abs(n);
    if (abs >= 10000000) return U.round(n / 10000000, 1) + "Cr";
    if (abs >= 100000) return U.round(n / 100000, 1) + "L";
    if (abs >= 1000) return U.round(n / 1000, 1) + "K";
    return String(U.round(n, 0));
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function animate(duration, onFrame, onDone) {
    if (!DEFAULTS.animate || duration <= 0) {
      onFrame(1);
      if (onDone) onDone();
      return;
    }
    const start = performance.now();
    function frame(now) {
      const t = Math.min(1, (now - start) / duration);
      onFrame(easeOutCubic(t));
      if (t < 1) requestAnimationFrame(frame);
      else if (onDone) onDone();
    }
    requestAnimationFrame(frame);
  }

  /* ---------- Rounded rect helper ---------- */
  function roundRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  /* ---------- Draw axes + grid ---------- */
  function drawAxes(ctx, box, scale, labels, opts) {
    const pad = box.pad;
    const plotW = box.width - pad.left - pad.right;
    const plotH = box.height - pad.top - pad.bottom;

    ctx.font = DEFAULTS.font;
    ctx.textBaseline = "middle";
    ctx.textAlign = "right";

    const steps = Math.round(scale.max / scale.step);
    for (let i = 0; i <= steps; i++) {
      const value = scale.step * i;
      const y = pad.top + plotH - (value / scale.max) * plotH;

      ctx.strokeStyle = DEFAULTS.gridColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + plotW, y);
      ctx.stroke();

      ctx.fillStyle = DEFAULTS.textColor;
      ctx.fillText(formatAxis(value), pad.left - 8, y);
    }

    /* X labels */
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = DEFAULTS.textColor;

    const count = labels.length;
    const slot = plotW / Math.max(1, count);
    const maxLabels = Math.max(2, Math.floor(plotW / 52));
    const skip = Math.ceil(count / maxLabels);

    labels.forEach(function (label, i) {
      if (i % skip !== 0 && i !== count - 1) return;
      const x = pad.left + slot * i + slot / 2;
      ctx.fillText(label, x, pad.top + plotH + 10);
    });

    /* Baseline */
    ctx.strokeStyle = DEFAULTS.axisColor;
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top + plotH);
    ctx.lineTo(pad.left + plotW, pad.top + plotH);
    ctx.stroke();
  }

  function makeBox(width, height, padding) {
    return {
      width: width,
      height: height,
      pad: Object.assign({}, DEFAULTS.padding, padding || {})
    };
  }

  /* ==========================================================================
     LINE / AREA CHART
     ========================================================================== */
  Charts.line = function (container, config) {
    if (!container) return null;
    const cfg = config || {};
    const labels = cfg.labels || [];
    const series = cfg.series || [];
    const height = cfg.height || DEFAULTS.height;

    const setup = setupCanvas(container, height);
    const ctx = setup.ctx;
    const box = makeBox(setup.width, setup.height, cfg.padding);

    let maxValue = 0;
    series.forEach(function (s) {
      (s.data || []).forEach(function (v) { maxValue = Math.max(maxValue, U.num(v)); });
    });
    const scale = niceScale(maxValue * 1.08, cfg.gridLines || DEFAULTS.gridLines);

    const pad = box.pad;
    const plotW = box.width - pad.left - pad.right;
    const plotH = box.height - pad.top - pad.bottom;
    const count = labels.length;
    const slot = plotW / Math.max(1, count);

    function xAt(i) {
      return pad.left + slot * i + slot / 2;
    }

    function yAt(v) {
      return pad.top + plotH - (U.num(v) / scale.max) * plotH;
    }

    function draw(progress) {
      ctx.clearRect(0, 0, box.width, box.height);
      drawAxes(ctx, box, scale, labels, cfg);

      series.forEach(function (s) {
        const data = s.data || [];
        const color = s.color || SBT.config.palette.navy;

        /* Area fill */
        if (cfg.area !== false && s.fill !== false) {
          const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + plotH);
          grad.addColorStop(0, hexToRgba(color, 0.22));
          grad.addColorStop(1, hexToRgba(color, 0.01));

          ctx.beginPath();
          ctx.moveTo(xAt(0), pad.top + plotH);
          data.forEach(function (v, i) {
            ctx.lineTo(xAt(i), yAt(U.num(v) * progress));
          });
          ctx.lineTo(xAt(data.length - 1), pad.top + plotH);
          ctx.closePath();
          ctx.fillStyle = grad;
          ctx.fill();
        }

        /* Line */
        ctx.beginPath();
        data.forEach(function (v, i) {
          const x = xAt(i);
          const y = yAt(U.num(v) * progress);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.4;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.stroke();

        /* Points */
        if (cfg.points !== false && count <= 24) {
          data.forEach(function (v, i) {
            const x = xAt(i);
            const y = yAt(U.num(v) * progress);
            ctx.beginPath();
            ctx.arc(x, y, 3.2, 0, Math.PI * 2);
            ctx.fillStyle = "#fff";
            ctx.fill();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.stroke();
          });
        }
      });
    }

    animate(cfg.duration || DEFAULTS.duration, draw);

    /* Hover tooltip */
    attachHover(setup, box, labels, series, xAt, yAt, slot, cfg);

    return { redraw: function () { draw(1); } };
  };

  /* ==========================================================================
     BAR CHART (single or grouped)
     ========================================================================== */
  Charts.bar = function (container, config) {
    if (!container) return null;
    const cfg = config || {};
    const labels = cfg.labels || [];
    const series = cfg.series || [];
    const height = cfg.height || DEFAULTS.height;

    const setup = setupCanvas(container, height);
    const ctx = setup.ctx;
    const box = makeBox(setup.width, setup.height, cfg.padding);

    let maxValue = 0;
    series.forEach(function (s) {
      (s.data || []).forEach(function (v) { maxValue = Math.max(maxValue, U.num(v)); });
    });
    const scale = niceScale(maxValue * 1.08, cfg.gridLines || DEFAULTS.gridLines);

    const pad = box.pad;
    const plotW = box.width - pad.left - pad.right;
    const plotH = box.height - pad.top - pad.bottom;
    const count = labels.length;
    const slot = plotW / Math.max(1, count);
    const groupCount = Math.max(1, series.length);
    const groupPad = slot * 0.22;
    const barW = Math.max(3, (slot - groupPad * 2) / groupCount);

    function xAt(i) {
      return pad.left + slot * i + slot / 2;
    }

    function yAt(v) {
      return pad.top + plotH - (U.num(v) / scale.max) * plotH;
    }

    function draw(progress) {
      ctx.clearRect(0, 0, box.width, box.height);
      drawAxes(ctx, box, scale, labels, cfg);

      labels.forEach(function (label, i) {
        const groupStart = pad.left + slot * i + groupPad;

        series.forEach(function (s, si) {
          const value = U.num((s.data || [])[i]);
          const barH = (value / scale.max) * plotH * progress;
          const x = groupStart + si * barW;
          const y = pad.top + plotH - barH;
          const color = s.color || SBT.config.chartColors[si % SBT.config.chartColors.length];

          if (barH > 0.5) {
            const grad = ctx.createLinearGradient(0, y, 0, pad.top + plotH);
            grad.addColorStop(0, color);
            grad.addColorStop(1, hexToRgba(color, 0.72));
            ctx.fillStyle = grad;
            roundRect(ctx, x, y, Math.max(2, barW - 2), barH, Math.min(5, barW / 2));
            ctx.fill();
          }
        });
      });
    }

    animate(cfg.duration || DEFAULTS.duration, draw);
    attachHover(setup, box, labels, series, xAt, yAt, slot, cfg);

    return { redraw: function () { draw(1); } };
  };

  /* ==========================================================================
     DOUGHNUT CHART
     ========================================================================== */
  Charts.doughnut = function (container, config) {
    if (!container) return null;
    const cfg = config || {};
    const labels = cfg.labels || [];
    const values = cfg.values || [];
    const height = cfg.height || DEFAULTS.height;

    const setup = setupCanvas(container, height);
    const ctx = setup.ctx;
    const width = setup.width;

    const total = U.sum(values);
    const cx = width / 2;
    const cy = height / 2;
    const outer = Math.min(width, height) / 2 - 12;
    const inner = outer * (cfg.cutout === undefined ? 0.62 : cfg.cutout);

    function draw(progress) {
      ctx.clearRect(0, 0, width, height);

      if (total <= 0) {
        ctx.beginPath();
        ctx.arc(cx, cy, (outer + inner) / 2, 0, Math.PI * 2);
        ctx.strokeStyle = "#eef2f7";
        ctx.lineWidth = outer - inner;
        ctx.stroke();

        ctx.fillStyle = DEFAULTS.textColor;
        ctx.font = DEFAULTS.font;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(U.t("common.noData"), cx, cy);
        return;
      }

      let startAngle = -Math.PI / 2;

      values.forEach(function (value, i) {
        const v = U.num(value);
        if (v <= 0) return;
        const angle = (v / total) * Math.PI * 2 * progress;
        const color = (cfg.colors && cfg.colors[i]) ||
          SBT.config.chartColors[i % SBT.config.chartColors.length];

        ctx.beginPath();
        ctx.arc(cx, cy, outer, startAngle, startAngle + angle);
        ctx.arc(cx, cy, inner, startAngle + angle, startAngle, true);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();

        /* Separator */
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();

        startAngle += angle;
      });

      /* Center label */
      if (cfg.centerLabel !== false) {
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#16283c";
        ctx.font = '700 15px "Inter", "Segoe UI", system-ui, sans-serif';
        ctx.fillText(cfg.centerValue || U.currencyShort(total), cx, cy - 6);
        ctx.fillStyle = DEFAULTS.textColor;
        ctx.font = DEFAULTS.font;
        ctx.fillText(cfg.centerText || U.t("common.total"), cx, cy + 12);
      }
    }

    animate(cfg.duration || DEFAULTS.duration, draw);

    /* Hover */
    setup.canvas.addEventListener("mousemove", function (e) {
      const rect = setup.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left - cx;
      const y = e.clientY - rect.top - cy;
      const dist = Math.sqrt(x * x + y * y);

      if (dist < inner || dist > outer || total <= 0) {
        setup.tooltip.classList.remove("is-visible");
        return;
      }

      let angle = Math.atan2(y, x) + Math.PI / 2;
      if (angle < 0) angle += Math.PI * 2;

      let acc = 0;
      for (let i = 0; i < values.length; i++) {
        const slice = (U.num(values[i]) / total) * Math.PI * 2;
        if (angle >= acc && angle < acc + slice) {
          setup.tooltip.innerHTML =
            U.escape(labels[i]) + ": <strong>" + U.currency(values[i]) + "</strong>";
          setup.tooltip.style.left = (e.clientX - rect.left) + "px";
          setup.tooltip.style.top = (e.clientY - rect.top) + "px";
          setup.tooltip.classList.add("is-visible");
          return;
        }
        acc += slice;
      }
      setup.tooltip.classList.remove("is-visible");
    });

    setup.canvas.addEventListener("mouseleave", function () {
      setup.tooltip.classList.remove("is-visible");
    });

    return { redraw: function () { draw(1); } };
  };

  /* ==========================================================================
     HORIZONTAL BAR CHART
     ========================================================================== */
  Charts.hbar = function (container, config) {
    if (!container) return null;
    const cfg = config || {};
    const labels = cfg.labels || [];
    const values = cfg.values || [];
    const rowH = cfg.rowHeight || 34;
    const height = Math.max(80, labels.length * rowH + 20);

    const setup = setupCanvas(container, height);
    const ctx = setup.ctx;
    const width = setup.width;

    const labelW = Math.min(120, width * 0.32);
    const valueW = 74;
    const plotW = width - labelW - valueW - 12;
    const maxValue = Math.max.apply(null, values.concat([1]));

    function draw(progress) {
      ctx.clearRect(0, 0, width, height);
      ctx.font = DEFAULTS.font;
      ctx.textBaseline = "middle";

      labels.forEach(function (label, i) {
        const y = 12 + i * rowH;
        const barH = rowH * 0.52;
        const value = U.num(values[i]);
        const barW = (value / maxValue) * plotW * progress;
        const color = (cfg.colors && cfg.colors[i]) ||
          SBT.config.chartColors[i % SBT.config.chartColors.length];

        /* Label */
        ctx.textAlign = "right";
        ctx.fillStyle = "#4d6076";
        ctx.font = DEFAULTS.fontBold;
        ctx.fillText(U.truncate(label, 16), labelW - 10, y + barH / 2);

        /* Track */
        ctx.fillStyle = "#f1f5f9";
        roundRect(ctx, labelW, y, plotW, barH, barH / 2);
        ctx.fill();

        /* Bar */
        if (barW > 1) {
          const grad = ctx.createLinearGradient(labelW, 0, labelW + plotW, 0);
          grad.addColorStop(0, color);
          grad.addColorStop(1, hexToRgba(color, 0.7));
          ctx.fillStyle = grad;
          roundRect(ctx, labelW, y, Math.max(barH, barW), barH, barH / 2);
          ctx.fill();
        }

        /* Value */
        ctx.textAlign = "left";
        ctx.fillStyle = "#16283c";
        ctx.font = DEFAULTS.fontBold;
        ctx.fillText(cfg.formatValue ? cfg.formatValue(value) : U.currencyShort(value),
          labelW + plotW + 8, y + barH / 2);
      });
    }

    animate(cfg.duration || DEFAULTS.duration, draw);
    return { redraw: function () { draw(1); } };
  };

  /* ==========================================================================
     HOVER TOOLTIP (line/bar)
     ========================================================================== */
  function attachHover(setup, box, labels, series, xAt, yAt, slot, cfg) {
    const canvas = setup.canvas;
    const tooltip = setup.tooltip;

    canvas.addEventListener("mousemove", function (e) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;

      const pad = box.pad;
      const plotW = box.width - pad.left - pad.right;
      if (x < pad.left || x > pad.left + plotW) {
        tooltip.classList.remove("is-visible");
        return;
      }

      const idx = U.clamp(Math.floor((x - pad.left) / slot), 0, labels.length - 1);
      if (idx < 0 || idx >= labels.length) return;

      let html = '<div style="font-weight:700;margin-bottom:2px">' + U.escape(labels[idx]) + "</div>";
      series.forEach(function (s) {
        const value = U.num((s.data || [])[idx]);
        html += '<div style="display:flex;align-items:center;gap:5px">' +
          '<i style="width:7px;height:7px;border-radius:2px;background:' +
          (s.color || SBT.config.palette.navy) + ';display:inline-block"></i>' +
          U.escape(s.name || "") + ": " +
          (cfg.formatValue ? cfg.formatValue(value) : U.currency(value)) +
          "</div>";
      });

      tooltip.innerHTML = html;
      tooltip.style.left = xAt(idx) + "px";
      tooltip.style.top = (pad.top + 6) + "px";
      tooltip.classList.add("is-visible");
    });

    canvas.addEventListener("mouseleave", function () {
      tooltip.classList.remove("is-visible");
    });
  }

  /* ---------- Color helper ---------- */
  function hexToRgba(hex, alpha) {
    const h = String(hex || "#1b4b73").replace("#", "");
    const full = h.length === 3
      ? h.split("").map(function (c) { return c + c; }).join("")
      : h;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
  }

  Charts.hexToRgba = hexToRgba;

  /* ---------- Auto-redraw on resize ---------- */
  Charts.registry = [];

  Charts.register = function (container, renderFn) {
    Charts.registry.push({ container: container, render: renderFn });
    renderFn();
  };

  let resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      Charts.registry.forEach(function (item) {
        if (document.body.contains(item.container)) {
          try { item.render(); } catch (e) { /* ignore */ }
        }
      });
    }, 220);
  });
})(window);
