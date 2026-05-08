-- Structured wizard answers + optional email snapshot for feedback triage.
alter table public.app_feedback
  add column if not exists answers jsonb not null default '{}'::jsonb;

alter table public.app_feedback
  add column if not exists recommend text;
