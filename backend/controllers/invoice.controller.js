const Invoice = require('../models/Invoice.model');
const PurchaseOrder = require('../models/PurchaseOrder.model');
const Vendor = require('../models/Vendor.model');
const logActivity = require('../utils/activityLogger');
const generateInvoicePDF = require('../utils/generatePDF');
const sendEmail = require('../utils/sendEmail');
const amountToWords = require('../utils/amountToWords');

// ─── PO statuses that allow invoice creation ──────────────────────────────────
// PO must be at least 'sent' (i.e. not still in draft)
const INVOICEABLE_STATUSES = ['sent', 'acknowledged', 'in_progress', 'delivered', 'completed'];

// ─── getAllInvoices ───────────────────────────────────────────────────────────
const getAllInvoices = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip  = (page - 1) * limit;

    const query = {};

    // Vendor scope
    if (req.user.role === 'vendor') {
      const vendor = await Vendor.findOne({ user: req.user.id }).select('_id');
      if (!vendor) return res.status(200).json({ success: true, invoices: [], count: 0 });
      query.vendor = vendor._id;
    }

    // Filters
    if (req.query.status)             query.status   = req.query.status;
    if (req.query.vendor)             query.vendor   = req.query.vendor;
    if (req.query.purchaseOrder)      query.purchaseOrder = req.query.purchaseOrder;

    // Date range on invoiceDate
    if (req.query.from || req.query.to) {
      query.invoiceDate = {};
      if (req.query.from) query.invoiceDate.$gte = new Date(req.query.from);
      if (req.query.to)   query.invoiceDate.$lte = new Date(req.query.to);
    }

    const [invoices, total] = await Promise.all([
      Invoice.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('vendor', 'companyName email vendorId')
        .populate('purchaseOrder', 'poNumber status')
        .populate('createdBy', 'firstName lastName email'),
      Invoice.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      count: invoices.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      invoices
    });
  } catch (error) {
    next(error);
  }
};

// ─── getInvoiceById ───────────────────────────────────────────────────────────
const getInvoiceById = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('vendor')
      .populate('purchaseOrder')
      .populate('createdBy', 'firstName lastName email');

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    // Vendor access check
    if (req.user.role === 'vendor') {
      const vendor = await Vendor.findOne({ user: req.user.id }).select('_id');
      if (!vendor || invoice.vendor._id.toString() !== vendor._id.toString()) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
    }

    return res.status(200).json({ success: true, invoice });
  } catch (error) {
    next(error);
  }
};

// ─── createInvoice ────────────────────────────────────────────────────────────
const createInvoice = async (req, res, next) => {
  try {
    const { purchaseOrderId, notes, paymentTerms } = req.body;

    if (!purchaseOrderId) {
      return res.status(400).json({ success: false, message: 'purchaseOrderId is required' });
    }

    // Find and validate PO
    const po = await PurchaseOrder.findById(purchaseOrderId).populate('vendor');
    if (!po) {
      return res.status(404).json({ success: false, message: 'Purchase Order not found' });
    }
    if (!INVOICEABLE_STATUSES.includes(po.status)) {
      return res.status(400).json({
        success: false,
        message: `PO must be in status [${INVOICEABLE_STATUSES.join(', ')}] to create an invoice. Current: '${po.status}'`
      });
    }

    // Prevent duplicate invoice for same PO
    const existing = await Invoice.findOne({ purchaseOrder: purchaseOrderId });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An invoice already exists for this Purchase Order',
        invoiceId: existing._id
      });
    }

    const vendor = po.vendor;

    // Due date: 30 days from now
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    // Map PO items → invoice items (field names match invoice item schema)
    const items = (po.items || []).map(item => ({
      name:       item.name,
      description: item.description || '',
      quantity:   item.quantity,
      unit:       item.unit || 'units',
      unitPrice:  item.unitPrice,
      totalPrice: item.totalPrice,
      hsn:        item.hsn || ''
    }));

    const totalAmount = po.totalAmount;
    const words = amountToWords(totalAmount);

    const invoice = await Invoice.create({
      purchaseOrder: purchaseOrderId,
      vendor:        vendor._id,
      createdBy:     req.user.id,
      invoiceDate:   new Date(),
      dueDate,
      items,
      subtotal:     po.subtotal,
      cgstRate:     po.cgstRate,
      sgstRate:     po.sgstRate,
      igstRate:     po.igstRate,
      cgstAmount:   po.cgstAmount,
      sgstAmount:   po.sgstAmount,
      igstAmount:   po.igstAmount,
      totalTax:     po.totalTax,
      totalAmount,
      amountInWords: words,
      currency:     po.currency || 'INR',
      paymentTerms: paymentTerms || po.paymentTerms || 'Net 30',
      bankDetails:  vendor.bankDetails || {},
      buyerGST:     vendor.gstNumber || '',
      sellerGST:    process.env.COMPANY_GSTIN || '27AABCV1234F1ZK',
      notes:        notes || '',
      status:       'draft'
    });

    // Populate for response
    const populated = await Invoice.findById(invoice._id)
      .populate('vendor', 'companyName email vendorId')
      .populate('purchaseOrder', 'poNumber status')
      .populate('createdBy', 'firstName lastName email');

    await logActivity({
      user: req.user.id,
      action: 'INVOICE_CREATED',
      module: 'invoice',
      description: `Invoice ${invoice.invoiceNumber} created for PO ${po.poNumber}`,
      entityType: 'Invoice',
      entityId: invoice._id,
      entityNumber: invoice.invoiceNumber,
      metadata: { totalAmount, poNumber: po.poNumber },
      req
    });

    return res.status(201).json({
      success: true,
      invoice: populated,
      message: 'Invoice created successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ─── generatePDF ─────────────────────────────────────────────────────────────
const generatePDF = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('vendor')
      .populate('purchaseOrder');

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const pdfBuffer = await generateInvoicePDF(invoice.toObject());

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${invoice.invoiceNumber}.pdf"`,
      'Content-Length': pdfBuffer.length
    });

    await logActivity({
      user: req.user.id,
      action: 'INVOICE_PDF_GENERATED',
      module: 'invoice',
      description: `PDF generated for invoice ${invoice.invoiceNumber}`,
      entityType: 'Invoice',
      entityId: invoice._id,
      entityNumber: invoice.invoiceNumber,
      req
    });

    return res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

// ─── sendInvoiceEmail ─────────────────────────────────────────────────────────
const sendInvoiceEmail = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('vendor')
      .populate('purchaseOrder')
      .populate('createdBy', 'firstName lastName');

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const vendor       = invoice.vendor || {};
    const recipientEmail = req.body.email || vendor.email;

    if (!recipientEmail) {
      return res.status(400).json({
        success: false,
        message: 'No recipient email provided and vendor has no email on record'
      });
    }

    // Generate PDF buffer
    const pdfBuffer = await generateInvoicePDF(invoice.toObject());

    // Build branded email HTML
    const emailHTML = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:0;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <!-- Header -->
    <div style="background:#16a34a;padding:24px 32px;">
      <h1 style="color:#fff;margin:0;font-size:22px;letter-spacing:-0.5px;">VendorBridge</h1>
      <p style="color:#bbf7d0;margin:4px 0 0;font-size:13px;">Procurement &amp; Vendor Management ERP</p>
    </div>

    <!-- Body -->
    <div style="padding:28px 32px;">
      <h2 style="color:#1a1a1a;font-size:18px;margin:0 0 8px;">Invoice ${invoice.invoiceNumber}</h2>
      <p style="color:#6b7280;font-size:13px;margin:0 0 20px;">
        Please find your tax invoice attached to this email.
      </p>

      <!-- Summary card -->
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:18px 24px;margin-bottom:20px;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr>
            <td style="padding:5px 0;color:#374151;font-weight:600;">Invoice Number</td>
            <td style="padding:5px 0;text-align:right;color:#1a1a1a;">${invoice.invoiceNumber}</td>
          </tr>
          <tr>
            <td style="padding:5px 0;color:#374151;font-weight:600;">Invoice Date</td>
            <td style="padding:5px 0;text-align:right;color:#1a1a1a;">${new Date(invoice.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
          </tr>
          <tr>
            <td style="padding:5px 0;color:#374151;font-weight:600;">Due Date</td>
            <td style="padding:5px 0;text-align:right;color:#e11d48;">${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
          </tr>
          <tr>
            <td style="padding:5px 0;color:#374151;font-weight:600;">PO Number</td>
            <td style="padding:5px 0;text-align:right;color:#1a1a1a;">${invoice.purchaseOrder?.poNumber || '—'}</td>
          </tr>
          <tr style="border-top:1px solid #bbf7d0;">
            <td style="padding:10px 0 5px;color:#166534;font-weight:700;font-size:15px;">Grand Total</td>
            <td style="padding:10px 0 5px;text-align:right;color:#16a34a;font-weight:700;font-size:15px;">
              ₹${Number(invoice.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </td>
          </tr>
        </table>
      </div>

      <p style="color:#374151;font-size:13px;line-height:1.6;margin:0 0 20px;">
        Please process the payment by the due date mentioned above.
        For any queries regarding this invoice, please contact us at
        <a href="mailto:billing@vendorbridge.com" style="color:#16a34a;">billing@vendorbridge.com</a>.
      </p>

      <p style="color:#374151;font-size:13px;margin:0;">
        Thank you for your business,<br/>
        <strong style="color:#16a34a;">VendorBridge Billing Team</strong>
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#f3f4f6;padding:14px 32px;text-align:center;font-size:11px;color:#9ca3af;">
      VendorBridge Pvt Ltd &bull; 123, Business Park, Andheri East, Mumbai 400069<br/>
      GSTIN: 27AABCV1234F1ZK &bull; billing@vendorbridge.com
    </div>
  </div>
</body>
</html>`;

    await sendEmail({
      to: recipientEmail,
      subject: `Tax Invoice ${invoice.invoiceNumber} from VendorBridge`,
      html: emailHTML,
      attachments: [{
        filename: `${invoice.invoiceNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }]
    });

    // Update invoice record
    invoice.emailSentAt   = new Date();
    invoice.emailSentTo   = recipientEmail;
    invoice.status        = 'sent';
    await invoice.save();

    await logActivity({
      user: req.user.id,
      action: 'INVOICE_EMAIL_SENT',
      module: 'invoice',
      description: `Invoice ${invoice.invoiceNumber} emailed to ${recipientEmail}`,
      entityType: 'Invoice',
      entityId: invoice._id,
      entityNumber: invoice.invoiceNumber,
      metadata: { recipientEmail },
      req
    });

    return res.status(200).json({
      success: true,
      message: `Invoice emailed successfully to ${recipientEmail}`,
      emailSentAt: invoice.emailSentAt,
      emailSentTo: invoice.emailSentTo
    });
  } catch (error) {
    next(error);
  }
};

// ─── updateInvoiceStatus ──────────────────────────────────────────────────────
const VALID_INVOICE_TRANSITIONS = {
  draft:   ['sent', 'cancelled'],
  sent:    ['paid', 'overdue', 'cancelled'],
  overdue: ['paid', 'cancelled'],
  paid:    [],
  cancelled: []
};

const updateInvoiceStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'New status is required' });
    }

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const allowed = VALID_INVOICE_TRANSITIONS[invoice.status] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot transition from '${invoice.status}' to '${status}'. Allowed: ${allowed.join(', ') || 'none'}`
      });
    }

    const oldStatus = invoice.status;
    invoice.status = status;
    if (status === 'paid') invoice.paidAt = new Date();

    await invoice.save();

    await logActivity({
      user: req.user.id,
      action: 'INVOICE_STATUS_UPDATED',
      module: 'invoice',
      description: `Invoice ${invoice.invoiceNumber}: '${oldStatus}' → '${status}'`,
      entityType: 'Invoice',
      entityId: invoice._id,
      entityNumber: invoice.invoiceNumber,
      metadata: { oldStatus, newStatus: status },
      req
    });

    return res.status(200).json({
      success: true,
      invoice,
      message: `Invoice status updated to '${status}'`
    });
  } catch (error) {
    next(error);
  }
};

// ─── exportInvoicesCSV ────────────────────────────────────────────────────────
const exportInvoicesCSV = async (req, res, next) => {
  try {
    const query = {};

    if (req.user.role === 'vendor') {
      const vendor = await Vendor.findOne({ user: req.user.id }).select('_id');
      if (!vendor) {
        res.set('Content-Type', 'text/csv');
        return res.send('Invoice No,Date,Vendor,PO Number,Subtotal,CGST,SGST,IGST,Total Tax,Grand Total,Status\n');
      }
      query.vendor = vendor._id;
    }

    if (req.query.status)        query.status   = req.query.status;
    if (req.query.vendor)        query.vendor   = req.query.vendor;
    if (req.query.from || req.query.to) {
      query.invoiceDate = {};
      if (req.query.from) query.invoiceDate.$gte = new Date(req.query.from);
      if (req.query.to)   query.invoiceDate.$lte = new Date(req.query.to);
    }

    const invoices = await Invoice.find(query)
      .sort({ createdAt: -1 })
      .populate('vendor', 'companyName')
      .populate('purchaseOrder', 'poNumber');

    // Escape a value for CSV: wrap in quotes, escape internal quotes
    const esc = val => {
      const str = String(val === null || val === undefined ? '' : val);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const fmtNum = n => (Number(n) || 0).toFixed(2);
    const fmtD   = d => d ? new Date(d).toLocaleDateString('en-IN') : '';

    const headers = [
      'Invoice No', 'Invoice Date', 'Due Date',
      'Vendor', 'PO Number',
      'Subtotal (₹)', 'CGST (₹)', 'SGST (₹)', 'IGST (₹)',
      'Total Tax (₹)', 'Grand Total (₹)',
      'Status', 'Paid At', 'Email Sent To'
    ].map(esc).join(',');

    const rows = invoices.map(inv => [
      esc(inv.invoiceNumber),
      esc(fmtD(inv.invoiceDate)),
      esc(fmtD(inv.dueDate)),
      esc(inv.vendor?.companyName || ''),
      esc(inv.purchaseOrder?.poNumber || ''),
      esc(fmtNum(inv.subtotal)),
      esc(fmtNum(inv.cgstAmount)),
      esc(fmtNum(inv.sgstAmount)),
      esc(fmtNum(inv.igstAmount)),
      esc(fmtNum(inv.totalTax)),
      esc(fmtNum(inv.totalAmount)),
      esc(inv.status),
      esc(fmtD(inv.paidAt)),
      esc(inv.emailSentTo || '')
    ].join(','));

    const csv = [headers, ...rows].join('\r\n');

    const dateStamp = new Date().toISOString().slice(0, 10);
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="invoices-export-${dateStamp}.csv"`,
      'Content-Length': Buffer.byteLength(csv, 'utf8')
    });

    return res.send(csv);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  generatePDF,
  sendInvoiceEmail,
  updateInvoiceStatus,
  exportInvoicesCSV
};
