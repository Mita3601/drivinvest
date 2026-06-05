
-- 1) Drop MD5 password storage
DROP FUNCTION IF EXISTS public.set_password_md5(text);
ALTER TABLE public.profiles DROP COLUMN IF EXISTS password_md5;

-- 2) Restrict profile self-updates to non-sensitive columns via column-level grants
REVOKE UPDATE ON public.profiles FROM authenticated, anon, PUBLIC;
GRANT UPDATE (full_name, email, country) ON public.profiles TO authenticated;
-- admins keep ALL via service_role/admin policies; ensure admin still works
GRANT UPDATE ON public.profiles TO service_role;

-- 3) user_roles: block all writes from non-admins explicitly
DROP POLICY IF EXISTS "Only admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can delete roles" ON public.user_roles;
CREATE POLICY "Only admins can insert roles" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Only admins can update roles" ON public.user_roles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Only admins can delete roles" ON public.user_roles
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 4) daily_bonuses: only authenticated can insert their own row
DROP POLICY IF EXISTS "Users insert own bonuses" ON public.daily_bonuses;
CREATE POLICY "Users insert own bonuses" ON public.daily_bonuses
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 5) Revoke EXECUTE on internal SECURITY DEFINER helpers from anon/public
REVOKE EXECUTE ON FUNCTION public.apply_referral_bonus(uuid, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_referral_purchase_bonus(uuid, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.distribute_daily_rewards() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_profile_sensitive_fields() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_referral_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;

-- User-callable RPCs: restrict to authenticated only (not anon)
REVOKE EXECUTE ON FUNCTION public.buy_investment(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.request_withdrawal(numeric, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.claim_mission_reward(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.redeem_promo_code(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_toggle_promoter(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_toggle_freeze(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_grant_product(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_adjust_balance(uuid, numeric) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_investment_type(uuid, numeric, numeric) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_create_promo_code(text, promo_type, numeric, timestamptz, timestamptz, integer) FROM PUBLIC, anon;
