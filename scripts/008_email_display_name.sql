-- Update profile trigger to derive display_name from email prefix
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

-- Fix existing profiles: set display_name to email prefix
UPDATE public.profiles p
SET display_name = split_part(u.email, '@', 1)
FROM auth.users u
WHERE p.id = u.id;

-- Create profiles for any auth users that don't have one yet
INSERT INTO public.profiles (id, display_name)
SELECT u.id, split_part(u.email, '@', 1)
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;
