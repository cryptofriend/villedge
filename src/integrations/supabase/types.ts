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
      bulletin_reactions: {
        Row: {
          bulletin_id: string
          created_at: string
          id: string
          reaction_type: string
        }
        Insert: {
          bulletin_id: string
          created_at?: string
          id?: string
          reaction_type: string
        }
        Update: {
          bulletin_id?: string
          created_at?: string
          id?: string
          reaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "bulletin_reactions_bulletin_id_fkey"
            columns: ["bulletin_id"]
            isOneToOne: false
            referencedRelation: "bulletin"
            referencedColumns: ["id"]
          },
        ]
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
      events: {
        Row: {
          created_at: string
          description: string | null
          end_time: string | null
          id: string
          image_url: string | null
          location: string | null
          luma_id: string | null
          luma_url: string
          start_time: string
          title: string
          village_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_time?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          luma_id?: string | null
          luma_url: string
          start_time: string
          title: string
          village_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_time?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          luma_id?: string | null
          luma_url?: string
          start_time?: string
          title?: string
          village_id?: string
        }
        Relationships: []
      }
      notified_donations: {
        Row: {
          id: string
          notified_at: string
          tx_hash: string
          wallet_address: string
        }
        Insert: {
          id?: string
          notified_at?: string
          tx_hash: string
          wallet_address: string
        }
        Update: {
          id?: string
          notified_at?: string
          tx_hash?: string
          wallet_address?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          asks: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          offerings: string | null
          project_description: string | null
          project_url: string | null
          social_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          asks?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          offerings?: string | null
          project_description?: string | null
          project_url?: string | null
          social_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          asks?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          offerings?: string | null
          project_description?: string | null
          project_url?: string | null
          social_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      proposal_reactions: {
        Row: {
          created_at: string
          id: string
          proposal_id: string
          reaction_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          proposal_id: string
          reaction_type: string
        }
        Update: {
          created_at?: string
          id?: string
          proposal_id?: string
          reaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_reactions_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          amount: number | null
          author_name: string
          created_at: string
          description: string | null
          id: string
          title: string
          village_id: string
        }
        Insert: {
          amount?: number | null
          author_name: string
          created_at?: string
          description?: string | null
          id?: string
          title: string
          village_id: string
        }
        Update: {
          amount?: number | null
          author_name?: string
          created_at?: string
          description?: string | null
          id?: string
          title?: string
          village_id?: string
        }
        Relationships: []
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
          status: string | null
          user_id: string | null
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
          status?: string | null
          user_id?: string | null
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
          status?: string | null
          user_id?: string | null
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
      treasury: {
        Row: {
          balance: number
          created_at: string
          id: string
          updated_at: string
          village_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          village_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          village_id?: string
        }
        Relationships: []
      }
      villages: {
        Row: {
          center: Json
          created_at: string
          created_by: string | null
          dates: string
          description: string
          focus: string | null
          id: string
          instagram_url: string | null
          location: string
          logo_url: string | null
          luma_calendar_id: string | null
          name: string
          participants: string | null
          solana_wallet_address: string | null
          telegram_url: string | null
          twitter_url: string | null
          updated_at: string
          wallet_address: string | null
          website_url: string | null
        }
        Insert: {
          center: Json
          created_at?: string
          created_by?: string | null
          dates: string
          description: string
          focus?: string | null
          id: string
          instagram_url?: string | null
          location: string
          logo_url?: string | null
          luma_calendar_id?: string | null
          name: string
          participants?: string | null
          solana_wallet_address?: string | null
          telegram_url?: string | null
          twitter_url?: string | null
          updated_at?: string
          wallet_address?: string | null
          website_url?: string | null
        }
        Update: {
          center?: Json
          created_at?: string
          created_by?: string | null
          dates?: string
          description?: string
          focus?: string | null
          id?: string
          instagram_url?: string | null
          location?: string
          logo_url?: string | null
          luma_calendar_id?: string | null
          name?: string
          participants?: string | null
          solana_wallet_address?: string | null
          telegram_url?: string | null
          twitter_url?: string | null
          updated_at?: string
          wallet_address?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      webauthn_challenges: {
        Row: {
          challenge: string
          created_at: string
          email: string | null
          expires_at: string
          id: string
          type: string
          user_id: string | null
        }
        Insert: {
          challenge: string
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          type?: string
          user_id?: string | null
        }
        Update: {
          challenge?: string
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      webauthn_credentials: {
        Row: {
          backup_state: string | null
          created_at: string
          credential_id: string
          device_type: string | null
          friendly_name: string | null
          id: string
          last_used_at: string | null
          public_key: string
          sign_count: number
          transports: string[] | null
          user_id: string
          user_verification_status: string | null
          username: string | null
        }
        Insert: {
          backup_state?: string | null
          created_at?: string
          credential_id: string
          device_type?: string | null
          friendly_name?: string | null
          id?: string
          last_used_at?: string | null
          public_key: string
          sign_count?: number
          transports?: string[] | null
          user_id: string
          user_verification_status?: string | null
          username?: string | null
        }
        Update: {
          backup_state?: string | null
          created_at?: string
          credential_id?: string
          device_type?: string | null
          friendly_name?: string | null
          id?: string
          last_used_at?: string | null
          public_key?: string
          sign_count?: number
          transports?: string[] | null
          user_id?: string
          user_verification_status?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_webauthn_challenges: { Args: never; Returns: undefined }
      is_village_host: {
        Args: { _user_id: string; _village_id: string }
        Returns: boolean
      }
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
