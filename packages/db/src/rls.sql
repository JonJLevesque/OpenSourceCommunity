-- =============================================================================
-- OpenSourceCommunity — Row-Level Security Policies
-- PostgreSQL 16 / Supabase
--
-- Pattern: every tenant-scoped table gets RLS enabled + a policy that filters
-- rows by matching tenant_id against the session-local GUC
-- `app.current_tenant_id`.  Call set_tenant_context() at the start of every
-- request / transaction to activate isolation.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helper: set_tenant_context
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', tenant_id::text, true);
END;
$$;

-- ---------------------------------------------------------------------------
-- core schema
-- ---------------------------------------------------------------------------

-- members
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON members
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- custom_roles
ALTER TABLE custom_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON custom_roles
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- tenant_modules
ALTER TABLE tenant_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON tenant_modules
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON notifications
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- webhooks
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON webhooks
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- audit_log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON audit_log
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- invitations
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON invitations
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- sso_configs
ALTER TABLE sso_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON sso_configs
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- crm_integrations
ALTER TABLE crm_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON crm_integrations
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- ---------------------------------------------------------------------------
-- forums schema
-- ---------------------------------------------------------------------------

-- forum_categories
ALTER TABLE forum_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON forum_categories
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- forum_threads
ALTER TABLE forum_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON forum_threads
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- forum_posts
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON forum_posts
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- forum_reactions
ALTER TABLE forum_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON forum_reactions
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- forum_follows
ALTER TABLE forum_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON forum_follows
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- forum_reports
ALTER TABLE forum_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON forum_reports
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- ---------------------------------------------------------------------------
-- ideas schema
-- ---------------------------------------------------------------------------

-- ideas
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON ideas
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- idea_votes
ALTER TABLE idea_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON idea_votes
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- idea_comments
ALTER TABLE idea_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON idea_comments
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- idea_status_history
ALTER TABLE idea_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON idea_status_history
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- ---------------------------------------------------------------------------
-- events schema
-- ---------------------------------------------------------------------------

-- events
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON events
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- event_rsvps
ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON event_rsvps
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- event_recordings
ALTER TABLE event_recordings ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON event_recordings
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- ---------------------------------------------------------------------------
-- courses schema
-- ---------------------------------------------------------------------------

-- courses
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON courses
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- course_lessons
ALTER TABLE course_lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON course_lessons
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- learning_paths
ALTER TABLE learning_paths ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON learning_paths
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- course_enrollments
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON course_enrollments
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- ---------------------------------------------------------------------------
-- webinars schema
-- ---------------------------------------------------------------------------

-- webinars
ALTER TABLE webinars ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON webinars
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- webinar_registrations
ALTER TABLE webinar_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON webinar_registrations
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- webinar_qa
ALTER TABLE webinar_qa ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON webinar_qa
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- webinar_polls
ALTER TABLE webinar_polls ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON webinar_polls
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- ---------------------------------------------------------------------------
-- kb (knowledge base) schema
-- ---------------------------------------------------------------------------

-- kb_categories
ALTER TABLE kb_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON kb_categories
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- kb_articles
ALTER TABLE kb_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON kb_articles
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- kb_article_versions
ALTER TABLE kb_article_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON kb_article_versions
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- kb_article_feedback
ALTER TABLE kb_article_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON kb_article_feedback
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- ---------------------------------------------------------------------------
-- social-intel schema
-- ---------------------------------------------------------------------------

-- si_keyword_groups
ALTER TABLE si_keyword_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON si_keyword_groups
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- si_mentions
ALTER TABLE si_mentions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON si_mentions
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- si_alerts
ALTER TABLE si_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON si_alerts
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- si_alert_configs
ALTER TABLE si_alert_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON si_alert_configs
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);
