-- Sousbot storage buckets + RLS policies.
-- fridge-photos: private, user-scoped read/write under {user_id}/ prefix.
-- dish-images: public read (dish photos are shown to the owning user, no cross-user listing needed
--              beyond public URL fetch); writes restricted to the owning user's {user_id}/ prefix.

insert into storage.buckets (id, name, public)
values
  ('fridge-photos', 'fridge-photos', false),
  ('dish-images', 'dish-images', true)
on conflict (id) do nothing;

-- fridge-photos: fully private, only the owner can read/write objects under their own prefix.
create policy fridge_photos_select_own on storage.objects
  for select using (
    bucket_id = 'fridge-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy fridge_photos_insert_own on storage.objects
  for insert with check (
    bucket_id = 'fridge-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy fridge_photos_update_own on storage.objects
  for update using (
    bucket_id = 'fridge-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  ) with check (
    bucket_id = 'fridge-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy fridge_photos_delete_own on storage.objects
  for delete using (
    bucket_id = 'fridge-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- dish-images: public bucket, anyone (including anon) can read; only the owner (or service_role,
-- which generates these images server-side) can write under their own {user_id}/ prefix.
create policy dish_images_public_select on storage.objects
  for select using (bucket_id = 'dish-images');

create policy dish_images_insert_own on storage.objects
  for insert with check (
    bucket_id = 'dish-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy dish_images_update_own on storage.objects
  for update using (
    bucket_id = 'dish-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  ) with check (
    bucket_id = 'dish-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy dish_images_delete_own on storage.objects
  for delete using (
    bucket_id = 'dish-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
