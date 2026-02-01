import type { FileSchema } from '../workflows/types';

export const timeAttendanceSchema: FileSchema = {
  fileType: 'time-attendance',
  requiredFields: ['employee_id', 'date', 'clock_in', 'clock_out'],
  optionalFields: ['break_duration', 'notes'],
};
