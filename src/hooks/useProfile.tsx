import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useProfile = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id,user_id,email,full_name,balance,total_deposited,total_withdrawn,referral_code,referred_by,is_frozen,is_promoter,country,preferred_withdrawal_country,preferred_withdrawal_operator,preferred_withdrawal_number,active_deposit_bonus_pct,active_product_discount_pct,created_at,updated_at",
        )
        .eq("user_id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};
