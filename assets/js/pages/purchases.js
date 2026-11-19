/* ==========================================================================
   SHREE BRAHMANI TRADERS — Purchase Entry
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
    let list = SBT.store.list("purchases");

    if (filters.from || filters.to) {
      list = list.filter(function (r) { return U.inRange(r.date, filters.from, filters.to); });
    }
    if (filters.status) {
      list = list.filter(function (r) { return r.paymentStatus === filters.status; });
    }
    if (filters.search) {
      list = UI.filterRows(list, filters.search,
        ["supplierName", "supplierMobile", "materialName", "notes"]);
    }

    return U.sortBy(list, "date", true);
  }

  function render() {
    const list = rows();
    const all = SBT.store.list("purchases");
    const totalAmount = U.sum(list, function (r) { return C.purchaseTotal(r); });
    const totalPaid = U.sum(list, function (r) { return C.purchasePaid(r); });
    const totalDue = U.sum(list, function (r) { return C.purchaseDue(r); });

    return (
      App.pageHead(
        "Purchase Entry",
        "Record material purchases from suppliers",
        '<button type="button" class="sbt-btn sbt-btn--outline" id="purExport">' +
          '<i class="bi bi-file-earmark-excel"></i> Export</button>' +
        '<button type="button" class="sbt-btn sbt-btn--accent" id="purAdd">' +
          '<i class="bi bi-plus-lg"></i> New Purchase</button>'
      ) +

      '<div class="sbt-kpi-grid">' +
        App.kpi({ label: "Total Purchases", variant: "navy", icon: "bi-cart-plus-fill",
          value: U.currency(totalAmount), meta: list.length + " entries" }) +
        App.kpi({ label: "Amount Paid", variant: "green", icon: "bi-check-circle-fill",
          value: U.currency(totalPaid) }) +
        App.kpi({ label: "Outstanding", variant: "red", icon: "bi-exclamation-circle-fill",
          value: U.currency(totalDue) }) +
        App.kpi({ label: "All Records", variant: "blue", icon: "bi-journal-text",
          value: all.length }) +
      "</div>" +

      App.card({
        flush: true,
        body:
          '<div class="sbt-toolbar">' +
            '<div class="sbt-field sbt-field--grow">' +
              '<label for="purSearch">Search</label>' +
              '<input type="search" class="sbt-input" id="purSearch" placeholder="Supplier, material, mobile…" value="' +
                U.escape(filters.search) + '">' +
            "</div>" +
            '<div class="sbt-field">' +
              '<label for="purStatus">Payment</label>' +
              '<select class="sbt-select" id="purStatus">' +
                '<option value="">All</option>' +
                SBT.config.paymentStatuses.map(function (s) {
                  return '<option value="' + s + '"' + (filters.status === s ? " selected" : "") + ">" + s + "</option>";
                }).join("") +
              "</select>" +
            "</div>" +
            '<div class="sbt-field">' +
              '<label for="purFrom">From</label>' +
              '<input type="date" class="sbt-input" id="purFrom" value="' + U.escape(filters.from) + '">' +
            "</div>" +
            '<div class="sbt-field">' +
              '<label for="purTo">To</label>' +
              '<input type="date" class="sbt-input" id="purTo" value="' + U.escape(filters.to) + '">' +
            "</div>" +
            '<button type="button" class="sbt-btn sbt-btn--ghost" id="purClear">' +
              '<i class="bi bi-x-lg"></i> Clear</button>' +
          "</div>" +
          UI.table({
            columns: [
              { label: "Date", render: function (r) { return U.formatDate(r.date); } },
              { label: "Supplier", render: function (r) { return UI.partyCell(r.supplierName, r.supplierMobile); } },
              { label: "Material", render: function (r) {
                return '<div class="sbt-strong">' + U.escape(r.materialName) + "</div>" +
                  '<div class="sbt-muted" style="font-size:.72rem">' + U.qty(r.quantity) + " " + U.escape(r.unit) +
                  " @ " + U.currency(r.purchaseRate) + "</div>";
              }},
              { label: "Base", align: "right", render: function (r) { return U.currency(C.purchaseBase(r)); } },
              { label: "Expenses", align: "right", render: function (r) {
                const e = C.purchaseExpenses(r);
                return e > 0 ? U.currency(e) : '<span class="sbt-muted">—</span>';
              }},
              { label: "Total", align: "right", render: function (r) {
                return "<strong>" + U.currency(C.purchaseTotal(r)) + "</strong>";
              }},
              { label: "Paid", align: "right", render: function (r) { return U.currency(C.purchasePaid(r)); } },
              { label: "Due", align: "right", render: function (r) {
                const d = C.purchaseDue(r);
                return d > 0
                  ? '<span class="sbt-text-danger sbt-strong">' + U.currency(d) + "</span>"
                  : '<span class="sbt-text-success">—</span>';
              }},
              { label: "Status", render: function (r) { return U.paymentBadge(r.paymentStatus); } },
              { label: "Actions", className: "actions", render: function (r) {
                return '<button type="button" class="sbt-btn sbt-btn--sm sbt-btn--ghost" data-view="' + r.id + '" title="View">' +
                    '<i class="bi bi-eye"></i></button>' +
                  '<button type="button" class="sbt-btn sbt-btn--sm sbt-btn--ghost" data-edit="' + r.id + '" title="Edit">' +
                    '<i class="bi bi-pencil"></i></button>' +
                  '<button type="button" class="sbt-btn sbt-btn--sm sbt-btn--ghost" data-del="' + r.id + '" title="Delete">' +
                    '<i class="bi bi-trash3"></i></button>';
              }}
            ],
            rows: list,
            footer: list.length ?
              "<tr><td colspan='5'>Total (" + list.length + " entries)</td>" +
              '<td class="num">' + U.currency(totalAmount) + "</td>" +
              '<td class="num">' + U.currency(totalPaid) + "</td>" +
              '<td class="num">' + U.currency(totalDue) + "</td>" +
              "<td colspan='2'></td></tr>" : "",
            empty: { icon: "bi-cart-plus", title: "No purchases found", message: "Record your first purchase entry." }
          })
      })
    );
  }

  function openForm(record) {
    const isEdit = !!record;
    const r = record || {};
    const today = U.today();

    const modal = UI.modal({
      title: isEdit ? "Edit Purchase" : "New Purchase Entry",
      subtitle: "Purchase cost is calculated automatically",
      size: "lg",
      body:
        '<form id="purForm" novalidate>' +
          '<div class="sbt-form-grid">' +
            UI.field({ label: "Purchase Date", name: "date", type: "date", required: true, value: r.date || today }) +
            UI.field({ label: "Supplier Name", name: "supplierName", required: true, value: r.supplierName,
              placeholder: "Enter supplier name", help: "Type a new name to create a supplier" }) +
            UI.field({ label: "Supplier Mobile", name: "supplierMobile", value: r.supplierMobile,
              placeholder: "10-digit mobile", inputmode: "numeric" }) +
            UI.field({ label: "Material", name: "materialName", type: "select", required: true,
              value: r.materialName, options: [] }) +
            UI.field({ label: "Quantity", name: "quantity", type: "number", step: "0.001", min: 0,
              required: true, value: r.quantity, placeholder: "0" }) +
            UI.field({ label: "Unit", name: "unit", type: "select", required: true,
              value: r.unit || "Brass", options: SBT.config.units }) +
            UI.field({ label: "Purchase Rate", name: "purchaseRate", type: "number", step: "0.01", min: 0,
              required: true, value: r.purchaseRate, prefix: "₹" }) +
            UI.field({ label: "Transportation Charges", name: "transportCharges", type: "number", step: "0.01",
              min: 0, value: r.transportCharges || 0, prefix: "₹" }) +
            UI.field({ label: "Loading / Unloading", name: "loadingCharges", type: "number", step: "0.01",
              min: 0, value: r.loadingCharges || 0, prefix: "₹" }) +
            UI.field({ label: "Other Expenses", name: "otherExpenses", type: "number", step: "0.01",
              min: 0, value: r.otherExpenses || 0, prefix: "₹" }) +
            UI.field({ label: "Payment Status", name: "paymentStatus", type: "select", required: true,
              value: r.paymentStatus || "Pending", options: SBT.config.paymentStatuses }) +
            UI.field({ label: "Paid Amount", name: "paidAmount", type: "number", step: "0.01", min: 0,
              value: r.paidAmount || 0, prefix: "₹", help: "Used when status is Partial" }) +
            UI.field({ label: "Notes", name: "notes", type: "textarea", value: r.notes,
              placeholder: "Optional remarks…", full: true }) +
          "</div>" +

          '<div class="sbt-divider"></div>' +

          '<div class="sbt-form-grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">' +
            '<div class="sbt-field"><label>Base Amount</label>' +
              '<input class="sbt-input" id="purBase" readonly value="₹0.00"></div>' +
            '<div class="sbt-field"><label>Additional Expenses</label>' +
              '<input class="sbt-input" id="purExp" readonly value="₹0.00"></div>' +
            '<div class="sbt-field"><label>Total Purchase Amount</label>' +
              '<input class="sbt-input" id="purTotal" readonly value="₹0.00" ' +
              'style="font-weight:800;color:var(--sbt-navy-700)"></div>' +
            '<div class="sbt-field"><label>Balance Due</label>' +
              '<input class="sbt-input" id="purDue" readonly value="₹0.00" ' +
              'style="font-weight:800;color:var(--sbt-danger)"></div>' +
          "</div>" +
        "</form>",
      footer:
        '<button type="button" class="sbt-btn sbt-btn--outline" data-act="cancel">Cancel</button>' +
        '<button type="button" class="sbt-btn sbt-btn--accent" data-act="save">' +
          '<i class="bi bi-check-lg"></i> ' + (isEdit ? "Update Purchase" : "Save Purchase") + "</button>",
      onOpen: function (m) {
        const form = m.$("#purForm");
        const materialSel = form.querySelector('[name="materialName"]');
        const unitSel = form.querySelector('[name="unit"]');
        const qtyEl = form.querySelector('[name="quantity"]');
        const rateEl = form.querySelector('[name="purchaseRate"]');
        const transEl = form.querySelector('[name="transportCharges"]');
        const loadEl = form.querySelector('[name="loadingCharges"]');
        const otherEl = form.querySelector('[name="otherExpenses"]');
        const statusEl = form.querySelector('[name="paymentStatus"]');
        const paidEl = form.querySelector('[name="paidAmount"]');
        const mobileEl = form.querySelector('[name="supplierMobile"]');
        const supplierEl = form.querySelector('[name="supplierName"]');

        /* Populate materials */
        materialSel.innerHTML = App.productOptions(true);
        if (r.materialName) materialSel.value = r.materialName;

        /* Supplier autocomplete */
        supplierEl.setAttribute("list", "purSupplierList");
        supplierEl.insertAdjacentHTML("afterend", App.partyDatalist("suppliers", "purSupplierList"));

        function recalc() {
          const base = U.num(qtyEl.value) * U.num(rateEl.value);
          const exp = U.num(transEl.value) + U.num(loadEl.value) + U.num(otherEl.value);
          const total = base + exp;

          let paid = 0;
          if (statusEl.value === "Paid") paid = total;
          else if (statusEl.value === "Partial") paid = U.clamp(U.num(paidEl.value), 0, total);
          else paid = 0;

          m.$("#purBase").value = U.currency(base);
          m.$("#purExp").value = U.currency(exp);
          m.$("#purTotal").value = U.currency(total);
          m.$("#purDue").value = U.currency(Math.max(0, total - paid));

          paidEl.disabled = statusEl.value !== "Partial";
          if (statusEl.value === "Paid") paidEl.value = U.round(total, 2);
          if (statusEl.value === "Pending") paidEl.value = 0;
        }

        [qtyEl, rateEl, transEl, loadEl, otherEl, paidEl].forEach(function (el) {
          el.addEventListener("input", recalc);
        });
        statusEl.addEventListener("change", recalc);

        materialSel.addEventListener("change", function () {
          const opt = materialSel.selectedOptions[0];
          if (!opt || !opt.value) return;
          unitSel.value = opt.dataset.unit || unitSel.value;
          if (!isEdit || !U.num(rateEl.value)) {
            rateEl.value = opt.dataset.rate || "";
          }
          recalc();
        });

        supplierEl.addEventListener("change", function () {
          const mobile = App.findPartyMobile("suppliers", supplierEl.value);
          if (mobile && !mobileEl.value) mobileEl.value = mobile;
        });

        recalc();

        m.$('[data-act="cancel"]').addEventListener("click", m.close);
        m.$('[data-act="save"]').addEventListener("click", function () {
          const data = UI.readForm(form);

          const errors = U.validate({
            date: { value: data.date, label: "Purchase date", required: true },
            supplierName: { value: data.supplierName, label: "Supplier name", required: true, minLength: 2 },
            supplierMobile: { value: data.supplierMobile, label: "Supplier mobile", mobile: true },
            materialName: { value: data.materialName, label: "Material", required: true },
            quantity: { value: data.quantity, label: "Quantity", required: true, type: "number", min: 0.001 },
            purchaseRate: { value: data.purchaseRate, label: "Purchase rate", required: true, type: "number", min: 0 }
          });

          if (!UI.showErrors(form, errors)) return;

          const payload = {
            date: data.date,
            supplierName: data.supplierName,
            supplierMobile: data.supplierMobile,
            materialName: data.materialName,
            quantity: U.num(data.quantity),
            unit: data.unit,
            purchaseRate: U.num(data.purchaseRate),
            transportCharges: U.num(data.transportCharges),
            loadingCharges: U.num(data.loadingCharges),
            otherExpenses: U.num(data.otherExpenses),
            paymentStatus: data.paymentStatus,
            paidAmount: U.num(data.paidAmount),
            notes: data.notes
          };

          payload.totalAmount = C.purchaseTotal(payload);

          if (isEdit) {
            SBT.store.update("purchases", r.id, payload);
            UI.success("Purchase updated successfully");
          } else {
            SBT.store.insert("purchases", payload);
            UI.success("Purchase recorded successfully");
          }

          App.ensureParty("suppliers", payload.supplierName, payload.supplierMobile);
          m.close();
          refresh();
        });
      }
    });
  }

  function viewRecord(id) {
    const r = SBT.store.get("purchases", id);
    if (!r) return;

    const rowsHtml = [
      ["Purchase Date", U.formatDate(r.date)],
      ["Supplier", r.supplierName + (r.supplierMobile ? " · " + r.supplierMobile : "")],
      ["Material", r.materialName],
      ["Quantity", U.qty(r.quantity) + " " + (r.unit || "")],
      ["Purchase Rate", U.currency(r.purchaseRate)],
      ["Base Amount", U.currency(C.purchaseBase(r))],
      ["Transportation", U.currency(r.transportCharges)],
      ["Loading / Unloading", U.currency(r.loadingCharges)],
      ["Other Expenses", U.currency(r.otherExpenses)],
      ["Total Amount", U.currency(C.purchaseTotal(r))],
      ["Paid Amount", U.currency(C.purchasePaid(r))],
      ["Balance Due", U.currency(C.purchaseDue(r))],
      ["Payment Status", r.paymentStatus],
      ["Notes", r.notes || "—"]
    ].map(function (pair) {
      return '<tr><td class="sbt-muted" style="width:42%">' + U.escape(pair[0]) + "</td>" +
        '<td class="sbt-strong">' + U.escape(pair[1]) + "</td></tr>";
    }).join("");

    UI.modal({
      title: "Purchase Details",
      subtitle: "Entry created " + U.relativeTime(r.createdAt),
      body: '<table class="sbt-table sbt-table--compact"><tbody>' + rowsHtml + "</tbody></table>",
      footer: '<button type="button" class="sbt-btn sbt-btn--outline" data-act="close">Close</button>',
      onOpen: function (m) {
        m.$('[data-act="close"]').addEventListener("click", m.close);
      }
    });
  }

  async function remove(id) {
    const r = SBT.store.get("purchases", id);
    if (!r) return;
    const ok = await UI.confirm({
      title: "Delete Purchase",
      message: "Delete purchase of " + r.materialName + " from " + r.supplierName +
        " (" + U.currency(C.purchaseTotal(r)) + ")? Stock will be recalculated.",
      confirmText: "Delete Purchase"
    });
    if (!ok) return;
    SBT.store.remove("purchases", id);
    UI.success("Purchase deleted");
    refresh();
  }

  function exportData() {
    const list = rows().map(function (r) {
      return {
        Date: r.date,
        Supplier: r.supplierName,
        Mobile: r.supplierMobile,
        Material: r.materialName,
        Quantity: r.quantity,
        Unit: r.unit,
        Rate: r.purchaseRate,
        Transportation: r.transportCharges,
        Loading: r.loadingCharges,
        Other: r.otherExpenses,
        Total: C.purchaseTotal(r),
        Paid: C.purchasePaid(r),
        Due: C.purchaseDue(r),
        Status: r.paymentStatus,
        Notes: r.notes
      };
    });
    U.exportExcel("SBT-Purchases", list, null, "Purchase Report");
    UI.success("Purchases exported");
  }

  function mount() {
    const addBtn = document.getElementById("purAdd");
    if (addBtn) addBtn.addEventListener("click", function () { openForm(null); });

    const exportBtn = document.getElementById("purExport");
    if (exportBtn) exportBtn.addEventListener("click", exportData);

    const searchEl = document.getElementById("purSearch");
    if (searchEl) {
      searchEl.addEventListener("input", U.debounce(function () {
        filters.search = searchEl.value;
        refresh();
        const el = document.getElementById("purSearch");
        if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
      }, 220));
    }

    const statusEl = document.getElementById("purStatus");
    if (statusEl) statusEl.addEventListener("change", function () {
      filters.status = statusEl.value;
      refresh();
    });

    const fromEl = document.getElementById("purFrom");
    if (fromEl) fromEl.addEventListener("change", function () {
      filters.from = fromEl.value;
      refresh();
    });

    const toEl = document.getElementById("purTo");
    if (toEl) toEl.addEventListener("change", function () {
      filters.to = toEl.value;
      refresh();
    });

    const clearBtn = document.getElementById("purClear");
    if (clearBtn) clearBtn.addEventListener("click", function () {
      filters = { search: "", status: "", from: "", to: "" };
      refresh();
    });

    const content = document.getElementById("sbtContent");
    U.on(content, "click", "[data-edit]", function (e, el) {
      openForm(SBT.store.get("purchases", el.dataset.edit));
    });
    U.on(content, "click", "[data-view]", function (e, el) { viewRecord(el.dataset.view); });
    U.on(content, "click", "[data-del]", function (e, el) { remove(el.dataset.del); });
  }

  function refresh() {
    const content = document.getElementById("sbtContent");
    if (!content) return;
    content.innerHTML = render();
    mount();
  }

  App.purchases = { render: render, mount: mount, refresh: refresh };
})(window);
