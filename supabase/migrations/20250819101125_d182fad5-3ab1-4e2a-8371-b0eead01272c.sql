-- Add company and location columns to profiles if they don't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location text;

-- Update the handle_new_user function to include new fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, role, company, location)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'user'),
    NEW.raw_user_meta_data ->> 'company',
    NEW.raw_user_meta_data ->> 'location'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    display_name = COALESCE(NEW.raw_user_meta_data ->> 'display_name', profiles.display_name),
    role = COALESCE(NEW.raw_user_meta_data ->> 'role', profiles.role),
    company = COALESCE(NEW.raw_user_meta_data ->> 'company', profiles.company),
    location = COALESCE(NEW.raw_user_meta_data ->> 'location', profiles.location),
    updated_at = now();
  
  RETURN NEW;
END;
$$;

-- Create function to check if user has specific role (works with text role column)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Enable realtime for profiles table
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- Add profiles to realtime publication
DO $$
BEGIN
    -- Try to add the table to the publication
    BEGIN
        ALTER publication supabase_realtime ADD TABLE public.profiles;
    EXCEPTION
        WHEN duplicate_object THEN
            -- Table is already in the publication, do nothing
            NULL;
    END;
END $$;