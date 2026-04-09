-- Coverage Awareness RPCs

CREATE OR REPLACE FUNCTION public.get_discovery_stats()
RETURNS TABLE (
  parent_category_name TEXT,
  total_passes BIGINT,
  completed_passes BIGINT,
  total_found BIGINT,
  total_unique BIGINT,
  yield_ratio NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (payload_json->>'parent_category_name')::TEXT as parent_category_name,
    COUNT(*) as total_passes,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_passes,
    SUM(results_count)::BIGINT as total_found,
    SUM(new_businesses_count)::BIGINT as total_unique,
    ROUND(
      CASE 
        WHEN SUM(results_count) > 0 THEN (SUM(new_businesses_count)::NUMERIC / SUM(results_count)::NUMERIC)
        ELSE 0 
      END, 3
    ) as yield_ratio
  FROM public.search_jobs
  WHERE job_type = 'discovery'
  GROUP BY 1
  ORDER BY total_unique DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_discovery_stats() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_discovery_stats() TO authenticated;
