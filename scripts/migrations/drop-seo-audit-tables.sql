-- Optional cleanup if seo_audit_runs was ever applied. Safe if the table never existed.
-- The SEO site audit feature has been removed in favor of IRSE.

drop table if exists public.seo_audit_issues;
drop table if exists public.seo_audit_runs;
