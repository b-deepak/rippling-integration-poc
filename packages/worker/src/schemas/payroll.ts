import type { FileSchema } from '../workflows/types';

export const payrollSchema: FileSchema = {
  fileType: 'payroll',
  requiredFields: ['employee_id', 'pay_period', 'gross_pay', 'deductions', 'net_pay'],
  optionalFields: ['bonus', 'overtime_pay', 'tax_withholding'],
};
