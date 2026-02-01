/**
 * R2 bucket utilities for file operations
 */

import { PATHS, getErrorPath } from './storage-paths';

/**
 * Move a file from one prefix to another within the bucket
 * - Get object from {fromPrefix}/{path}
 * - Put to {toPrefix}/{path}
 * - Delete from {fromPrefix}/{path}
 */
export async function moveFile(
  bucket: R2Bucket,
  fromPrefix: string,
  toPrefix: string,
  path: string
): Promise<void> {
  const sourcePath = `${fromPrefix}/${path}`;
  const destPath = `${toPrefix}/${path}`;

  // Get the object from source
  const object = await bucket.get(sourcePath);
  if (!object) {
    throw new Error(`Object not found: ${sourcePath}`);
  }

  // Put to destination
  await bucket.put(destPath, object.body, {
    httpMetadata: object.httpMetadata,
    customMetadata: object.customMetadata,
  });

  // Delete from source
  await bucket.delete(sourcePath);
}

/**
 * Write an error report to the errors prefix
 * Writes JSON array to errors/{path}_errors.json
 */
export async function writeErrorReport(
  bucket: R2Bucket,
  path: string,
  errors: unknown[]
): Promise<void> {
  const errorPath = `${PATHS.ERRORS}/${getErrorPath(path)}`;
  const content = JSON.stringify(errors, null, 2);

  await bucket.put(errorPath, content, {
    httpMetadata: {
      contentType: 'application/json',
    },
  });
}
