// ─── Event Names ───
export const INVOICE_CREATED = 'invoice.created';
export const PURCHASE_COMPLETED = 'purchase.completed';
export const PURCHASE_CANCELLED = 'purchase.cancelled';
export const LOW_STOCK = 'stock.low';
export const STOCK_ADJUSTED = 'stock.adjusted';
export const INVOICE_CANCELED = 'invoice.canceled';

// ─── Queue Names ───
export const PURCHASES_QUEUE = 'PURCHASES_QUEUE';
export const INVOICES_QUEUE = 'INVOICES_QUEUE';
export const LOW_STOCK_QUEUE = 'LOW_STOCK_QUEUE';
export const EMAIL_QUEUE = 'EMAIL_QUEUE';
export const SCHEDULER_QUEUE = 'SCHEDULER_QUEUE';

// ─── Repeatable Job Names (used as jobId for idempotency) ───
export const JOB_LOW_STOCK_CHECK = 'low-stock-check';
export const JOB_RESET_LOW_STOCK_ALERTS = 'reset-low-stock-alerts';
export const JOB_GENERATE_REORDER_SUGGESTIONS = 'generate-reorder-suggestions';
export const JOB_DAILY_SALES_REPORT = 'end-of-day-sales-report';
export const JOB_WEEKLY_REVENUE_REPORT = 'weekly-revenue-report';
export const JOB_MONTHLY_PL_REPORT = 'monthly-pl-report';
export const JOB_QUARTERLY_TAX_SUMMARY = 'quarterly-tax-summary';
export const JOB_CLEANUP_SOFT_DELETED = 'cleanup-soft-deleted';
export const JOB_DAILY_SALES_TARGETS = 'check-daily-sales-targets';
export const JOB_EMPLOYEE_PERFORMANCE = 'employee-performance-summary';
export const JOB_SHRINKAGE_TRACKING = 'shrinkage-tracking-report';
