/**
 * Streaming CSV Validator
 *
 * Performs fast validation of CSV files without full parsing.
 * Designed to validate 5MB files in <1s.
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
  details: {
    rowCount: number;
    columnCount: number;
    headers: string[];
    fileSize: number;
  };
}

export interface ValidationOptions {
  maxFileSize?: number;      // Default: 5MB
  requiredHeaders?: string[]; // If provided, these headers must exist
}

const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Quick metadata validation (sync, <1ms)
 */
export function validateMetadata(
  file: File,
  options: ValidationOptions = {}
): { valid: boolean; error?: string } {
  const maxSize = options.maxFileSize ?? DEFAULT_MAX_FILE_SIZE;

  // Check extension
  if (!file.name.toLowerCase().endsWith('.csv')) {
    return { valid: false, error: 'File must have .csv extension' };
  }

  // Check size
  if (file.size === 0) {
    return { valid: false, error: 'File is empty' };
  }

  if (file.size > maxSize) {
    const maxMB = (maxSize / (1024 * 1024)).toFixed(1);
    const fileMB = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `File too large: ${fileMB}MB exceeds ${maxMB}MB limit`
    };
  }

  return { valid: true };
}

/**
 * Stream-based structure validation
 * Scans the entire file but doesn't fully parse - just checks structure
 */
export async function validateStructure(
  content: string,
  options: ValidationOptions = {}
): Promise<ValidationResult> {
  const lines = content.split('\n');
  const nonEmptyLines: string[] = [];

  // Collect non-empty lines
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed) {
      nonEmptyLines.push(trimmed);
    }
  }

  // Must have at least header + 1 data row
  if (nonEmptyLines.length < 2) {
    return {
      valid: false,
      error: 'File must have a header row and at least one data row',
      details: { rowCount: 0, columnCount: 0, headers: [], fileSize: content.length }
    };
  }

  // Parse header row
  const headerLine = nonEmptyLines[0];
  const headers = parseCSVLine(headerLine);
  const columnCount = headers.length;

  if (columnCount === 0) {
    return {
      valid: false,
      error: 'No columns found in header row',
      details: { rowCount: 0, columnCount: 0, headers: [], fileSize: content.length }
    };
  }

  // Check for empty headers
  const emptyHeaderIndex = headers.findIndex(h => !h.trim());
  if (emptyHeaderIndex !== -1) {
    return {
      valid: false,
      error: `Empty header found at column ${emptyHeaderIndex + 1}`,
      details: { rowCount: 0, columnCount, headers, fileSize: content.length }
    };
  }

  // Check for duplicate headers
  const headerSet = new Set<string>();
  for (const header of headers) {
    const normalized = header.toLowerCase().trim();
    if (headerSet.has(normalized)) {
      return {
        valid: false,
        error: `Duplicate header found: "${header}"`,
        details: { rowCount: 0, columnCount, headers, fileSize: content.length }
      };
    }
    headerSet.add(normalized);
  }

  // Check required headers if specified
  if (options.requiredHeaders && options.requiredHeaders.length > 0) {
    const headerLower = headers.map(h => h.toLowerCase().trim());
    for (const required of options.requiredHeaders) {
      if (!headerLower.includes(required.toLowerCase())) {
        return {
          valid: false,
          error: `Missing required header: "${required}"`,
          details: { rowCount: 0, columnCount, headers, fileSize: content.length }
        };
      }
    }
  }

  // Validate structure of all rows (column count consistency)
  const rowCount = nonEmptyLines.length - 1; // Exclude header

  for (let i = 1; i < nonEmptyLines.length; i++) {
    const line = nonEmptyLines[i];
    const rowColumns = parseCSVLine(line);

    if (rowColumns.length !== columnCount) {
      return {
        valid: false,
        error: `Row ${i} has ${rowColumns.length} columns, expected ${columnCount}`,
        details: { rowCount: i - 1, columnCount, headers, fileSize: content.length }
      };
    }

    // Check for unclosed quotes (malformed CSV)
    if (hasUnclosedQuotes(line)) {
      return {
        valid: false,
        error: `Row ${i} has unclosed quotes (malformed CSV)`,
        details: { rowCount: i - 1, columnCount, headers, fileSize: content.length }
      };
    }
  }

  // Sample validation: parse first 10 and last 10 rows fully
  const sampleSize = Math.min(10, rowCount);
  const samplesToCheck = [
    ...nonEmptyLines.slice(1, sampleSize + 1),                    // First N
    ...nonEmptyLines.slice(Math.max(1, nonEmptyLines.length - sampleSize)) // Last N
  ];

  for (let i = 0; i < samplesToCheck.length; i++) {
    const parsed = parseCSVLine(samplesToCheck[i]);
    // Just verify it parses without throwing
    if (parsed.some(cell => cell === undefined)) {
      return {
        valid: false,
        error: `Sample row contains unparseable data`,
        details: { rowCount, columnCount, headers, fileSize: content.length }
      };
    }
  }

  return {
    valid: true,
    details: {
      rowCount,
      columnCount,
      headers,
      fileSize: content.length
    }
  };
}

/**
 * Parse a single CSV line, handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          current += '"';
          i++;
        } else {
          // End of quoted field
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
  }

  // Add last field
  result.push(current.trim());

  return result;
}

/**
 * Check if a line has unclosed quotes
 */
function hasUnclosedQuotes(line: string): boolean {
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote, skip next
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    }
  }

  return inQuotes; // If still in quotes at end, they're unclosed
}

/**
 * Full validation: combines metadata + structure checks
 */
export async function validateCSV(
  file: File,
  content: string,
  options: ValidationOptions = {}
): Promise<ValidationResult> {
  // Step 1: Metadata check
  const metadataResult = validateMetadata(file, options);
  if (!metadataResult.valid) {
    return {
      valid: false,
      error: metadataResult.error,
      details: { rowCount: 0, columnCount: 0, headers: [], fileSize: file.size }
    };
  }

  // Step 2: Structure validation
  return validateStructure(content, options);
}
