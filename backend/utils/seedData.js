/**
 * seedData.js  –  VendorBridge complete demo dataset
 * Run:  node utils/seedData.js   (from backend/ directory)
 */

require('dotenv').config();
const mongoose = require('mongoose');

// ── Models ─────────────────────────────────────────────────────────────────
const User          = require('../models/User.model');
const Vendor        = require('../models/Vendor.model');
const RFQ           = require('../models/RFQ.model');
const Quotation     = require('../models/Quotation.model');
const Approval      = require('../models/Approval.model');
const PurchaseOrder = require('../models/PurchaseOrder.model');
const Invoice       = require('../models/Invoice.model');
const ActivityLog   = require('../models/ActivityLog.model');
const Notification  = require('../models/Notification.model');

// ── Helpers ────────────────────────────────────────────────────────────────
const amountToWords = require('./amountToWords');

const daysFromNow = n => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
};

const daysAgo = n => daysFromNow(-n);

// ── Connect ────────────────────────────────────────────────────────────────
async function connect() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not found in .env');
  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB');
}

// ── Drop all collections ───────────────────────────────────────────────────
async function dropAll() {
  await Promise.all([
    User.deleteMany({}),
    Vendor.deleteMany({}),
    RFQ.deleteMany({}),
    Quotation.deleteMany({}),
    Approval.deleteMany({}),
    PurchaseOrder.deleteMany({}),
    Invoice.deleteMany({}),
    ActivityLog.deleteMany({}),
    Notification.deleteMany({})
  ]);
  console.log('🗑️  All collections cleared');
}

// ── Main seed ──────────────────────────────────────────────────────────────
async function seed(disconnectAfterSeed = true) {
  if (mongoose.connection.readyState === 0) {
    await connect();
  }
  await dropAll();

  // ═══════════════════════════════════════════════════════════════
  //  1. USERS
  // ═══════════════════════════════════════════════════════════════
  console.log('\n📌 Seeding users…');

  // User.pre('save') hashes the password – use create() not insertMany()
  const [adminUser, procUser, managerUser, vendor1User, vendor2User, vendor3User] = await Promise.all([
    User.create({ firstName:'Rahul',  lastName:'Sharma', email:'admin@vendorbridge.com',        password:'Admin@123',  role:'admin',               company:'VendorBridge Pvt Ltd', phone:'9876543210' }),
    User.create({ firstName:'Priya',  lastName:'Mehta',  email:'procurement@vendorbridge.com',   password:'Proc@1234',  role:'procurement_officer', company:'VendorBridge Pvt Ltd', phone:'9876543211' }),
    User.create({ firstName:'Vikram', lastName:'Singh',  email:'manager@vendorbridge.com',        password:'Mgr@12345',  role:'manager',             company:'VendorBridge Pvt Ltd', phone:'9876543212' }),
    User.create({ firstName:'Anjali', lastName:'Patel',  email:'vendor1@techcorp.com',            password:'Vend@1234',  role:'vendor',              company:'TechCorp Solutions',   phone:'9876543213' }),
    User.create({ firstName:'Suresh', lastName:'Kumar',  email:'vendor2@infrasupply.com',         password:'Vend@1234',  role:'vendor',              company:'Infra Supply Co',      phone:'9876543214' }),
    User.create({ firstName:'Meena',  lastName:'Joshi',  email:'vendor3@officezone.com',          password:'Vend@1234',  role:'vendor',              company:'OfficeZone India',     phone:'9876543215' })
  ]);
  console.log(`   ✔ ${6} users created`);

  // ═══════════════════════════════════════════════════════════════
  //  2. VENDORS
  // ═══════════════════════════════════════════════════════════════
  console.log('📌 Seeding vendors…');

  // Must use create() one by one — insertMany() bypasses pre('save') hooks,
  // so vendorId would never be auto-generated (all null → duplicate key error)
  const techVendorDoc = await Vendor.create({
    companyName:   'TechCorp Solutions',
    contactPerson: 'Anjali Patel',
    email:         'vendor1@techcorp.com',
    phone:         '9876543213',
    category:      'IT & Technology',
    gstNumber:     '27ABCDE1234F1Z5',
    panNumber:     'ABCDE1234F',
    address:       { street:'401, Techno Park, MIDC', city:'Mumbai', state:'Maharashtra', pincode:'400093', country:'India' },
    bankDetails:   { bankName:'HDFC Bank', accountNumber:'50200012345678', ifscCode:'HDFC0001234', branchName:'Andheri East Mumbai' },
    status:        'active', rating: 4.5, totalOrders: 24, totalSpend: 2850000,
    notes:         'Premier IT hardware supplier. Timely deliveries.',
    createdBy:     adminUser._id
  });

  const infraVendorDoc = await Vendor.create({
    companyName:   'Infra Supply Co',
    contactPerson: 'Suresh Kumar',
    email:         'vendor2@infrasupply.com',
    phone:         '9876543214',
    category:      'Construction',
    gstNumber:     '29FGHIJ5678K2Z6',
    panNumber:     'FGHIJ5678K',
    address:       { street:'12, Industrial Layout, Peenya', city:'Bangalore', state:'Karnataka', pincode:'560058', country:'India' },
    bankDetails:   { bankName:'SBI', accountNumber:'30012345678901', ifscCode:'SBIN0012345', branchName:'Peenya Bangalore' },
    status:        'active', rating: 4.2, totalOrders: 18, totalSpend: 4200000,
    notes:         'Reliable construction materials supplier.',
    createdBy:     adminUser._id
  });

  const officeVendorDoc = await Vendor.create({
    companyName:   'OfficeZone India',
    contactPerson: 'Meena Joshi',
    email:         'vendor3@officezone.com',
    phone:         '9876543215',
    category:      'Office Supplies',
    gstNumber:     '27LMNOP9012Q3Z7',
    panNumber:     'LMNOP9012Q',
    address:       { street:'B-22, Chakala MIDC', city:'Mumbai', state:'Maharashtra', pincode:'400099', country:'India' },
    bankDetails:   { bankName:'Axis Bank', accountNumber:'91230056781234', ifscCode:'UTIB0002345', branchName:'Andheri Mumbai' },
    status:        'active', rating: 3.8, totalOrders: 31, totalSpend: 1450000,
    notes:         'Good range of office supplies. Competitive pricing.',
    createdBy:     adminUser._id
  });

  const swiftVendorDoc = await Vendor.create({
    companyName:   'SwiftLog Freight',
    contactPerson: 'Deepak Rathore',
    email:         'contact@swiftlog.in',
    phone:         '9876543216',
    category:      'Logistics',
    gstNumber:     '24RSTUV3456W4Z8',
    panNumber:     'RSTUV3456W',
    address:       { street:'Plot 7, Vatva GIDC', city:'Ahmedabad', state:'Gujarat', pincode:'382445', country:'India' },
    bankDetails:   { bankName:'ICICI Bank', accountNumber:'006901234567', ifscCode:'ICIC0000069', branchName:'Vatva Ahmedabad' },
    status:        'active', rating: 4.0, totalOrders: 12, totalSpend: 980000,
    notes:         'Pan-India logistics coverage.',
    createdBy:     adminUser._id
  });

  const powerVendorDoc = await Vendor.create({
    companyName:   'PowerElec Systems',
    contactPerson: 'Ravi Naik',
    email:         'sales@powereelc.co.in',
    phone:         '9876543217',
    category:      'Electrical',
    gstNumber:     '27XYZAB7890C5Z9',
    panNumber:     'XYZAB7890C',
    address:       { street:'D-Block, Bhosari MIDC', city:'Pune', state:'Maharashtra', pincode:'411026', country:'India' },
    bankDetails:   { bankName:'Bank of Maharashtra', accountNumber:'20221234567', ifscCode:'MAHB0000221', branchName:'Bhosari Pune' },
    status:        'active', rating: 4.7, totalOrders: 9, totalSpend: 1750000,
    notes:         'Specialist electrical equipment supplier. Top rated.',
    createdBy:     adminUser._id
  });

  const vendorDocs = [techVendorDoc, infraVendorDoc, officeVendorDoc, swiftVendorDoc, powerVendorDoc];

  const [techVendor, infraVendor, officeVendor, swiftVendor, powerVendor] = vendorDocs;
  console.log(`   ✔ ${vendorDocs.length} vendors created`);

  // ═══════════════════════════════════════════════════════════════
  //  3. RFQs
  // ═══════════════════════════════════════════════════════════════
  console.log('📌 Seeding RFQs…');

  const rfq1 = await RFQ.create({
    title:       'Office Laptop Procurement Q1 2025',
    description: 'Procurement of business laptops, wireless mice and laptop bags for the Q1 2025 expansion of our engineering and operations teams.',
    category:    'IT & Technology',
    status:      'awarded',
    priority:    'high',
    deadline:    daysAgo(30),
    items: [
      { name:'Business Laptop 15"', description:'Intel i7, 16GB RAM, 512GB SSD, Windows 11 Pro', quantity:20, unit:'units', estimatedUnitPrice:50000 },
      { name:'Wireless Mouse',      description:'Ergonomic, USB-C receiver, 2-year warranty',     quantity:20, unit:'units', estimatedUnitPrice:1200  },
      { name:'Laptop Bag 15.6"',    description:'Water-resistant, padded, trolley-compatible',     quantity:20, unit:'units', estimatedUnitPrice:1500  }
    ],
    assignedVendors:  [techVendor._id, infraVendor._id, officeVendor._id],
    awardedTo:        officeVendor._id,
    quotationsReceived: 3,
    createdBy:        procUser._id,
    notes:            'Priority procurement — new hires joining March 1st.'
  });

  const rfq2 = await RFQ.create({
    title:       'Server Infrastructure Upgrade',
    description: 'Upgrade of our on-premises server rack with new rack servers, UPS units and structured cabling for the data centre expansion.',
    category:    'IT & Technology',
    status:      'under_review',
    priority:    'urgent',
    deadline:    daysFromNow(14),
    items: [
      { name:'Rack Server 2U',   description:'Xeon Silver, 64GB RAM, 4TB NVMe RAID, dual PSU', quantity:4,  unit:'units', estimatedUnitPrice:180000 },
      { name:'Online UPS 10KVA', description:'Double conversion, 30-min backup at full load',   quantity:2,  unit:'units', estimatedUnitPrice:95000  }
    ],
    assignedVendors: [techVendor._id, powerVendor._id],
    quotationsReceived: 0,
    createdBy:   procUser._id,
    notes:       'Datacenter expansion — Q2 deadline critical.'
  });

  const rfq3 = await RFQ.create({
    title:       'Office Furniture Renewal',
    description: 'Complete furniture renewal for the newly renovated 3rd floor — standing desks, ergonomic chairs, storage cabinets and meeting room furniture.',
    category:    'Office Supplies',
    status:      'published',
    priority:    'medium',
    deadline:    daysFromNow(21),
    items: [
      { name:'Height-Adjustable Standing Desk', description:'Electric, 180×80cm, memory presets', quantity:30, unit:'units', estimatedUnitPrice:22000 },
      { name:'Ergonomic Office Chair',           description:'Mesh back, lumbar support, adjustable arms', quantity:30, unit:'units', estimatedUnitPrice:12000 },
      { name:'3-Drawer Pedestal',               description:'Metal, lockable, anti-tip mechanism', quantity:30, unit:'units', estimatedUnitPrice:4500  },
      { name:'6-Seater Conference Table',        description:'Laminate top, cable tray included',   quantity:2,  unit:'units', estimatedUnitPrice:35000 }
    ],
    assignedVendors: [officeVendor._id, swiftVendor._id],
    quotationsReceived: 0,
    createdBy:   procUser._id,
    notes:       'Coordinate with facilities team on delivery slots.'
  });

  console.log(`   ✔ 3 RFQs created`);

  // ═══════════════════════════════════════════════════════════════
  //  4. QUOTATIONS for RFQ1
  // ═══════════════════════════════════════════════════════════════
  console.log('📌 Seeding quotations…');

  // Shared RFQ1 items (same names, different prices per vendor)
  const buildItems = (laptopPrice, mousePrice, bagPrice) => [
    { rfqItemName:'Business Laptop 15"', quantity:20, unit:'units', unitPrice:laptopPrice, totalPrice: laptopPrice * 20 },
    { rfqItemName:'Wireless Mouse',       quantity:20, unit:'units', unitPrice:mousePrice,  totalPrice: mousePrice  * 20 },
    { rfqItemName:'Laptop Bag 15.6"',     quantity:20, unit:'units', unitPrice:bagPrice,    totalPrice: bagPrice    * 20 }
  ];

  // TechCorp quote — Mumbai (intra-state → CGST+SGST on their own invoice, but quotation just has GST 18%)
  const techItems    = buildItems(55000, 1400, 1800);
  const techSubtotal = techItems.reduce((s, i) => s + i.totalPrice, 0);   // 20*(55000+1400+1800)=1164000
  const techTax      = Math.round(techSubtotal * 0.18);
  const techTotal    = techSubtotal + techTax;

  // OfficeZone quote — lowest — Mumbai
  const officeItems    = buildItems(52000, 1200, 1500);
  const officeSubtotal = officeItems.reduce((s, i) => s + i.totalPrice, 0); // 20*(52000+1200+1500)=1094000
  const officeTax      = Math.round(officeSubtotal * 0.18);
  const officeTotal    = officeSubtotal + officeTax;

  // InfraSupply quote — highest — Bangalore (inter-state)
  const infraItems    = buildItems(58000, 1500, 2000);
  const infraSubtotal = infraItems.reduce((s, i) => s + i.totalPrice, 0);  // 20*(58000+1500+2000)=1230000
  const infraTax      = Math.round(infraSubtotal * 0.18);
  const infraTotal    = infraSubtotal + infraTax;

  // Sequential creates — Quotation pre('save') uses countDocuments() for numbering;
  // concurrent creates would all read count=0 and collide on QOT-00001
  const quoteTech = await Quotation.create({
    rfq: rfq1._id, vendor: techVendor._id, submittedBy: vendor1User._id,
    items: techItems, subtotal: techSubtotal, taxRate: 18,
    taxAmount: techTax, totalAmount: techTotal,
    deliveryTimeline: 14, deliveryTimelineUnit: 'days',
    validityPeriod: 30, paymentTerms: 'Net 30',
    warranty: '1 year on-site warranty',
    notes: 'All units pre-configured with company image.',
    status: 'submitted', isLowestPrice: false
  });
  const quoteOffice = await Quotation.create({
    rfq: rfq1._id, vendor: officeVendor._id, submittedBy: vendor3User._id,
    items: officeItems, subtotal: officeSubtotal, taxRate: 18,
    taxAmount: officeTax, totalAmount: officeTotal,
    deliveryTimeline: 10, deliveryTimelineUnit: 'days',
    validityPeriod: 45, paymentTerms: 'Net 30',
    warranty: '1 year carry-in warranty',
    notes: 'Lowest quoted price. Free delivery to office premises.',
    status: 'awarded', isLowestPrice: true
  });
  const quoteInfra = await Quotation.create({
    rfq: rfq1._id, vendor: infraVendor._id, submittedBy: vendor2User._id,
    items: infraItems, subtotal: infraSubtotal, taxRate: 18,
    taxAmount: infraTax, totalAmount: infraTotal,
    deliveryTimeline: 21, deliveryTimelineUnit: 'days',
    validityPeriod: 30, paymentTerms: 'Net 45',
    notes: 'Includes extended support contract.',
    status: 'submitted', isLowestPrice: false
  });

  console.log(`   ✔ 3 quotations created`);
  console.log(`     TechCorp   total: ₹${techTotal.toLocaleString('en-IN')}`);
  console.log(`     OfficeZone total: ₹${officeTotal.toLocaleString('en-IN')} (LOWEST — awarded)`);
  console.log(`     InfraSupply total: ₹${infraTotal.toLocaleString('en-IN')}`);

  // ═══════════════════════════════════════════════════════════════
  //  5. APPROVAL  (for RFQ1 / OfficeZone quotation)
  // ═══════════════════════════════════════════════════════════════
  console.log('📌 Seeding approval…');

  const yesterday = daysAgo(1);
  const approval = await Approval.create({
    rfq:         rfq1._id,
    quotation:   quoteOffice._id,
    vendor:      officeVendor._id,
    requestedBy: procUser._id,
    approvalSteps: [
      {
        stepNumber: 1,
        approver:   managerUser._id,
        status:     'approved',
        remarks:    'Lowest bidder with acceptable delivery timeline. Approved.',
        actionedAt: yesterday
      }
    ],
    currentStep:  1,
    status:       'approved',
    priority:     'normal',
    totalAmount:  officeTotal,
    remarks:      'Approved — OfficeZone India offers best value for Q1 laptop procurement.',
    approvedAt:   yesterday,
    dueDate:      daysAgo(29)
  });

  console.log(`   ✔ 1 approval created (APV number: ${approval.approvalNumber})`);

  // ═══════════════════════════════════════════════════════════════
  //  6. PURCHASE ORDER  (OfficeZone = Mumbai = CGST + SGST)
  // ═══════════════════════════════════════════════════════════════
  console.log('📌 Seeding purchase order…');

  // OfficeZone → Mumbai → Maharashtra → Buyer also Maharashtra → CGST 9% + SGST 9%
  const poSubtotal  = officeSubtotal;
  const cgstRate    = 9, sgstRate = 9, igstRate = 0;
  const cgstAmount  = parseFloat((poSubtotal * cgstRate  / 100).toFixed(2));
  const sgstAmount  = parseFloat((poSubtotal * sgstRate  / 100).toFixed(2));
  const igstAmount  = 0;
  const totalTax    = parseFloat((cgstAmount + sgstAmount).toFixed(2));
  const poTotal     = parseFloat((poSubtotal + totalTax).toFixed(2));

  const poItems = [
    { name:'Business Laptop 15"', description:'Intel i7, 16GB RAM, 512GB SSD, Windows 11 Pro', quantity:20, unit:'units', unitPrice:52000, totalPrice:1040000, hsn:'84713010' },
    { name:'Wireless Mouse',       description:'Ergonomic, USB-C receiver, 2-year warranty',     quantity:20, unit:'units', unitPrice:1200,  totalPrice:24000,   hsn:'84716060' },
    { name:'Laptop Bag 15.6"',     description:'Water-resistant, padded, trolley-compatible',     quantity:20, unit:'units', unitPrice:1500,  totalPrice:30000,   hsn:'42029200' }
  ];

  const po = await PurchaseOrder.create({
    rfq:      rfq1._id,
    quotation: quoteOffice._id,
    approval:  approval._id,
    vendor:    officeVendor._id,
    createdBy: procUser._id,
    items:     poItems,
    billingAddress: {
      street: '123, Business Park, Andheri East',
      city:   'Mumbai', state: 'Maharashtra',
      pincode: '400069', country: 'India'
    },
    deliveryAddress: {
      street: '3rd Floor, VendorBridge HQ, Andheri East',
      city:   'Mumbai', state: 'Maharashtra',
      pincode: '400069', country: 'India'
    },
    subtotal:    poSubtotal,
    cgstRate,    sgstRate,    igstRate,
    cgstAmount,  sgstAmount,  igstAmount,
    totalTax,    totalAmount: poTotal,
    currency:    'INR',
    paymentTerms: 'Net 30',
    expectedDeliveryDate: daysFromNow(10),
    status:      'sent',
    notes:       'Please deliver between 9AM–5PM. Contact Priya Mehta on arrival.',
    terms:       'Payment within 30 days of delivery and acceptance. GST applicable as per invoice.'
  });

  console.log(`   ✔ 1 PO created (${po.poNumber})`);
  console.log(`     Subtotal: ₹${poSubtotal.toLocaleString('en-IN')} | CGST: ₹${cgstAmount.toLocaleString('en-IN')} | SGST: ₹${sgstAmount.toLocaleString('en-IN')} | Total: ₹${poTotal.toLocaleString('en-IN')}`);

  // ═══════════════════════════════════════════════════════════════
  //  7. INVOICE  (from the PO)
  // ═══════════════════════════════════════════════════════════════
  console.log('📌 Seeding invoice…');

  const invoiceItems = poItems.map(p => ({
    name:       p.name,
    description: p.description,
    quantity:   p.quantity,
    unit:       p.unit,
    unitPrice:  p.unitPrice,
    totalPrice: p.totalPrice,
    hsn:        p.hsn
  }));

  const words = amountToWords(poTotal);

  const invoice = await Invoice.create({
    purchaseOrder: po._id,
    vendor:        officeVendor._id,
    createdBy:     procUser._id,
    invoiceDate:   daysAgo(3),
    dueDate:       daysFromNow(27),
    items:         invoiceItems,
    subtotal:      poSubtotal,
    cgstRate,      sgstRate,    igstRate,
    cgstAmount,    sgstAmount,  igstAmount,
    totalTax,      totalAmount: poTotal,
    roundOff:      0,
    amountInWords: words,
    currency:      'INR',
    status:        'sent',
    paymentTerms:  'Net 30',
    bankDetails: {
      bankName:      'Axis Bank',
      accountNumber: '91230056781234',
      ifscCode:      'UTIB0002345',
      branchName:    'Andheri Mumbai'
    },
    buyerGST:    '27LMNOP9012Q3Z7',
    sellerGST:   '27AABCV1234F1ZK',
    notes:       'Thank you for your business. Please ensure timely payment.',
    emailSentAt: daysAgo(3),
    emailSentTo: 'vendor3@officezone.com'
  });

  console.log(`   ✔ 1 invoice created (${invoice.invoiceNumber})`);
  console.log(`     Amount in words: "${words}"`);

  // ═══════════════════════════════════════════════════════════════
  //  8. ACTIVITY LOGS  (10 records across all modules)
  // ═══════════════════════════════════════════════════════════════
  console.log('📌 Seeding activity logs…');

  await ActivityLog.insertMany([
    {
      user: adminUser._id,     action: 'USER_LOGIN',
      module: 'auth',          description: 'Admin user logged in',
      entityType: 'User',      entityId: adminUser._id,
      ipAddress: '192.168.1.1', userAgent: 'Chrome/120',
      status: 'success',       createdAt: daysAgo(10)
    },
    {
      user: adminUser._id,     action: 'VENDOR_CREATED',
      module: 'vendor',        description: 'Vendor TechCorp Solutions onboarded',
      entityType: 'Vendor',    entityId: techVendor._id,
      entityNumber: techVendor.vendorId,
      ipAddress: '192.168.1.1', status: 'success', createdAt: daysAgo(9)
    },
    {
      user: procUser._id,      action: 'RFQ_CREATED',
      module: 'rfq',           description: 'RFQ created: Office Laptop Procurement Q1 2025',
      entityType: 'RFQ',       entityId: rfq1._id,
      entityNumber: rfq1.rfqNumber,
      ipAddress: '192.168.1.2', status: 'success', createdAt: daysAgo(35)
    },
    {
      user: procUser._id,      action: 'RFQ_PUBLISHED',
      module: 'rfq',           description: 'RFQ published and sent to 3 vendors',
      entityType: 'RFQ',       entityId: rfq1._id,
      entityNumber: rfq1.rfqNumber,
      ipAddress: '192.168.1.2', status: 'success', createdAt: daysAgo(34)
    },
    {
      user: vendor3User._id,   action: 'QUOTATION_SUBMITTED',
      module: 'quotation',     description: `Quotation ${quoteOffice.quotationNumber} submitted for ${rfq1.rfqNumber}`,
      entityType: 'Quotation', entityId: quoteOffice._id,
      entityNumber: quoteOffice.quotationNumber,
      ipAddress: '10.0.0.5',   status: 'success', createdAt: daysAgo(32)
    },
    {
      user: procUser._id,      action: 'QUOTATION_SHORTLISTED',
      module: 'quotation',     description: `OfficeZone quotation shortlisted — lowest price`,
      entityType: 'Quotation', entityId: quoteOffice._id,
      entityNumber: quoteOffice.quotationNumber,
      ipAddress: '192.168.1.2', status: 'success', createdAt: daysAgo(28)
    },
    {
      user: procUser._id,      action: 'APPROVAL_REQUESTED',
      module: 'approval',      description: `Approval requested for quotation ${quoteOffice.quotationNumber}`,
      entityType: 'Approval',  entityId: approval._id,
      entityNumber: approval.approvalNumber,
      ipAddress: '192.168.1.2', status: 'success', createdAt: daysAgo(2)
    },
    {
      user: managerUser._id,   action: 'APPROVAL_APPROVED',
      module: 'approval',      description: `Approval ${approval.approvalNumber} fully approved`,
      entityType: 'Approval',  entityId: approval._id,
      entityNumber: approval.approvalNumber,
      ipAddress: '192.168.1.3', status: 'success', createdAt: yesterday
    },
    {
      user: procUser._id,      action: 'PO_CREATED',
      module: 'purchase_order', description: `PO ${po.poNumber} created — OfficeZone India`,
      entityType: 'PurchaseOrder', entityId: po._id,
      entityNumber: po.poNumber,
      metadata: { gstType: 'CGST+SGST', grandTotal: poTotal },
      ipAddress: '192.168.1.2', status: 'success', createdAt: yesterday
    },
    {
      user: procUser._id,      action: 'INVOICE_CREATED',
      module: 'invoice',       description: `Invoice ${invoice.invoiceNumber} created for PO ${po.poNumber}`,
      entityType: 'Invoice',   entityId: invoice._id,
      entityNumber: invoice.invoiceNumber,
      ipAddress: '192.168.1.2', status: 'success', createdAt: daysAgo(3)
    }
  ]);

  console.log(`   ✔ 10 activity logs created`);

  // ═══════════════════════════════════════════════════════════════
  //  9. NOTIFICATIONS  (5 for procurement user, mix read/unread)
  // ═══════════════════════════════════════════════════════════════
  console.log('📌 Seeding notifications…');

  await Notification.insertMany([
    {
      recipient: procUser._id,
      title:    'Quotation Received',
      message:  `TechCorp Solutions submitted a quotation for ${rfq1.rfqNumber} — ₹${techTotal.toLocaleString('en-IN')}`,
      type:     'quotation', priority: 'normal',
      isRead:   true,  readAt: daysAgo(30),
      link:     `/quotations/${quoteTech._id}`,
      relatedModel: 'Quotation', relatedId: quoteTech._id,
      createdAt: daysAgo(32)
    },
    {
      recipient: procUser._id,
      title:    'Lowest Quotation Alert',
      message:  `OfficeZone India is the lowest bidder for ${rfq1.rfqNumber} at ₹${officeTotal.toLocaleString('en-IN')}`,
      type:     'quotation', priority: 'high',
      isRead:   true,  readAt: daysAgo(28),
      link:     `/quotations/${quoteOffice._id}`,
      relatedModel: 'Quotation', relatedId: quoteOffice._id,
      createdAt: daysAgo(31)
    },
    {
      recipient: procUser._id,
      title:    'Approval Granted ✅',
      message:  `Approval ${approval.approvalNumber} has been fully approved by Vikram Singh. You may now create a Purchase Order.`,
      type:     'approval', priority: 'high',
      isRead:   true,  readAt: yesterday,
      link:     `/approvals/${approval._id}`,
      relatedModel: 'Approval', relatedId: approval._id,
      createdAt: yesterday
    },
    {
      recipient: procUser._id,
      title:    'Invoice Sent',
      message:  `Invoice ${invoice.invoiceNumber} for ₹${poTotal.toLocaleString('en-IN')} has been emailed to OfficeZone India.`,
      type:     'invoice', priority: 'normal',
      isRead:   false,
      link:     `/invoices/${invoice._id}`,
      relatedModel: 'Invoice', relatedId: invoice._id,
      createdAt: daysAgo(3)
    },
    {
      recipient: procUser._id,
      title:    'New RFQ Published',
      message:  `RFQ "${rfq2.title}" has been published and assigned to 2 vendors. Deadline: ${rfq2.deadline.toLocaleDateString('en-IN')}.`,
      type:     'rfq', priority: 'normal',
      isRead:   false,
      link:     `/rfqs/${rfq2._id}`,
      relatedModel: 'RFQ', relatedId: rfq2._id,
      createdAt: daysAgo(1)
    }
  ]);

  console.log(`   ✔ 5 notifications created (3 read, 2 unread)`);

  // ═══════════════════════════════════════════════════════════════
  //  SUMMARY
  // ═══════════════════════════════════════════════════════════════
  const counts = await Promise.all([
    User.countDocuments(),
    Vendor.countDocuments(),
    RFQ.countDocuments(),
    Quotation.countDocuments(),
    Approval.countDocuments(),
    PurchaseOrder.countDocuments(),
    Invoice.countDocuments(),
    ActivityLog.countDocuments(),
    Notification.countDocuments()
  ]);

  console.log(`
╔══════════════════════════════════════════════════════════╗
║              VendorBridge Seed Complete 🎉               ║
╠══════════════════════════════════════════════════════════╣
║  Users           : ${String(counts[0]).padEnd(35)}║
║  Vendors         : ${String(counts[1]).padEnd(35)}║
║  RFQs            : ${String(counts[2]).padEnd(35)}║
║  Quotations      : ${String(counts[3]).padEnd(35)}║
║  Approvals       : ${String(counts[4]).padEnd(35)}║
║  Purchase Orders : ${String(counts[5]).padEnd(35)}║
║  Invoices        : ${String(counts[6]).padEnd(35)}║
║  Activity Logs   : ${String(counts[7]).padEnd(35)}║
║  Notifications   : ${String(counts[8]).padEnd(35)}║
╠══════════════════════════════════════════════════════════╣
║                   Demo Credentials                       ║
╠═══════════════════════╦══════════════════════╦═══════════╣
║ Role                  ║ Email                ║ Password  ║
╠═══════════════════════╬══════════════════════╬═══════════╣
║ Admin                 ║ admin@vendorbridge.com║ Admin@123 ║
║ Procurement Officer   ║ procurement@vendor…  ║ Proc@1234 ║
║ Manager / Approver    ║ manager@vendorbridge… ║ Mgr@12345 ║
║ Vendor (TechCorp)     ║ vendor1@techcorp.com ║ Vend@1234 ║
║ Vendor (InfraSupply)  ║ vendor2@infrasupply… ║ Vend@1234 ║
║ Vendor (OfficeZone)   ║ vendor3@officezone…  ║ Vend@1234 ║
╚═══════════════════════╩══════════════════════╩═══════════╝

  PO Number   : ${po.poNumber}
  Invoice No  : ${invoice.invoiceNumber}
  Approval No : ${approval.approvalNumber}

  GST Applied : CGST 9% + SGST 9% (OfficeZone = Mumbai = intra-state)
  PO Subtotal : ₹${poSubtotal.toLocaleString('en-IN')}
  Total Tax   : ₹${totalTax.toLocaleString('en-IN')}
  Grand Total : ₹${poTotal.toLocaleString('en-IN')}
  In Words    : ${words}
`);
  if (disconnectAfterSeed) {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// ── Run ────────────────────────────────────────────────────────────────────
if (require.main === module) {
  seed(true).catch(err => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  });
}

module.exports = () => seed(false);
