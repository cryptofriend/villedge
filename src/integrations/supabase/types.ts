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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      bulletin: {
        Row: {
          author_name: string
          created_at: string
          id: string
          message: string
          village_id: string
        }
        Insert: {
          author_name: string
          created_at?: string
          id?: string
          message: string
          village_id: string
        }
        Update: {
          author_name?: string
          created_at?: string
          id?: string
          message?: string
          village_id?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          author_name: string
          content: string
          created_at: string
          id: string
          parent_id: string | null
          spot_id: string
        }
        Insert: {
          author_name: string
          content: string
          created_at?: string
          id?: string
          parent_id?: string | null
          spot_id: string
        }
        Update: {
          author_name?: string
          content?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          spot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_spot_id_fkey"
            columns: ["spot_id"]
            isOneToOne: false
            referencedRelation: "spots"
            referencedColumns: ["id"]
          },
        ]
      }
      residents: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          github_url: string | null
          id: string
          interests: string[] | null
          looking_for: string | null
          name: string
          offering: string | null
          skills: string[] | null
          twitter_url: string | null
          updated_at: string
          village_id: string
          website_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          github_url?: string | null
          id?: string
          interests?: string[] | null
          looking_for?: string | null
          name: string
          offering?: string | null
          skills?: string[] | null
          twitter_url?: string | null
          updated_at?: string
          village_id: string
          website_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          github_url?: string | null
          id?: string
          interests?: string[] | null
          looking_for?: string | null
          name?: string
          offering?: string | null
          skills?: string[] | null
          twitter_url?: string | null
          updated_at?: string
          village_id?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "residents_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "villages"
            referencedColumns: ["id"]
          },
        ]
      }
      scenius: {
        Row: {
          contributors: string[] | null
          created_at: string
          description: string | null
          github_url: string | null
          id: string
          image_url: string | null
          name: string
          project_url: string | null
          status: string | null
          tags: string[] | null
          updated_at: string
          village_id: string
        }
        Insert: {
          contributors?: string[] | null
          created_at?: string
          description?: string | null
          github_url?: string | null
          id?: string
          image_url?: string | null
          name: string
          project_url?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string
          village_id: string
        }
        Update: {
          contributors?: string[] | null
          created_at?: string
          description?: string | null
          github_url?: string | null
          id?: string
          image_url?: string | null
          name?: string
          project_url?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string
          village_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenius_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "villages"
            referencedColumns: ["id"]
          },
        ]
      }
      spots: {
        Row: {
          category: string
          coordinates: Json
          created_at: string
          description: string
          google_maps_url: string | null
          id: string
          image_url: string | null
          name: string
          tags: string[] | null
          updated_at: string
          village_id: string | null
        }
        Insert: {
          category: string
          coordinates: Json
          created_at?: string
          description: string
          google_maps_url?: string | null
          id?: string
          image_url?: string | null
          name: string
          tags?: string[] | null
          updated_at?: string
          village_id?: string | null
        }
        Update: {
          category?: string
          coordinates?: Json
          created_at?: string
          description?: string
          google_maps_url?: string | null
          id?: string
          image_url?: string | null
          name?: string
          tags?: string[] | null
          updated_at?: string
          village_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spots_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "villages"
            referencedColumns: ["id"]
          },
        ]
      }
      stays: {
        Row: {
          asks: string | null
          created_at: string
          end_date: string
          id: string
          intention: string | null
          is_host: boolean | null
          nickname: string
          offerings: string | null
          project_description: string | null
          project_url: string | null
          secret_hash: string | null
          social_profile: string | null
          start_date: string
          villa: string
          village_id: string
        }
        Insert: {
          asks?: string | null
          created_at?: string
          end_date: string
          id?: string
          intention?: string | null
          is_host?: boolean | null
          nickname: string
          offerings?: string | null
          project_description?: string | null
          project_url?: string | null
          secret_hash?: string | null
          social_profile?: string | null
          start_date: string
          villa: string
          village_id: string
        }
        Update: {
          asks?: string | null
          created_at?: string
          end_date?: string
          id?: string
          intention?: string | null
          is_host?: boolean | null
          nickname?: string
          offerings?: string | null
          project_description?: string | null
          project_url?: string | null
          secret_hash?: string | null
          social_profile?: string | null
          start_date?: string
          villa?: string
          village_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stays_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "villages"
            referencedColumns: ["id"]
          },
        ]
      }
      villages: {
        Row: {
          center: Json
          created_at: string
          dates: string
          description: string
          focus: string | null
          id: string
          location: string
          logo_url: string | null
          luma_calendar_id: string | null
          name: string
          participants: string | null
          updated_at: string
        }
        Insert: {
          center: Json
          created_at?: string
          dates: string
          description: string
          focus?: string | null
          id: string
          location: string
          logo_url?: string | null
          luma_calendar_id?: string | null
          name: string
          participants?: string | null
          updated_at?: string
        }
        Update: {
          center?: Json
          created_at?: string
          dates?: string
          description?: string
          focus?: string | null
          id?: string
          location?: string
          logo_url?: string | null
          luma_calendar_id?: string | null
          name?: string
          participants?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
