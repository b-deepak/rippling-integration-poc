import type { FieldDefinition, FieldValidationError, BatchValidationResult } from './types';

// Validation patterns
const PATTERNS = {
  integer: /^-?\d+$/,
  decimal: /^-?\d+(\.\d+)?$/,
  date: /^\d{4}-\d{2}-\d{2}$/,
  datetime: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  currency: /^[A-Z]{3}$/,
  boolean: /^(true|false|yes|no|1|0)$/i,
  url: /^https?:\/\/.+/i,
};

/**
 * Validate a single field value against its type definition
 */
export function validateFieldType(
  field: string,
  value: string,
  definition: FieldDefinition
): FieldValidationError | null {
  const { type, required, enumValues, min, max, minLength, maxLength } = definition;

  // Check required
  if (required && (!value || value.trim() === '')) {
    return {
      field,
      value,
      expectedType: type,
      message: `Required field "${field}" is empty`,
    };
  }

  // Skip validation for empty optional fields
  if (!value || value.trim() === '') {
    return null;
  }

  const trimmedValue = value.trim();

  // Type-specific validation
  switch (type) {
    case 'string':
      if (minLength !== undefined && trimmedValue.length < minLength) {
        return {
          field,
          value,
          expectedType: type,
          message: `Field "${field}" must be at least ${minLength} characters, got ${trimmedValue.length}`,
        };
      }
      if (maxLength !== undefined && trimmedValue.length > maxLength) {
        return {
          field,
          value,
          expectedType: type,
          message: `Field "${field}" must be at most ${maxLength} characters, got ${trimmedValue.length}`,
        };
      }
      break;

    case 'integer':
      if (!PATTERNS.integer.test(trimmedValue)) {
        return {
          field,
          value,
          expectedType: type,
          message: `Field "${field}" must be an integer, got "${value}"`,
        };
      }
      const intVal = parseInt(trimmedValue, 10);
      if (min !== undefined && intVal < min) {
        return {
          field,
          value,
          expectedType: type,
          message: `Field "${field}" must be at least ${min}, got ${intVal}`,
        };
      }
      if (max !== undefined && intVal > max) {
        return {
          field,
          value,
          expectedType: type,
          message: `Field "${field}" must be at most ${max}, got ${intVal}`,
        };
      }
      break;

    case 'decimal':
      if (!PATTERNS.decimal.test(trimmedValue)) {
        return {
          field,
          value,
          expectedType: type,
          message: `Field "${field}" must be a decimal number, got "${value}"`,
        };
      }
      const decVal = parseFloat(trimmedValue);
      if (min !== undefined && decVal < min) {
        return {
          field,
          value,
          expectedType: type,
          message: `Field "${field}" must be at least ${min}, got ${decVal}`,
        };
      }
      if (max !== undefined && decVal > max) {
        return {
          field,
          value,
          expectedType: type,
          message: `Field "${field}" must be at most ${max}, got ${decVal}`,
        };
      }
      break;

    case 'date':
      if (!PATTERNS.date.test(trimmedValue)) {
        return {
          field,
          value,
          expectedType: type,
          message: `Field "${field}" must be a date in YYYY-MM-DD format, got "${value}"`,
        };
      }
      // Validate it's a real date
      const dateObj = new Date(trimmedValue);
      if (isNaN(dateObj.getTime())) {
        return {
          field,
          value,
          expectedType: type,
          message: `Field "${field}" is not a valid date, got "${value}"`,
        };
      }
      break;

    case 'datetime':
      if (!PATTERNS.datetime.test(trimmedValue)) {
        return {
          field,
          value,
          expectedType: type,
          message: `Field "${field}" must be ISO 8601 datetime, got "${value}"`,
        };
      }
      const dtObj = new Date(trimmedValue);
      if (isNaN(dtObj.getTime())) {
        return {
          field,
          value,
          expectedType: type,
          message: `Field "${field}" is not a valid datetime, got "${value}"`,
        };
      }
      break;

    case 'email':
      if (!PATTERNS.email.test(trimmedValue)) {
        return {
          field,
          value,
          expectedType: type,
          message: `Field "${field}" must be a valid email address, got "${value}"`,
        };
      }
      break;

    case 'currency':
      if (!PATTERNS.currency.test(trimmedValue)) {
        return {
          field,
          value,
          expectedType: type,
          message: `Field "${field}" must be a 3-letter currency code (ISO 4217), got "${value}"`,
        };
      }
      break;

    case 'enum':
      if (!enumValues || enumValues.length === 0) {
        return {
          field,
          value,
          expectedType: type,
          message: `Field "${field}" has enum type but no enumValues defined`,
        };
      }
      if (!enumValues.includes(trimmedValue)) {
        return {
          field,
          value,
          expectedType: type,
          message: `Field "${field}" must be one of [${enumValues.join(', ')}], got "${value}"`,
        };
      }
      break;

    case 'boolean':
      if (!PATTERNS.boolean.test(trimmedValue)) {
        return {
          field,
          value,
          expectedType: type,
          message: `Field "${field}" must be a boolean (true/false/yes/no/1/0), got "${value}"`,
        };
      }
      break;

    case 'url':
      if (!PATTERNS.url.test(trimmedValue)) {
        return {
          field,
          value,
          expectedType: type,
          message: `Field "${field}" must be a valid HTTP(S) URL, got "${value}"`,
        };
      }
      break;
  }

  return null;
}

/**
 * Validate all fields in a record against field definitions
 */
export function validateRecord(
  record: Record<string, string>,
  fieldTypes: Record<string, FieldDefinition>
): FieldValidationError[] {
  const errors: FieldValidationError[] = [];

  for (const [field, definition] of Object.entries(fieldTypes)) {
    const value = record[field] ?? '';
    const error = validateFieldType(field, value, definition);
    if (error) {
      errors.push(error);
    }
  }

  return errors;
}

/**
 * Validate a batch of records, separating valid from invalid
 */
export function validateBatch(
  records: Record<string, string>[],
  fieldTypes: Record<string, FieldDefinition>
): BatchValidationResult {
  const validRecords: Record<string, string>[] = [];
  const invalidRecords: { record: Record<string, string>; errors: FieldValidationError[] }[] = [];

  for (const record of records) {
    const errors = validateRecord(record, fieldTypes);
    if (errors.length > 0) {
      invalidRecords.push({ record, errors });
    } else {
      validRecords.push(record);
    }
  }

  return { validRecords, invalidRecords };
}
