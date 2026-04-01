-- ──────────────────────────────────────────────────────────────────────────────
-- Migration 0001: Full-text search GIN indexes
--
-- Adds GIN indexes on tsvector expressions for the four main searchable tables.
-- CONCURRENTLY avoids locking tables in production; remove if running in a
-- transaction-based migration runner.
--
-- Note: body is JSONB (Tiptap format). body::text stringifies the JSON which
-- includes Tiptap structural keys but also all the actual text content.
-- This is acceptable for MVP search; a future migration can add a generated
-- search_text column with clean text extraction.
-- ──────────────────────────────────────────────────────────────────────────────

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forum_threads_fts
  ON forum_threads
  USING GIN (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body::text, '')));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ideas_fts
  ON ideas
  USING GIN (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body::text, '')));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_fts
  ON events
  USING GIN (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body::text, '')));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kb_articles_fts
  ON kb_articles
  USING GIN (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body::text, '')));

-- webhook_deliveries table from migration 0001 (added between 0000 and this file)
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMP,
  response_status INTEGER,
  response_body TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
