/**
 * CSV Parser Service
 * Simple CSV parsing for PoC - handles basic comma-separated values
 */

export interface ParsedCSV {
  headers: string[];
  records: Record<string, string>[];
}

/**
 * Parse CSV content into headers and records
 * @param content - Raw CSV string content
 * @returns Parsed headers and array of record objects
 */
export function parseCSV(content: string): ParsedCSV {
  // Handle both \r\n (Windows) and \n (Unix) line endings
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return { headers: [], records: [] };
  }

  // First row is headers
  const headers = lines[0].split(",").map((header) => header.trim());

  // Map remaining rows to objects
  const records: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((value) => value.trim());
    const record: Record<string, string> = {};

    headers.forEach((header, index) => {
      record[header] = values[index] ?? "";
    });

    records.push(record);
  }

  return { headers, records };
}
