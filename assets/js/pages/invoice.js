/* ==========================================================================
   SHREE BRAHMANI TRADERS — Invoice (standalone printable page)
   ========================================================================== */
(function (global) {
  "use strict";

  const SBT = global.SBT;
  const U = SBT.utils;
  const C = SBT.calc;

  function T(key, vars) { return U.t(key, vars); }

  function param(name) {
    const match = new RegExp("[?&]" + name + "=([^&]*)").exec(window.location.search);
    return match ? decodeURIComponent(match[1].replace(/\+/g, " ")) : "";
  }

  /* Delegates to the bilingual engine so Gujarati invoices read correctly. */
  function amountInWords(amount) {
    if (SBT.i18n && typeof SBT.i18n.amountInWords === "function") {
      return SBT.i18n.amountInWords(amount);
    }
    return T("inv.zeroRupees");
  }

  /* Settings ship with English defaults. When the user has not customised
     them, fall back to the localised default instead of showing English. */
  function localizedSetting(value, key) {
    const fallback = SBT.config.defaultSettings || {};
    const englishDefault = {
      "inv.defaultTerms": fallback.termsNote,
      "inv.defaultFooter": fallback.footerNote
    }[key];
    if (!value || value === englishDefault) return T(key);
    return value;
  }

  function renderInvoice() {
    const id = param("id");
    const sale = id ? SBT.store.get("sales", id) : null;
    const host = document.getElementById("invoiceRoot");

    if (!host) return;

    if (!sale) {
      host.innerHTML =
        '<div class="inv-error">' +
          '<i class="bi bi-exclamation-triangle-fill"></i>' +
          "<h2>" + U.escape(T("inv.notFound")) + "</h2>" +
          "<p>" + U.escape(T("inv.notFoundMsg")) + "</p>" +
          '<a class="inv-btn inv-btn--primary" href="sales.html">' +
            '<i class="bi bi-arrow-left"></i> ' + U.escape(T("inv.backToSales")) + "</a>" +
        "</div>";
      return;
    }

    const s = SBT.store.settings;
    const gross = C.salesGross(sale);
    const gst = C.salesGst(sale);
    const final = C.salesFinal(sale);
    const paid = C.salesPaid(sale);
    const due = C.salesDue(sale);

    const product = SBT.store.list("products").find(function (p) {
      return p.name === sale.materialName;
    }) || {};

    const customer = SBT.store.list("customers").find(function (c) {
      return c.name === sale.customerName;
    }) || {};

    host.innerHTML =
      '<div class="inv-actions">' +
        '<a class="inv-btn inv-btn--ghost" href="sales.html">' +
          '<i class="bi bi-arrow-left"></i> ' + U.escape(T("inv.back")) + '</a>' +
        '<div class="inv-actions__right">' +
          '<button type="button" class="inv-btn inv-btn--outline" id="invPrint">' +
            '<i class="bi bi-printer"></i> ' + U.escape(T("common.print")) + '</button>' +
          '<button type="button" class="inv-btn inv-btn--primary" id="invPdf">' +
            '<i class="bi bi-file-earmark-pdf"></i> ' + U.escape(T("inv.savePdf")) + '</button>' +
        "</div>" +
      "</div>" +

      '<div class="inv-sheet" id="invSheet">' +
        /* Header */
        '<div class="inv-head">' +
          '<div class="inv-head__brand">' +
            '<div class="inv-head__logo">' +
              '<img src="assets/img/logo-mark.svg" alt="" ' +
                'onerror="this.style.display=\'none\';this.parentNode.textContent=\'SB\';" />' +
            "</div>" +
            "<div>" +
              '<h1>' + U.escape(s.businessName || "SHREE BRAHMANI TRADERS") + "</h1>" +
              '<p class="inv-head__tag">' + U.escape(T("app.tagline")) + "</p>" +
              (s.address ? '<p class="inv-head__line">' + U.escape(s.address) + "</p>" : "") +
              '<p class="inv-head__line">' +
                (s.mobile ? U.escape(T("inv.mobile", { value: s.mobile })) : "") +
                (s.mobile && s.email ? " · " : "") +
                (s.email ? U.escape(T("inv.email", { value: s.email })) : "") +
              "</p>" +
              (s.gstin ? '<p class="inv-head__line"><strong>' + U.escape(T("common.gstin")) + ":</strong> " +
                U.escape(s.gstin) + "</p>" : "") +
            "</div>" +
          "</div>" +
          '<div class="inv-head__meta">' +
            '<div class="inv-head__title">' + U.escape(T("inv.taxInvoice")) + '</div>' +
            '<table class="inv-meta-table">' +
              "<tr><td>" + U.escape(T("inv.invoiceNo")) + "</td><td><strong>" +
                U.escape(sale.invoiceNo || "—") + "</strong></td></tr>" +
              "<tr><td>" + U.escape(T("inv.invoiceDate")) + "</td><td>" + U.formatDate(sale.date) + "</td></tr>" +
              "<tr><td>" + U.escape(T("inv.payment")) + "</td><td>" +
                U.escape(U.tv(sale.paymentStatus) || "—") + "</td></tr>" +
            "</table>" +
          "</div>" +
        "</div>" +

        /* Parties */
        '<div class="inv-parties">' +
          '<div class="inv-party">' +
            '<div class="inv-party__label">' + U.escape(T("inv.billedTo")) + '</div>' +
            '<div class="inv-party__name">' + U.escape(sale.customerName || "—") + "</div>" +
            (sale.customerMobile ? '<div class="inv-party__line">' + U.escape(sale.customerMobile) + "</div>" : "") +
            (customer.address ? '<div class="inv-party__line">' + U.escape(customer.address) + "</div>" : "") +
            (customer.gstin ? '<div class="inv-party__line"><strong>' + U.escape(T("common.gstin")) + ":</strong> " +
              U.escape(customer.gstin) + "</div>" : "") +
          "</div>" +
          '<div class="inv-party inv-party--right">' +
            '<div class="inv-party__label">' + U.escape(T("inv.amountDue")) + '</div>' +
            '<div class="inv-party__amount">' + U.currency(due) + "</div>" +
            '<div class="inv-party__line">' +
              U.escape(due > 0 ? T("inv.paymentPending") : T("inv.fullyPaid")) +
            "</div>" +
          "</div>" +
        "</div>" +

        /* Items */
        '<table class="inv-items">' +
          "<thead><tr>" +
            '<th style="width:44px">#</th>' +
            "<th>" + U.escape(T("inv.description")) + "</th>" +
            '<th class="num">' + U.escape(T("inv.hsn")) + "</th>" +
            '<th class="num">' + U.escape(T("inv.qty")) + "</th>" +
            '<th class="num">' + U.escape(T("inv.rate")) + "</th>" +
            '<th class="num">' + U.escape(T("inv.amount")) + "</th>" +
          "</tr></thead>" +
          "<tbody>" +
            "<tr>" +
              "<td>1</td>" +
              "<td>" +
                '<div class="inv-item__name">' + U.escape(sale.materialName || "—") + "</div>" +
                (sale.notes ? '<div class="inv-item__note">' + U.escape(sale.notes) + "</div>" : "") +
              "</td>" +
              '<td class="num">' + U.escape(product.hsn || "—") + "</td>" +
              '<td class="num">' + U.qty(sale.quantity) + " " + U.escape(U.tv(sale.unit) || "") + "</td>" +
              '<td class="num">' + U.currency(sale.sellingRate) + "</td>" +
              '<td class="num">' + U.currency(C.salesBase(sale)) + "</td>" +
            "</tr>" +
          "</tbody>" +
        "</table>" +

        /* Totals */
        '<div class="inv-totals">' +
          '<div class="inv-totals__words">' +
            '<div class="inv-party__label">' + U.escape(T("common.amountInWords")) + '</div>' +
            '<div class="inv-words">' + U.escape(amountInWords(final)) + "</div>" +
            (s.bankName ?
              '<div class="inv-bank">' +
                '<div class="inv-party__label" style="margin-top:.9rem">' +
                  U.escape(T("inv.bankDetails")) + '</div>' +
                '<div class="inv-party__line">' + U.escape(s.bankName) + "</div>" +
                (s.bankAccount ? '<div class="inv-party__line">' +
                  U.escape(T("inv.ac", { value: s.bankAccount })) + "</div>" : "") +
                (s.bankIfsc ? '<div class="inv-party__line">' +
                  U.escape(T("inv.ifsc", { value: s.bankIfsc })) + "</div>" : "") +
              "</div>" : "") +
          "</div>" +
          '<div class="inv-totals__table">' +
            "<table>" +
              "<tr><td>" + U.escape(T("inv.subTotal")) + "</td><td class='num'>" +
                U.currency(C.salesBase(sale)) + "</td></tr>" +
              (U.num(sale.discount) ?
                "<tr><td>" + U.escape(T("inv.discount")) + "</td><td class='num'>− " +
                  U.currency(sale.discount) + "</td></tr>" : "") +
              "<tr><td>" + U.escape(T("inv.taxableValue")) + "</td><td class='num'>" +
                U.currency(gross) + "</td></tr>" +
              (sale.gstApplicable ?
                "<tr><td>" + U.escape(T("inv.gstAt", { rate: U.num(sale.gstRate) })) +
                  "</td><td class='num'>" + U.currency(gst) + "</td></tr>" : "") +
              (U.num(sale.transportCharges) ?
                "<tr><td>" + U.escape(T("inv.transportation")) + "</td><td class='num'>" +
                  U.currency(sale.transportCharges) + "</td></tr>" : "") +
              "<tr class='inv-total-row'><td>" + U.escape(T("inv.grandTotal")) + "</td><td class='num'>" +
                U.currency(final) + "</td></tr>" +
              "<tr><td>" + U.escape(T("inv.amountPaid")) + "</td><td class='num'>" +
                U.currency(paid) + "</td></tr>" +
              "<tr class='inv-due-row'><td>" + U.escape(T("inv.balanceDue")) + "</td><td class='num'>" +
                U.currency(due) + "</td></tr>" +
            "</table>" +
          "</div>" +
        "</div>" +

        /* Footer */
        '<div class="inv-foot">' +
          '<div class="inv-foot__terms">' +
            '<div class="inv-party__label">' + U.escape(T("inv.terms")) + '</div>' +
            "<p>" + U.escape(localizedSetting(s.termsNote, "inv.defaultTerms")) + "</p>" +
            '<p class="inv-foot__thanks">' +
              U.escape(localizedSetting(s.footerNote, "inv.defaultFooter")) + "</p>" +
          "</div>" +
          '<div class="inv-foot__sign">' +
            '<div class="inv-sign-line"></div>' +
            "<div>" + U.escape(T("inv.for", { name: s.businessName || "SHREE BRAHMANI TRADERS" })) +
              "</div>" +
            '<div class="inv-party__line">' + U.escape(T("inv.authorisedSignatory")) + "</div>" +
          "</div>" +
        "</div>" +
      "</div>";

    const printBtn = document.getElementById("invPrint");
    if (printBtn) printBtn.addEventListener("click", function () { window.print(); });

    const pdfBtn = document.getElementById("invPdf");
    if (pdfBtn) pdfBtn.addEventListener("click", function () {
      SBT.ui.info(T("inv.pdfHint"));
      setTimeout(function () { window.print(); }, 400);
    });
  }

  document.addEventListener("DOMContentLoaded", renderInvoice);
})(window);
