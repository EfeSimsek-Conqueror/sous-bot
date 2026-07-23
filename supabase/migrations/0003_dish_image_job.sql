-- Adds fal.ai queue job tracking columns to `recipes` so generate-dish-image / dish-image-status
-- can submit a queue job, return immediately, and later poll+complete idempotently without
-- reconstructing fal's per-request URLs (which must be used verbatim, per AI.md).

alter table public.recipes
  add column if not exists image_request_id  text,
  add column if not exists image_status_url  text,
  add column if not exists image_response_url text;
