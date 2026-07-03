export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          deposit_moov_number: string | null
          deposit_mtn_number: string | null
          deposit_orange_number: string | null
          id: string
          min_withdrawal: number
          support_whatsapp_link: string | null
          withdrawal_fee_percent: number
        }
        Insert: {
          deposit_moov_number?: string | null
          deposit_mtn_number?: string | null
          deposit_orange_number?: string | null
          id?: string
          min_withdrawal?: number
          support_whatsapp_link?: string | null
          withdrawal_fee_percent?: number
        }
        Update: {
          deposit_moov_number?: string | null
          deposit_mtn_number?: string | null
          deposit_orange_number?: string | null
          id?: string
          min_withdrawal?: number
          support_whatsapp_link?: string | null
          withdrawal_fee_percent?: number
        }
        Relationships: []
      }
      daily_bonuses: {
        Row: {
          amount: number
          claimed_at: string
          id: string
          user_id: string
        }
        Insert: {
          amount?: number
          claimed_at?: string
          id?: string
          user_id: string
        }
        Update: {
          amount?: number
          claimed_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      investment_types: {
        Row: {
          created_at: string
          daily_return: number
          duration: number
          id: string
          image_url: string | null
          is_frozen: boolean
          is_starter: boolean
          name: string
          price: number
          referral_base_price: number | null
          stock_limit: number | null
          tag: string | null
          total_return: number
        }
        Insert: {
          created_at?: string
          daily_return: number
          duration?: number
          id?: string
          image_url?: string | null
          is_frozen?: boolean
          is_starter?: boolean
          name: string
          price: number
          referral_base_price?: number | null
          stock_limit?: number | null
          tag?: string | null
          total_return: number
        }
        Update: {
          created_at?: string
          daily_return?: number
          duration?: number
          id?: string
          image_url?: string | null
          is_frozen?: boolean
          is_starter?: boolean
          name?: string
          price?: number
          referral_base_price?: number | null
          stock_limit?: number | null
          tag?: string | null
          total_return?: number
        }
        Relationships: []
      }
      investments: {
        Row: {
          amount_invested: number
          created_at: string
          daily_yield: number
          end_date: string
          id: string
          last_reward_date: string
          start_date: string
          status: Database["public"]["Enums"]["investment_status"]
          type_id: string
          user_id: string
        }
        Insert: {
          amount_invested: number
          created_at?: string
          daily_yield: number
          end_date?: string
          id?: string
          last_reward_date?: string
          start_date?: string
          status?: Database["public"]["Enums"]["investment_status"]
          type_id: string
          user_id: string
        }
        Update: {
          amount_invested?: number
          created_at?: string
          daily_yield?: number
          end_date?: string
          id?: string
          last_reward_date?: string
          start_date?: string
          status?: Database["public"]["Enums"]["investment_status"]
          type_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investments_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "investment_types"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_rewards: {
        Row: {
          amount: number
          created_at: string
          id: string
          mission_type: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          mission_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          mission_type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active_deposit_bonus_pct: number
          active_product_discount_pct: number
          balance: number
          country: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_frozen: boolean
          is_promoter: boolean
          preferred_withdrawal_country: string | null
          preferred_withdrawal_number: string | null
          preferred_withdrawal_operator: string | null
          referral_code: string
          referred_by: string | null
          total_deposited: number
          total_withdrawn: number
          updated_at: string
          user_id: string
        }
        Insert: {
          active_deposit_bonus_pct?: number
          active_product_discount_pct?: number
          balance?: number
          country?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_frozen?: boolean
          is_promoter?: boolean
          preferred_withdrawal_country?: string | null
          preferred_withdrawal_number?: string | null
          preferred_withdrawal_operator?: string | null
          referral_code?: string
          referred_by?: string | null
          total_deposited?: number
          total_withdrawn?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          active_deposit_bonus_pct?: number
          active_product_discount_pct?: number
          balance?: number
          country?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_frozen?: boolean
          is_promoter?: boolean
          preferred_withdrawal_country?: string | null
          preferred_withdrawal_number?: string | null
          preferred_withdrawal_operator?: string | null
          referral_code?: string
          referred_by?: string | null
          total_deposited?: number
          total_withdrawn?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_referred_by"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_code_uses: {
        Row: {
          id: string
          promo_id: string
          used_at: string
          user_id: string
        }
        Insert: {
          id?: string
          promo_id: string
          used_at?: string
          user_id: string
        }
        Update: {
          id?: string
          promo_id?: string
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_code_uses_promo_id_fkey"
            columns: ["promo_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          ends_at: string
          id: string
          max_users: number
          starts_at: string
          type: Database["public"]["Enums"]["promo_type"]
          uses_count: number
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          ends_at: string
          id?: string
          max_users?: number
          starts_at?: string
          type: Database["public"]["Enums"]["promo_type"]
          uses_count?: number
          value: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          ends_at?: string
          id?: string
          max_users?: number
          starts_at?: string
          type?: Database["public"]["Enums"]["promo_type"]
          uses_count?: number
          value?: number
        }
        Relationships: []
      }
      referral_rewards: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          level: number
          referee_id: string
          referrer_id: string
        }
        Insert: {
          amount?: number
          created_at?: string | null
          id?: string
          level: number
          referee_id: string
          referrer_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          level?: number
          referee_id?: string
          referrer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_rewards_referee_id_fkey"
            columns: ["referee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_rewards_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          created_at: string
          id: string
          message: string
          status: string
          subject: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          status?: string
          subject: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          status?: string
          subject?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          country: string | null
          created_at: string
          fee_amount: number | null
          id: string
          method: string | null
          net_amount: number | null
          payment_url: string | null
          proof_url: string | null
          reference: string | null
          sender_number: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          user_id: string
          wallet_number: string | null
        }
        Insert: {
          amount: number
          country?: string | null
          created_at?: string
          fee_amount?: number | null
          id?: string
          method?: string | null
          net_amount?: number | null
          payment_url?: string | null
          proof_url?: string | null
          reference?: string | null
          sender_number?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id: string
          wallet_number?: string | null
        }
        Update: {
          amount?: number
          country?: string | null
          created_at?: string
          fee_amount?: number | null
          id?: string
          method?: string | null
          net_amount?: number | null
          payment_url?: string | null
          proof_url?: string | null
          reference?: string | null
          sender_number?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id?: string
          wallet_number?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_adjust_balance: {
        Args: { p_new_balance: number; p_user_id: string }
        Returns: Json
      }
      admin_create_promo_code: {
        Args: {
          p_code: string
          p_ends_at: string
          p_max_users: number
          p_starts_at: string
          p_type: Database["public"]["Enums"]["promo_type"]
          p_value: number
        }
        Returns: Json
      }
      admin_grant_product: {
        Args: { p_type_id: string; p_user_id: string }
        Returns: Json
      }
      admin_toggle_freeze: { Args: { p_user_id: string }; Returns: Json }
      admin_toggle_investment_type_freeze: {
        Args: { p_id: string }
        Returns: Json
      }
      admin_toggle_promoter: { Args: { p_user_id: string }; Returns: Json }
      admin_update_investment_type: {
        Args: { p_daily_return: number; p_id: string; p_price: number }
        Returns: Json
      }
      apply_referral_bonus: {
        Args: { deposit_amount: number; depositor_user_id: string }
        Returns: undefined
      }
      apply_referral_purchase_bonus: {
        Args: { p_base_price: number; p_user_id: string }
        Returns: undefined
      }
      buy_investment: { Args: { p_type_id: string }; Returns: Json }
      claim_daily_bonus: { Args: never; Returns: Json }
      claim_mission_reward: { Args: { p_mission_type: string }; Returns: Json }
      confirm_westpay_deposit: {
        Args: { p_amount: number; p_reference: string }
        Returns: Json
      }
      distribute_daily_rewards: { Args: never; Returns: number }
      expire_stale_deposits: { Args: never; Returns: number }
      generate_referral_code: { Args: never; Returns: string }
      get_daily_bonus_status: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      redeem_promo_code: { Args: { p_code: string }; Returns: Json }
      request_withdrawal: {
        Args: {
          p_amount: number
          p_country: string
          p_method: string
          p_wallet: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      investment_status: "active" | "completed"
      promo_type: "balance" | "product_discount" | "deposit_bonus"
      transaction_status: "pending" | "approved" | "rejected"
      transaction_type: "deposit" | "withdrawal"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      investment_status: ["active", "completed"],
      promo_type: ["balance", "product_discount", "deposit_bonus"],
      transaction_status: ["pending", "approved", "rejected"],
      transaction_type: ["deposit", "withdrawal"],
    },
  },
} as const
