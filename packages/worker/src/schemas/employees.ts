import type { FileSchema } from '../workflows/types';

/**
 * Employees schema based on Rippling Worker API
 * https://developer.rippling.com/documentation/rest-api/reference/workers
 */
export const employeesSchema: FileSchema = {
  fileType: 'employees',
  requiredFields: [
    'id',                    // Unique identifier
    'work_email',            // Work email address
    'start_date',            // Employment start date (YYYY-MM-DD)
    'status',                // INIT, HIRED, ACCEPTED, ACTIVE, TERMINATED
    'department_id',         // Department identifier
    'title',                 // Job title
  ],
  optionalFields: [
    'user_id',               // Associated user ID
    'personal_email',        // Personal email address
    'end_date',              // Employment end date
    'manager_id',            // Manager's worker ID
    'legal_entity_id',       // Legal entity ID
    'country',               // Country code (ISO 3166-1 alpha-2)
    'employment_type_id',    // Employment type ID
    'gender',                // MALE, FEMALE, NONBINARY, etc.
    'date_of_birth',         // Date of birth (YYYY-MM-DD)
    'level_id',              // Level ID
    'compensation_id',       // Compensation package ID
    'overtime_exemption',    // EXEMPT or NON_EXEMPT
  ],
};
