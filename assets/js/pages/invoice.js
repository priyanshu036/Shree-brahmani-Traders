/* ==========================================================================
   SHREE BRAHMANI TRADERS — Invoice (standalone printable page)
   ========================================================================== */
(function (global) {
  "use strict";

  const SBT = global.SBT;
  const U = SBT.utils;
  const C = SBT.calc;

  function param(name) {
    const match = new RegExp("[?&]" + name + "=([^&]*)").exec(window.location.search);
    return match ? decodeURIComponent(match[1].replace(/\+/g, " ")) : "";
  }

  /* Number to Indian words (for amount in words) */
  function amountInWords(amount) {
    const n = Math.round(U.num(amount));
    if (n === 0) return "Zero Rupees Only";

    const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
      "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen",
      "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    function twoDigits(num) {
      if (num < 20) return ones[num];
      return tens[Math.floor(num / 10)] + (num % 10 ? " " + ones[num % 10] : "");
    }

    function threeDigits(num) {
      const h = Math.floor(num / 100);
      const rest = num % 100;
      let out = "";
      if (h) out += ones[h] + " Hundred";
      if (rest) out += (h ? " " : "") + twoDigits(rest);
      return out;
    }

    const parts = [];
    const crore = Math.floor(n / 10000000);
    const lakh = Math.floor((n % 10000000) / 100000);
    const thousand = Math.floor((n % 100000) / 1000);
    const hundred = n % 1000;

    if (crore) parts.push(threeDigits(crore) + " Crore");
    if (lakh) parts.push(twoDigits(lakh) + " Lakh");
    if (thousand) parts.push(twoDigits(thousand) + " Thousand");
    if (hundred) parts.push(threeDigits(hundred));

    return parts.join(" ") + " Rupees Only";
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
          "<h2>Invoice not found</h2>" +
          "<p>The invoice you are looking for does not exist or has been deleted.</p>" +
          '<a class="inv-btn inv-btn--primary" href="sales.html">' +
            '<i class="bi bi-arrow-left"></i> Back to Sales</a>' +
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
          '<i class="bi bi-arrow-left"></i> Back</a>' +
        '<div class="inv-actions__right">' +
          '<button type="button" class="inv-btn inv-btn--outline" id="invPrint">' +
            '<i class="bi bi-printer"></i> Print</button>' +
          '<button type="button" class="inv-btn inv-btn--primary" id="invPdf">' +
            '<i class="bi bi-file-earmark-pdf"></i> Save as PDF</button>' +
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
              '<p class="inv-head__tag">' + U.escape(SBT.config.tagline) + "</p>" +
              (s.address ? '<p class="inv-head__line">' + U.escape(s.address) + "</p>" : "") +
              '<p class="inv-head__line">' +
                (s.mobile ? "Mobile: " + U.escape(s.mobile) : "") +
                (s.mobile && s.email ? " · " : "") +
                (s.email ? "Email: " + U.escape(s.email) : "") +
              "</p>" +
              (s.gstin ? '<p class="inv-head__line"><strong>GSTIN:</strong> ' +
                U.escape(s.gstin) + "</p>" : "") +
            "</div>" +
          "</div>" +
          '<div class="inv-head__meta">' +
            '<div class="inv-head__title">TAX INVOICE</div>' +
            '<table class="inv-meta-table">' +
              "<tr><td>Invoice No.</td><td><strong>" + U.escape(sale.invoiceNo || "—") + "</strong></td></tr>" +
              "<tr><td>Invoice Date</td><td>" + U.formatDate(sale.date) + "</td></tr>" +
              "<tr><td>Payment</td><td>" + U.escape(sale.paymentStatus || "—") + "</td></tr>" +
            "</table>" +
          "</div>" +
        "</div>" +

        /* Parties */
        '<div class="inv-parties">' +
          '<div class="inv-party">' +
            '<div class="inv-party__label">Billed To</div>' +
            '<div class="inv-party__name">' + U.escape(sale.customerName || "—") + "</div>" +
            (sale.customerMobile ? '<div class="inv-party__line">' + U.escape(sale.customerMobile) + "</div>" : "") +
            (customer.address ? '<div class="inv-party__line">' + U.escape(customer.address) + "</div>" : "") +
            (customer.gstin ? '<div class="inv-party__line"><strong>GSTIN:</strong> ' +
              U.escape(customer.gstin) + "</div>" : "") +
          "</div>" +
          '<div class="inv-party inv-party--right">' +
            '<div class="inv-party__label">Amount Due</div>' +
            '<div class="inv-party__amount">' + U.currency(due) + "</div>" +
            '<div class="inv-party__line">' +
              (due > 0 ? "Payment pending" : "Fully paid — thank you!") +
            "</div>" +
          "</div>" +
        "</div>" +

        /* Items */
        '<table class="inv-items">' +
          "<thead><tr>" +
            '<th style="width:44px">#</th>' +
            "<th>Description</th>" +
            '<th class="num">HSN</th>' +
            '<th class="num">Qty</th>' +
            '<th class="num">Rate</th>' +
            '<th class="num">Amount</th>' +
          "</tr></thead>" +
          "<tbody>" +
            "<tr>" +
              "<td>1</td>" +
              "<td>" +
                '<div class="inv-item__name">' + U.escape(sale.materialName || "—") + "</div>" +
                (sale.notes ? '<div class="inv-item__note">' + U.escape(sale.notes) + "</div>" : "") +
              "</td>" +
              '<td class="num">' + U.escape(product.hsn || "—") + "</td>" +
              '<td class="num">' + U.qty(sale.quantity) + " " + U.escape(sale.unit || "") + "</td>" +
              '<td class="num">' + U.currency(sale.sellingRate) + "</td>" +
              '<td class="num">' + U.currency(C.salesBase(sale)) + "</td>" +
            "</tr>" +
          "</tbody>" +
        "</table>" +

        /* Totals */
        '<div class="inv-totals">' +
          '<div class="inv-totals__words">' +
            '<div class="inv-party__label">Amount in Words</div>' +
            '<div class="inv-words">' + U.escape(amountInWords(final)) + "</div>" +
            (s.bankName ?
              '<div class="inv-bank">' +
                '<div class="inv-party__label" style="margin-top:.9rem">Bank Details</div>' +
                '<div class="inv-party__line">' + U.escape(s.bankName) + "</div>" +
                (s.bankAccount ? '<div class="inv-party__line">A/c: ' + U.escape(s.bankAccount) + "</div>" : "") +
                (s.bankIfsc ? '<div class="inv-party__line">IFSC: ' + U.escape(s.bankIfsc) + "</div>" : "") +
              "</div>" : "") +
          "</div>" +
          '<div class="inv-totals__table">' +
            "<table>" +
              "<tr><td>Sub Total</td><td class='num'>" + U.currency(C.salesBase(sale)) + "</td></tr>" +
              (U.num(sale.discount) ?
                "<tr><td>Discount</td><td class='num'>− " + U.currency(sale.discount) + "</td></tr>" : "") +
              "<tr><td>Taxable Value</td><td class='num'>" + U.currency(gross) + "</td></tr>" +
              (sale.gstApplicable ?
                "<tr><td>GST @ " + U.num(sale.gstRate) + "%</td><td class='num'>" +
                  U.currency(gst) + "</td></tr>" : "") +
              (U.num(sale.transportCharges) ?
                "<tr><td>Transportation</td><td class='num'>" +
                  U.currency(sale.transportCharges) + "</td></tr>" : "") +
              "<tr class='inv-total-row'><td>Grand Total</td><td class='num'>" +
                U.currency(final) + "</td></tr>" +
              "<tr><td>Amount Paid</td><td class='num'>" + U.currency(paid) + "</td></tr>" +
              "<tr class='inv-due-row'><td>Balance Due</td><td class='num'>" +
                U.currency(due) + "</td></tr>" +
            "</table>" +
          "</div>" +
        "</div>" +

        /* Footer */
        '<div class="inv-foot">' +
          '<div class="inv-foot__terms">' +
            '<div class="inv-party__label">Terms &amp; Conditions</div>' +
            '<p>' + U.escape(s.termsNote || "Goods once sold will not be taken back.") + "</p>" +
            (s.footerNote ? '<p class="inv-foot__thanks">' + U.escape(s.footerNote) + "</p>" : "") +
          "</div>" +
          '<div class="inv-foot__sign">' +
            '<div class="inv-sign-line"></div>' +
            "<div>For <strong>" + U.escape(s.businessName || "SHREE BRAHMANI TRADERS") + "</strong></div>" +
            '<div class="inv-party__line">Authorised Signatory</div>' +
          "</div>" +
        "</div>" +
      "</div>";

    const printBtn = document.getElementById("invPrint");
    if (printBtn) printBtn.addEventListener("click", function () { window.print(); });

    const pdfBtn = document.getElementById("invPdf");
    if (pdfBtn) pdfBtn.addEventListener("click", function () {
      SBT.ui.info("In the print dialog, choose 'Save as PDF' as the destination.");
      setTimeout(function () { window.print(); }, 400);
    });
  }

  document.addEventListener("DOMContentLoaded", renderInvoice);
})(window);
