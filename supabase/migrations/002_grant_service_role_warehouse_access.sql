grant usage on schema public to service_role;

grant select, insert, update, delete on table public.workflow_runs to service_role;
grant select, insert, update, delete on table public.raw_source_events to service_role;
grant select, insert, update, delete on table public.source_documents to service_role;
grant select, insert, update, delete on table public.pain_points to service_role;
grant select, insert, update, delete on table public.ad_angles to service_role;
grant select, insert, update, delete on table public.ad_variants to service_role;
grant select, insert, update, delete on table public.human_review_items to service_role;
