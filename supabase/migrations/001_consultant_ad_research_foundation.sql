create extension if not exists pgcrypto;

create table if not exists workflow_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  workflow_name text not null,
  status text not null default 'pending',
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  error text
);

create table if not exists raw_source_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  workflow_run_id uuid references workflow_runs(id),
  source text not null,
  request jsonb not null default '{}'::jsonb,
  response jsonb not null default '{}'::jsonb,
  status text not null default 'stored'
);

create table if not exists source_documents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  workflow_run_id uuid references workflow_runs(id),
  source text not null,
  source_type text,
  url text,
  title text,
  domain text,
  author text,
  published_at timestamptz,
  extracted_text text,
  summary text,
  raw_payload jsonb not null default '{}'::jsonb
);

create table if not exists pain_points (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  workflow_run_id uuid references workflow_runs(id),
  source_document_id uuid references source_documents(id),
  audience text,
  pain_point text not null,
  audience_language text,
  objection text,
  emotional_trigger text,
  evidence_quote text,
  confidence text not null default 'medium',
  notes text
);

create table if not exists ad_angles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  workflow_run_id uuid references workflow_runs(id),
  pain_point_id uuid references pain_points(id),
  audience text,
  angle text not null,
  hook text,
  body_direction text,
  proof_point text,
  risk_note text,
  status text not null default 'planned'
);

create table if not exists ad_variants (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  workflow_run_id uuid references workflow_runs(id),
  ad_angle_id uuid references ad_angles(id),
  hook text,
  body_copy text,
  visual_direction text,
  landing_page_url text,
  status text not null default 'planned',
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists human_review_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  workflow_run_id uuid references workflow_runs(id),
  item_type text not null,
  title text,
  body text,
  source_evidence jsonb not null default '[]'::jsonb,
  recommendation text,
  status text not null default 'pending_review',
  reviewed_at timestamptz,
  reviewer_notes text
);

create index if not exists idx_workflow_runs_created_at on workflow_runs(created_at);
create index if not exists idx_workflow_runs_status on workflow_runs(status);

create index if not exists idx_raw_source_events_workflow_run_id on raw_source_events(workflow_run_id);
create index if not exists idx_raw_source_events_created_at on raw_source_events(created_at);
create index if not exists idx_raw_source_events_status on raw_source_events(status);
create index if not exists idx_raw_source_events_source on raw_source_events(source);

create index if not exists idx_source_documents_workflow_run_id on source_documents(workflow_run_id);
create index if not exists idx_source_documents_created_at on source_documents(created_at);
create index if not exists idx_source_documents_source on source_documents(source);
create index if not exists idx_source_documents_domain on source_documents(domain);
create index if not exists idx_source_documents_published_at on source_documents(published_at);

create index if not exists idx_pain_points_workflow_run_id on pain_points(workflow_run_id);
create index if not exists idx_pain_points_source_document_id on pain_points(source_document_id);
create index if not exists idx_pain_points_created_at on pain_points(created_at);
create index if not exists idx_pain_points_confidence on pain_points(confidence);
create index if not exists idx_pain_points_audience on pain_points(audience);

create index if not exists idx_ad_angles_workflow_run_id on ad_angles(workflow_run_id);
create index if not exists idx_ad_angles_pain_point_id on ad_angles(pain_point_id);
create index if not exists idx_ad_angles_created_at on ad_angles(created_at);
create index if not exists idx_ad_angles_status on ad_angles(status);
create index if not exists idx_ad_angles_audience on ad_angles(audience);

create index if not exists idx_ad_variants_workflow_run_id on ad_variants(workflow_run_id);
create index if not exists idx_ad_variants_ad_angle_id on ad_variants(ad_angle_id);
create index if not exists idx_ad_variants_created_at on ad_variants(created_at);
create index if not exists idx_ad_variants_status on ad_variants(status);

create index if not exists idx_human_review_items_workflow_run_id on human_review_items(workflow_run_id);
create index if not exists idx_human_review_items_created_at on human_review_items(created_at);
create index if not exists idx_human_review_items_status on human_review_items(status);
create index if not exists idx_human_review_items_item_type on human_review_items(item_type);
