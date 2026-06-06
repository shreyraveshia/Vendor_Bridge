// 1. Load dotenv FIRST before anything else:
require('dotenv').config();

// 2. Import all required packages:
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

// 3. Import connectDB from config/db.js
const connectDB = require('./config/db');

// Helper to safely load route modules and fallback gracefully if they don't exist
const loadRoute = (routePath) => {
  try {
    return require(routePath);
  } catch (error) {
    console.warn(`⚠️ Warning: Route file ${routePath} could not be loaded. Falling back to placeholder.`);
    const dummyRouter = express.Router();
    dummyRouter.all('*', (req, res) => {
      res.status(501).json({
        success: false,
        message: `Endpoint handler for ${req.baseUrl} is not implemented yet.`
      });
    });
    return dummyRouter;
  }
};

// 4. Import all route files (wrap in try/catch or use lazy loader to prevent crash)
const authRoutes = loadRoute('./routes/auth.routes');
const vendorRoutes = loadRoute('./routes/vendor.routes');
const rfqRoutes = loadRoute('./routes/rfq.routes');
const quotationRoutes = loadRoute('./routes/quotation.routes');
const approvalRoutes = loadRoute('./routes/approval.routes');
const purchaseOrderRoutes = loadRoute('./routes/purchaseOrder.routes');
const invoiceRoutes = loadRoute('./routes/invoice.routes');
const notificationRoutes = loadRoute('./routes/notification.routes');
const activityLogRoutes = loadRoute('./routes/activityLog.routes');
const reportRoutes = loadRoute('./routes/report.routes');

// 5. Import errorHandler from middleware/errorHandler.middleware.js
const errorHandler = require('./middleware/errorHandler.middleware');

// 6. Call connectDB()
connectDB();

// 7. Create Express app
const app = express();

// 8. Apply middleware IN THIS EXACT ORDER:
// a. helmet() — security headers
app.use(helmet());

// b. compression() — gzip all responses
app.use(compression());

// c. morgan('dev') — only if NODE_ENV !== 'production', else morgan('combined')
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// d. express.json({ limit: '10mb' })
app.use(express.json({ limit: '10mb' }));

// e. express.urlencoded({ extended: true, limit: '10mb' })
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// f. cookie-parser()
app.use(cookieParser());

// g. cors setup
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// h. Rate limiter applied to /api/* only
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // requests per window
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', apiLimiter);

// 9. Mount all API routes:
app.use('/api/auth',            authRoutes);
app.use('/api/vendors',         vendorRoutes);
app.use('/api/rfqs',            rfqRoutes);
app.use('/api/quotations',      quotationRoutes);
app.use('/api/approvals',       approvalRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/invoices',        invoiceRoutes);
app.use('/api/notifications',   notificationRoutes);
app.use('/api/activity-logs',   activityLogRoutes);
app.use('/api/reports',         reportRoutes);

// 10. Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'ok',
    message: 'VendorBridge API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    uptime: process.uptime()
  });
});

// 11. 404 handler for unknown routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// 12. Mount errorHandler LAST
app.use(errorHandler);

// 13. Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`🚀 VendorBridge Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
});

// 14. Handle unhandled rejections and uncaught exceptions:
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err.message);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err.message);
  process.exit(1);
});
