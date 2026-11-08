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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          activity_date: string
          activity_type: string
          created_at: string
          customer_id: string | null
          description: string
          id: string
          lead_id: string | null
        }
        Insert: {
          activity_date?: string
          activity_type?: string
          created_at?: string
          customer_id?: string | null
          description: string
          id?: string
          lead_id?: string | null
        }
        Update: {
          activity_date?: string
          activity_type?: string
          created_at?: string
          customer_id?: string | null
          description?: string
          id?: string
          lead_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          company: string | null
          created_at: string
          email: string | null
          id: string
          last_contacted: string | null
          lead_id: string | null
          name: string
          notes: string | null
          phone: string | null
          status: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_contacted?: string | null
          lead_id?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          status?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_contacted?: string | null
          lead_id?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_up_assignments: {
        Row: {
          created_at: string
          follow_up_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          follow_up_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          follow_up_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_up_assignments_follow_up_id_fkey"
            columns: ["follow_up_id"]
            isOneToOne: false
            referencedRelation: "follow_ups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_ups: {
        Row: {
          assigned_to: string | null
          assigned_user_id: string | null
          created_at: string
          customer_id: string | null
          description: string | null
          due_at: string
          follow_up_date: string
          follow_up_type: string
          id: string
          lead_id: string | null
          priority: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          assigned_user_id?: string | null
          created_at?: string
          customer_id?: string | null
          description?: string | null
          due_at: string
          follow_up_date: string
          follow_up_type?: string
          id?: string
          lead_id?: string | null
          priority?: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          assigned_user_id?: string | null
          created_at?: string
          customer_id?: string | null
          description?: string | null
          due_at?: string
          follow_up_date?: string
          follow_up_type?: string
          id?: string
          lead_id?: string | null
          priority?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_ups_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_assignments: {
        Row: {
          created_at: string
          lead_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          lead_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          lead_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_assignments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          assigned_user_id: string | null
          company_name: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          lead_source: string | null
          next_follow_up: string | null
          notes: string | null
          phone: string | null
          priority: string
          status: string
        }
        Insert: {
          assigned_to?: string | null
          assigned_user_id?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          lead_source?: string | null
          next_follow_up?: string | null
          notes?: string | null
          phone?: string | null
          priority?: string
          status?: string
        }
        Update: {
          assigned_to?: string | null
          assigned_user_id?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          lead_source?: string | null
          next_follow_up?: string | null
          notes?: string | null
          phone?: string | null
          priority?: string
          status?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          dedupe_key: string
          follow_up_id: string | null
          id: string
          kind: string
          lead_id: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          dedupe_key: string
          follow_up_id?: string | null
          id?: string
          kind: string
          lead_id?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          dedupe_key?: string
          follow_up_id?: string | null
          id?: string
          kind?: string
          lead_id?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_follow_up_id_fkey"
            columns: ["follow_up_id"]
            isOneToOne: false
            referencedRelation: "follow_ups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      registration_requests: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      registration_review_history: {
        Row: {
          historical: boolean
          id: string
          previous_status: string | null
          registration_id: string
          reviewed_at: string
          reviewed_by: string | null
          reviewer_email: string | null
          reviewer_name: string | null
          status: string
        }
        Insert: {
          historical?: boolean
          id?: string
          previous_status?: string | null
          registration_id: string
          reviewed_at?: string
          reviewed_by?: string | null
          reviewer_email?: string | null
          reviewer_name?: string | null
          status: string
        }
        Update: {
          historical?: boolean
          id?: string
          previous_status?: string | null
          registration_id?: string
          reviewed_at?: string
          reviewed_by?: string | null
          reviewer_email?: string | null
          reviewer_name?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "registration_review_history_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registration_requests"
            referencedColumns: ["id"]
          },
        ]
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
      users: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          notify_email: boolean
          notify_followups: boolean
          preferences: Json
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          notify_email?: boolean
          notify_followups?: boolean
          preferences?: Json
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          notify_email?: boolean
          notify_followups?: boolean
          preferences?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_customer: { Args: { _customer_id: string }; Returns: boolean }
      can_access_lead: { Args: { _lead_id: string }; Returns: boolean }
      generate_followup_reminders: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_approved: { Args: { _user_id: string }; Returns: boolean }
      move_lead_status: {
        Args: { _from: string; _lead_id: string; _to: string }
        Returns: {
          assigned_to: string | null
          assigned_user_id: string | null
          company_name: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          lead_source: string | null
          next_follow_up: string | null
          notes: string | null
          phone: string | null
          priority: string
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "leads"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "admin" | "intern"
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
  public: {
    Enums: {
      app_role: ["admin", "intern"],
    },
  },
} as const
