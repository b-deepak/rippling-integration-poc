import type { FileSchema } from '../workflows/types';

export const employeesSchema: FileSchema = {
  fileType: 'employees',
  requiredFields: ['employee_id', 'first_name', 'last_name', 'email', 'department'],
  optionalFields: ['phone', 'hire_date', 'manager_id', 'title', 'location'],
};
