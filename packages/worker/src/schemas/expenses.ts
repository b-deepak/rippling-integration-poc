import type { FileSchema } from '../workflows/types';
import type { FieldDefinition } from '../validation/types';

/**
 * Field type definitions for expense records
 */
const fieldTypes: Record<string, FieldDefinition> = {
  id: { type: 'string', required: true },
  worker_id: { type: 'string', required: true },
  amount: { type: 'decimal', required: true, min: 0 },
  currency: { type: 'currency', required: true },
  expense_date: { type: 'date', required: true },
  category: { type: 'string', required: true },
  description: { type: 'string', required: true },
  merchant: { type: 'string', required: false },
  receipt_url: { type: 'url', required: false },
  project_id: { type: 'string', required: false },
  department_id: { type: 'string', required: false },
  reimbursable: { type: 'boolean', required: false },
  status: {
    type: 'enum',
    required: false,
    enumValues: ['PENDING', 'APPROVED', 'REJECTED', 'REIMBURSED'],
  },
  approved_by: { type: 'string', required: false },
  approved_at: { type: 'datetime', required: false },
  payment_method: {
    type: 'enum',
    required: false,
    enumValues: ['CARD', 'CASH', 'TRANSFER', 'CHECK'],
  },
  notes: { type: 'string', required: false },
};

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
  fieldTypes,
};
