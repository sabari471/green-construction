-- Create user roles enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'buyer', 'seller');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update profiles table to use the enum and ensure proper structure
ALTER TABLE public.profiles 
ALTER COLUMN role TYPE public.app_role USING role::public.app_role,
ALTER COLUMN role SET DEFAULT 'user';

-- Create user_roles table for more granular role management
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create function to check if user has role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  ) OR EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Create function to get user profile with role
CREATE OR REPLACE FUNCTION public.get_user_profile(_user_id uuid)
RETURNS TABLE(
    id uuid,
    user_id uuid,
    display_name text,
    bio text,
    avatar_url text,
    company text,
    location text,
    website text,
    role public.app_role,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT p.id, p.user_id, p.display_name, p.bio, p.avatar_url, p.company, p.location, p.website, p.role, p.created_at, p.updated_at
  FROM public.profiles p
  WHERE p.user_id = _user_id;
$$;

-- Update the handle_new_user function to properly set user role
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
    COALESCE((NEW.raw_user_meta_data ->> 'role')::public.app_role, 'user'),
    NEW.raw_user_meta_data ->> 'company',
    NEW.raw_user_meta_data ->> 'location'
  );
  
  -- Also insert into user_roles for consistency
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data ->> 'role')::public.app_role, 'user')
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" 
ON public.user_roles 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for profiles and user_roles
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.user_roles REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER publication supabase_realtime ADD TABLE public.profiles;
ALTER publication supabase_realtime ADD TABLE public.user_roles;