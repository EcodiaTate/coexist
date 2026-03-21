-- ============================================================
-- Migration 026: Make collective_id nullable for channel-only messages
-- Staff channels at state/national level have no collective_id.
-- Polls and announcements can be created in any chat context.
-- ============================================================

-- chat_messages: allow null collective_id (channel-only messages)
alter table chat_messages alter column collective_id drop not null;

-- chat_polls: allow null collective_id
alter table chat_polls alter column collective_id drop not null;

-- chat_announcements: allow null collective_id
alter table chat_announcements alter column collective_id drop not null;

-- Ensure a message belongs to at least one context
-- (either a collective, a channel, or both)
alter table chat_messages drop constraint if exists chat_messages_has_context;
alter table chat_messages add constraint chat_messages_has_context
  check (collective_id is not null or channel_id is not null);
