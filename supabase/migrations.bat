@echo off
REM Push all migrations to Supabase (includes new migrations)

echo Pushing database migrations...
npx supabase db push --include-all
echo Done.
