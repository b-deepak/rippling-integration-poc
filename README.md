# Rippling Integration POC

A CSV file ingestion system built on Cloudflare's edge platform. Supports multiple file types (time-attendance, expenses, payroll, employees) with dedicated workflows, schema validation, and durable execution.

## Live URLs

| Service | URL |
|---------|-----|
| Web UI | https://sftp-web.pages.dev |
| Worker API | https://sftp-worker.deepak-bhardwaj.workers.dev |

## Features

- **Multi-file type support**: 4 file types with dedicated workflows and schemas
- **Schema validation**: Uploaded CSV headers are validated against the selected file type
- **Durable workflows**: Cloudflare Workflows ensure reliable processing with automatic retries
- **Edge processing**: Files processed at Cloudflare's edge for low latency
- **Error handling**: Failed records are logged separately for download

## Supported File Types

| File Type | Required Headers |
|-----------|-----------------|
| time-attendance | employee_id, date, clock_in, clock_out |
| expenses | employee_id, date, amount, category, description |
| payroll | employee_id, pay_period, gross_pay, deductions, net_pay |
| employees | employee_id, first_name, last_name, email, department |

## Upload Limits

| Limit | Value |
|-------|-------|
| Max file size | 5 MB per file |
| Max files per upload | 10 files |
| Max total size | 50 MB combined |
| File extension | `.csv` only |

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm
- Cloudflare account

### Installation

```bash
# Install dependencies
pnpm install

# Initialize local D1 database
pnpm --filter worker db:init
```

### Development

```bash
# Run all services in parallel
pnpm dev

# Or run individually:
pnpm dev:worker    # Worker on port 8787
pnpm dev:web       # Web UI on port 3000
pnpm dev:stub-api  # Stub API on port 8788
```

### Deployment

```bash
# Set your API token
export CLOUDFLARE_API_TOKEN="your-token"

# Deploy worker
pnpm wrangler deploy

# Deploy web UI
pnpm --filter web build && pnpm wrangler pages deploy apps/web/dist --project-name=sftp-web
```

## Project Structure

```
sftp-poc/
├── apps/
│   └── web/                    # React frontend (Vite)
│       └── src/
│           ├── App.tsx
│           └── components/
│               └── FileUploader.tsx
├── packages/
│   └── worker/                 # Cloudflare Worker + Workflows
│       └── src/
│           ├── index.ts        # API routes
│           ├── schemas/        # File type schemas
│           ├── workflows/      # Durable workflows
│           │   ├── base.ts     # Abstract base class
│           │   ├── time-attendance.ts
│           │   ├── expenses.ts
│           │   ├── payroll.ts
│           │   └── employees.ts
│           └── services/
│               └── stream-validator.ts
├── test-files/                 # Sample CSV files
└── docs/
    └── ARCHITECTURE.md
```

## API Endpoints

### POST /api/upload

Upload a CSV file for processing.

```bash
curl -X POST https://sftp-worker.deepak-bhardwaj.workers.dev/api/upload \
  -F "file=@time-attendance.csv" \
  -F "partner=rippling" \
  -F "fileType=time-attendance"
```

**Response:**
```json
{
  "fileId": "uuid",
  "status": "accepted",
  "fileType": "time-attendance",
  "rowCount": 10
}
```

### GET /api/files

List processed files.

```bash
curl https://sftp-worker.deepak-bhardwaj.workers.dev/api/files
```

### GET /api/errors/:fileId/csv

Download failed records as CSV.

```bash
curl https://sftp-worker.deepak-bhardwaj.workers.dev/api/errors/{fileId}/csv
```

## Testing

Sample test files are available in `test-files/`:

```bash
# Upload time-attendance
curl -X POST http://localhost:8787/api/upload \
  -F "file=@test-files/time-attendance.csv" \
  -F "partner=rippling" \
  -F "fileType=time-attendance"
```

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed architecture documentation including sequence diagrams and data flow.

## License

MIT
