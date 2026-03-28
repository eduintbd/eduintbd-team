-- Drop the existing unique constraint on user_id
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_key;

-- Add a composite unique constraint to allow multiple roles per user
-- but prevent duplicate role assignments
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);