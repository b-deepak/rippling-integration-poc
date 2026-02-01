import type { FileSchema } from '../workflows/types';

/**
 * Expenses schema for Rippling Spend Management
 * Note: Spend Management is a separate Rippling product.
 * This schema is based on common expense management patterns.
 * Update with actual Rippling Spend API when available.
 */
export const expensesSchema: FileSchema = {
  fileType: 'expenses',
  requiredFields: [
    'id',                    // Unique expense identifier
    'worker_id',             // The worker's ID who submitted the expense
    'amount',                // Expense amount
    'currency',              // Currency code (USD, EUR, etc.)
    'expense_date',          // Date of expense (YYYY-MM-DD)
    'category',              // Expense category
    'description',           // Expense description
  ],
  optionalFields: [
    'merchant',              // Merchant/vendor name
    'receipt_url',           // URL to receipt image
    'project_id',            // Associated project ID
    'department_id',         // Department to charge
    'reimbursable',          // Whether expense is reimbursable
    'status',                // PENDING, APPROVED, REJECTED, REIMBURSED
    'approved_by',           // Approver's worker ID
    'approved_at',           // Approval timestamp
    'payment_method',        // CARD, CASH, etc.
    'notes',                 // Additional notes
  ],
};
