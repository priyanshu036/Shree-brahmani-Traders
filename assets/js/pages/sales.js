/* ==========================================================================
   SHREE BRAHMANI TRADERS — Sales Entry
   ========================================================================== */
(function (global) {
  "use strict";

  const SBT = global.SBT;
  const U = SBT.utils;
  const App = SBT.app;
  const C = SBT.calc;
  const UI = SBT.ui;

  function T(key, vars) { return U.t(key, vars); }

  let filters = { search: "", status: "", from: "", to: "" };

  function rows() {
    let list = SBT.store.list("sales");

    if (filters.from || filters.to) {
      list = list.filter(function (r) { return U.inRange(r.date, filters.from, filters.to); });
    }
    if (filters.status) {
      list = list.filter(function (r) { return r.paymentStatus === filters.status; });
    }
    if (filters.search) {
      list = UI.filterRows(list, filters.search,
        ["customerName", "customerMobile", "materialName", "invoiceNo", "notes"]);
    }

    return U.sortBy(list, "date", true);
  }

  function render() {
    const list = rows();
    const all = SBT.store.list("sales");
    const totalAmount = U.sum(list, function (r) { return C.salesFinal(r); });
    const totalPaid = U.sum(list, function (r) { return C.salesPaid(r); });
    const totalDue = U.sum(list, function (r) { return C.salesDue(r); });
    const totalProfit = U.sum(list, function (r) { return C.saleNetProfit(r); });

    return (
      App.pageHead(
        T("sales.title"),
        T("sales.subtitle"),
        '<button type="button" class="sbt-btn sbt-btn--outline" id="salExport">' +
          '<i class="bi bi-file-earmark-excel"></i> ' + U.escape(T("common.export")) + '</button>' +
        '<button type="button" class="sbt-btn sbt-btn--accent" id="salAdd">' +
          '<i class="bi bi-plus-lg"></i> ' + U.escape(T("sales.newSale")) + '</button>'
      ) +

      '<div class="sbt-kpi-grid">' +
        App.kpi({ label: T("sales.totalSales"), variant: "navy", icon: "bi-receipt-cutoff",
          value: U.currency(totalAmount), meta: U.escape(T("common.invoicesCount", { n: list.length })) }) +
        App.kpi({ label: T("sales.amountReceived"), variant: "green", icon: "bi-check-circle-fill",
          value: U.currency(totalPaid) }) +
        App.kpi({ label: T("sales.pendingPayment"), variant: "red", icon: "bi-exclamation-circle-fill",
          value: U.currency(totalDue) }) +
        App.kpi({ label: T("sales.netProfit"), variant: totalProfit >= 0 ? "green" : "red",
          icon: "bi-graph-up-arrow", value: U.currency(totalProfit),
          meta: totalAmount > 0
            ? U.percent((totalProfit / totalAmount) * 100) + " " + U.escape(T("dash.margin"))
            : "—" }) +
      "</div>" +

      App.card({
        flush: true,
        body:
          '<div class="sbt-toolbar">' +
            '<div class="sbt-field sbt-field--grow">' +
              '<label for="salSearch">' + U.escape(T("common.search")) + '</label>' +
              '<input type="search" class="sbt-input" id="salSearch" placeholder="' +
                U.escape(T("sales.searchPlaceholder")) + '" value="' +
                U.escape(filters.search) + '">' +
            "</div>" +
            '<div class="sbt-field">' +
              '<label for="salStatus">' + U.escape(T("sales.payment")) + '</label>' +
              '<select class="sbt-select" id="salStatus">' +
                '<option value="">' + U.escape(T("common.all")) + '</option>' +
                SBT.config.paymentStatuses.map(function (s) {
                  return '<option value="' + U.escape(s) + '"' + (filters.status === s ? " selected" : "") + ">" +
                    U.escape(U.tv(s)) + "</option>";
                }).join("") +
              "</select>" +
            "</div>" +
            '<div class="sbt-field">' +
              '<label for="salFrom">' + U.escape(T("common.from")) + '</label>' +
              '<input type="date" class="sbt-input" id="salFrom" value="' + U.escape(filters.from) + '">' +
            "</div>" +
            '<div class="sbt-field">' +
              '<label for="salTo">' + U.escape(T("common.to")) + '</label>' +
              '<input type="date" class="sbt-input" id="salTo" value="' + U.escape(filters.to) + '">' +
            "</div>" +
            '<button type="button" class="sbt-btn sbt-btn--ghost" id="salClear">' +
              '<i class="bi bi-x-lg"></i> ' + U.escape(T("common.clear")) + '</button>' +
          "</div>" +
          UI.table({
            columns: [
              { label: U.escape(T("common.invoice")), render: function (r) {
                return '<span class="sbt-mono sbt-strong">' + U.escape(r.invoiceNo || "—") + "</span>" +
                  '<div class="sbt-muted" style="font-size:.72rem">' + U.formatDate(r.date) + "</div>";
              }},
              { label: U.escape(T("common.customer")), render: function (r) { return UI.partyCell(r.customerName, r.customerMobile); } },
              { label: U.escape(T("common.purchase")), render: function (r) { return App.purchaseRefCell(r.purchaseId); } },
              { label: U.escape(T("common.material")), render: function (r) {
                return '<div class="sbt-strong">' + U.escape(r.materialName) + "</div>" +
                  '<div class="sbt-muted" style="font-size:.72rem">' + U.qty(r.quantity) + " " + U.escape(U.tv(r.unit)) +
                  " @ " + U.currency(r.sellingRate) + "</div>";
              }},
              { label: U.escape(T("common.amount")), align: "right", render: function (r) { return U.currency(C.salesGross(r)); } },
              { label: U.escape(T("sales.finalAmount")), align: "right", render: function (r) {
                return "<strong>" + U.currency(C.salesFinal(r)) + "</strong>";
              }},
              { label: U.escape(T("pl.profit")), align: "right", render: function (r) {
                const p = C.saleNetProfit(r);
                return '<span class="' + (p >= 0 ? "sbt-text-success" : "sbt-text-danger") + ' sbt-strong">' +
                  U.currency(p) + "</span>";
              }},
              { label: U.escape(T("common.due")), align: "right", render: function (r) {
                const d = C.salesDue(r);
                return d > 0
                  ? '<span class="sbt-text-danger sbt-strong">' + U.currency(d) + "</span>"
                  : '<span class="sbt-text-success">—</span>';
              }},
              { label: U.escape(T("common.status")), render: function (r) { return U.paymentBadge(r.paymentStatus); } },
              { label: U.escape(T("common.actions")), className: "actions", render: function (r) {
                return '<button type="button" class="sbt-btn sbt-btn--sm sbt-btn--ghost" data-invoice="' + r.id + '" title="' +
                    U.escape(T("common.invoice")) + '">' +
                    '<i class="bi bi-file-earmark-text"></i></button>' +
                  '<button type="button" class="sbt-btn sbt-btn--sm sbt-btn--ghost" data-edit="' + r.id + '" title="' +
                    U.escape(T("common.edit")) + '">' +
                    '<i class="bi bi-pencil"></i></button>' +
                  '<button type="button" class="sbt-btn sbt-btn--sm sbt-btn--ghost" data-del="' + r.id + '" title="' +
                    U.escape(T("common.delete")) + '">' +
                    '<i class="bi bi-trash3"></i></button>';
              }}
            ],
            rows: list,
            footer: list.length ?
              "<tr><td colspan='5'>" + U.escape(T("common.total")) + " (" +
                U.escape(T("common.invoicesCount", { n: list.length })) + ")</td>" +
              '<td class="num">' + U.currency(totalAmount) + "</td>" +
              '<td class="num">' + U.currency(totalProfit) + "</td>" +
              '<td class="num">' + U.currency(totalDue) + "</td>" +
              "<td colspan='2'></td></tr>" : "",
            empty: { icon: "bi-receipt", title: T("sales.noSalesFound"), message: T("sales.noSalesFoundMsg") }
          })
      })
    );
  }

  function openForm(record) {
    const isEdit = !!record;
    const r = record || {};
    const today = U.today();
    const settings = SBT.store.settings;

    const modal = UI.modal({
      title: isEdit ? T("sales.editSale") : T("sales.newEntry"),
      subtitle: T("sales.formSubtitle"),
      size: "lg",
      body:
        '<form id="salForm" novalidate>' +
          '<div class="sbt-form-grid">' +
            UI.field({ label: T("sales.salesDate"), name: "date", type: "date", required: true, value: r.date || today }) +
            UI.field({ label: T("sales.invoiceNo"), name: "invoiceNo", value: r.invoiceNo || "",
              placeholder: T("sales.invoicePlaceholder") }) +
            UI.field({ label: T("sales.customerName"), name: "customerName", required: true, value: r.customerName,
              placeholder: T("sales.customerNamePlaceholder") }) +
            UI.field({ label: T("sales.customerMobile"), name: "customerMobile", value: r.customerMobile,
              placeholder: T("common.mobilePlaceholder"), inputmode: "numeric" }) +
            UI.field({ label: T("sales.linkedPurchase"), name: "purchaseId", type: "select",
              value: r.purchaseId || "", options: [],
              help: T("sales.linkedPurchaseHelp") }) +
            UI.field({ label: T("common.material"), name: "materialName", type: "select", required: true,
              value: r.materialName, options: [] }) +
            UI.field({ label: T("common.quantity"), name: "quantity", type: "number", step: "0.001", min: 0,
              required: true, value: r.quantity, placeholder: "0" }) +
            UI.field({ label: T("common.unit"), name: "unit", type: "select", required: true,
              value: r.unit || "Brass", options: SBT.config.units }) +
            UI.field({ label: T("sales.sellingRate"), name: "sellingRate", type: "number", step: "0.01", min: 0,
              required: true, value: r.sellingRate, prefix: SBT.store.settings.currency || "₹" }) +
            UI.field({ label: T("sales.discount"), name: "discount", type: "number", step: "0.01", min: 0,
              value: r.discount || 0, prefix: SBT.store.settings.currency || "₹" }) +
            UI.field({ label: T("sales.transport"), name: "transportCharges", type: "number", step: "0.01",
              min: 0, value: r.transportCharges || 0, prefix: SBT.store.settings.currency || "₹" }) +
            UI.field({ label: T("sales.gstRate"), name: "gstRate", type: "number", step: "0.01", min: 0, max: 100,
              value: r.gstRate === undefined ? settings.defaultGstRate : r.gstRate }) +
            UI.field({ label: T("sales.applyGst"), name: "gstApplicable", type: "checkbox",
              value: r.gstApplicable !== undefined ? r.gstApplicable : settings.gstEnabled }) +
            UI.field({ label: T("sales.paymentStatus"), name: "paymentStatus", type: "select", required: true,
              value: r.paymentStatus || "Pending", options: SBT.config.paymentStatuses }) +
            UI.field({ label: T("sales.paidAmount"), name: "paidAmount", type: "number", step: "0.01", min: 0,
              value: r.paidAmount || 0, prefix: SBT.store.settings.currency || "₹", help: T("sales.paidHelp") }) +
            UI.field({ label: T("common.notes"), name: "notes", type: "textarea", value: r.notes,
              placeholder: T("sales.notesPlaceholder"), full: true }) +
          "</div>" +

          '<div class="sbt-divider"></div>' +

          '<div class="sbt-form-grid" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr))">' +
            '<div class="sbt-field"><label>' + U.escape(T("sales.grossAmount")) + '</label>' +
              '<input class="sbt-input" id="salGross" readonly value="—"></div>' +
            '<div class="sbt-field"><label>' + U.escape(T("sales.gstAmount")) + '</label>' +
              '<input class="sbt-input" id="salGst" readonly value="—"></div>' +
            '<div class="sbt-field"><label>' + U.escape(T("sales.finalAmount")) + '</label>' +
              '<input class="sbt-input" id="salFinal" readonly value="—" ' +
              'style="font-weight:800;color:var(--sbt-navy-700)"></div>' +
            '<div class="sbt-field"><label>' + U.escape(T("sales.remaining")) + '</label>' +
              '<input class="sbt-input" id="salDue" readonly value="—" ' +
              'style="font-weight:800;color:var(--sbt-danger)"></div>' +
            '<div class="sbt-field"><label>' + U.escape(T("sales.estProfit")) + '</label>' +
              '<input class="sbt-input" id="salProfit" readonly value="—" ' +
              'style="font-weight:800;color:var(--sbt-success)"></div>' +
          "</div>" +
        "</form>",
      footer:
        '<button type="button" class="sbt-btn sbt-btn--outline" data-act="cancel">' +
          U.escape(T("common.cancel")) + '</button>' +
        '<button type="button" class="sbt-btn sbt-btn--accent" data-act="save">' +
          '<i class="bi bi-check-lg"></i> ' +
          U.escape(isEdit ? T("sales.updateSale") : T("sales.saveSale")) + "</button>",
      onOpen: function (m) {
        const form = m.$("#salForm");
        const materialSel = form.querySelector('[name="materialName"]');
        const unitSel = form.querySelector('[name="unit"]');
        const qtyEl = form.querySelector('[name="quantity"]');
        const rateEl = form.querySelector('[name="sellingRate"]');
        const discEl = form.querySelector('[name="discount"]');
        const transEl = form.querySelector('[name="transportCharges"]');
        const gstRateEl = form.querySelector('[name="gstRate"]');
        const gstChk = form.querySelector('[name="gstApplicable"]');
        const statusEl = form.querySelector('[name="paymentStatus"]');
        const paidEl = form.querySelector('[name="paidAmount"]');
        const customerEl = form.querySelector('[name="customerName"]');
        const mobileEl = form.querySelector('[name="customerMobile"]');

        materialSel.innerHTML = App.productOptions(true);
        if (r.materialName) materialSel.value = r.materialName;

        const purchaseSel = form.querySelector('[name="purchaseId"]');
        purchaseSel.innerHTML = App.purchaseOptions(r.purchaseId);

        customerEl.setAttribute("list", "salCustomerList");
        customerEl.insertAdjacentHTML("afterend", App.partyDatalist("customers", "salCustomerList"));

        function recalc() {
          const draft = {
            quantity: U.num(qtyEl.value),
            sellingRate: U.num(rateEl.value),
            discount: U.num(discEl.value),
            transportCharges: U.num(transEl.value),
            gstApplicable: gstChk.checked,
            gstRate: U.num(gstRateEl.value),
            materialName: materialSel.value
          };

          const gross = C.salesGross(draft);
          const gst = C.salesGst(draft);
          const final = C.salesFinal(draft);

          let paid = 0;
          if (statusEl.value === "Paid") paid = final;
          else if (statusEl.value === "Partial") paid = U.clamp(U.num(paidEl.value), 0, final);

          const profit = C.saleNetProfit(Object.assign({}, draft, { paidAmount: paid }));

          m.$("#salGross").value = U.currency(gross);
          m.$("#salGst").value = U.currency(gst);
          m.$("#salFinal").value = U.currency(final);
          m.$("#salDue").value = U.currency(Math.max(0, final - paid));
          m.$("#salProfit").value = U.currency(profit);

          paidEl.disabled = statusEl.value !== "Partial";
          if (statusEl.value === "Paid") paidEl.value = U.round(final, 2);
          if (statusEl.value === "Pending") paidEl.value = 0;

          gstRateEl.disabled = !gstChk.checked;
        }

        [qtyEl, rateEl, discEl, transEl, gstRateEl, paidEl].forEach(function (el) {
          el.addEventListener("input", recalc);
        });
        [statusEl, gstChk].forEach(function (el) {
          el.addEventListener("change", recalc);
        });

        materialSel.addEventListener("change", function () {
          const opt = materialSel.selectedOptions[0];
          if (!opt || !opt.value) return;
          unitSel.value = opt.dataset.unit || unitSel.value;
          if (!isEdit || !U.num(rateEl.value)) {
            rateEl.value = opt.dataset.sell || "";
          }
          if (opt.dataset.gst) gstRateEl.value = opt.dataset.gst;
          recalc();
        });

        customerEl.addEventListener("change", function () {
          const mobile = App.findPartyMobile("customers", customerEl.value);
          if (mobile && !mobileEl.value) mobileEl.value = mobile;
        });

        /* Picking a purchase pre-fills the material so the sale is tied to
           the exact stock that was bought. */
        purchaseSel.addEventListener("change", function () {
          const key = String(purchaseSel.value);
          const purchase = SBT.store.list("purchases").find(function (p) {
            return String(p.purchaseId || p.id) === key;
          });
          if (!purchase) return;
          if (purchase.materialName) {
            materialSel.value = purchase.materialName;
            const opt = materialSel.selectedOptions[0];
            if (opt && opt.dataset.unit) unitSel.value = opt.dataset.unit;
            if (opt && opt.dataset.sell && !U.num(rateEl.value)) {
              rateEl.value = opt.dataset.sell;
            }
          }
          recalc();
        });

        recalc();

        m.$('[data-act="cancel"]').addEventListener("click", m.close);
        m.$('[data-act="save"]').addEventListener("click", function () {
          const data = UI.readForm(form);

          const errors = U.validate({
            date: { value: data.date, label: T("sales.salesDateLabel"), required: true, type: "date" },
            customerName: { value: data.customerName, label: T("sales.customerNameLabel"), required: true, minLength: 2, maxLength: 120 },
            customerMobile: { value: data.customerMobile, label: T("sales.customerMobileLabel"), mobile: true },
            materialName: { value: data.materialName, label: T("sales.materialLabel"), required: true },
            quantity: { value: data.quantity, label: T("sales.quantityLabel"), required: true, type: "number", min: 0.001 },
            sellingRate: { value: data.sellingRate, label: T("sales.sellingRateLabel"), required: true, type: "number", min: 0 },
            discount: { value: data.discount, label: T("sales.discountLabel"), type: "number", min: 0 },
            transportCharges: { value: data.transportCharges, label: T("sales.transportLabel"), type: "number", min: 0 },
            gstRate: { value: data.gstRate, label: T("sales.gstRateLabel"), type: "number", min: 0, max: 100 },
            paidAmount: { value: data.paidAmount, label: T("sales.paidAmountLabel"), type: "number", min: 0 }
          });

          /* Stock check. When editing, the stored sale already reduced stock,
             so add the original quantity back before comparing. */
          if (!errors.quantity) {
            const available = C.stockOf(data.materialName) +
              (isEdit && r.materialName === data.materialName ? U.num(r.quantity) : 0);
            if (U.num(data.quantity) > available + 0.0001) {
              errors.quantity = T("sales.insufficientStock", {
                qty: U.qty(available),
                unit: U.tv(data.unit || "")
              });
            }
          }

          /* Discount cannot exceed the base amount. */
          const base = U.num(data.quantity) * U.num(data.sellingRate);
          if (!errors.discount && U.num(data.discount) > base + 0.0001) {
            errors.discount = T("sales.discountTooHigh", { amount: U.currency(base) });
          }

          /* Paid amount cannot exceed the invoice total. */
          const draft = {
            quantity: U.num(data.quantity),
            sellingRate: U.num(data.sellingRate),
            discount: U.num(data.discount),
            transportCharges: U.num(data.transportCharges),
            gstApplicable: !!data.gstApplicable,
            gstRate: U.num(data.gstRate),
            materialName: data.materialName
          };
          const finalAmount = C.salesFinal(draft);
          if (!errors.paidAmount && U.num(data.paidAmount) > finalAmount + 0.0001) {
            errors.paidAmount = T("sales.paidTooHigh", { amount: U.currency(finalAmount) });
          }

          if (!UI.showErrors(form, errors)) return;

          const payload = {
            date: data.date,
            invoiceNo: data.invoiceNo || SBT.store.nextInvoiceNumber(),
            purchaseId: data.purchaseId || "",
            customerName: data.customerName,
            customerMobile: data.customerMobile,
            materialName: data.materialName,
            quantity: U.num(data.quantity),
            unit: data.unit,
            sellingRate: U.num(data.sellingRate),
            discount: U.num(data.discount),
            transportCharges: U.num(data.transportCharges),
            gstApplicable: !!data.gstApplicable,
            gstRate: U.num(data.gstRate),
            paymentStatus: data.paymentStatus,
            paidAmount: U.num(data.paidAmount),
            notes: data.notes
          };

          payload.totalAmount = C.salesFinal(payload);

          if (isEdit) {
            SBT.store.update("sales", r.id, payload);
            UI.success(T("sales.saleUpdated"));
          } else {
            SBT.store.insert("sales", payload);
            UI.success(T("sales.saleRecorded"));
          }

          App.ensureParty("customers", payload.customerName, payload.customerMobile);
          m.close();
          refresh();
        });
      }
    });
  }

  async function remove(id) {
    const r = SBT.store.get("sales", id);
    if (!r) return;
    const ok = await UI.confirm({
      title: T("sales.deleteSale"),
      message: T("sales.deleteMessage", {
        invoice: r.invoiceNo || "",
        customer: r.customerName,
        amount: U.currency(C.salesFinal(r))
      }),
      confirmText: T("sales.deleteSale")
    });
    if (!ok) return;
    SBT.store.remove("sales", id);
    UI.success(T("sales.saleDeleted"));
    refresh();
  }

  function exportData() {
    const list = rows().map(function (r) {
      return {
        [T("common.invoice")]: r.invoiceNo,
        [T("common.date")]: r.date,
        [T("common.purchase")]: r.purchaseId ? App.purchaseLabel(SBT.store.list("purchases").find(function (p) {
          return String(p.purchaseId || p.id) === String(r.purchaseId);
        })) : "",
        [T("common.customer")]: r.customerName,
        [T("common.mobile")]: r.customerMobile,
        [T("common.material")]: r.materialName,
        [T("common.quantity")]: r.quantity,
        [T("common.unit")]: U.tv(r.unit),
        [T("common.rate")]: r.sellingRate,
        [T("sales.grossAmount")]: C.salesGross(r),
        [T("sales.discount")]: r.discount,
        [T("sales.gstAmount")]: C.salesGst(r),
        [T("sales.transport")]: r.transportCharges,
        [T("sales.finalAmount")]: C.salesFinal(r),
        [T("common.paid")]: C.salesPaid(r),
        [T("common.due")]: C.salesDue(r),
        [T("pl.profit")]: C.saleNetProfit(r),
        [T("common.status")]: U.tv(r.paymentStatus)
      };
    });
    if (!list.length) { UI.warn(T("common.nothingToExport")); return; }
    U.exportExcel("SBT-Sales", list, null, T("sales.reportTitle"));
    UI.success(T("sales.exported"));
  }

  function mount() {
    const addBtn = document.getElementById("salAdd");
    if (addBtn) addBtn.addEventListener("click", function () { openForm(null); });

    const exportBtn = document.getElementById("salExport");
    if (exportBtn) exportBtn.addEventListener("click", exportData);

    const searchEl = document.getElementById("salSearch");
    if (searchEl) {
      searchEl.addEventListener("input", U.debounce(function () {
        filters.search = searchEl.value;
        refresh();
        const el = document.getElementById("salSearch");
        if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
      }, 220));
    }

    const statusEl = document.getElementById("salStatus");
    if (statusEl) statusEl.addEventListener("change", function () {
      filters.status = statusEl.value;
      refresh();
    });

    const fromEl = document.getElementById("salFrom");
    if (fromEl) fromEl.addEventListener("change", function () {
      filters.from = fromEl.value;
      refresh();
    });

    const toEl = document.getElementById("salTo");
    if (toEl) toEl.addEventListener("change", function () {
      filters.to = toEl.value;
      refresh();
    });

    const clearBtn = document.getElementById("salClear");
    if (clearBtn) clearBtn.addEventListener("click", function () {
      filters = { search: "", status: "", from: "", to: "" };
      refresh();
    });

    const content = document.getElementById("sbtContent");
    U.on(content, "click", "[data-edit]", function (e, el) {
      openForm(SBT.store.get("sales", el.dataset.edit));
    });
    U.on(content, "click", "[data-del]", function (e, el) { remove(el.dataset.del); });
    U.on(content, "click", "[data-invoice]", function (e, el) {
      window.location.href = "invoice.html?id=" + encodeURIComponent(el.dataset.invoice);
    });
  }

  function refresh() {
    const content = document.getElementById("sbtContent");
    if (!content) return;
    content.innerHTML = render();
    mount();
  }

  App.sales = { render: render, mount: mount, refresh: refresh };
})(window);
