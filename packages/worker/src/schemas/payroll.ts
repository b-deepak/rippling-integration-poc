import type { FileSchema } from '../workflows/types';

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
};
