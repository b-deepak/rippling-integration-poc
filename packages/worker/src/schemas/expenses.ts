import type { FileSchema } from '../workflows/types';

export const expensesSchema: FileSchema = {
  fileType: 'expenses',
  requiredFields: ['employee_id', 'date', 'amount', 'category', 'description'],
  optionalFields: ['receipt_id', 'currency', 'approved_by'],
};
