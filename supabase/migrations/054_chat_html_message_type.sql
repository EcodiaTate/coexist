-- Migration 054: Add 'html' to chat_messages message_type check constraint.
-- Allows sending rich HTML content inline in chat.

ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_message_type_check;

ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_message_type_check
  CHECK (message_type IN ('text', 'image', 'voice', 'video', 'poll', 'announcement', 'system', 'html'));
