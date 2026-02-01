import type { FileSchema } from '../workflows/types';

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
};
