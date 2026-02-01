/**
 * Validation Service
 * Quick and deep validation for CSV file uploads
 */

import { parseCSV } from "./csv-parser";

export interface QuickValidationResult {
  valid: boolean;
  error?: string;
}

export interface DeepValidationResult {
  valid: boolean;
  error?: string;
  rowCount: number;
}

/**
 * Quick validation for upload endpoint
 * Performs fast checks without parsing entire file
 * @param file - File object from upload
 * @returns Validation result with error message if invalid
 */
export function quickValidate(file: File): QuickValidationResult {
  // Check file exists and has content
  if (!file) {
    return { valid: false, error: "No file provided" };
  }

  if (file.size === 0) {
    return { valid: false, error: "File is empty" };
  }

  // Check filename ends with .csv
  if (!file.name.toLowerCase().endsWith(".csv")) {
    return { valid: false, error: "File must be a CSV file (.csv extension)" };
  }

  return { valid: true };
}

/**
 * Quick validation with header check
 * Requires reading file content to verify headers exist
 * @param file - File object from upload
 * @param content - File content as string
 * @returns Validation result with error message if invalid
 */
export function quickValidateWithContent(
  file: File,
  content: string
): QuickValidationResult {
  // First run basic quick validation
  const basicResult = quickValidate(file);
  if (!basicResult.valid) {
    return basicResult;
  }

  // Check first line exists (has headers)
  const firstLine = content.split(/\r?\n/)[0]?.trim();
  if (!firstLine || firstLine.length === 0) {
    return { valid: false, error: "File has no header row" };
  }

  return { valid: true };
}

/**
 * Deep validation - parses content and validates structure
 * @param content - CSV content as string
 * @returns Validation result with row count
 */
export function deepValidate(content: string): DeepValidationResult {
  if (!content || content.trim().length === 0) {
    return { valid: false, error: "Content is empty", rowCount: 0 };
  }

  const { headers, records } = parseCSV(content);

  // Check we have headers
  if (headers.length === 0) {
    return { valid: false, error: "No headers found in CSV", rowCount: 0 };
  }

  // Check we have at least 1 data row
  if (records.length === 0) {
    return {
      valid: false,
      error: "CSV must have at least one data row",
      rowCount: 0,
    };
  }

  return { valid: true, rowCount: records.length };
}
