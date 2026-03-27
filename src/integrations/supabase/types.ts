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
      investment_types: {
        Row: {
          created_at: string
          daily_return: number
          duration: number
          id: string
          image_url: string | null
          name: string
          price: number
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
          name: string
          price: number
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
          name?: string
          price?: number
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
      profiles: {
        Row: {
          balance: number
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          referral_code: string
          referred_by: string | null
          total_deposited: number
          total_withdrawn: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          referral_code?: string
          referred_by?: string | null
          total_deposited?: number
          total_withdrawn?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
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
          created_at: string
          id: string
          method: string | null
          proof_url: string | null
          sender_number: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          user_id: string
          wallet_number: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          method?: string | null
          proof_url?: string | null
          sender_number?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id: string
          wallet_number?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: string | null
          proof_url?: string | null
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
      apply_referral_bonus: {
        Args: { deposit_amount: number; depositor_user_id: string }
        Returns: undefined
      }
      buy_investment: { Args: { p_type_id: string }; Returns: Json }
      distribute_daily_rewards: { Args: never; Returns: number }
      generate_referral_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      investment_status: "active" | "completed"
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
      transaction_status: ["pending", "approved", "rejected"],
      transaction_type: ["deposit", "withdrawal"],
    },
  },
} as const
