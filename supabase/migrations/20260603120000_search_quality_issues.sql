-- Search quality issue queue.
--
-- Collects signals from zero-result searches, low-confidence results, missing metadata,
-- and user feedback. Provides a human-reviewed work queue for improving search quality.
--
-- AI may SUGGEST fixes (suggested_fix field). Humans approve via admin UI before applying.
-- Never auto-publish AI suggestions.

CREATE TABLE IF NOT EXISTS public.search_quality_issues (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     timestamptz NOT NULL DEFAULT now(),
  resolved_at    timestamptz,
  issue_type     text NOT NULL CHECK (issue_type IN (
    'zero_result_query',
    'low_confidence_result',
    'missing_business_type',
    'missing_item_tags',
    'missing_coordinates',
    'low_data_quality',
    'bad_result_report',
    'duplicate_candidate'
  )),
  severity       text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  status         text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'wont_fix')),
  business_id    uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  raw_query      text,
  normalized_query text,
  impression_id  uuid REFERENCES public.search_impressions(id) ON DELETE SET NULL,
  occurrence_count integer NOT NULL DEFAULT 1,
  last_seen_at   timestamptz NOT NULL DEFAULT now(),
  details        jsonb NOT NULL DEFAULT '{}',
  suggested_fix  text,
  operator_notes text
);

CREATE INDEX IF NOT EXISTS search_quality_issues_status_idx
  ON public.search_quality_issues (status, severity, created_at DESC);
CREATE INDEX IF NOT EXISTS search_quality_issues_issue_type_idx
  ON public.search_quality_issues (issue_type, status);
CREATE INDEX IF NOT EXISTS search_quality_issues_business_id_idx
  ON public.search_quality_issues (business_id)
  WHERE business_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS search_quality_issues_query_idx
  ON public.search_quality_issues (normalized_query)
  WHERE normalized_query IS NOT NULL;

ALTER TABLE public.search_quality_issues ENABLE ROW LEVEL SECURITY;

-- Upsert a zero-result query issue: increment count or create new.
CREATE OR REPLACE FUNCTION public.upsert_zero_result_issue(
  p_raw_query        text,
  p_normalized_query text,
  p_impression_id    uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  -- Try to update an existing open issue for this query
  UPDATE public.search_quality_issues
  SET
    occurrence_count = occurrence_count + 1,
    last_seen_at     = now(),
    impression_id    = COALESCE(p_impression_id, impression_id)
  WHERE
    issue_type       = 'zero_result_query'
    AND status       = 'open'
    AND normalized_query = p_normalized_query
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    INSERT INTO public.search_quality_issues
      (issue_type, severity, raw_query, normalized_query, impression_id, details)
    VALUES
      ('zero_result_query', 'high', p_raw_query, p_normalized_query, p_impression_id,
       jsonb_build_object('first_seen', now()))
    RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END;
$$;

-- View: open issues by priority for the admin queue.
CREATE OR REPLACE VIEW public.v_search_quality_issues_open AS
SELECT
  i.id,
  i.issue_type,
  i.severity,
  i.status,
  i.raw_query,
  i.normalized_query,
  i.occurrence_count,
  i.last_seen_at,
  i.suggested_fix,
  b.title AS business_title,
  b.slug  AS business_slug
FROM public.search_quality_issues i
LEFT JOIN public.businesses b ON b.id = i.business_id
WHERE i.status = 'open'
ORDER BY
  CASE i.severity WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
  i.occurrence_count DESC,
  i.last_seen_at DESC;
