-- Wedding Shared Album cleanup
-- Run this in the Supabase SQL Editor to wipe all guest/photo data.
-- Storage files must be deleted separately (use: npm run db:clean).

delete from public.photo_likes;
delete from public.photos;
delete from public.guests;
