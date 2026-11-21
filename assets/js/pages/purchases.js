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

  function T(key, vars) { return U.t(key, vars); }

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
        T("pur.title"),
        T("pur.subtitle"),
        '<button type="button" class="sbt-btn sbt-btn--outline" id="purExport">' +
          '<i class="bi bi-file-earmark-excel"></i> ' + U.escape(T("common.export")) + '</button>' +
        '<button type="button" class="sbt-btn sbt-btn--accent" id="purAdd">' +
          '<i class="bi bi-plus-lg"></i> ' + U.escape(T("pur.newPurchase")) + '</button>'
      ) +

      '<div class="sbt-kpi-grid">' +
        App.kpi({ label: T("pur.totalPurchases"), variant: "navy", icon: "bi-cart-plus-fill",
          value: U.currency(totalAmount), meta: U.escape(T("common.entriesCount", { n: list.length })) }) +
        App.kpi({ label: T("pur.amountPaid"), variant: "green", icon: "bi-check-circle-fill",
          value: U.currency(totalPaid) }) +
        App.kpi({ label: T("pur.outstanding"), variant: "red", icon: "bi-exclamation-circle-fill",
          value: U.currency(totalDue) }) +
        App.kpi({ label: T("pur.allRecords"), variant: "blue", icon: "bi-journal-text",
          value: all.length }) +
      "</div>" +

      App.card({
        flush: true,
        body:
          '<div class="sbt-toolbar">' +
            '<div class="sbt-field sbt-field--grow">' +
              '<label for="purSearch">' + U.escape(T("common.search")) + '</label>' +
              '<input type="search" class="sbt-input" id="purSearch" placeholder="' +
                U.escape(T("pur.searchPlaceholder")) + '" value="' +
                U.escape(filters.search) + '">' +
            "</div>" +
            '<div class="sbt-field">' +
              '<label for="purStatus">' + U.escape(T("sales.payment")) + '</label>' +
              '<select class="sbt-select" id="purStatus">' +
                '<option value="">' + U.escape(T("common.all")) + '</option>' +
                SBT.config.paymentStatuses.map(function (s) {
                  return '<option value="' + U.escape(s) + '"' + (filters.status === s ? " selected" : "") + ">" +
                    U.escape(U.tv(s)) + "</option>";
                }).join("") +
              "</select>" +
            "</div>" +
            '<div class="sbt-field">' +
              '<label for="purFrom">' + U.escape(T("common.from")) + '</label>' +
              '<input type="date" class="sbt-input" id="purFrom" value="' + U.escape(filters.from) + '">' +
            "</div>" +
            '<div class="sbt-field">' +
              '<label for="purTo">' + U.escape(T("common.to")) + '</label>' +
              '<input type="date" class="sbt-input" id="purTo" value="' + U.escape(filters.to) + '">' +
            "</div>" +
            '<button type="button" class="sbt-btn sbt-btn--ghost" id="purClear">' +
              '<i class="bi bi-x-lg"></i> ' + U.escape(T("common.clear")) + '</button>' +
          "</div>" +
          UI.table({
            columns: [
              { label: U.escape(T("common.date")), render: function (r) { return U.formatDate(r.date); } },
              { label: U.escape(T("common.supplier")), render: function (r) { return UI.partyCell(r.supplierName, r.supplierMobile); } },
              { label: U.escape(T("common.material")), render: function (r) {
                return '<div class="sbt-strong">' + U.escape(r.materialName) + "</div>" +
                  '<div class="sbt-muted" style="font-size:.72rem">' + U.qty(r.quantity) + " " + U.escape(U.tv(r.unit)) +
                  " @ " + U.currency(r.purchaseRate) + "</div>";
              }},
              { label: U.escape(T("pur.baseAmount")), align: "right", render: function (r) { return U.currency(C.purchaseBase(r)); } },
              { label: U.escape(T("pur.otherExpenses")), align: "right", render: function (r) {
                const e = C.purchaseExpenses(r);
                return e > 0 ? U.currency(e) : '<span class="sbt-muted">—</span>';
              }},
              { label: U.escape(T("common.total")), align: "right", render: function (r) {
                return "<strong>" + U.currency(C.purchaseTotal(r)) + "</strong>";
              }},
              { label: U.escape(T("common.paid")), align: "right", render: function (r) { return U.currency(C.purchasePaid(r)); } },
              { label: U.escape(T("common.due")), align: "right", render: function (r) {
                const d = C.purchaseDue(r);
                return d > 0
                  ? '<span class="sbt-text-danger sbt-strong">' + U.currency(d) + "</span>"
                  : '<span class="sbt-text-success">—</span>';
              }},
              { label: U.escape(T("common.status")), render: function (r) { return U.paymentBadge(r.paymentStatus); } },
              { label: U.escape(T("pur.linkedRecords")), render: function (r) {
                const linked = App.linkedRecords(r.purchaseId || r.id);
                const total = linked.sales.length + linked.expenses.length;
                if (!total) return '<span class="sbt-muted">—</span>';
                return '<button type="button" class="sbt-btn sbt-btn--sm sbt-btn--ghost" data-linked="' +
                  U.escape(r.purchaseId || r.id) + '" title="' + U.escape(T("pur.viewLinked")) + '">' +
                  '<i class="bi bi-link-45deg"></i> ' + linked.sales.length + " / " +
                  linked.expenses.length + "</button>";
              }},
              { label: U.escape(T("common.actions")), className: "actions", render: function (r) {
                return '<button type="button" class="sbt-btn sbt-btn--sm sbt-btn--ghost" data-view="' + r.id + '" title="' +
                    U.escape(T("common.view")) + '">' +
                    '<i class="bi bi-eye"></i></button>' +
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
                U.escape(T("common.entriesCount", { n: list.length })) + ")</td>" +
              '<td class="num">' + U.currency(totalAmount) + "</td>" +
              '<td class="num">' + U.currency(totalPaid) + "</td>" +
              '<td class="num">' + U.currency(totalDue) + "</td>" +
              "<td colspan='3'></td></tr>" : "",
            empty: { icon: "bi-cart-plus", title: T("pur.noPurchasesFound"), message: T("pur.noPurchasesFoundMsg") }
          })
      })
    );
  }

  function openForm(record) {
    const isEdit = !!record;
    const r = record || {};
    const today = U.today();

    const modal = UI.modal({
      title: isEdit ? T("pur.editPurchase") : T("pur.newEntry"),
      subtitle: T("pur.formSubtitle"),
      size: "lg",
      body:
        '<form id="purForm" novalidate>' +
          '<div class="sbt-form-grid">' +
            UI.field({ label: T("pur.purchaseDate"), name: "date", type: "date", required: true, value: r.date || today }) +
            UI.field({ label: T("pur.supplierName"), name: "supplierName", required: true, value: r.supplierName,
              placeholder: T("pur.supplierNamePlaceholder"), help: T("pur.supplierNameHelp") }) +
            UI.field({ label: T("pur.supplierMobile"), name: "supplierMobile", value: r.supplierMobile,
              placeholder: T("common.mobilePlaceholder"), inputmode: "numeric" }) +
            UI.field({ label: T("common.material"), name: "materialName", type: "select", required: true,
              value: r.materialName, options: [] }) +
            UI.field({ label: T("common.quantity"), name: "quantity", type: "number", step: "0.001", min: 0,
              required: true, value: r.quantity, placeholder: "0" }) +
            UI.field({ label: T("common.unit"), name: "unit", type: "select", required: true,
              value: r.unit || "Brass", options: SBT.config.units }) +
            UI.field({ label: T("pur.purchaseRate"), name: "purchaseRate", type: "number", step: "0.01", min: 0,
              required: true, value: r.purchaseRate, prefix: SBT.store.settings.currency || "₹" }) +
            UI.field({ label: T("sales.transport"), name: "transportCharges", type: "number", step: "0.01",
              min: 0, value: r.transportCharges || 0, prefix: SBT.store.settings.currency || "₹" }) +
            UI.field({ label: T("pur.loading"), name: "loadingCharges", type: "number", step: "0.01",
              min: 0, value: r.loadingCharges || 0, prefix: SBT.store.settings.currency || "₹" }) +
            UI.field({ label: T("pur.otherExpenses"), name: "otherExpenses", type: "number", step: "0.01",
              min: 0, value: r.otherExpenses || 0, prefix: SBT.store.settings.currency || "₹" }) +
            UI.field({ label: T("sales.paymentStatus"), name: "paymentStatus", type: "select", required: true,
              value: r.paymentStatus || "Pending", options: SBT.config.paymentStatuses }) +
            UI.field({ label: T("sales.paidAmount"), name: "paidAmount", type: "number", step: "0.01", min: 0,
              value: r.paidAmount || 0, prefix: SBT.store.settings.currency || "₹", help: T("sales.paidHelp") }) +
            UI.field({ label: T("common.notes"), name: "notes", type: "textarea", value: r.notes,
              placeholder: T("sales.notesPlaceholder"), full: true }) +
          "</div>" +

          '<div class="sbt-divider"></div>' +

          '<div class="sbt-form-grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">' +
            '<div class="sbt-field"><label>' + U.escape(T("pur.baseAmount")) + '</label>' +
              '<input class="sbt-input" id="purBase" readonly value="—"></div>' +
            '<div class="sbt-field"><label>' + U.escape(T("pur.additionalExpenses")) + '</label>' +
              '<input class="sbt-input" id="purExp" readonly value="—"></div>' +
            '<div class="sbt-field"><label>' + U.escape(T("pur.totalPurchaseAmount")) + '</label>' +
              '<input class="sbt-input" id="purTotal" readonly value="—" ' +
              'style="font-weight:800;color:var(--sbt-navy-700)"></div>' +
            '<div class="sbt-field"><label>' + U.escape(T("pur.balanceDue")) + '</label>' +
              '<input class="sbt-input" id="purDue" readonly value="—" ' +
              'style="font-weight:800;color:var(--sbt-danger)"></div>' +
          "</div>" +
        "</form>",
      footer:
        '<button type="button" class="sbt-btn sbt-btn--outline" data-act="cancel">' +
          U.escape(T("common.cancel")) + '</button>' +
        '<button type="button" class="sbt-btn sbt-btn--accent" data-act="save">' +
          '<i class="bi bi-check-lg"></i> ' +
          U.escape(isEdit ? T("pur.updatePurchase") : T("pur.savePurchase")) + "</button>",
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
            date: { value: data.date, label: T("pur.purchaseDateLabel"), required: true, type: "date" },
            supplierName: { value: data.supplierName, label: T("pur.supplierNameLabel"), required: true, minLength: 2, maxLength: 120 },
            supplierMobile: { value: data.supplierMobile, label: T("pur.supplierMobileLabel"), mobile: true },
            materialName: { value: data.materialName, label: T("sales.materialLabel"), required: true },
            quantity: { value: data.quantity, label: T("sales.quantityLabel"), required: true, type: "number", min: 0.001 },
            purchaseRate: { value: data.purchaseRate, label: T("pur.purchaseRateLabel"), required: true, type: "number", min: 0 },
            transportCharges: { value: data.transportCharges, label: T("sales.transportLabel"), type: "number", min: 0 },
            loadingCharges: { value: data.loadingCharges, label: T("pur.loading"), type: "number", min: 0 },
            otherExpenses: { value: data.otherExpenses, label: T("pur.otherExpenses"), type: "number", min: 0 },
            paidAmount: { value: data.paidAmount, label: T("sales.paidAmountLabel"), type: "number", min: 0 }
          });

          /* Paid amount cannot exceed the purchase total. */
          const draft = {
            quantity: U.num(data.quantity),
            purchaseRate: U.num(data.purchaseRate),
            transportCharges: U.num(data.transportCharges),
            loadingCharges: U.num(data.loadingCharges),
            otherExpenses: U.num(data.otherExpenses)
          };
          const totalAmount = C.purchaseTotal(draft);
          if (!errors.paidAmount && U.num(data.paidAmount) > totalAmount + 0.0001) {
            errors.paidAmount = T("pur.paidTooHigh", { amount: U.currency(totalAmount) });
          }

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
            UI.success(T("pur.purchaseUpdated"));
          } else {
            /* store.insert gives the purchase its id, which doubles as the
               link key shared by its sales and expenses. */
            SBT.store.insert("purchases", payload);
            UI.success(T("pur.purchaseRecorded"));
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
      [T("pur.purchaseDate"), U.formatDate(r.date)],
      [T("pur.purchaseId"), r.purchaseId || r.id],
      [T("common.supplier"), r.supplierName + (r.supplierMobile ? " · " + r.supplierMobile : "")],
      [T("common.material"), r.materialName],
      [T("common.quantity"), U.qty(r.quantity) + " " + U.tv(r.unit || "")],
      [T("pur.purchaseRate"), U.currency(r.purchaseRate)],
      [T("pur.baseAmount"), U.currency(C.purchaseBase(r))],
      [T("pur.transportation"), U.currency(r.transportCharges)],
      [T("pur.loading"), U.currency(r.loadingCharges)],
      [T("pur.otherExpenses"), U.currency(r.otherExpenses)],
      [T("pur.totalAmount"), U.currency(C.purchaseTotal(r))],
      [T("common.paid"), U.currency(C.purchasePaid(r))],
      [T("pur.balanceDue"), U.currency(C.purchaseDue(r))],
      [T("sales.paymentStatus"), U.tv(r.paymentStatus)],
      [T("common.notes"), r.notes || "—"]
    ].map(function (pair) {
      return '<tr><td class="sbt-muted" style="width:42%">' + U.escape(pair[0]) + "</td>" +
        '<td class="sbt-strong">' + U.escape(pair[1]) + "</td></tr>";
    }).join("");

    UI.modal({
      title: T("pur.details"),
      subtitle: T("pur.detailsSubtitle", { when: U.relativeTime(r.createdAt) }),
      body: '<table class="sbt-table sbt-table--compact"><tbody>' + rowsHtml + "</tbody></table>",
      footer: '<button type="button" class="sbt-btn sbt-btn--outline" data-act="close">' +
        U.escape(T("common.close")) + '</button>',
      onOpen: function (m) {
        m.$('[data-act="close"]').addEventListener("click", m.close);
      }
    });
  }

  function viewLinked(purchaseId) {
    const key = String(purchaseId);
    const purchase = SBT.store.list("purchases").find(function (p) {
      return String(p.purchaseId || p.id) === key;
    });
    const linked = App.linkedRecords(key);

    const salesHtml = linked.sales.length
      ? UI.table({
          compact: true,
          columns: [
            { label: U.escape(T("common.invoice")), render: function (r) {
              return '<span class="sbt-mono">' + U.escape(r.invoiceNo || "—") + "</span>";
            }},
            { label: U.escape(T("common.customer")), render: function (r) { return U.escape(r.customerName || "—"); } },
            { label: U.escape(T("inv.qty")), align: "right", render: function (r) {
              return U.qty(r.quantity) + " " + U.escape(U.tv(r.unit || ""));
            }},
            { label: U.escape(T("common.amount")), align: "right", render: function (r) {
              return U.currency(C.salesFinal(r));
            }}
          ],
          rows: linked.sales
        })
      : '<div class="sbt-empty"><i class="bi bi-receipt"></i><strong>' + U.escape(T("pur.noSalesLinked")) + '</strong>' +
        "<span>" + U.escape(T("pur.noSalesLinkedMsg")) + "</span></div>";

    const expensesHtml = linked.expenses.length
      ? UI.table({
          compact: true,
          columns: [
            { label: U.escape(T("common.date")), render: function (r) { return U.formatDate(r.date); } },
            { label: U.escape(T("common.category")), render: function (r) { return U.escape(U.tv(r.category) || "—"); } },
            { label: U.escape(T("common.description")), render: function (r) { return U.escape(r.description || "—"); } },
            { label: U.escape(T("common.amount")), align: "right", render: function (r) {
              return U.currency(r.amount);
            }}
          ],
          rows: linked.expenses
        })
      : '<div class="sbt-empty"><i class="bi bi-wallet2"></i><strong>' + U.escape(T("pur.noExpensesLinked")) + '</strong>' +
        "<span>" + U.escape(T("pur.noExpensesLinkedMsg")) + "</span></div>";

    const salesTotal = U.sum(linked.sales, function (r) { return C.salesFinal(r); });
    const expenseTotal = U.sum(linked.expenses, function (r) { return r.amount; });

    UI.modal({
      title: T("pur.linkedRecords"),
      subtitle: purchase ? App.purchaseLabel(purchase) : purchaseId,
      size: "lg",
      body:
        '<div class="sbt-kpi-grid" style="margin-bottom:1rem">' +
          App.kpi({ label: T("pur.purchaseCost"), variant: "navy", icon: "bi-cart-plus-fill",
            value: purchase ? U.currency(C.purchaseTotal(purchase)) : "—" }) +
          App.kpi({ label: T("pur.linkedSales"), variant: "green", icon: "bi-receipt-cutoff",
            value: U.currency(salesTotal), meta: U.escape(T("common.invoicesCount", { n: linked.sales.length })) }) +
          App.kpi({ label: T("pur.linkedExpenses"), variant: "red", icon: "bi-wallet2",
            value: U.currency(expenseTotal), meta: U.escape(T("common.entriesCount", { n: linked.expenses.length })) }) +
        "</div>" +
        '<h4 style="font-size:.9rem;margin:0 0 .5rem">' + U.escape(T("dash.sales")) + "</h4>" + salesHtml +
        '<h4 style="font-size:.9rem;margin:1.25rem 0 .5rem">' + U.escape(T("nav.expenses")) + "</h4>" + expensesHtml,
      footer: '<button type="button" class="sbt-btn sbt-btn--outline" data-act="close">' +
        U.escape(T("common.close")) + '</button>',
      onOpen: function (m) {
        m.$('[data-act="close"]').addEventListener("click", m.close);
      }
    });
  }

  async function remove(id) {
    const r = SBT.store.get("purchases", id);
    if (!r) return;
    const ok = await UI.confirm({
      title: T("pur.deletePurchase"),
      message: T("pur.deleteMessage", {
        material: r.materialName,
        supplier: r.supplierName,
        amount: U.currency(C.purchaseTotal(r))
      }),
      confirmText: T("pur.deletePurchase")
    });
    if (!ok) return;
    SBT.store.remove("purchases", id);
    UI.success(T("pur.purchaseDeleted"));
    refresh();
  }

  function exportData() {
    const list = rows().map(function (r) {
      return {
        [T("common.date")]: r.date,
        [T("common.supplier")]: r.supplierName,
        [T("common.mobile")]: r.supplierMobile,
        [T("common.material")]: r.materialName,
        [T("common.quantity")]: r.quantity,
        [T("common.unit")]: U.tv(r.unit),
        [T("common.rate")]: r.purchaseRate,
        [T("pur.transportation")]: r.transportCharges,
        [T("pur.loading")]: r.loadingCharges,
        [T("pur.otherExpenses")]: r.otherExpenses,
        [T("common.total")]: C.purchaseTotal(r),
        [T("common.paid")]: C.purchasePaid(r),
        [T("common.due")]: C.purchaseDue(r),
        [T("common.status")]: U.tv(r.paymentStatus),
        [T("common.notes")]: r.notes
      };
    });
    if (!list.length) { UI.warn(T("common.nothingToExport")); return; }
    U.exportExcel("SBT-Purchases", list, null, T("pur.reportTitle"));
    UI.success(T("pur.exported"));
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
    U.on(content, "click", "[data-linked]", function (e, el) { viewLinked(el.dataset.linked); });
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
