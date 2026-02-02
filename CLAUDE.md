# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CSV file ingestion system built on Cloudflare's edge platform. Partners upload CSV files via a React UI, which triggers durable Workflows for validation, transformation, and API submission.

## Commands

```bash
# Development (run all services)
pnpm dev                    # All services in parallel
pnpm dev:worker             # Worker only (port 8787)
pnpm dev:web                # React UI only (port 3000)
pnpm dev:stub-api           # Stub partner API (port 8788)

# Before first run - initialize D1 database
pnpm --filter worker db:init

# Build & Deploy
pnpm build                  # Build all
pnpm deploy                 # Deploy to Cloudflare

# Testing
pnpm test                   # Run unit tests
pnpm --filter worker test:e2e  # Run E2E test (requires dev servers running)

# Type checking
pnpm typecheck              # Check all packages
```

## Architecture

```
User Upload → Worker (validation) → R2 /incoming/ → Workflow → Partner API
                                                         ↓
                                    R2 /processed/  ←  R2 /staging/
                                    R2 /errors/ (failed records)
```

### Packages

- **apps/web** - React frontend (Vite, Cloudflare Pages)
- **packages/worker** - Cloudflare Worker + Workflows (Hono)
- **packages/stub-api** - Mock partner API for testing (Hono)

### Workflow Steps (Durable Execution)

1. **validate** - Check file has data rows, validate headers match schema
2. **stage** - Move from `incoming/` to `staging/`
3. **transform** - Parse CSV, validate field types, apply transformations
4. **process** - Call partner API per record with retry (3x exponential backoff)
5. **finalize** - Move to `processed/`, write errors to `errors/`, update final status

### Field Type Validation

Records are validated against schema-defined field types in the transform step. Invalid records are marked as failed but don't stop the batch.

| Type | Pattern | Example |
|------|---------|---------|
| `string` | Any non-empty | `"hello"` |
| `integer` | `/^-?\d+$/` | `"42"`, `"-5"` |
| `decimal` | `/^-?\d+(\.\d+)?$/` | `"123.45"` |
| `date` | `YYYY-MM-DD` | `"2024-01-15"` |
| `datetime` | ISO 8601 | `"2024-01-15T09:00:00Z"` |
| `email` | RFC 5322 simplified | `"user@example.com"` |
| `currency` | ISO 4217 (3 letters) | `"USD"`, `"EUR"` |
| `enum` | From predefined list | `"SALARY"`, `"HOURLY"` |
| `boolean` | true/false, yes/no, 1/0 | `"true"` |
| `url` | HTTP(S) URL | `"https://example.com"` |

Field definitions in `packages/worker/src/schemas/*.ts` support constraints: `required`, `min`, `max`, `minLength`, `maxLength`, `enumValues`.

### R2 Storage Hierarchy

```
bucket/
├── incoming/{partner}/{yyyy}/{mm}/{dd}/{file}_{ts}.csv
├── staging/{partner}/{yyyy}/{mm}/{dd}/{file}_{ts}.csv
├── processed/{partner}/{yyyy}/{mm}/{dd}/{file}_{ts}.csv
└── errors/{partner}/{yyyy}/{mm}/{dd}/{file}_{ts}_errors.json
```

### Key Files

- `packages/worker/src/index.ts` - API routes (upload, status, errors)
- `packages/worker/src/workflows/base.ts` - Base workflow class with validation integration
- `packages/worker/src/workflows/time-attendance.ts` - Time attendance workflow (calculates hours)
- `packages/worker/src/schemas/*.ts` - Schema definitions with field types
- `packages/worker/src/validation/` - Field type validation module
- `packages/worker/src/services/stream-validator.ts` - Fast CSV upload validation
- `packages/worker/wrangler.toml` - Cloudflare bindings (R2, Workflows)

### Status Flow

`accepted` → `validating` → `staging` → `processing` → `completed` | `failed`

### Upload Validation (Fail-Fast)

Files are validated on upload before acceptance (<3s for 5MB files):

| Check | Behavior |
|-------|----------|
| File extension | Must be `.csv` |
| File size | Max 5MB per file |
| Headers | Must exist, no empty/duplicate headers |
| Structure | All rows must have same column count |
| Data rows | At least 1 data row required |
| Quotes | No unclosed quotes (malformed CSV) |

On validation failure, returns 400 with specific error message.

### Error Handling

- Individual record failures don't fail the batch
- Failed records written to `errors/{path}_errors.json`
- API calls retry 3x with exponential backoff (1s, 2s, 4s)
- 4xx errors are not retried (client error)
- If ALL records fail, status becomes `failed`

## Bindings (wrangler.toml)

| Binding | Type | Purpose |
|---------|------|---------|
| BUCKET | R2Bucket | File storage |
| DB | D1Database | Status tracking |
| FILE_WORKFLOW | Workflow | Durable execution |
| STUB_API_URL | string | Partner API endpoint |

## Deployment

### First-time Setup

```bash
# 1. Login to Cloudflare
pnpm wrangler login

# 2. Create R2 bucket and D1 database
pnpm setup

# 3. Copy the database_id from output, update packages/worker/wrangler.toml

# 4. Run migrations on remote D1
pnpm db:migrate
```

### Deploy Services

```bash
# 1. Deploy stub API (or your real partner API)
pnpm deploy:stub-api
# Note the URL: https://sftp-stub-api.<subdomain>.workers.dev

# 2. Update STUB_API_URL in packages/worker/wrangler.toml with the URL above

# 3. Deploy worker
pnpm deploy:worker
# Note the URL: https://sftp-worker.<subdomain>.workers.dev

# 4. Create apps/web/.env.production with:
#    VITE_API_URL=https://sftp-worker.<subdomain>.workers.dev

# 5. Deploy web UI
pnpm deploy:web
```

### Environment Variables

| Package | Variable | Description |
|---------|----------|-------------|
| worker | STUB_API_URL | Partner API endpoint (in wrangler.toml) |
| web | VITE_API_URL | Worker URL for API calls (in .env.production) |
