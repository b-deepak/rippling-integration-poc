/**
 * End-to-end test script for the SFTP file processing system
 *
 * Usage: npx tsx scripts/test-e2e.ts
 *
 * Prerequisites:
 *   1. Start the stub API: pnpm --filter stub-api dev
 *   2. Start the worker: pnpm --filter worker dev
 */

const WORKER_URL = process.env.WORKER_URL || 'http://localhost:8787';
const TEST_PARTNER = 'test-partner';

interface FileStatus {
  id: string;
  partner: string;
  filename: string;
  original_filename: string;
  status: string;
  total_records: number;
  processed_records: number;
  failed_records: number;
  error_summary: string | null;
  created_at: string;
  updated_at: string;
}

// Generate a sample CSV with dummy data
function generateSampleCSV(rowCount: number): string {
  const headers = ['id', 'name', 'email', 'department', 'status'];
  const rows = [headers.join(',')];

  for (let i = 1; i <= rowCount; i++) {
    const row = [
      `EMP${String(i).padStart(4, '0')}`,
      `Employee ${i}`,
      `employee${i}@example.com`,
      ['Engineering', 'Sales', 'Marketing', 'HR'][i % 4],
      ['active', 'inactive'][i % 2],
    ];
    rows.push(row.join(','));
  }

  return rows.join('\n');
}

// Upload a file to the worker
async function uploadFile(csvContent: string, filename: string): Promise<string> {
  const formData = new FormData();
  const blob = new Blob([csvContent], { type: 'text/csv' });
  formData.append('file', blob, filename);
  formData.append('partner', TEST_PARTNER);

  const response = await fetch(`${WORKER_URL}/api/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Upload failed: ${error}`);
  }

  const result = await response.json() as { fileId: string; status: string };
  console.log(`✓ Uploaded ${filename} - fileId: ${result.fileId}`);
  return result.fileId;
}

// Poll status until complete or timeout
async function waitForCompletion(
  fileId: string,
  timeoutMs: number = 60000,
  pollIntervalMs: number = 2000
): Promise<FileStatus> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const response = await fetch(`${WORKER_URL}/api/status/${fileId}`);

    if (!response.ok) {
      throw new Error(`Status check failed: ${await response.text()}`);
    }

    const status = await response.json() as FileStatus;
    console.log(`  Status: ${status.status} | Processed: ${status.processed_records}/${status.total_records} | Failed: ${status.failed_records}`);

    if (status.status === 'completed' || status.status === 'failed') {
      return status;
    }

    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error('Timeout waiting for file processing');
}

// Check if errors were recorded
async function checkErrors(fileId: string): Promise<unknown[] | null> {
  const response = await fetch(`${WORKER_URL}/api/errors/${fileId}`);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Error check failed: ${await response.text()}`);
  }

  return await response.json() as unknown[];
}

// Main test function
async function runTests() {
  console.log('='.repeat(60));
  console.log('SFTP PoC - End-to-End Test');
  console.log('='.repeat(60));
  console.log(`Worker URL: ${WORKER_URL}`);
  console.log(`Partner: ${TEST_PARTNER}`);
  console.log('');

  try {
    // Test 1: Upload and process a small file
    console.log('Test 1: Small file (10 records)');
    console.log('-'.repeat(40));

    const smallCSV = generateSampleCSV(10);
    const smallFileId = await uploadFile(smallCSV, 'small-test.csv');
    const smallResult = await waitForCompletion(smallFileId);

    console.log(`✓ Final status: ${smallResult.status}`);
    console.log(`  Total: ${smallResult.total_records}, Processed: ${smallResult.processed_records}, Failed: ${smallResult.failed_records}`);

    if (smallResult.failed_records > 0) {
      const errors = await checkErrors(smallFileId);
      console.log(`  Errors recorded: ${errors ? errors.length : 0}`);
    }
    console.log('');

    // Test 2: Check status list API
    console.log('Test 2: Status list API');
    console.log('-'.repeat(40));

    const listResponse = await fetch(`${WORKER_URL}/api/status?partner=${TEST_PARTNER}`);
    const listResult = await listResponse.json() as { files: FileStatus[]; count: number };
    console.log(`✓ Found ${listResult.count} files for partner ${TEST_PARTNER}`);
    console.log('');

    // Summary
    console.log('='.repeat(60));
    console.log('All tests completed!');
    console.log('='.repeat(60));

    // Exit with error code if any failures
    if (smallResult.status === 'failed' && smallResult.processed_records === 0) {
      console.log('WARNING: All records failed - check stub API is running');
      process.exit(1);
    }

  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

// Run tests
runTests();
