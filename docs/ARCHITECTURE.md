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
