import { formatDistanceToNow, parseISO } from 'date-fns';

/**
 * Format currency in Indian Rupees format (e.g. ₹1,23,456.00)
 */
export const formatCurrency = (amount) => {
  if (amount == null || isNaN(amount)) return '₹0.00';
  return Number(amount).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

/**
 * Format absolute date (e.g. 15 Jan 2025)
 */
export const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

/**
 * Format relative date (e.g. "2 hours ago")
 */
export const formatDateRelative = (date) => {
  if (!date) return '';
  const d = typeof date === 'string' ? parseISO(date) : date;
  try {
    return formatDistanceToNow(d, { addSuffix: true });
  } catch (error) {
    return '';
  }
};

/**
 * Format numbers with Indian commas separator
 */
export const formatNumber = (n) => {
  if (n == null || isNaN(n)) return '0';
  return Number(n).toLocaleString('en-IN');
};

/**
 * Truncate long descriptions
 */
export const truncateText = (str, len = 30) => {
  if (!str) return '';
  if (str.length <= len) return str;
  return str.substring(0, len) + '...';
};

/**
 * Map document status strings into Tailwind badge color classes
 */
export const getStatusColor = (status) => {
  const s = String(status || '').toLowerCase();
  switch (s) {
    // Green
    case 'active':
    case 'approved':
    case 'paid':
    case 'completed':
    case 'awarded':
    case 'success':
      return 'bg-green-100 text-green-800 border border-green-200 dark:bg-green-950/45 dark:text-green-400 dark:border-green-800/30';
    
    // Amber / Orange
    case 'pending':
    case 'under_review':
    case 'sent':
      return 'bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/45 dark:text-amber-400 dark:border-amber-800/30';
    
    // Red
    case 'inactive':
    case 'rejected':
    case 'cancelled':
    case 'overdue':
    case 'failure':
    case 'blacklisted':
      return 'bg-red-100 text-red-800 border border-red-200 dark:bg-red-950/45 dark:text-red-400 dark:border-red-800/30';
    
    // Blue
    case 'draft':
    case 'published':
      return 'bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-950/45 dark:text-blue-400 dark:border-blue-800/30';
    
    // Default Gray
    default:
      return 'bg-slate-100 text-slate-800 border border-slate-200 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700/30';
  }
};
