// Auto-generated types will go here via `supabase gen types typescript`
// For now, define the schema manually to unblock development.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          display_name: string
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          display_name?: string
          avatar_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
      households: {
        Row: {
          id: string
          name: string
          alias: string | null
          default_adults: number
          default_children: number
          default_babies: number
          public_share_token: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          alias?: string | null
          default_adults?: number
          default_children?: number
          default_babies?: number
          public_share_token?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          alias?: string | null
          default_adults?: number
          default_children?: number
          default_babies?: number
          public_share_token?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      household_members: {
        Row: {
          household_id: string
          user_id: string
          role: 'owner' | 'member' | 'guest'
          joined_at: string
        }
        Insert: {
          household_id: string
          user_id: string
          role: 'owner' | 'member' | 'guest'
          joined_at?: string
        }
        Update: {
          household_id?: string
          user_id?: string
          role?: 'owner' | 'member' | 'guest'
          joined_at?: string
        }
        Relationships: []
      }
      household_invites: {
        Row: {
          id: string
          household_id: string
          token: string
          role: 'member' | 'guest'
          created_by: string | null
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          token?: string
          role?: 'member' | 'guest'
          created_by?: string | null
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          token?: string
          role?: 'member' | 'guest'
          created_by?: string | null
          expires_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      day_placeholders: {
        Row: {
          id: string
          household_id: string
          day_of_week: number
          label: string
        }
        Insert: {
          id?: string
          household_id: string
          day_of_week: number
          label: string
        }
        Update: {
          id?: string
          household_id?: string
          day_of_week?: number
          label?: string
        }
        Relationships: []
      }
      ingredients: {
        Row: {
          id: string
          household_id: string
          name: string
          starred: boolean
          warning: boolean
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          name: string
          starred?: boolean
          warning?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          name?: string
          starred?: boolean
          warning?: boolean
          created_at?: string
        }
        Relationships: []
      }
      day_contexts: {
        Row: {
          id: string
          household_id: string
          date: string
          event_name: string | null
          extra_adults: number
          extra_children: number
          extra_babies: number
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          date: string
          event_name?: string | null
          extra_adults?: number
          extra_children?: number
          extra_babies?: number
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          date?: string
          event_name?: string | null
          extra_adults?: number
          extra_children?: number
          extra_babies?: number
          created_at?: string
        }
        Relationships: []
      }
      meal_plans: {
        Row: {
          id: string
          household_id: string
          date: string
          title: string
          description: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          household_id: string
          date: string
          title: string
          description?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          date?: string
          title?: string
          description?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      meal_plan_ingredients: {
        Row: {
          meal_plan_id: string
          ingredient_id: string
        }
        Insert: {
          meal_plan_id: string
          ingredient_id: string
        }
        Update: {
          meal_plan_id?: string
          ingredient_id?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
