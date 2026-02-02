import type { FileSchema } from '../workflows/types';
import type { FieldDefinition } from '../validation/types';

/**
 * Field type definitions for employee records
 */
const fieldTypes: Record<string, FieldDefinition> = {
  id: { type: 'string', required: true },
  work_email: { type: 'email', required: true },
  start_date: { type: 'date', required: true },
  status: {
    type: 'enum',
    required: true,
    enumValues: ['INIT', 'HIRED', 'ACCEPTED', 'ACTIVE', 'TERMINATED', 'ON_LEAVE'],
  },
  department_id: { type: 'string', required: true },
  title: { type: 'string', required: true },
  user_id: { type: 'string', required: false },
  personal_email: { type: 'email', required: false },
  end_date: { type: 'date', required: false },
  manager_id: { type: 'string', required: false },
  legal_entity_id: { type: 'string', required: false },
  country: { type: 'string', required: false, minLength: 2, maxLength: 2 },
  employment_type_id: { type: 'string', required: false },
  gender: {
    type: 'enum',
    required: false,
    enumValues: ['MALE', 'FEMALE', 'NONBINARY', 'PREFER_NOT_TO_SAY'],
  },
  date_of_birth: { type: 'date', required: false },
  level_id: { type: 'string', required: false },
  compensation_id: { type: 'string', required: false },
  overtime_exemption: {
    type: 'enum',
    required: false,
    enumValues: ['EXEMPT', 'NON_EXEMPT'],
  },
};

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
  fieldTypes,
};
