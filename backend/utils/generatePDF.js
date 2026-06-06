/**
 * generatePDF.js
 * Uses Puppeteer to render a GST-compliant Indian Tax Invoice as PDF
 */

const puppeteer = require('puppeteer');
const amountToWords = require('./amountToWords');

// ─── Format helpers ───────────────────────────────────────────────────────────
const fmt = n => (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// ─── Build HTML ───────────────────────────────────────────────────────────────
function buildInvoiceHTML(invoice) {
  const vendor = invoice.vendor || {};
  const po     = invoice.purchaseOrder || {};

  const isIGST       = (invoice.igstAmount || 0) > 0;
  const cgstRate     = invoice.cgstRate  || 9;
  const sgstRate     = invoice.sgstRate  || 9;
  const igstRate     = invoice.igstRate  || 18;
  const cgstAmount   = fmt(invoice.cgstAmount  || 0);
  const sgstAmount   = fmt(invoice.sgstAmount  || 0);
  const igstAmount   = fmt(invoice.igstAmount  || 0);
  const totalTax     = fmt(invoice.totalTax    || 0);
  const subtotal     = fmt(invoice.subtotal    || 0);
  const grandTotal   = fmt(invoice.totalAmount || 0);
  const roundOff     = fmt(invoice.roundOff    || 0);
  const words        = invoice.amountInWords   || amountToWords(invoice.totalAmount || 0);

  const bankDetails  = invoice.bankDetails || {};
  const vendorAddr   = vendor.address     || {};

  const itemRows = (invoice.items || []).map((item, i) => `
    <tr>
      <td class="center">${i + 1}</td>
      <td>${item.name || '—'}<br/><small class="desc">${item.description || ''}</small></td>
      <td class="center">${item.hsn || '—'}</td>
      <td class="right">${item.quantity || 0}</td>
      <td class="center">${item.unit || '—'}</td>
      <td class="right">₹${fmt(item.unitPrice)}</td>
      <td class="right">₹${fmt(item.totalPrice)}</td>
    </tr>
  `).join('');

  const gstRows = isIGST
    ? `<tr>
         <td colspan="5"></td>
         <td class="label">IGST @ ${igstRate}%</td>
         <td class="right">₹${igstAmount}</td>
       </tr>`
    : `<tr>
         <td colspan="5"></td>
         <td class="label">CGST @ ${cgstRate}%</td>
         <td class="right">₹${cgstAmount}</td>
       </tr>
       <tr>
         <td colspan="5"></td>
         <td class="label">SGST @ ${sgstRate}%</td>
         <td class="right">₹${sgstAmount}</td>
       </tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Tax Invoice - ${invoice.invoiceNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12px;
      color: #1a1a1a;
      background: #fff;
      padding: 0;
    }
    .page { max-width: 800px; margin: 0 auto; padding: 20px; }

    /* Header */
    .inv-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #16a34a;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .logo-block h1 {
      font-size: 26px;
      font-weight: 900;
      color: #16a34a;
      letter-spacing: -1px;
    }
    .logo-block span { font-size: 11px; color: #555; }
    .inv-title {
      text-align: right;
    }
    .inv-title h2 {
      font-size: 20px;
      font-weight: 700;
      color: #16a34a;
      letter-spacing: 2px;
    }
    .inv-title p { font-size: 11px; color: #555; margin-top: 2px; }

    /* Info Grid */
    .info-grid {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
    }
    .info-box {
      flex: 1;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      padding: 10px 14px;
    }
    .info-box h3 {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #fff;
      background: #16a34a;
      margin: -10px -14px 10px -14px;
      padding: 5px 14px;
      border-radius: 5px 5px 0 0;
    }
    .info-box p { line-height: 1.6; font-size: 11.5px; }
    .info-box strong { font-weight: 700; font-size: 13px; }

    /* Invoice Meta */
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      overflow: hidden;
    }
    .meta-table td {
      padding: 7px 12px;
      border: 1px solid #e5e7eb;
      font-size: 11.5px;
    }
    .meta-table td:nth-child(odd) {
      background: #f9fafb;
      font-weight: 600;
      color: #374151;
      width: 22%;
    }

    /* Items Table */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 0;
      font-size: 11.5px;
    }
    .items-table thead tr {
      background: #16a34a;
      color: #fff;
    }
    .items-table thead th {
      padding: 8px 10px;
      text-align: left;
      font-weight: 600;
      font-size: 11px;
      letter-spacing: 0.3px;
    }
    .items-table thead th.right { text-align: right; }
    .items-table thead th.center { text-align: center; }
    .items-table tbody tr { border-bottom: 1px solid #e5e7eb; }
    .items-table tbody tr:nth-child(even) { background: #f9fafb; }
    .items-table tbody td { padding: 7px 10px; vertical-align: top; }
    .items-table td.right  { text-align: right; }
    .items-table td.center { text-align: center; }
    .items-table td.label  { text-align: right; font-weight: 600; color: #374151; background: #f3f4f6; }
    .desc { color: #6b7280; font-size: 10px; }

    /* Totals */
    .totals-section { border: 1px solid #d1d5db; border-top: none; }
    .subtotal-row td { background: #f9fafb; font-weight: 600; }
    .tax-row td { }
    .total-row td {
      background: #16a34a !important;
      color: #fff;
      font-weight: 700;
      font-size: 13px;
      padding: 9px 10px;
    }
    .total-row td.label { background: #16a34a !important; color: #fff; }
    .words-row td {
      background: #f0fdf4;
      font-style: italic;
      font-size: 11px;
      color: #166534;
      padding: 6px 10px;
      border-top: 1px solid #bbf7d0;
    }

    /* Bank details */
    .bank-section {
      margin-top: 16px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      overflow: hidden;
    }
    .bank-section h3 {
      background: #374151;
      color: #fff;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      padding: 5px 14px;
    }
    .bank-section table { width: 100%; border-collapse: collapse; }
    .bank-section td { padding: 6px 14px; font-size: 11px; border-bottom: 1px solid #f3f4f6; }
    .bank-section td:first-child { font-weight: 600; color: #374151; width: 30%; }

    /* Footer */
    .footer {
      margin-top: 24px;
      border-top: 2px solid #16a34a;
      padding-top: 10px;
      text-align: center;
      font-size: 10px;
      color: #6b7280;
    }
    .footer strong { color: #16a34a; }
    .sig-section {
      display: flex;
      justify-content: space-between;
      margin-top: 32px;
      font-size: 11px;
    }
    .sig-section div { text-align: center; }
    .sig-line { width: 160px; border-top: 1px solid #9ca3af; margin: 30px auto 4px; }
  </style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div class="inv-header">
    <div class="logo-block">
      <h1>VendorBridge</h1>
      <span>Procurement &amp; Vendor Management ERP</span>
    </div>
    <div class="inv-title">
      <h2>TAX INVOICE</h2>
      <p>Original for Recipient</p>
    </div>
  </div>

  <!-- SELLER / BUYER INFO -->
  <div class="info-grid">
    <div class="info-box">
      <h3>Seller Details</h3>
      <p>
        <strong>VendorBridge Pvt Ltd</strong><br/>
        123, Business Park, Andheri East<br/>
        Mumbai, Maharashtra — 400069<br/>
        India<br/><br/>
        <strong>GSTIN:</strong> 27AABCV1234F1ZK<br/>
        <strong>PAN:</strong> AABCV1234F<br/>
        <strong>Email:</strong> billing@vendorbridge.com<br/>
        <strong>Phone:</strong> +91-22-4567-8900
      </p>
    </div>
    <div class="info-box">
      <h3>Buyer / Bill To</h3>
      <p>
        <strong>${vendor.companyName || '—'}</strong><br/>
        ${vendorAddr.street ? vendorAddr.street + '<br/>' : ''}
        ${vendorAddr.city || ''}${vendorAddr.city && vendorAddr.state ? ', ' : ''}${vendorAddr.state || ''}${vendorAddr.pincode ? ' — ' + vendorAddr.pincode : ''}<br/>
        India<br/><br/>
        <strong>GSTIN:</strong> ${invoice.buyerGST || vendor.gstNumber || '—'}<br/>
        <strong>Email:</strong> ${vendor.email || '—'}<br/>
        <strong>Phone:</strong> ${vendor.phone || '—'}
      </p>
    </div>
  </div>

  <!-- INVOICE META -->
  <table class="meta-table">
    <tbody>
      <tr>
        <td>Invoice No</td>
        <td><strong>${invoice.invoiceNumber}</strong></td>
        <td>Invoice Date</td>
        <td>${fmtDate(invoice.invoiceDate)}</td>
      </tr>
      <tr>
        <td>Due Date</td>
        <td>${fmtDate(invoice.dueDate)}</td>
        <td>PO Number</td>
        <td>${po.poNumber || '—'}</td>
      </tr>
      <tr>
        <td>Payment Terms</td>
        <td>${invoice.paymentTerms || 'Net 30'}</td>
        <td>Currency</td>
        <td>${invoice.currency || 'INR'}</td>
      </tr>
    </tbody>
  </table>

  <!-- ITEMS TABLE -->
  <table class="items-table">
    <thead>
      <tr>
        <th style="width:4%">#</th>
        <th style="width:32%">Item / Description</th>
        <th class="center" style="width:9%">HSN</th>
        <th class="right" style="width:7%">Qty</th>
        <th class="center" style="width:6%">Unit</th>
        <th class="right" style="width:16%">Unit Rate</th>
        <th class="right" style="width:16%">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows || '<tr><td colspan="7" style="text-align:center;padding:16px;color:#9ca3af;">No items</td></tr>'}

      <!-- Subtotal -->
      <tr class="subtotal-row">
        <td colspan="5"></td>
        <td class="label">Subtotal</td>
        <td class="right">₹${subtotal}</td>
      </tr>

      <!-- GST rows -->
      ${gstRows}

      <!-- Total Tax -->
      <tr class="tax-row">
        <td colspan="5"></td>
        <td class="label">Total Tax</td>
        <td class="right">₹${totalTax}</td>
      </tr>

      ${Number(invoice.roundOff || 0) !== 0 ? `
      <tr>
        <td colspan="5"></td>
        <td class="label">Round Off</td>
        <td class="right">₹${roundOff}</td>
      </tr>` : ''}

      <!-- Grand Total -->
      <tr class="total-row">
        <td colspan="5"></td>
        <td class="label">Grand Total</td>
        <td class="right">₹${grandTotal}</td>
      </tr>

      <!-- Amount in Words -->
      <tr class="words-row">
        <td colspan="7">
          <strong>Amount in Words:</strong> ${words}
        </td>
      </tr>
    </tbody>
  </table>

  <!-- BANK DETAILS -->
  <div class="bank-section">
    <h3>Bank Details (for payment)</h3>
    <table>
      <tr><td>Bank Name</td><td>${bankDetails.bankName || '—'}</td></tr>
      <tr><td>Account Number</td><td>${bankDetails.accountNumber || '—'}</td></tr>
      <tr><td>IFSC Code</td><td>${bankDetails.ifscCode || '—'}</td></tr>
      <tr><td>Branch</td><td>${bankDetails.branchName || '—'}</td></tr>
    </table>
  </div>

  <!-- SIGNATURES -->
  <div class="sig-section">
    <div>
      <div class="sig-line"></div>
      <p>Authorised Signatory</p>
      <p><strong>VendorBridge Pvt Ltd</strong></p>
    </div>
    <div>
      <div class="sig-line"></div>
      <p>Receiver's Signature</p>
      <p><strong>${vendor.companyName || ''}</strong></p>
    </div>
  </div>

  ${invoice.notes ? `<p style="margin-top:16px;font-size:11px;color:#6b7280;"><strong>Notes:</strong> ${invoice.notes}</p>` : ''}

  <!-- FOOTER -->
  <div class="footer">
    <p>This is a computer generated invoice and does not require a physical signature.</p>
    <p style="margin-top:4px;">Thank you for your business! For queries, contact <strong>billing@vendorbridge.com</strong></p>
    <p style="margin-top:4px; font-size:9px;">
      Subject to <strong>Mumbai</strong> jurisdiction. GST applicable as per Government of India norms.
    </p>
  </div>

</div>
</body>
</html>`;
}

// ─── Main export ──────────────────────────────────────────────────────────────
/**
 * generateInvoicePDF(invoice)
 * @param {object} invoice – populated Mongoose Invoice document
 * @returns {Buffer} PDF buffer
 */
async function generateInvoicePDF(invoice) {
  const html = buildInvoiceHTML(invoice);
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' }
    });

    return pdfBuffer;
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = generateInvoicePDF;
