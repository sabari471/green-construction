-- Fix the role column type issue by handling the default properly
ALTER TABLE public.profiles 
ALTER COLUMN role DROP DEFAULT;

-- Create user roles enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'buyer', 'seller');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update the column type with explicit casting
ALTER TABLE public.profiles 
ALTER COLUMN role TYPE public.app_role USING 
  CASE 
    WHEN role = 'buyer' THEN 'buyer'::public.app_role
    WHEN role = 'seller' THEN 'seller'::public.app_role
    WHEN role = 'admin' THEN 'admin'::public.app_role
    ELSE 'user'::public.app_role
  END;

-- Set the new default
ALTER TABLE public.profiles 
ALTER COLUMN role SET DEFAULT 'user'::public.app_role;

-- Create user_roles table for more granular role management
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL DEFAULT 'user'::public.app_role,
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