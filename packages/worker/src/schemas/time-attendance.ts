import type { FileSchema } from '../workflows/types';
import type { FieldDefinition } from '../validation/types';

/**
 * Field type definitions for time-attendance records
 */
const fieldTypes: Record<string, FieldDefinition> = {
  id: { type: 'string', required: true },
  worker_id: { type: 'string', required: true },
  start_time: { type: 'datetime', required: true },
  end_time: { type: 'datetime', required: true },
  break_minutes: { type: 'integer', required: false, min: 0 },
  job_code_id: { type: 'string', required: false },
  work_location_id: { type: 'string', required: false },
  comments: { type: 'string', required: false },
  approved: { type: 'boolean', required: false },
  approved_by: { type: 'string', required: false },
};

/**
 * Time & Attendance schema based on Rippling TimeEntry API
 * https://developer.rippling.com/documentation/rest-api/reference/time-entries
 */
export const timeAttendanceSchema: FileSchema = {
  fileType: 'time-attendance',
  requiredFields: [
    'id',                    // Unique identifier for the time entry
    'worker_id',             // The ID of the worker
    'start_time',            // Start time (ISO 8601 datetime)
    'end_time',              // End time (ISO 8601 datetime)
  ],
  optionalFields: [
    'break_minutes',         // Total break duration in minutes
    'job_code_id',           // Job code identifier
    'work_location_id',      // Work location identifier
    'comments',              // Comments or notes
    'approved',              // Whether the entry is approved
    'approved_by',           // Approver's worker ID
  ],
  fieldTypes,
};
