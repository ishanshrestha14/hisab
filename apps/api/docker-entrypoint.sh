#!/bin/sh
set -e

echo "Running database migrations…"
npx prisma migrate deploy --schema=/app/prisma/schema.prisma

echo "Starting API…"
exec node /app/dist/index.js
