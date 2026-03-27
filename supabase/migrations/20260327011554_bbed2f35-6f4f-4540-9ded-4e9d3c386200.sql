
-- Add sender_number to transactions
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS sender_number text;

-- Create user roles system (secure, not on profiles)
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Admin can read all user_roles
CREATE POLICY "Admins can read all roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Users can read their own roles
CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Admin-only RLS policies for admin operations
-- Allow admins to read all profiles
CREATE POLICY "Admins can read all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to update all profiles (for balance adjustments)
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to read all transactions
CREATE POLICY "Admins can read all transactions" ON public.transactions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to update transactions (approve/reject)
CREATE POLICY "Admins can update transactions" ON public.transactions
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to read all investments
CREATE POLICY "Admins can read all investments" ON public.investments
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to update investments (cancel)
CREATE POLICY "Admins can update investments" ON public.investments
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete investments (force cancel)
CREATE POLICY "Admins can delete investments" ON public.investments
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to read all support tickets
CREATE POLICY "Admins can read all tickets" ON public.support_tickets
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to update support tickets
CREATE POLICY "Admins can update tickets" ON public.support_tickets
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Update investment_types: change duration default to 180
ALTER TABLE public.investment_types ALTER COLUMN duration SET DEFAULT 180;

-- Delete existing investment types and insert SVIP tiers
DELETE FROM public.investment_types;

INSERT INTO public.investment_types (name, price, daily_return, total_return, duration, tag) VALUES
  ('SVIP1', 3000, 500, 90000, 180, 'DÉBUTANT'),
  ('SVIP2', 6000, 1000, 180000, 180, 'STARTER'),
  ('SVIP3', 12000, 2100, 378000, 180, 'POPULAIRE'),
  ('SVIP4', 25000, 4400, 828000, 180, 'TENDANCE'),
  ('SVIP5', 50000, 10000, 1800000, 180, 'PREMIUM'),
  ('SVIP6', 100000, 21000, 3780000, 180, 'ÉLITE'),
  ('SVIP7', 200000, 45000, 8100000, 180, 'EXCLUSIF'),
  ('SVIP8', 350000, 85000, 15300000, 180, 'VIP'),
  ('SVIP9', 510000, 150000, 27000000, 180, 'ULTRA VIP'),
  ('SVIP10', 950000, 280000, 50400000, 180, 'LÉGENDE');
