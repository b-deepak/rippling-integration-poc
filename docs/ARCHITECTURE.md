# Architecture Documentation

## System Overview

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────┐
│   Web UI    │────▶│  Worker API     │────▶│ Partner API │
│  (Pages)    │     │  (Workflows)    │     │  (Future)   │
└─────────────┘     └────────┬────────┘     └─────────────┘
                             │
                    ┌────────▼────────┐
                    │   R2 Storage    │
                    └─────────────────┘
```

## Components

| Component | Technology | Purpose |
|-----------|------------|---------|
| Web UI | React + Vite + Cloudflare Pages | File upload interface |
| Worker API | Hono + Cloudflare Workers | API routes, validation, workflow orchestration |
| Workflows | Cloudflare Workflows | Durable file processing with retries |
| Storage | Cloudflare R2 | File storage (incoming, staging, processed, errors) |
| Partner API | TBD | External API per file type (to be implemented) |

---

## Data Flow Diagram

```
                                    ┌─────────────────────────────────────────┐
                                    │              R2 BUCKET                  │
                                    │  ┌─────────┐ ┌─────────┐ ┌───────────┐  │
User uploads ──▶ Worker ──▶ Validate ──▶│incoming/│─▶│staging/ │─▶│processed/ │  │
    CSV          API        + Store    └─────────┘ └────┬────┘ └───────────┘  │
                   │                                    │      ┌─────────┐    │
                   │                                    │      │ errors/ │    │
                   ▼                                    │      └─────────┘    │
            ┌──────────────┐                           │           ▲          │
            │   Workflow   │◀──────────────────────────┘           │          │
            │  (Durable)   │───────────────────────────────────────┘          │
            └──────┬───────┘                                                  │
                   │                                                          │
                   ▼                                    └─────────────────────┘
            ┌──────────────┐
            │  Partner API │
            │  (per record)│
            └──────────────┘
```

---

## Sequence Diagram: File Upload Flow

```
┌──────┐          ┌────────┐          ┌────────┐          ┌──────┐          ┌───────────┐
│ User │          │ Web UI │          │ Worker │          │  R2  │          │ Workflow  │
└──┬───┘          └───┬────┘          └───┬────┘          └──┬───┘          └─────┬─────┘
   │                  │                   │                  │                    │
   │  Select file     │                   │                  │                    │
   │  + file type     │                   │                  │                    │
   │─────────────────▶│                   │                  │                    │
   │                  │                   │                  │                    │
   │                  │ POST /api/upload  │                  │                    │
   │                  │  (multipart form) │                  │                    │
   │                  │──────────────────▶│                  │                    │
   │                  │                   │                  │                    │
   │                  │                   │ 1. Validate CSV  │                    │
   │                  │                   │    format        │                    │
   │                  │                   │                  │                    │
   │                  │                   │ 2. Validate      │                    │
   │                  │                   │    headers vs    │                    │
   │                  │                   │    schema        │                    │
   │                  │                   │                  │                    │
   │                  │                   │ 3. Store file    │                    │
   │                  │                   │─────────────────▶│ incoming/{path}    │
   │                  │                   │                  │                    │
   │                  │                   │ 4. Create workflow                    │
   │                  │                   │───────────────────────────────────────▶
   │                  │                   │                  │                    │
   │                  │  {fileId, status} │                  │                    │
   │                  │◀──────────────────│                  │                    │
   │                  │                   │                  │                    │
   │  Show success    │                   │                  │                    │
   │◀─────────────────│                   │                  │                    │
   │                  │                   │                  │                    │
```

---

## Sequence Diagram: Workflow Processing

```
┌──────────┐          ┌──────┐          ┌───────────┐
│ Workflow │          │  R2  │          │Partner API│
└────┬─────┘          └──┬───┘          └─────┬─────┘
     │                   │                    │
     │ STEP 1: Validate  │                    │
     │ GET incoming/{path}                    │
     │──────────────────▶│                    │
     │◀──────────────────│                    │
     │  (file content)   │                    │
     │                   │                    │
     │ STEP 2: Stage     │                    │
     │ PUT staging/{path}│                    │
     │──────────────────▶│                    │
     │ DELETE incoming/  │                    │
     │──────────────────▶│                    │
     │                   │                    │
     │ STEP 3: Transform │                    │
     │ (parse CSV,       │                    │
     │  calc hours for   │                    │
     │  time-attendance) │                    │
     │                   │                    │
     │ STEP 4: Process   │                    │
     │ For each record:  │                    │
     │  - Log record     │                    │
     │  - (Future: call  │                    │
     │    partner API)───────────────────────▶│
     │                   │                    │
     │ STEP 5: Finalize  │                    │
     │ PUT processed/    │                    │
     │──────────────────▶│                    │
     │ DELETE staging/   │                    │
     │──────────────────▶│                    │
     │ PUT errors/ (if any)                   │
     │──────────────────▶│                    │
     │                   │                    │
```

> **Note:** Currently, Step 4 logs records. Override `processStep()` in each workflow to call actual partner APIs.

---

## R2 Storage Structure

```
{bucket}/
├── incoming/
│   └── {partner}/{fileType}/{yyyy-mm-dd}/{filename}_{timestamp}.csv
├── staging/
│   └── {partner}/{fileType}/{yyyy-mm-dd}/{filename}_{timestamp}.csv
├── processed/
│   └── {partner}/{fileType}/{yyyy-mm-dd}/{filename}_{timestamp}.csv
└── errors/
    └── {partner}/{fileType}/{yyyy-mm-dd}/{filename}_{timestamp}_errors.json
```

**Example:**
```
sftp-files/
├── incoming/rippling/time-attendance/2024-01-15/attendance_1705329600000.csv
├── staging/rippling/expenses/2024-01-15/expense_1705329700000.csv
├── processed/rippling/payroll/2024-01-15/payroll_1705329800000.csv
└── errors/rippling/employees/2024-01-15/employees_1705329900000_errors.json
```

---

## Workflow Architecture (OOP Inheritance)

```
                    ┌─────────────────────────┐
                    │   BaseFileWorkflow      │
                    │   (Abstract Class)      │
                    ├─────────────────────────┤
                    │ + run()                 │  Template Method
                    │ # validateStep()        │  ─ Virtual
                    │ # stageStep()           │  ─ Virtual
                    │ # transformStep()       │  ─ Virtual
                    │ # processStep()         │  ─ Virtual
                    │ # finalizeStep()        │  ─ Virtual
                    │ # getSchema()           │  ─ Abstract
                    │ # getApiEndpoint()      │  ─ Abstract
                    └───────────┬─────────────┘
                                │
        ┌───────────────┬───────┴───────┬───────────────┐
        ▼               ▼               ▼               ▼
┌───────────────┐┌───────────────┐┌───────────────┐┌───────────────┐
│TimeAttendance ││   Expenses    ││    Payroll    ││   Employees   │
│   Workflow    ││   Workflow    ││   Workflow    ││   Workflow    │
├───────────────┤├───────────────┤├───────────────┤├───────────────┤
│ getSchema()   ││ getSchema()   ││ getSchema()   ││ getSchema()   │
│ getEndpoint() ││ getEndpoint() ││ getEndpoint() ││ getEndpoint() │
│ transformStep*││               ││               ││               │
└───────────────┘└───────────────┘└───────────────┘└───────────────┘
        │
        └── * Overrides to calculate hours_worked
```

---

## Status Flow

```
┌──────────┐     ┌────────────┐     ┌─────────┐     ┌────────────┐     ┌───────────┐
│ accepted │────▶│ validating │────▶│ staging │────▶│ processing │────▶│ completed │
└──────────┘     └────────────┘     └─────────┘     └────────────┘     └─────┬─────┘
                                                                              │
                                                          (if ALL fail) ┌────▼────┐
                                                                        │ failed  │
                                                                        └─────────┘
```

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Invalid CSV format | 400 error on upload |
| Schema mismatch | 400 error on upload |
| Single record API failure | Record logged to errors/, processing continues |
| API 4xx error | Not retried (client error) |
| API 5xx error | Retried with exponential backoff (5s, 15s, 30s, 60s) |
| All records fail | Final status = `failed` |
| Partial failure | Final status = `completed`, errors downloadable |

---

## Retry Configuration

```javascript
{
  retries: { limit: 5, delay: '5 seconds', backoff: 'exponential' },
  timeout: '5 minutes'
}
```

Delays: 0s → 5s → 15s → 30s → 60s (max)

---

## Security Considerations

- Files validated before storage (format, size, headers)
- Partner name sanitized in paths
- No authentication in POC (add in production)
- CORS enabled for cross-origin requests

---

## Tech Stack

### Detailed Component Breakdown

| Component | Technology | Version/Notes | Purpose |
|-----------|------------|---------------|---------|
| **Frontend** | | | |
| UI Framework | React | 19.x | Component-based UI |
| Build Tool | Vite | 6.x | Fast dev server & bundling |
| Language | TypeScript | 5.x | Type safety |
| Hosting | Cloudflare Pages | - | Edge deployment, CDN |
| **Backend** | | | |
| Runtime | Cloudflare Workers | - | Edge compute, V8 isolates |
| Framework | Hono | 4.x | Lightweight web framework |
| Durable Execution | Cloudflare Workflows | - | Retry logic, state persistence |
| Language | TypeScript | 5.x | Type safety |
| **Storage** | | | |
| Object Storage | Cloudflare R2 | - | S3-compatible, no egress fees |
| Metadata | R2 customMetadata | - | Key-value pairs on objects |
| **Infrastructure** | | | |
| Package Manager | pnpm | 9.x | Monorepo workspace support |
| Deployment | Wrangler CLI | 4.x | Cloudflare deployment tool |
| Monorepo | pnpm workspaces | - | Multi-package management |

### File Schemas (Mapped to Rippling APIs)

| File Type | Rippling Domain | API Endpoint | Required Fields |
|-----------|-----------------|--------------|-----------------|
| time-attendance | Time & Attendance | `POST /time_entries` | id, worker_id, start_time, end_time |
| expenses | Spend Management | `POST /expenses` | id, worker_id, amount, currency, expense_date, category, description |
| payroll | Compensation | `POST /compensations` | id, worker_id, payment_type, annual_compensation, currency |
| employees | Workforce | `POST /workers` | id, work_email, start_date, status, department_id, title |

### Rippling API Reference

| File Type | Rippling API Docs | Domain Model |
|-----------|-------------------|--------------|
| **time-attendance** | [TimeEntry API](https://developer.rippling.com/docs/rippling-api/1cda7ca54d58e-create-a-time-entry) | TimeEntry - clock in/out records with optional break tracking |
| **expenses** | [Spend Management](https://developer.rippling.com/docs/rippling-api/spend-management) | Expense - employee expense submissions with receipts |
| **payroll** | [Compensation API](https://developer.rippling.com/docs/rippling-api/d13ad7b5c56af-get-a-compensation) | Compensation - salary/hourly wage and bonus information |
| **employees** | [Worker API](https://developer.rippling.com/docs/rippling-api/dda97f8f9322b-get-a-worker) | Worker - employee profile, department, employment details |

### Schema Field Mapping

**time-attendance → TimeEntry**
```
CSV Field        → Rippling API Field
─────────────────────────────────────
id               → externalId (custom identifier)
worker_id        → workerId (Rippling worker UUID)
start_time       → startTime (ISO 8601 datetime)
end_time         → endTime (ISO 8601 datetime)
break_minutes    → breakDuration (in minutes)
job_code_id      → jobCodeId (optional)
comments         → notes (optional)
```

**expenses → Expense**
```
CSV Field        → Rippling API Field
─────────────────────────────────────
id               → externalId
worker_id        → workerId
amount           → amount (decimal)
currency         → currency (ISO 4217: USD, EUR)
expense_date     → expenseDate (YYYY-MM-DD)
category         → category (travel, meals, supplies, etc.)
description      → description
merchant         → merchantName (optional)
receipt_url      → receiptUrl (optional)
```

**payroll → Compensation**
```
CSV Field              → Rippling API Field
───────────────────────────────────────────
id                     → externalId
worker_id              → workerId
payment_type           → paymentType (SALARY, HOURLY)
annual_compensation    → annualCompensation (decimal)
currency               → currency (ISO 4217)
hourly_wage            → hourlyWage (if HOURLY)
target_annual_bonus    → targetAnnualBonus (optional)
salary_effective_date  → effectiveDate (YYYY-MM-DD)
```

**employees → Worker**
```
CSV Field        → Rippling API Field
─────────────────────────────────────
id               → externalId
work_email       → workEmail (required, unique)
start_date       → startDate (YYYY-MM-DD)
status           → status (ACTIVE, TERMINATED, ON_LEAVE)
department_id    → departmentId (Rippling dept UUID)
title            → jobTitle
manager_id       → managerId (optional)
employment_type  → employmentType (FULL_TIME, PART_TIME, CONTRACTOR)
```

---

## API over R2 Pattern

### What Is It?

This POC uses R2 as both **file storage** and **metadata store**, eliminating the need for a traditional database. This is a **custom-built pattern** designed for simplicity in the POC.

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                       R2 Object                             │
├─────────────────────────────────────────────────────────────┤
│  Body (file content):                                       │
│    - Original CSV data                                      │
│                                                             │
│  customMetadata (key-value):                                │
│    - fileId: "abc123"                                       │
│    - partner: "rippling"                                    │
│    - fileType: "payroll"                                    │
│    - totalRecords: "8"                                      │
│    - processedRecords: "8"                                  │
│    - failedRecords: "0"                                     │
│    - completedAt: "2024-01-15T10:30:00Z"                    │
└─────────────────────────────────────────────────────────────┘
```

### Implementation Details

**Writing metadata (workflow finalize step):**
```typescript
// Store file with processing results as metadata
await env.BUCKET.put(processedKey, content, {
  customMetadata: {
    fileId: params.fileId,
    partner: params.partner,
    fileType: params.fileType,
    totalRecords: String(records.length),
    processedRecords: String(result.processed.length),
    failedRecords: String(result.failed.length),
    completedAt: new Date().toISOString(),
  },
});
```

**Reading metadata (API endpoint):**
```typescript
// List files and extract metadata
const objects = await env.BUCKET.list({ prefix: 'processed/' });
const files = objects.objects.map(obj => ({
  key: obj.key,
  size: obj.size,
  uploaded: obj.uploaded.toISOString(),
  ...obj.customMetadata,  // Spread metadata as properties
}));
```

### Why This Approach?

| Benefit | Explanation |
|---------|-------------|
| **Zero Dependencies** | No database setup, provisioning, or connection management |
| **Atomic Storage** | File and metadata stored together, always in sync |
| **Simplified Deployment** | Only R2 binding needed |
| **Cost Efficient** | R2 has no egress fees, metadata storage is free |
| **Quick POC** | Fastest path to working prototype |

---

## POC Limitations

### Current Constraints

| Limitation | Impact | Workaround in POC |
|------------|--------|-------------------|
| **No Query Capability** | Cannot filter/search files by metadata | List all and filter client-side |
| **No Transactions** | Cannot atomically update multiple objects | Single object operations only |
| **Metadata Size** | R2 limits customMetadata to 2KB total | Only store essential fields |
| **No Indexes** | Linear scan for listing files | Acceptable for small file counts |
| **No Pagination** | R2 list returns max 1000 objects | Fine for POC scale |
| **No Authentication** | Anyone can upload/view files | Add auth in production |
| **No Rate Limiting** | Potential for abuse | Use Cloudflare Rate Limiting |
| **Hardcoded Partner** | "rippling" is hardcoded | Make configurable |

### What's Not Implemented

- User authentication/authorization
- File access audit logging
- Real-time status updates (polling only)
- File deletion from UI
- Multi-tenant isolation
- API rate limiting
- Production error monitoring

---

## Production Enhancements

### Recommended Architecture Changes

```
                 Current (POC)                    Production
                 ─────────────                    ──────────
File Metadata:   R2 customMetadata     →     D1/Postgres Database
File Listing:    R2 list + filter      →     Database query with indexes
Authentication:  None                  →     Cloudflare Access / JWT
Status Updates:  Manual refresh        →     WebSocket / SSE
Audit Log:       None                  →     Append-only audit table
Multi-tenant:    Hardcoded partner     →     Organization-based routing
```

### Database Schema (Recommended)

```sql
-- D1 or external Postgres
CREATE TABLE files (
  id TEXT PRIMARY KEY,
  partner TEXT NOT NULL,
  file_type TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  status TEXT DEFAULT 'accepted',
  total_records INTEGER,
  processed_records INTEGER,
  failed_records INTEGER,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  created_by TEXT,  -- User ID
  INDEX idx_partner_type (partner, file_type),
  INDEX idx_status (status),
  INDEX idx_uploaded (uploaded_at DESC)
);

CREATE TABLE audit_log (
  id TEXT PRIMARY KEY,
  file_id TEXT REFERENCES files(id),
  action TEXT NOT NULL,  -- 'upload', 'process', 'complete', 'error'
  details JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT
);
```

### Authentication Options

| Option | Use Case | Complexity |
|--------|----------|------------|
| Cloudflare Access | Internal tools, SSO | Low |
| JWT + Worker validation | API-first, programmatic access | Medium |
| OAuth 2.0 | Third-party integrations | High |

### Scaling Considerations

| Aspect | POC Approach | Production Recommendation |
|--------|--------------|---------------------------|
| **File Size** | 5MB limit | Use multipart upload for larger files |
| **Concurrency** | Single workflow per file | Shard large files, parallel processing |
| **Throughput** | ~100 files/day | Add queue (Cloudflare Queues) for bursts |
| **Monitoring** | Console logs | Cloudflare Analytics + external APM |
| **Alerting** | None | Alert on failed workflows, error spikes |

### Real Partner API Integration

Replace the logging in `processStep()` with actual API calls:

```typescript
protected async processStep(
  step: WorkflowStep,
  records: Record[],
  params: WorkflowParams
): Promise<ProcessResult> {
  return step.do('process', { timeout: '25 minutes' }, async () => {
    const processed: Record[] = [];
    const failed: { record: Record; error: string }[] = [];

    for (const record of records) {
      try {
        // Real API call with retry
        const response = await fetchWithRetry(
          `${env.PARTNER_API_URL}${this.getApiEndpoint()}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${env.PARTNER_API_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(record),
          },
          { maxRetries: 3, baseDelay: 1000 }
        );
        processed.push(record);
      } catch (error) {
        failed.push({ record, error: error.message });
      }
    }

    return { processed, failed };
  });
}
```

---

## Future Roadmap

1. **Phase 1: Security** - Add authentication, rate limiting, audit logging
2. **Phase 2: Database** - Migrate metadata to D1 for querying
3. **Phase 3: Real-time** - WebSocket status updates, progress bars
4. **Phase 4: Scale** - Queue-based processing, parallel workflows
5. **Phase 5: Integration** - Connect to real Rippling APIs with OAuth
