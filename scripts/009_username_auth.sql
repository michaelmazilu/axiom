-- Migration: Switch to username-based auth
-- Usernames are stored in display_name, emails are auto-generated as username@axiom.local

-- 1. Fix duplicates: append a suffix to duplicate display_names, keeping the oldest one untouched
WITH dupes AS (
  SELECT id, display_name,
    ROW_NUMBER() OVER (PARTITION BY display_name ORDER BY created_at ASC) AS rn
  FROM public.profiles
)
UPDATE public.profiles p
SET display_name = dupes.display_name || '_' || dupes.rn
FROM dupes
WHERE p.id = dupes.id AND dupes.rn > 1;

-- 2. Add unique constraint on display_name
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_display_name_unique UNIQUE (display_name);

-- 3. Update trigger to use display_name from metadata (the username)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      split_part(new.email, '@', 1)
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;
