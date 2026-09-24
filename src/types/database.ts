export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  graphql_public: {
    Tables: Record<never, never>
    Views: Record<never, never>
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
  public: {
    Tables: {
      chatgpt_oauth_clients: {
        Row: {
          client_id: string
          client_name: string | null
          created_at: string
          grant_types: string[]
          id: string
          redirect_uris: string[]
          response_types: string[]
          token_endpoint_auth_method: string
        }
        Insert: {
          client_id: string
          client_name?: string | null
          created_at?: string
          grant_types?: string[]
          id?: string
          redirect_uris: string[]
          response_types?: string[]
          token_endpoint_auth_method?: string
        }
        Update: {
          client_id?: string
          client_name?: string | null
          created_at?: string
          grant_types?: string[]
          id?: string
          redirect_uris?: string[]
          response_types?: string[]
          token_endpoint_auth_method?: string
        }
        Relationships: []
      }
      chatgpt_oauth_codes: {
        Row: {
          client_id: string | null
          code: string
          code_challenge: string | null
          code_challenge_method: string | null
          created_at: string
          expires_at: string
          id: string
          redirect_uri: string
          state: string | null
          used: boolean
          user_id: string | null
        }
        Insert: {
          client_id?: string | null
          code: string
          code_challenge?: string | null
          code_challenge_method?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          redirect_uri: string
          state?: string | null
          used?: boolean
          user_id?: string | null
        }
        Update: {
          client_id?: string | null
          code?: string
          code_challenge?: string | null
          code_challenge_method?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          redirect_uri?: string
          state?: string | null
          used?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      chatgpt_oauth_tokens: {
        Row: {
          access_token: string
          access_token_expires_at: string
          client_id: string
          created_at: string
          id: string
          refresh_token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          access_token_expires_at: string
          client_id?: string
          created_at?: string
          id?: string
          refresh_token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          access_token_expires_at?: string
          client_id?: string
          created_at?: string
          id?: string
          refresh_token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      day_contexts: {
        Row: {
          created_at: string
          date: string
          end_date: string | null
          event_name: string | null
          extra_adults: number
          extra_babies: number
          extra_children: number
          household_id: string
          id: string
        }
        Insert: {
          created_at?: string
          date: string
          end_date?: string | null
          event_name?: string | null
          extra_adults?: number
          extra_babies?: number
          extra_children?: number
          household_id: string
          id?: string
        }
        Update: {
          created_at?: string
          date?: string
          end_date?: string | null
          event_name?: string | null
          extra_adults?: number
          extra_babies?: number
          extra_children?: number
          household_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "day_contexts_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      day_placeholders: {
        Row: {
          day_of_week: number
          household_id: string
          id: string
          label: string
        }
        Insert: {
          day_of_week: number
          household_id: string
          id?: string
          label: string
        }
        Update: {
          day_of_week?: number
          household_id?: string
          id?: string
          label?: string
        }
        Relationships: [
          {
            foreignKeyName: "day_placeholders_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_invites: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          expires_at: string | null
          household_id: string
          id: string
          role: string
          token: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          expires_at?: string | null
          household_id: string
          id?: string
          role?: string
          token?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          expires_at?: string | null
          household_id?: string
          id?: string
          role?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_invites_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          household_id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          household_id: string
          joined_at?: string
          role: string
          user_id: string
        }
        Update: {
          household_id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          alias: string | null
          created_at: string
          created_by: string | null
          default_adults: number
          default_babies: number
          default_children: number
          id: string
          name: string
          public_share_token: string | null
        }
        Insert: {
          alias?: string | null
          created_at?: string
          created_by?: string | null
          default_adults?: number
          default_babies?: number
          default_children?: number
          id?: string
          name: string
          public_share_token?: string | null
        }
        Update: {
          alias?: string | null
          created_at?: string
          created_by?: string | null
          default_adults?: number
          default_babies?: number
          default_children?: number
          id?: string
          name?: string
          public_share_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "households_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredients: {
        Row: {
          created_at: string
          household_id: string
          id: string
          name: string
          starred: boolean
          warning: boolean
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          name: string
          starred?: boolean
          warning?: boolean
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          name?: string
          starred?: boolean
          warning?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "ingredients_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_ideas: {
        Row: {
          created_at: string
          created_by: string | null
          date: string | null
          description: string | null
          household_id: string
          id: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date?: string | null
          description?: string | null
          household_id: string
          id?: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date?: string | null
          description?: string | null
          household_id?: string
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_ideas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_ideas_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_outcomes: {
        Row: {
          created_at: string
          household_id: string
          id: string
          meal_plan_id: string
          note: string | null
          reason: string | null
          recorded_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          meal_plan_id: string
          note?: string | null
          reason?: string | null
          recorded_by?: string | null
          status: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          meal_plan_id?: string
          note?: string | null
          reason?: string | null
          recorded_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_outcomes_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_outcomes_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: true
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_outcomes_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plan_ingredients: {
        Row: {
          ingredient_id: string
          meal_plan_id: string
        }
        Insert: {
          ingredient_id: string
          meal_plan_id: string
        }
        Update: {
          ingredient_id?: string
          meal_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plan_ingredients_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plans: {
        Row: {
          created_at: string
          created_by: string | null
          date: string
          description: string | null
          household_id: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date: string
          description?: string | null
          household_id: string
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          household_id?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plans_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          last_household_id: string | null
          sound_effects_enabled: boolean
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          id: string
          last_household_id?: string | null
          sound_effects_enabled?: boolean
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          last_household_id?: string | null
          sound_effects_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "profiles_last_household_id_fkey"
            columns: ["last_household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      public_stats: {
        Row: {
          key: string
          refreshed_at: string
          value: number
        }
        Insert: {
          key: string
          refreshed_at?: string
          value?: number
        }
        Update: {
          key?: string
          refreshed_at?: string
          value?: number
        }
        Relationships: []
      }
      reactions: {
        Row: {
          created_at: string
          emoji: string
          household_id: string
          id: string
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          household_id: string
          id?: string
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          household_id?: string
          id?: string
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      todo_items: {
        Row: {
          completed_at: string | null
          completed_on: string | null
          created_at: string
          created_by: string | null
          date: string
          household_id: string
          id: string
          note: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          completed_on?: string | null
          created_at?: string
          created_by?: string | null
          date: string
          household_id: string
          id?: string
          note?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          completed_on?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          household_id?: string
          id?: string
          note?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "todo_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todo_items_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todo_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: Record<never, never>
    Functions: {
      can_edit_meals: { Args: { p_household_id: string }; Returns: boolean }
      can_invite_members: { Args: { p_household_id: string }; Returns: boolean }
      can_propose_ideas: { Args: { p_household_id: string }; Returns: boolean }
      can_record_outcomes: {
        Args: { p_household_id: string }
        Returns: boolean
      }
      can_vote: { Args: { p_household_id: string }; Returns: boolean }
      delete_current_user: { Args: never; Returns: undefined }
      exchange_mcp_oauth_code: {
        Args: { p_client_id: string; p_code: string; p_redirect_uri: string }
        Returns: Json
      }
      exchange_oauth_code: {
        Args: { p_code: string; p_redirect_uri: string }
        Returns: Json
      }
      generate_oauth_code: { Args: never; Returns: string }
      get_public_stat: { Args: { p_key: string }; Returns: number }
      is_household_member: {
        Args: { p_household_id: string }
        Returns: boolean
      }
      refresh_chatgpt_oauth_token: {
        Args: {
          p_expires_at: string
          p_new_access_token: string
          p_user_id: string
        }
        Returns: undefined
      }
      refresh_public_stat: { Args: { p_key: string }; Returns: number }
      user_household_role: { Args: { p_household_id: string }; Returns: string }
    }
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
