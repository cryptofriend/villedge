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
      invitation_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          max_uses: number
          owner_id: string
          updated_at: string
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          max_uses?: number
          owner_id: string
          updated_at?: string
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          max_uses?: number
          owner_id?: string
          updated_at?: string
          used_count?: number
        }
        Relationships: []
      }
      notification_routes: {
        Row: {
          chat_id: string
          created_at: string
          id: string
          is_enabled: boolean
          notification_type: string
          thread_id: number | null
          updated_at: string
          village_id: string
        }
        Insert: {
          chat_id: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          notification_type: string
          thread_id?: number | null
          updated_at?: string
          village_id: string
        }
        Update: {
          chat_id?: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          notification_type?: string
          thread_id?: number | null
          updated_at?: string
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
      profile_social_links: {
        Row: {
          created_at: string
          id: string
          platform: string | null
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform?: string | null
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string | null
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          asks: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          id: string
          is_anon: boolean
          is_verified: boolean
          offerings: string | null
          project_description: string | null
          project_url: string | null
          social_url: string | null
          telegram_id: string | null
          updated_at: string
          user_id: string
          username: string | null
          wallet_address: string | null
        }
        Insert: {
          asks?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          is_anon?: boolean
          is_verified?: boolean
          offerings?: string | null
          project_description?: string | null
          project_url?: string | null
          social_url?: string | null
          telegram_id?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
          wallet_address?: string | null
        }
        Update: {
          asks?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          is_anon?: boolean
          is_verified?: boolean
          offerings?: string | null
          project_description?: string | null
          project_url?: string | null
          social_url?: string | null
          telegram_id?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
          wallet_address?: string | null
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
      referrals: {
        Row: {
          created_at: string
          id: string
          invitation_code_id: string | null
          referred_id: string
          referrer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invitation_code_id?: string | null
          referred_id: string
          referrer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invitation_code_id?: string | null
          referred_id?: string
          referrer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_invitation_code_id_fkey"
            columns: ["invitation_code_id"]
            isOneToOne: false
            referencedRelation: "invitation_codes"
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
      reveal_requests: {
        Row: {
          created_at: string
          id: string
          requester_id: string
          status: string
          target_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          requester_id: string
          status?: string
          target_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          target_user_id?: string
          updated_at?: string
        }
        Relationships: []
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
      settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
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
      user_connections: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      user_projects: {
        Row: {
          created_at: string
          description: string | null
          favicon_url: string | null
          id: string
          thumbnail_url: string | null
          title: string | null
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          favicon_url?: string | null
          id?: string
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          favicon_url?: string | null
          id?: string
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_wallets: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          is_primary: boolean
          user_id: string
          wallet_address: string
          wallet_type: Database["public"]["Enums"]["wallet_type"]
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          is_primary?: boolean
          user_id: string
          wallet_address: string
          wallet_type: Database["public"]["Enums"]["wallet_type"]
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          is_primary?: boolean
          user_id?: string
          wallet_address?: string
          wallet_type?: Database["public"]["Enums"]["wallet_type"]
        }
        Relationships: []
      }
      village_hosts: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          role: string
          user_id: string
          village_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          role?: string
          user_id: string
          village_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          role?: string
          user_id?: string
          village_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "village_hosts_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "villages"
            referencedColumns: ["id"]
          },
        ]
      }
      villages: {
        Row: {
          apply_url: string | null
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
          thumbnail_url: string | null
          twitter_url: string | null
          updated_at: string
          village_type: string
          wallet_address: string | null
          website_url: string | null
        }
        Insert: {
          apply_url?: string | null
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
          thumbnail_url?: string | null
          twitter_url?: string | null
          updated_at?: string
          village_type?: string
          wallet_address?: string | null
          website_url?: string | null
        }
        Update: {
          apply_url?: string | null
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
          thumbnail_url?: string | null
          twitter_url?: string | null
          updated_at?: string
          village_type?: string
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
      approve_connection_request: {
        Args: { _request_id: string; _target_user_id: string }
        Returns: boolean
      }
      cleanup_expired_webauthn_challenges: { Args: never; Returns: undefined }
      generate_invitation_code: { Args: never; Returns: string }
      generate_username: { Args: { display_name: string }; Returns: string }
      get_safe_profile_data: {
        Args: { target_user_id: string }
        Returns: {
          asks: string
          avatar_url: string
          bio: string
          created_at: string
          id: string
          is_anon: boolean
          is_verified: boolean
          offerings: string
          project_description: string
          project_url: string
          social_url: string
          telegram_id: string
          updated_at: string
          user_id: string
          username: string
          wallet_address: string
        }[]
      }
      get_stays_with_privacy: {
        Args: { _viewer_id?: string; _village_id: string }
        Returns: {
          asks: string
          created_at: string
          end_date: string
          id: string
          intention: string
          is_anon: boolean
          is_host: boolean
          is_visible: boolean
          nickname: string
          offerings: string
          project_description: string
          project_url: string
          secret_hash: string
          social_profile: string
          start_date: string
          status: string
          user_id: string
          villa: string
          village_id: string
        }[]
      }
      has_approved_reveal: {
        Args: { _requester: string; _target: string }
        Returns: boolean
      }
      has_mutual_connection: {
        Args: { _user_a: string; _user_b: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_village_host: {
        Args: { _user_id: string; _village_id: string }
        Returns: boolean
      }
      use_invitation_code: {
        Args: { _code_id: string; _referred_id: string; _referrer_id: string }
        Returns: boolean
      }
      validate_invitation_code: { Args: { _code: string }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      wallet_type: "porto" | "ethereum" | "solana" | "ton"
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
      wallet_type: ["porto", "ethereum", "solana", "ton"],
    },
  },
} as const
