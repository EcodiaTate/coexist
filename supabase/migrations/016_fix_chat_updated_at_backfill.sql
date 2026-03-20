-- Backfill: set updated_at = created_at for all existing messages
-- so they don't falsely show as "edited"
UPDATE chat_messages SET updated_at = created_at WHERE updated_at != created_at;
