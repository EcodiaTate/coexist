-- Fix: Add self-referencing FK for reply_to_id if missing
-- PostgREST needs this FK to resolve the hint chat_messages_reply_to_id_fkey

DO $$
BEGIN
  -- Add reply_to_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_messages' AND column_name = 'reply_to_id'
  ) THEN
    ALTER TABLE chat_messages ADD COLUMN reply_to_id uuid;
  END IF;

  -- Add the FK constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'chat_messages_reply_to_id_fkey'
      AND table_name = 'chat_messages'
  ) THEN
    ALTER TABLE chat_messages
      ADD CONSTRAINT chat_messages_reply_to_id_fkey
      FOREIGN KEY (reply_to_id) REFERENCES chat_messages(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Ensure the index exists for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_reply ON chat_messages(reply_to_id);
