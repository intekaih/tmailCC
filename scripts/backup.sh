#!/bin/bash
# ============================================================
# TMail Supabase Backup Note
# ============================================================

set -e

echo "TMail uses Supabase/PostgreSQL."
echo "Use Supabase Dashboard backups, pg_dump against your Supabase connection string,"
echo "or the Supabase CLI for database exports."
echo ""
echo "Example:"
echo "  pg_dump \"postgresql://USER:PASSWORD@HOST:PORT/postgres\" > tmail_backup.sql"
echo ""
echo "This script intentionally does not run MongoDB mongodump."
