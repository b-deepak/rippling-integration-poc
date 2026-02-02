import type { CSVRecord } from './types';

// Retry configuration for workflow steps
export const RETRY_CONFIG = {
  retries: { limit: 5, delay: '5 seconds', backoff: 'exponential' },
  timeout: '5 minutes',
} as const;

/**
 * Parse CSV content into an array of records
 */
export function parseCSV(content: string): CSVRecord[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const records: CSVRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = line.split(',').map(v => v.trim());
    const record: CSVRecord = {};
    for (let j = 0; j < headers.length; j++) {
      record[headers[j]] = values[j] || '';
    }
    records.push(record);
  }
  return records;
}

/**
 * Fetch with exponential backoff retry
 * Delays: 0s, 5s, 15s, 30s, 60s (max 1 min)
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 5
): Promise<Response> {
  const delays = [0, 5000, 15000, 30000, 60000];
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (attempt > 0) {
      await new Promise(r => setTimeout(r, delays[Math.min(attempt, delays.length - 1)]));
    }
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      // Don't retry 4xx errors (client errors)
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`HTTP ${response.status}`);
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }
  throw lastError || new Error('Max retries exceeded');
}

/**
 * Calculate hours worked from clock_in and clock_out times
 * Expects time format: HH:MM or HH:MM:SS
 */
export function calculateHours(clockIn: string, clockOut: string): number {
  const parseTime = (time: string): number => {
    const parts = time.split(':').map(Number);
    const hours = parts[0] || 0;
    const minutes = parts[1] || 0;
    const seconds = parts[2] || 0;
    return hours + minutes / 60 + seconds / 3600;
  };

  try {
    const inTime = parseTime(clockIn);
    const outTime = parseTime(clockOut);

    // Handle overnight shifts
    let hours = outTime - inTime;
    if (hours < 0) hours += 24;

    return Math.round(hours * 100) / 100;
  } catch {
    return 0;
  }
}

/**
 * Validate a record against a schema
 */
export function validateRecord(
  record: CSVRecord,
  requiredFields: string[]
): { valid: boolean; missing: string[] } {
  const missing = requiredFields.filter(
    field => !record[field] || record[field].trim() === ''
  );
  return { valid: missing.length === 0, missing };
}
