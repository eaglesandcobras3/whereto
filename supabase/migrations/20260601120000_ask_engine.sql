-- Ask Engine: conversations, artifact sessions, shares, feedback, human review, analytics, security.
-- All writes via service-role API / workflows — no public INSERT policies.

-- Prerequisite: normally created in 20260426120000_date_updated_triggers.sql
CREATE OR REPLACE FUNCTION public.set_date_updated_to_now()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.date_updated = now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- ask_conversations
-- ---------------------------------------------------------------------------
CREATE TABLE public.ask_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL DEFAULT 'web'
    CONSTRAINT ask_conversations_channel_check
      CHECK (channel = ANY (ARRAY['web'::text, 'sms'::text, 'mobile'::text])),
  session_key text NOT NULL,
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  date_created timestamptz NOT NULL DEFAULT now(),
  date_updated timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ask_conversations_session_key_idx ON public.ask_conversations (session_key);
CREATE INDEX ask_conversations_user_id_idx ON public.ask_conversations (user_id) WHERE user_id IS NOT NULL;

ALTER TABLE public.ask_conversations ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- ask_messages
-- ---------------------------------------------------------------------------
CREATE TABLE public.ask_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.ask_conversations (id) ON DELETE CASCADE,
  role text NOT NULL
    CONSTRAINT ask_messages_role_check
      CHECK (role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text, 'tool'::text])),
  content text NOT NULL DEFAULT '',
  tool_calls jsonb,
  metadata jsonb,
  date_created timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ask_messages_conversation_id_idx ON public.ask_messages (conversation_id, date_created);

ALTER TABLE public.ask_messages ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- ask_artifact_sessions (stateful search workspace)
-- ---------------------------------------------------------------------------
CREATE TABLE public.ask_artifact_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.ask_conversations (id) ON DELETE CASCADE,
  artifact_type text NOT NULL,
  artifact_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  search_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  active_filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  refinement_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  date_created timestamptz NOT NULL DEFAULT now(),
  date_updated timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ask_artifact_sessions_conversation_id_idx
  ON public.ask_artifact_sessions (conversation_id, date_updated DESC);

ALTER TABLE public.ask_artifact_sessions ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- artifact_shares (public recommendation sets — not chat transcripts)
-- ---------------------------------------------------------------------------
CREATE TABLE public.artifact_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  artifact_session_id uuid REFERENCES public.ask_artifact_sessions (id) ON DELETE SET NULL,
  title text NOT NULL,
  summary_text text NOT NULL DEFAULT '',
  artifact_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  access_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  date_created timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX artifact_shares_slug_idx ON public.artifact_shares (slug);

ALTER TABLE public.artifact_shares ENABLE ROW LEVEL SECURITY;

-- Public read of non-expired shares (anon can SELECT for share pages)
CREATE POLICY artifact_shares_public_read ON public.artifact_shares
  FOR SELECT
  TO anon, authenticated
  USING (expires_at IS NULL OR expires_at > now());

-- ---------------------------------------------------------------------------
-- ai_feedback (structured listing corrections from ask)
-- ---------------------------------------------------------------------------
CREATE TABLE public.ai_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'pending'
    CONSTRAINT ai_feedback_status_check
      CHECK (status = ANY (ARRAY['pending'::text, 'reviewing'::text, 'resolved'::text, 'dismissed'::text])),
  business_id uuid REFERENCES public.businesses (id) ON DELETE SET NULL,
  listing_context text,
  submitter_name text NOT NULL,
  submitter_email text NOT NULL,
  message text NOT NULL,
  conversation_id uuid REFERENCES public.ask_conversations (id) ON DELETE SET NULL,
  source_ip text,
  user_agent text,
  date_created timestamptz NOT NULL DEFAULT now(),
  date_updated timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ai_feedback_status_date_idx ON public.ai_feedback (status, date_created DESC);

ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- human_review_tasks
-- ---------------------------------------------------------------------------
CREATE TABLE public.human_review_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'open'
    CONSTRAINT human_review_tasks_status_check
      CHECK (status = ANY (ARRAY['open'::text, 'in_progress'::text, 'resolved'::text, 'cancelled'::text])),
  reason text NOT NULL,
  user_message text,
  conversation_id uuid REFERENCES public.ask_conversations (id) ON DELETE SET NULL,
  artifact_session_id uuid REFERENCES public.ask_artifact_sessions (id) ON DELETE SET NULL,
  confidence_score real,
  submitter_contact text,
  admin_note text,
  date_created timestamptz NOT NULL DEFAULT now(),
  date_updated timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX human_review_tasks_status_date_idx ON public.human_review_tasks (status, date_created DESC);

ALTER TABLE public.human_review_tasks ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- conversation_events (analytics)
-- ---------------------------------------------------------------------------
CREATE TABLE public.conversation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.ask_conversations (id) ON DELETE SET NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  date_created timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX conversation_events_conversation_id_idx ON public.conversation_events (conversation_id, date_created DESC);

ALTER TABLE public.conversation_events ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- security_events (abuse monitoring)
-- ---------------------------------------------------------------------------
CREATE TABLE public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  ip_key text,
  path text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  date_created timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX security_events_type_date_idx ON public.security_events (event_type, date_created DESC);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- date_updated triggers
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS ask_conversations_touch_date_updated ON public.ask_conversations;
CREATE TRIGGER ask_conversations_touch_date_updated
  BEFORE UPDATE ON public.ask_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_date_updated_to_now();

DROP TRIGGER IF EXISTS ask_artifact_sessions_touch_date_updated ON public.ask_artifact_sessions;
CREATE TRIGGER ask_artifact_sessions_touch_date_updated
  BEFORE UPDATE ON public.ask_artifact_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_date_updated_to_now();

DROP TRIGGER IF EXISTS ai_feedback_touch_date_updated ON public.ai_feedback;
CREATE TRIGGER ai_feedback_touch_date_updated
  BEFORE UPDATE ON public.ai_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.set_date_updated_to_now();

DROP TRIGGER IF EXISTS human_review_tasks_touch_date_updated ON public.human_review_tasks;
CREATE TRIGGER human_review_tasks_touch_date_updated
  BEFORE UPDATE ON public.human_review_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_date_updated_to_now();

-- ---------------------------------------------------------------------------
-- Guides FTS for searchGuides tool
-- ---------------------------------------------------------------------------
ALTER TABLE public.guides
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A')
    || setweight(to_tsvector('english', coalesce(excerpt, '')), 'B')
    || setweight(to_tsvector('english', coalesce(summary, '')), 'B')
    || setweight(to_tsvector('english', coalesce(search_keywords, '')), 'C')
  ) STORED;

CREATE INDEX IF NOT EXISTS guides_search_vector_idx ON public.guides USING gin (search_vector);
