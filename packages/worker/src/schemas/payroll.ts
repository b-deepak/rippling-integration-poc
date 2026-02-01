import type { FileSchema } from '../workflows/types';
import type { FieldDefinition } from '../validation/types';

/**
 * Field type definitions for payroll/compensation records
 */
const fieldTypes: Record<string, FieldDefinition> = {
  id: { type: 'string', required: true },
  worker_id: { type: 'string', required: true },
  payment_type: {
    type: 'enum',
    required: true,
    enumValues: ['SALARY', 'HOURLY', 'CONTRACT', 'COMMISSION'],
  },
  annual_compensation: { type: 'decimal', required: true, min: 0 },
  currency: { type: 'currency', required: true },
  hourly_wage: { type: 'decimal', required: false, min: 0 },
  monthly_compensation: { type: 'decimal', required: false, min: 0 },
  weekly_compensation: { type: 'decimal', required: false, min: 0 },
  on_target_commission: { type: 'decimal', required: false, min: 0 },
  signing_bonus: { type: 'decimal', required: false, min: 0 },
  target_annual_bonus: { type: 'decimal', required: false, min: 0 },
  target_annual_bonus_percent: { type: 'decimal', required: false, min: 0, max: 100 },
  bonus_schedule: { type: 'string', required: false },
  payment_terms: { type: 'string', required: false },
  salary_effective_date: { type: 'date', required: false },
  relocation_reimbursement: { type: 'decimal', required: false, min: 0 },
};

/**
 * Payroll/Compensation schema based on Rippling Compensation API
 * https://developer.rippling.com/documentation/rest-api/reference/compensations
 */
export const payrollSchema: FileSchema = {
  fileType: 'payroll',
  requiredFields: [
    'id',                        // Unique identifier
    'worker_id',                 // The worker's ID
    'payment_type',              // SALARY, HOURLY, etc.
    'annual_compensation',       // Annual compensation amount
    'currency',                  // Currency code (USD, EUR, etc.)
  ],
  optionalFields: [
    'hourly_wage',               // Hourly wage amount
    'monthly_compensation',      // Monthly compensation
    'weekly_compensation',       // Weekly compensation
    'on_target_commission',      // On-target commission amount
    'signing_bonus',             // Signing bonus amount
    'target_annual_bonus',       // Target annual bonus
    'target_annual_bonus_percent', // Bonus as percent of annual comp
    'bonus_schedule',            // Bonus schedule
    'payment_terms',             // Payment terms
    'salary_effective_date',     // Effective date (YYYY-MM-DD)
    'relocation_reimbursement',  // Relocation reimbursement amount
  ],
  fieldTypes,
};
