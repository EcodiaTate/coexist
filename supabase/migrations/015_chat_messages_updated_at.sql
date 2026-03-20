-- Add updated_at to chat_messages so we can detect edits
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Auto-set updated_at on any update
CREATE OR REPLACE FUNCTION set_chat_message_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_chat_messages_updated_at ON chat_messages;
CREATE TRIGGER trg_chat_messages_updated_at
  BEFORE UPDATE ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION set_chat_message_updated_at();

NOTIFY pgrst, 'reload schema';
