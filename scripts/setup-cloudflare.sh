#!/bin/bash
set -e

echo "============================================"
echo "SFTP PoC - Cloudflare Setup"
echo "============================================"
echo ""

# Check if logged in
if ! pnpm wrangler whoami &> /dev/null; then
  echo "Not logged in to Cloudflare. Running wrangler login..."
  pnpm wrangler login
fi

echo "Logged in as:"
pnpm wrangler whoami
echo ""

# Create R2 bucket
echo "Creating R2 bucket: sftp-files..."
pnpm wrangler r2 bucket create sftp-files 2>/dev/null || echo "Bucket may already exist"
echo ""

# Create D1 database
echo "Creating D1 database: sftp-status..."
DB_OUTPUT=$(pnpm wrangler d1 create sftp-status 2>&1 || true)
echo "$DB_OUTPUT"

# Extract database_id from output
DB_ID=$(echo "$DB_OUTPUT" | grep -oE 'database_id = "[^"]+"' | cut -d'"' -f2)

if [ -n "$DB_ID" ]; then
  echo ""
  echo "============================================"
  echo "D1 Database created!"
  echo "Database ID: $DB_ID"
  echo ""
  echo "UPDATE packages/worker/wrangler.toml:"
  echo "  database_id = \"$DB_ID\""
  echo "============================================"
else
  echo ""
  echo "Could not extract database_id. Check output above."
  echo "You may need to get the ID from: pnpm wrangler d1 list"
fi

echo ""
echo "Next steps:"
echo "1. Update database_id in packages/worker/wrangler.toml"
echo "2. Run: pnpm --filter worker db:migrate"
echo "3. Deploy stub-api: pnpm --filter stub-api deploy"
echo "4. Update STUB_API_URL in packages/worker/wrangler.toml"
echo "5. Deploy worker: pnpm --filter worker deploy"
echo "6. Deploy web: pnpm --filter web deploy"
