const RFQ          = require('../models/RFQ.model');
const Quotation    = require('../models/Quotation.model');
const Approval     = require('../models/Approval.model');
const PurchaseOrder = require('../models/PurchaseOrder.model');
const Invoice      = require('../models/Invoice.model');
const Vendor       = require('../models/Vendor.model');

// ─── Shared date helpers ──────────────────────────────────────────────────────
const startOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth   = (d = new Date()) => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
const monthsAgo    = n => { const d = new Date(); d.setMonth(d.getMonth() - n); return d; };
const fmtNum       = n => parseFloat((Number(n) || 0).toFixed(2));

// ─── getDashboardStats ────────────────────────────────────────────────────────
const getDashboardStats = async (req, res, next) => {
  try {
    const now       = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd   = endOfMonth(now);
    const sixMonthsAgo = monthsAgo(6);

    const [
      activeRFQCount,
      pendingApprovalCount,
      monthlyPOStats,
      invoiceStats,
      recentPOs,
      recentInvoices,
      spendByMonth,
      topVendors,
      rfqStatusDist,
      invoiceStatusDist
    ] = await Promise.all([

      // 1. Active RFQs (not closed/cancelled)
      RFQ.countDocuments({ status: { $nin: ['closed', 'cancelled'] } }),

      // 2. Pending approvals
      Approval.countDocuments({ status: 'pending' }),

      // 3. POs this month — count + total value
      PurchaseOrder.aggregate([
        { $match: { createdAt: { $gte: monthStart, $lte: monthEnd } } },
        {
          $group: {
            _id: null,
            count:      { $sum: 1 },
            totalValue: { $sum: '$totalAmount' }
          }
        }
      ]),

      // 4. Invoice stats — total count + overdue count
      Invoice.aggregate([
        {
          $facet: {
            total:   [{ $count: 'n' }],
            overdue: [{ $match: { status: 'overdue' } }, { $count: 'n' }]
          }
        }
      ]),

      // 5. Recent 5 POs
      PurchaseOrder.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('vendor', 'companyName vendorId')
        .select('poNumber status totalAmount createdAt vendor'),

      // 6. Recent 5 Invoices
      Invoice.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('vendor', 'companyName vendorId')
        .select('invoiceNumber status totalAmount invoiceDate dueDate vendor'),

      // 7. Spending by month — last 6 months
      PurchaseOrder.aggregate([
        { $match: { createdAt: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: {
              year:  { $year:  '$createdAt' },
              month: { $month: '$createdAt' }
            },
            totalSpend: { $sum: '$totalAmount' },
            count:      { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        {
          $project: {
            _id: 0,
            year:  '$_id.year',
            month: '$_id.month',
            totalSpend: 1,
            count: 1
          }
        }
      ]),

      // 8. Top 5 vendors by totalSpend
      Vendor.find({ status: 'active' })
        .sort({ totalSpend: -1 })
        .limit(5)
        .select('companyName vendorId totalSpend totalOrders rating category'),

      // 9. RFQ status distribution
      RFQ.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),

      // 10. Invoice status distribution
      Invoice.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 }, totalAmount: { $sum: '$totalAmount' } } },
        { $sort: { count: -1 } }
      ])
    ]);

    // Shape the PO / invoice stat results
    const poThisMonth    = monthlyPOStats[0] || { count: 0, totalValue: 0 };
    const invFacet       = invoiceStats[0]   || { total: [], overdue: [] };
    const totalInvoices  = invFacet.total[0]?.n   || 0;
    const overdueInvoices = invFacet.overdue[0]?.n || 0;

    return res.status(200).json({
      success: true,
      dashboard: {
        kpis: {
          activeRFQs:        activeRFQCount,
          pendingApprovals:  pendingApprovalCount,
          posThisMonth:      poThisMonth.count,
          poValueThisMonth:  fmtNum(poThisMonth.totalValue),
          totalInvoices,
          overdueInvoices
        },
        recentPOs,
        recentInvoices,
        spendByMonth,       // for line/bar chart
        topVendors,         // for leaderboard widget
        rfqStatusDist,      // for pie chart
        invoiceStatusDist   // for donut chart
      }
    });
  } catch (error) {
    next(error);
  }
};

// ─── getVendorAnalytics ───────────────────────────────────────────────────────
const getVendorAnalytics = async (req, res, next) => {
  try {
    const [
      vendorSummary,
      categorySpend,
      topPerformers
    ] = await Promise.all([

      // Per-vendor: orders, spend, avg quotation price, rfq participation
      PurchaseOrder.aggregate([
        {
          $group: {
            _id:        '$vendor',
            totalOrders: { $sum: 1 },
            totalSpend:  { $sum: '$totalAmount' },
            avgOrderValue: { $avg: '$totalAmount' }
          }
        },
        { $sort: { totalSpend: -1 } },
        { $limit: 20 },
        {
          $lookup: {
            from: 'vendors', localField: '_id',
            foreignField: '_id', as: 'vendor'
          }
        },
        { $unwind: { path: '$vendor', preserveNullAndEmpty: true } },
        {
          $project: {
            companyName:   '$vendor.companyName',
            vendorId:      '$vendor.vendorId',
            category:      '$vendor.category',
            rating:        '$vendor.rating',
            totalOrders:   1,
            totalSpend:    1,
            avgOrderValue: 1
          }
        }
      ]),

      // Category-wise spend breakdown
      PurchaseOrder.aggregate([
        {
          $lookup: {
            from: 'vendors', localField: 'vendor',
            foreignField: '_id', as: 'vendorInfo'
          }
        },
        { $unwind: { path: '$vendorInfo', preserveNullAndEmpty: true } },
        {
          $group: {
            _id:        '$vendorInfo.category',
            totalSpend: { $sum: '$totalAmount' },
            poCount:    { $sum: 1 }
          }
        },
        { $sort: { totalSpend: -1 } }
      ]),

      // Top performers by completed PO count (on-time delivery proxy)
      PurchaseOrder.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: '$vendor', completedPOs: { $sum: 1 }, totalSpend: { $sum: '$totalAmount' } } },
        { $sort: { completedPOs: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'vendors', localField: '_id',
            foreignField: '_id', as: 'vendor'
          }
        },
        { $unwind: { path: '$vendor', preserveNullAndEmpty: true } },
        {
          $project: {
            companyName:  '$vendor.companyName',
            vendorId:     '$vendor.vendorId',
            category:     '$vendor.category',
            rating:       '$vendor.rating',
            completedPOs: 1,
            totalSpend:   1
          }
        }
      ])
    ]);

    return res.status(200).json({
      success: true,
      vendorAnalytics: {
        vendorSummary,    // per-vendor table data
        categorySpend,    // pie/donut chart data
        topPerformers     // leaderboard
      }
    });
  } catch (error) {
    next(error);
  }
};

// ─── getProcurementStats ──────────────────────────────────────────────────────
const getProcurementStats = async (req, res, next) => {
  try {
    const twelveMonthsAgo = monthsAgo(12);

    const [
      monthlySpend,
      categorySpend,
      funnelCounts,
      avgCycleTime
    ] = await Promise.all([

      // Monthly spend trend — last 12 months
      PurchaseOrder.aggregate([
        { $match: { createdAt: { $gte: twelveMonthsAgo } } },
        {
          $group: {
            _id:  { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
            totalSpend: { $sum: '$totalAmount' },
            totalTax:   { $sum: '$totalTax' },
            count:      { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        {
          $project: {
            _id: 0,
            year:  '$_id.year',
            month: '$_id.month',
            totalSpend: 1,
            totalTax:   1,
            count:      1
          }
        }
      ]),

      // Category-wise spend
      PurchaseOrder.aggregate([
        {
          $lookup: {
            from: 'vendors', localField: 'vendor',
            foreignField: '_id', as: 'vendorInfo'
          }
        },
        { $unwind: { path: '$vendorInfo', preserveNullAndEmpty: true } },
        {
          $group: {
            _id:        '$vendorInfo.category',
            totalSpend: { $sum: '$totalAmount' },
            count:      { $sum: 1 }
          }
        },
        { $sort: { totalSpend: -1 } }
      ]),

      // Conversion funnel: RFQ → Quotation → Approval → PO
      Promise.all([
        RFQ.countDocuments({}),
        Quotation.countDocuments({}),
        Approval.countDocuments({}),
        PurchaseOrder.countDocuments({})
      ]),

      // Avg time from RFQ creation to PO creation (in days)
      // Join POs → Approvals → RFQs to get the timestamps
      PurchaseOrder.aggregate([
        {
          $lookup: {
            from: 'approvals', localField: 'approval',
            foreignField: '_id', as: 'approvalInfo'
          }
        },
        { $unwind: { path: '$approvalInfo', preserveNullAndEmpty: true } },
        {
          $lookup: {
            from: 'rfqs', localField: 'rfq',
            foreignField: '_id', as: 'rfqInfo'
          }
        },
        { $unwind: { path: '$rfqInfo', preserveNullAndEmpty: true } },
        {
          $project: {
            cycleTimeDays: {
              $divide: [
                { $subtract: ['$createdAt', '$rfqInfo.createdAt'] },
                1000 * 60 * 60 * 24  // ms → days
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            avgCycleTimeDays: { $avg: '$cycleTimeDays' },
            minCycleTimeDays: { $min: '$cycleTimeDays' },
            maxCycleTimeDays: { $max: '$cycleTimeDays' }
          }
        }
      ])
    ]);

    const [rfqCount, quotationCount, approvalCount, poCount] = funnelCounts;
    const cycleTime = avgCycleTime[0] || { avgCycleTimeDays: 0, minCycleTimeDays: 0, maxCycleTimeDays: 0 };

    return res.status(200).json({
      success: true,
      procurementStats: {
        monthlySpend,           // line chart
        categorySpend,          // pie chart
        conversionFunnel: {
          rfqs:         rfqCount,
          quotations:   quotationCount,
          approvals:    approvalCount,
          purchaseOrders: poCount
        },
        cycleTime: {
          avgDays: fmtNum(cycleTime.avgCycleTimeDays),
          minDays: fmtNum(cycleTime.minCycleTimeDays),
          maxDays: fmtNum(cycleTime.maxCycleTimeDays)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// ─── getSpendingSummary ───────────────────────────────────────────────────────
const getSpendingSummary = async (req, res, next) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;

    // Determine date range for current period
    let currentStart, currentEnd, previousStart, previousEnd;
    const now = new Date();

    if (startDate && endDate) {
      currentStart  = new Date(startDate);
      currentEnd    = new Date(endDate);
      const duration = currentEnd - currentStart;
      previousStart = new Date(currentStart - duration);
      previousEnd   = new Date(currentStart - 1);
    } else {
      switch (period) {
        case 'week': {
          const day = now.getDay();
          currentStart  = new Date(now); currentStart.setDate(now.getDate() - day);  currentStart.setHours(0,0,0,0);
          currentEnd    = new Date(now); currentEnd.setDate(now.getDate() + (6 - day)); currentEnd.setHours(23,59,59,999);
          previousStart = new Date(currentStart); previousStart.setDate(currentStart.getDate() - 7);
          previousEnd   = new Date(currentStart - 1);
          break;
        }
        case 'quarter': {
          const qMonth   = Math.floor(now.getMonth() / 3) * 3;
          currentStart  = new Date(now.getFullYear(), qMonth, 1);
          currentEnd    = new Date(now.getFullYear(), qMonth + 3, 0, 23, 59, 59, 999);
          previousStart = new Date(now.getFullYear(), qMonth - 3, 1);
          previousEnd   = new Date(currentStart - 1);
          break;
        }
        case 'year': {
          currentStart  = new Date(now.getFullYear(), 0, 1);
          currentEnd    = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
          previousStart = new Date(now.getFullYear() - 1, 0, 1);
          previousEnd   = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
          break;
        }
        default: { // month
          currentStart  = startOfMonth(now);
          currentEnd    = endOfMonth(now);
          previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          previousEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        }
      }
    }

    const matchCurrent  = { createdAt: { $gte: currentStart,  $lte: currentEnd  } };
    const matchPrevious = { createdAt: { $gte: previousStart, $lte: previousEnd } };

    const [
      currentSummary,
      previousSummary,
      vendorBreakdown,
      categoryBreakdown
    ] = await Promise.all([

      // Current period totals
      PurchaseOrder.aggregate([
        { $match: matchCurrent },
        {
          $group: {
            _id: null,
            totalSpend: { $sum: '$totalAmount' },
            totalTax:   { $sum: '$totalTax' },
            poCount:    { $sum: 1 }
          }
        }
      ]),

      // Previous period totals (for % change)
      PurchaseOrder.aggregate([
        { $match: matchPrevious },
        {
          $group: {
            _id: null,
            totalSpend: { $sum: '$totalAmount' },
            poCount:    { $sum: 1 }
          }
        }
      ]),

      // Breakdown by vendor
      PurchaseOrder.aggregate([
        { $match: matchCurrent },
        { $group: { _id: '$vendor', spend: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
        { $sort: { spend: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'vendors', localField: '_id',
            foreignField: '_id', as: 'v'
          }
        },
        { $unwind: { path: '$v', preserveNullAndEmpty: true } },
        { $project: { companyName: '$v.companyName', vendorId: '$v.vendorId', category: '$v.category', spend: 1, count: 1 } }
      ]),

      // Breakdown by category
      PurchaseOrder.aggregate([
        { $match: matchCurrent },
        {
          $lookup: {
            from: 'vendors', localField: 'vendor',
            foreignField: '_id', as: 'v'
          }
        },
        { $unwind: { path: '$v', preserveNullAndEmpty: true } },
        { $group: { _id: '$v.category', spend: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
        { $sort: { spend: -1 } }
      ])
    ]);

    const curr = currentSummary[0]  || { totalSpend: 0, totalTax: 0, poCount: 0 };
    const prev = previousSummary[0] || { totalSpend: 0, poCount: 0 };

    // % change vs previous period
    const spendChange = prev.totalSpend > 0
      ? fmtNum(((curr.totalSpend - prev.totalSpend) / prev.totalSpend) * 100)
      : null;

    return res.status(200).json({
      success: true,
      period,
      dateRange: { from: currentStart, to: currentEnd },
      summary: {
        totalSpend:       fmtNum(curr.totalSpend),
        totalTax:         fmtNum(curr.totalTax),
        poCount:          curr.poCount,
        previousSpend:    fmtNum(prev.totalSpend),
        spendChangePercent: spendChange   // null if no previous data
      },
      vendorBreakdown,
      categoryBreakdown
    });
  } catch (error) {
    next(error);
  }
};

// ─── exportReportCSV ──────────────────────────────────────────────────────────
const exportReportCSV = async (req, res, next) => {
  try {
    const { type = 'pos' } = req.query;
    const esc  = v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
    const fmtD = d => d ? new Date(d).toLocaleDateString('en-IN') : '';
    const fmtN = n => (Number(n) || 0).toFixed(2);

    let headers, rows, filename;

    switch (type) {

      case 'vendors': {
        const vendors = await Vendor.find().sort({ createdAt: -1 });
        headers  = ['Vendor ID', 'Company Name', 'Contact Person', 'Email', 'Phone',
                    'Category', 'GSTIN', 'Status', 'Rating', 'Total Orders', 'Total Spend (₹)', 'Created At'];
        rows = vendors.map(v => [
          esc(v.vendorId), esc(v.companyName), esc(v.contactPerson), esc(v.email),
          esc(v.phone), esc(v.category), esc(v.gstNumber || ''), esc(v.status),
          esc(v.rating), esc(v.totalOrders), esc(fmtN(v.totalSpend)), esc(fmtD(v.createdAt))
        ].join(','));
        filename = 'vendors-report';
        break;
      }

      case 'rfqs': {
        const rfqs = await RFQ.find().sort({ createdAt: -1 })
          .populate('createdBy', 'firstName lastName');
        headers  = ['RFQ Number', 'Title', 'Category', 'Status', 'Priority',
                    'Deadline', 'Quotations Received', 'Created By', 'Created At'];
        rows = rfqs.map(r => [
          esc(r.rfqNumber), esc(r.title), esc(r.category), esc(r.status),
          esc(r.priority), esc(fmtD(r.deadline)), esc(r.quotationsReceived),
          esc(r.createdBy ? `${r.createdBy.firstName} ${r.createdBy.lastName}` : ''),
          esc(fmtD(r.createdAt))
        ].join(','));
        filename = 'rfqs-report';
        break;
      }

      case 'invoices': {
        const invoices = await Invoice.find().sort({ createdAt: -1 })
          .populate('vendor', 'companyName')
          .populate('purchaseOrder', 'poNumber');
        headers  = ['Invoice No', 'Invoice Date', 'Due Date', 'Vendor', 'PO Number',
                    'Subtotal (₹)', 'Total Tax (₹)', 'Grand Total (₹)', 'Status',
                    'Paid At', 'Email Sent To'];
        rows = invoices.map(i => [
          esc(i.invoiceNumber), esc(fmtD(i.invoiceDate)), esc(fmtD(i.dueDate)),
          esc(i.vendor?.companyName || ''), esc(i.purchaseOrder?.poNumber || ''),
          esc(fmtN(i.subtotal)), esc(fmtN(i.totalTax)), esc(fmtN(i.totalAmount)),
          esc(i.status), esc(fmtD(i.paidAt)), esc(i.emailSentTo || '')
        ].join(','));
        filename = 'invoices-report';
        break;
      }

      default: { // 'pos'
        const pos = await PurchaseOrder.find().sort({ createdAt: -1 })
          .populate('vendor', 'companyName vendorId')
          .populate('createdBy', 'firstName lastName');
        headers  = ['PO Number', 'Vendor', 'Vendor ID', 'Status', 'GST Type',
                    'Subtotal (₹)', 'CGST (₹)', 'SGST (₹)', 'IGST (₹)',
                    'Total Tax (₹)', 'Grand Total (₹)', 'Created By', 'Created At'];
        rows = pos.map(p => [
          esc(p.poNumber),
          esc(p.vendor?.companyName || ''),
          esc(p.vendor?.vendorId    || ''),
          esc(p.status),
          esc(p.cgstAmount > 0 ? 'CGST+SGST' : 'IGST'),
          esc(fmtN(p.subtotal)),
          esc(fmtN(p.cgstAmount)),
          esc(fmtN(p.sgstAmount)),
          esc(fmtN(p.igstAmount)),
          esc(fmtN(p.totalTax)),
          esc(fmtN(p.totalAmount)),
          esc(p.createdBy ? `${p.createdBy.firstName} ${p.createdBy.lastName}` : ''),
          esc(fmtD(p.createdAt))
        ].join(','));
        filename = 'purchase-orders-report';
      }
    }

    const dateStamp = new Date().toISOString().slice(0, 10);
    const csv       = [headers.map(esc).join(','), ...rows].join('\r\n');

    res.set({
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}-${dateStamp}.csv"`,
      'Content-Length':       Buffer.byteLength(csv, 'utf8')
    });

    return res.send(csv);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getVendorAnalytics,
  getProcurementStats,
  getSpendingSummary,
  exportReportCSV
};
