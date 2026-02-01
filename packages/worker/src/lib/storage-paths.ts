/**
 * R2 Storage path constants and utilities
 */

export const PATHS = {
  INCOMING: 'incoming',
  STAGING: 'staging',
  PROCESSED: 'processed',
  ERRORS: 'errors',
  FAILED: 'failed',
} as const;

/**
 * Generate a storage path for a file
 * Returns: {partner}/{yyyy}/{mm}/{dd}/{filename}_{timestamp}
 */
export function generatePath(partner: string, filename: string): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const timestamp = Date.now();

  return `${partner}/${yyyy}/${mm}/${dd}/${filename}_${timestamp}`;
}

/**
 * Get the error report path for a given file path
 * Takes: "partner/2024/01/15/file_123.csv"
 * Returns: "partner/2024/01/15/file_123_errors.json"
 */
export function getErrorPath(originalPath: string): string {
  const lastDotIndex = originalPath.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return `${originalPath}_errors.json`;
  }
  return `${originalPath.substring(0, lastDotIndex)}_errors.json`;
}
