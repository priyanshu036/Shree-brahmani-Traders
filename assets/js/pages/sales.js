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
        "Sales Entry",
        "Record customer sales and generate invoices",
        '<button type="button" class="sbt-btn sbt-btn--outline" id="salExport">' +
          '<i class="bi bi-file-earmark-excel"></i> Export</button>' +
        '<button type="button" class="sbt-btn sbt-btn--accent" id="salAdd">' +
          '<i class="bi bi-plus-lg"></i> New Sale</button>'
      ) +

      '<div class="sbt-kpi-grid">' +
        App.kpi({ label: "Total Sales", variant: "navy", icon: "bi-receipt-cutoff",
          value: U.currency(totalAmount), meta: list.length + " invoices" }) +
        App.kpi({ label: "Amount Received", variant: "green", icon: "bi-check-circle-fill",
          value: U.currency(totalPaid) }) +
        App.kpi({ label: "Pending Payment", variant: "red", icon: "bi-exclamation-circle-fill",
          value: U.currency(totalDue) }) +
        App.kpi({ label: "Net Profit", variant: totalProfit >= 0 ? "green" : "red",
          icon: "bi-graph-up-arrow", value: U.currency(totalProfit),
          meta: totalAmount > 0 ? U.percent((totalProfit / totalAmount) * 100) + " margin" : "—" }) +
      "</div>" +

      App.card({
        flush: true,
        body:
          '<div class="sbt-toolbar">' +
            '<div class="sbt-field sbt-field--grow">' +
              '<label for="salSearch">Search</label>' +
              '<input type="search" class="sbt-input" id="salSearch" placeholder="Customer, invoice, material…" value="' +
                U.escape(filters.search) + '">' +
            "</div>" +
            '<div class="sbt-field">' +
              '<label for="salStatus">Payment</label>' +
              '<select class="sbt-select" id="salStatus">' +
                '<option value="">All</option>' +
                SBT.config.paymentStatuses.map(function (s) {
                  return '<option value="' + s + '"' + (filters.status === s ? " selected" : "") + ">" + s + "</option>";
                }).join("") +
              "</select>" +
            "</div>" +
            '<div class="sbt-field">' +
              '<label for="salFrom">From</label>' +
              '<input type="date" class="sbt-input" id="salFrom" value="' + U.escape(filters.from) + '">' +
            "</div>" +
            '<div class="sbt-field">' +
              '<label for="salTo">To</label>' +
              '<input type="date" class="sbt-input" id="salTo" value="' + U.escape(filters.to) + '">' +
            "</div>" +
            '<button type="button" class="sbt-btn sbt-btn--ghost" id="salClear">' +
              '<i class="bi bi-x-lg"></i> Clear</button>' +
          "</div>" +
          UI.table({
            columns: [
              { label: "Invoice", render: function (r) {
                return '<span class="sbt-mono sbt-strong">' + U.escape(r.invoiceNo || "—") + "</span>" +
                  '<div class="sbt-muted" style="font-size:.72rem">' + U.formatDate(r.date) + "</div>";
              }},
              { label: "Customer", render: function (r) { return UI.partyCell(r.customerName, r.customerMobile); } },
              { label: "Material", render: function (r) {
                return '<div class="sbt-strong">' + U.escape(r.materialName) + "</div>" +
                  '<div class="sbt-muted" style="font-size:.72rem">' + U.qty(r.quantity) + " " + U.escape(r.unit) +
                  " @ " + U.currency(r.sellingRate) + "</div>";
              }},
              { label: "Amount", align: "right", render: function (r) { return U.currency(C.salesGross(r)); } },
              { label: "Final", align: "right", render: function (r) {
                return "<strong>" + U.currency(C.salesFinal(r)) + "</strong>";
              }},
              { label: "Profit", align: "right", render: function (r) {
                const p = C.saleNetProfit(r);
                return '<span class="' + (p >= 0 ? "sbt-text-success" : "sbt-text-danger") + ' sbt-strong">' +
                  U.currency(p) + "</span>";
              }},
              { label: "Due", align: "right", render: function (r) {
                const d = C.salesDue(r);
                return d > 0
                  ? '<span class="sbt-text-danger sbt-strong">' + U.currency(d) + "</span>"
                  : '<span class="sbt-text-success">—</span>';
              }},
              { label: "Status", render: function (r) { return U.paymentBadge(r.paymentStatus); } },
              { label: "Actions", className: "actions", render: function (r) {
                return '<button type="button" class="sbt-btn sbt-btn--sm sbt-btn--ghost" data-invoice="' + r.id + '" title="Invoice">' +
                    '<i class="bi bi-file-earmark-text"></i></button>' +
                  '<button type="button" class="sbt-btn sbt-btn--sm sbt-btn--ghost" data-edit="' + r.id + '" title="Edit">' +
                    '<i class="bi bi-pencil"></i></button>' +
                  '<button type="button" class="sbt-btn sbt-btn--sm sbt-btn--ghost" data-del="' + r.id + '" title="Delete">' +
                    '<i class="bi bi-trash3"></i></button>';
              }}
            ],
            rows: list,
            footer: list.length ?
              "<tr><td colspan='4'>Total (" + list.length + " invoices)</td>" +
              '<td class="num">' + U.currency(totalAmount) + "</td>" +
              '<td class="num">' + U.currency(totalProfit) + "</td>" +
              '<td class="num">' + U.currency(totalDue) + "</td>" +
              "<td colspan='2'></td></tr>" : "",
            empty: { icon: "bi-receipt", title: "No sales found", message: "Create your first sales entry." }
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
      title: isEdit ? "Edit Sale" : "New Sales Entry",
      subtitle: "Invoice amount and profit are calculated automatically",
      size: "lg",
      body:
        '<form id="salForm" novalidate>' +
          '<div class="sbt-form-grid">' +
            UI.field({ label: "Sales Date", name: "date", type: "date", required: true, value: r.date || today }) +
            UI.field({ label: "Invoice No.", name: "invoiceNo", value: r.invoiceNo || "",
              placeholder: "Auto-generated if blank" }) +
            UI.field({ label: "Customer Name", name: "customerName", required: true, value: r.customerName,
              placeholder: "Enter customer name" }) +
            UI.field({ label: "Customer Mobile", name: "customerMobile", value: r.customerMobile,
              placeholder: "10-digit mobile", inputmode: "numeric" }) +
            UI.field({ label: "Material", name: "materialName", type: "select", required: true,
              value: r.materialName, options: [] }) +
            UI.field({ label: "Quantity", name: "quantity", type: "number", step: "0.001", min: 0,
              required: true, value: r.quantity, placeholder: "0" }) +
            UI.field({ label: "Unit", name: "unit", type: "select", required: true,
              value: r.unit || "Brass", options: SBT.config.units }) +
            UI.field({ label: "Selling Rate", name: "sellingRate", type: "number", step: "0.01", min: 0,
              required: true, value: r.sellingRate, prefix: "₹" }) +
            UI.field({ label: "Discount", name: "discount", type: "number", step: "0.01", min: 0,
              value: r.discount || 0, prefix: "₹" }) +
            UI.field({ label: "Transportation Charges", name: "transportCharges", type: "number", step: "0.01",
              min: 0, value: r.transportCharges || 0, prefix: "₹" }) +
            UI.field({ label: "GST Rate (%)", name: "gstRate", type: "number", step: "0.01", min: 0, max: 100,
              value: r.gstRate === undefined ? settings.defaultGstRate : r.gstRate }) +
            UI.field({ label: "Apply GST", name: "gstApplicable", type: "checkbox",
              value: r.gstApplicable !== undefined ? r.gstApplicable : settings.gstEnabled }) +
            UI.field({ label: "Payment Status", name: "paymentStatus", type: "select", required: true,
              value: r.paymentStatus || "Pending", options: SBT.config.paymentStatuses }) +
            UI.field({ label: "Paid Amount", name: "paidAmount", type: "number", step: "0.01", min: 0,
              value: r.paidAmount || 0, prefix: "₹", help: "Used when status is Partial" }) +
            UI.field({ label: "Notes", name: "notes", type: "textarea", value: r.notes,
              placeholder: "Optional remarks…", full: true }) +
          "</div>" +

          '<div class="sbt-divider"></div>' +

          '<div class="sbt-form-grid" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr))">' +
            '<div class="sbt-field"><label>Gross Amount</label>' +
              '<input class="sbt-input" id="salGross" readonly value="₹0.00"></div>' +
            '<div class="sbt-field"><label>GST Amount</label>' +
              '<input class="sbt-input" id="salGst" readonly value="₹0.00"></div>' +
            '<div class="sbt-field"><label>Final Amount</label>' +
              '<input class="sbt-input" id="salFinal" readonly value="₹0.00" ' +
              'style="font-weight:800;color:var(--sbt-navy-700)"></div>' +
            '<div class="sbt-field"><label>Remaining</label>' +
              '<input class="sbt-input" id="salDue" readonly value="₹0.00" ' +
              'style="font-weight:800;color:var(--sbt-danger)"></div>' +
            '<div class="sbt-field"><label>Est. Profit</label>' +
              '<input class="sbt-input" id="salProfit" readonly value="₹0.00" ' +
              'style="font-weight:800;color:var(--sbt-success)"></div>' +
          "</div>" +
        "</form>",
      footer:
        '<button type="button" class="sbt-btn sbt-btn--outline" data-act="cancel">Cancel</button>' +
        '<button type="button" class="sbt-btn sbt-btn--accent" data-act="save">' +
          '<i class="bi bi-check-lg"></i> ' + (isEdit ? "Update Sale" : "Save Sale") + "</button>",
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

        recalc();

        m.$('[data-act="cancel"]').addEventListener("click", m.close);
        m.$('[data-act="save"]').addEventListener("click", function () {
          const data = UI.readForm(form);

          const errors = U.validate({
            date: { value: data.date, label: "Sales date", required: true },
            customerName: { value: data.customerName, label: "Customer name", required: true, minLength: 2 },
            customerMobile: { value: data.customerMobile, label: "Customer mobile", mobile: true },
            materialName: { value: data.materialName, label: "Material", required: true },
            quantity: { value: data.quantity, label: "Quantity", required: true, type: "number", min: 0.001 },
            sellingRate: { value: data.sellingRate, label: "Selling rate", required: true, type: "number", min: 0 }
          });

          if (!errors.quantity) {
            const available = C.stockOf(data.materialName);
            if (U.num(data.quantity) > available + 0.0001) {
              errors.quantity = "Only " + U.qty(available) + " " + (data.unit || "") +
                " in stock. Purchase more or adjust stock first.";
            }
          }

          if (!UI.showErrors(form, errors)) return;

          const payload = {
            date: data.date,
            invoiceNo: data.invoiceNo || SBT.store.nextInvoiceNumber(),
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
            UI.success("Sale updated successfully");
          } else {
            SBT.store.insert("sales", payload);
            UI.success("Sale recorded successfully");
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
      title: "Delete Sale",
      message: "Delete invoice " + (r.invoiceNo || "") + " for " + r.customerName +
        " (" + U.currency(C.salesFinal(r)) + ")? Stock will be restored.",
      confirmText: "Delete Sale"
    });
    if (!ok) return;
    SBT.store.remove("sales", id);
    UI.success("Sale deleted");
    refresh();
  }

  function exportData() {
    const list = rows().map(function (r) {
      return {
        Invoice: r.invoiceNo,
        Date: r.date,
        Customer: r.customerName,
        Mobile: r.customerMobile,
        Material: r.materialName,
        Quantity: r.quantity,
        Unit: r.unit,
        Rate: r.sellingRate,
        Gross: C.salesGross(r),
        Discount: r.discount,
        GST: C.salesGst(r),
        Transportation: r.transportCharges,
        Final: C.salesFinal(r),
        Paid: C.salesPaid(r),
        Due: C.salesDue(r),
        Profit: C.saleNetProfit(r),
        Status: r.paymentStatus
      };
    });
    U.exportExcel("SBT-Sales", list, null, "Sales Report");
    UI.success("Sales exported");
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
