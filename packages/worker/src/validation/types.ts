/**
 * Supported field types for validation
 */
export type FieldType =
  | 'string'
  | 'integer'
  | 'decimal'
  | 'date'
  | 'datetime'
  | 'email'
  | 'currency'
  | 'enum'
  | 'boolean'
  | 'url';

/**
 * Definition of a field's type and constraints
 */
export interface FieldDefinition {
  type: FieldType;
  required: boolean;
  enumValues?: string[]; // For enum type
  min?: number; // For numeric types
  max?: number; // For numeric types
  minLength?: number; // For string type
  maxLength?: number; // For string type
}

/**
 * Error information for a single field validation failure
 */
export interface FieldValidationError {
  field: string;
  value: string;
  expectedType: FieldType;
  message: string;
}

/**
 * Result of validating a batch of records
 */
export interface BatchValidationResult {
  validRecords: Record<string, string>[];
  invalidRecords: { record: Record<string, string>; errors: FieldValidationError[] }[];
}
