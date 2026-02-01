export { timeAttendanceSchema } from './time-attendance';
export { expensesSchema } from './expenses';
export { payrollSchema } from './payroll';
export { employeesSchema } from './employees';

import type { FileSchema, FileType } from '../workflows/types';
import { timeAttendanceSchema } from './time-attendance';
import { expensesSchema } from './expenses';
import { payrollSchema } from './payroll';
import { employeesSchema } from './employees';

export const schemas: Record<FileType, FileSchema> = {
  'time-attendance': timeAttendanceSchema,
  'expenses': expensesSchema,
  'payroll': payrollSchema,
  'employees': employeesSchema,
};

export function getSchema(fileType: FileType): FileSchema {
  return schemas[fileType];
}
