#!/usr/bin/env bash
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Error: DATABASE_URL must be set (example: export DATABASE_URL=\"postgres://user:pass@host:5432/db\")"
  exit 2
fi

echo "Running pre-migration checks (review output for issues)..."
psql "$DATABASE_URL" -f supabase/migrations/pre_migration_checks.sql

echo
read -p "Proceed to apply migrations to DB at $DATABASE_URL? Type 'yes' to continue: " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Aborting. No changes applied."
  exit 0
fi

MIGRATIONS=(
  "supabase/migrations/20260918_add_notifications_and_atomic_approval.sql"
  "supabase/migrations/20260919_update_district_admin_mapping_role.sql"
  "supabase/migrations/20260920_admin_hierarchy_and_districts.sql"
  "supabase/migrations/20260920_rls_policies.sql"
)

for f in "${MIGRATIONS[@]}"; do
  echo "\nApplying: $f"
  psql "$DATABASE_URL" -f "$f"
  echo "Applied: $f"
done

echo "All migrations applied successfully."
