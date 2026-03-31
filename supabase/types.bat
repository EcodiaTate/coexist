@echo off
REM Regenerate Supabase TypeScript types from linked project
SET SCRIPT_DIR=%~dp0

echo Generating types from %PROJECT_REF%...
npx supabase gen types typescript --linked > "%SCRIPT_DIR%..\src\types\database.types.ts"
echo Types written to src\types\database.types.ts
