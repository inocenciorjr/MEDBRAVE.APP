export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          achievement_type: string | null
          badge_level: string | null
          category: string | null
          created_at: Json | null
          criteria: Json | null
          description: string | null
          icon_url: string | null
          id: string | null
          is_visible: boolean | null
          points_awarded: number | null
          progress: Json | null
          title: string | null
          unlocked_at: Json | null
          updated_at: Json | null
          user_id: string | null
        }
        Insert: {
          achievement_type?: string | null
          badge_level?: string | null
          category?: string | null
          created_at?: Json | null
          criteria?: Json | null
          description?: string | null
          icon_url?: string | null
          id?: string | null
          is_visible?: boolean | null
          points_awarded?: number | null
          progress?: Json | null
          title?: string | null
          unlocked_at?: Json | null
          updated_at?: Json | null
          user_id?: string | null
        }
        Update: {
          achievement_type?: string | null
          badge_level?: string | null
          category?: string | null
          created_at?: Json | null
          criteria?: Json | null
          description?: string | null
          icon_url?: string | null
          id?: string | null
          is_visible?: boolean | null
          points_awarded?: number | null
          progress?: Json | null
          title?: string | null
          unlocked_at?: Json | null
          updated_at?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      analytics: {
        Row: {
          campaign: string | null
          created_at: Json | null
          device_info: Json | null
          event_data: Json | null
          event_name: string | null
          event_type: string | null
          id: string | null
          ip_address: string | null
          location: Json | null
          medium: string | null
          session_id: string | null
          source: string | null
          timestamp: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          campaign?: string | null
          created_at?: Json | null
          device_info?: Json | null
          event_data?: Json | null
          event_name?: string | null
          event_type?: string | null
          id?: string | null
          ip_address?: string | null
          location?: Json | null
          medium?: string | null
          session_id?: string | null
          source?: string | null
          timestamp?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          campaign?: string | null
          created_at?: Json | null
          device_info?: Json | null
          event_data?: Json | null
          event_name?: string | null
          event_type?: string | null
          id?: string | null
          ip_address?: string | null
          location?: Json | null
          medium?: string | null
          session_id?: string | null
          source?: string | null
          timestamp?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      api_key_usage_logs: {
        Row: {
          api_key_id: string | null
          endpoint: string | null
          id: string | null
          ip_address: string | null
          method: string | null
          status_code: number | null
          timestamp: Json | null
          user_agent: string | null
        }
        Insert: {
          api_key_id?: string | null
          endpoint?: string | null
          id?: string | null
          ip_address?: string | null
          method?: string | null
          status_code?: number | null
          timestamp?: Json | null
          user_agent?: string | null
        }
        Update: {
          api_key_id?: string | null
          endpoint?: string | null
          id?: string | null
          ip_address?: string | null
          method?: string | null
          status_code?: number | null
          timestamp?: Json | null
          user_agent?: string | null
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: Json | null
          description: string | null
          expires_at: string | null
          id: string | null
          ip_restrictions: string | null
          is_active: boolean | null
          key: string | null
          last_used_at: Json | null
          name: string | null
          prefix: string | null
          revoked_at: Json | null
          revoked_by: string | null
          revoked_reason: string | null
          scopes: Json | null
          updated_at: Json | null
          usage_count: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: Json | null
          description?: string | null
          expires_at?: string | null
          id?: string | null
          ip_restrictions?: string | null
          is_active?: boolean | null
          key?: string | null
          last_used_at?: Json | null
          name?: string | null
          prefix?: string | null
          revoked_at?: Json | null
          revoked_by?: string | null
          revoked_reason?: string | null
          scopes?: Json | null
          updated_at?: Json | null
          usage_count?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: Json | null
          description?: string | null
          expires_at?: string | null
          id?: string | null
          ip_restrictions?: string | null
          is_active?: boolean | null
          key?: string | null
          last_used_at?: Json | null
          name?: string | null
          prefix?: string | null
          revoked_at?: Json | null
          revoked_by?: string | null
          revoked_reason?: string | null
          scopes?: Json | null
          updated_at?: Json | null
          usage_count?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          category: string | null
          created_at: Json | null
          default_value: Json | null
          description: string | null
          id: string | null
          is_editable: boolean | null
          is_public: boolean | null
          last_modified_by: string | null
          setting_key: string | null
          setting_type: string | null
          setting_value: Json | null
          updated_at: Json | null
          validation_rules: Json | null
          version: number | null
        }
        Insert: {
          category?: string | null
          created_at?: Json | null
          default_value?: Json | null
          description?: string | null
          id?: string | null
          is_editable?: boolean | null
          is_public?: boolean | null
          last_modified_by?: string | null
          setting_key?: string | null
          setting_type?: string | null
          setting_value?: Json | null
          updated_at?: Json | null
          validation_rules?: Json | null
          version?: number | null
        }
        Update: {
          category?: string | null
          created_at?: Json | null
          default_value?: Json | null
          description?: string | null
          id?: string | null
          is_editable?: boolean | null
          is_public?: boolean | null
          last_modified_by?: string | null
          setting_key?: string | null
          setting_type?: string | null
          setting_value?: Json | null
          updated_at?: Json | null
          validation_rules?: Json | null
          version?: number | null
        }
        Relationships: []
      }
      articles: {
        Row: {
          author_id: string | null
          author_name: string | null
          category_id: string | null
          category_name: string | null
          comment_count: number | null
          content: string | null
          created_at: Json | null
          featured_image: string | null
          id: string | null
          like_count: number | null
          published_at: string | null
          slug: string | null
          status: string | null
          tags: Json | null
          title: string | null
          updated_at: Json | null
          view_count: number | null
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          category_id?: string | null
          category_name?: string | null
          comment_count?: number | null
          content?: string | null
          created_at?: Json | null
          featured_image?: string | null
          id?: string | null
          like_count?: number | null
          published_at?: string | null
          slug?: string | null
          status?: string | null
          tags?: Json | null
          title?: string | null
          updated_at?: Json | null
          view_count?: number | null
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          category_id?: string | null
          category_name?: string | null
          comment_count?: number | null
          content?: string | null
          created_at?: Json | null
          featured_image?: string | null
          id?: string | null
          like_count?: number | null
          published_at?: string | null
          slug?: string | null
          status?: string | null
          tags?: Json | null
          title?: string | null
          updated_at?: Json | null
          view_count?: number | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string | null
          created_at: Json | null
          error_message: string | null
          id: string | null
          ip_address: string | null
          metadata: Json | null
          new_values: Json | null
          old_values: Json | null
          resource_id: string | null
          resource_type: string | null
          session_id: string | null
          severity: string | null
          status: string | null
          timestamp: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          created_at?: Json | null
          error_message?: string | null
          id?: string | null
          ip_address?: string | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          session_id?: string | null
          severity?: string | null
          status?: string | null
          timestamp?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          created_at?: Json | null
          error_message?: string | null
          id?: string | null
          ip_address?: string | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          session_id?: string | null
          severity?: string | null
          status?: string | null
          timestamp?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      backups: {
        Row: {
          backup_type: string | null
          checksum: string | null
          compression_type: string | null
          created_at: Json | null
          created_by: string | null
          duration: number | null
          end_time: Json | null
          error_message: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          id: string | null
          metadata: Json | null
          retention_policy: Json | null
          start_time: Json | null
          status: string | null
          updated_at: Json | null
        }
        Insert: {
          backup_type?: string | null
          checksum?: string | null
          compression_type?: string | null
          created_at?: Json | null
          created_by?: string | null
          duration?: number | null
          end_time?: Json | null
          error_message?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string | null
          metadata?: Json | null
          retention_policy?: Json | null
          start_time?: Json | null
          status?: string | null
          updated_at?: Json | null
        }
        Update: {
          backup_type?: string | null
          checksum?: string | null
          compression_type?: string | null
          created_at?: Json | null
          created_by?: string | null
          duration?: number | null
          end_time?: Json | null
          error_message?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string | null
          metadata?: Json | null
          retention_policy?: Json | null
          start_time?: Json | null
          status?: string | null
          updated_at?: Json | null
        }
        Relationships: []
      }
      cache: {
        Row: {
          created_at: Json | null
          expires_at: Json | null
          id: string | null
          key: string | null
          ttl: number | null
          updated_at: Json | null
          value: Json | null
        }
        Insert: {
          created_at?: Json | null
          expires_at?: Json | null
          id?: string | null
          key?: string | null
          ttl?: number | null
          updated_at?: Json | null
          value?: Json | null
        }
        Update: {
          created_at?: Json | null
          expires_at?: Json | null
          id?: string | null
          key?: string | null
          ttl?: number | null
          updated_at?: Json | null
          value?: Json | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: Json | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string | null
          parent_id: string | null
          updated_at: Json | null
        }
        Insert: {
          created_at?: Json | null
          description?: string | null
          display_order?: number | null
          id: string
          is_active?: boolean | null
          name?: string | null
          parent_id?: string | null
          updated_at?: Json | null
        }
        Update: {
          created_at?: Json | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          parent_id?: string | null
          updated_at?: Json | null
        }
        Relationships: []
      }
      collections: {
        Row: {
          card_count: number | null
          category: string | null
          created_at: Json | null
          deck_count: number | null
          deck_ids: Json | null
          description: string | null
          difficulty: string | null
          download_count: number | null
          id: string | null
          image_url: string | null
          is_official: boolean | null
          is_public: boolean | null
          language: string | null
          name: string | null
          owner_id: string | null
          rating: number | null
          rating_count: number | null
          tags: Json | null
          thumbnail_url: string | null
          title: string | null
          total_cards: number | null
          total_decks: number | null
          updated_at: Json | null
          user_id: string | null
          view_count: number | null
        }
        Insert: {
          card_count?: number | null
          category?: string | null
          created_at?: Json | null
          deck_count?: number | null
          deck_ids?: Json | null
          description?: string | null
          difficulty?: string | null
          download_count?: number | null
          id?: string | null
          image_url?: string | null
          is_official?: boolean | null
          is_public?: boolean | null
          language?: string | null
          name?: string | null
          owner_id?: string | null
          rating?: number | null
          rating_count?: number | null
          tags?: Json | null
          thumbnail_url?: string | null
          title?: string | null
          total_cards?: number | null
          total_decks?: number | null
          updated_at?: Json | null
          user_id?: string | null
          view_count?: number | null
        }
        Update: {
          card_count?: number | null
          category?: string | null
          created_at?: Json | null
          deck_count?: number | null
          deck_ids?: Json | null
          description?: string | null
          difficulty?: string | null
          download_count?: number | null
          id?: string | null
          image_url?: string | null
          is_official?: boolean | null
          is_public?: boolean | null
          language?: string | null
          name?: string | null
          owner_id?: string | null
          rating?: number | null
          rating_count?: number | null
          tags?: Json | null
          thumbnail_url?: string | null
          title?: string | null
          total_cards?: number | null
          total_decks?: number | null
          updated_at?: Json | null
          user_id?: string | null
          view_count?: number | null
        }
        Relationships: []
      }
      comments: {
        Row: {
          content: string | null
          content_id: string | null
          content_type: string | null
          created_at: Json | null
          id: string
          is_approved: boolean | null
          is_deleted: boolean | null
          like_count: number | null
          parent_id: string | null
          reply_count: number | null
          updated_at: Json | null
          user_id: string | null
        }
        Insert: {
          content?: string | null
          content_id?: string | null
          content_type?: string | null
          created_at?: Json | null
          id: string
          is_approved?: boolean | null
          is_deleted?: boolean | null
          like_count?: number | null
          parent_id?: string | null
          reply_count?: number | null
          updated_at?: Json | null
          user_id?: string | null
        }
        Update: {
          content?: string | null
          content_id?: string | null
          content_type?: string | null
          created_at?: Json | null
          id?: string
          is_approved?: boolean | null
          is_deleted?: boolean | null
          like_count?: number | null
          parent_id?: string | null
          reply_count?: number | null
          updated_at?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      content_reports: {
        Row: {
          action_taken: string | null
          content_id: string | null
          content_type: string | null
          created_at: Json | null
          description: string | null
          id: string
          reason: string | null
          report_type: string | null
          reporter_id: string | null
          reviewed_at: Json | null
          reviewed_by: string | null
          status: string | null
          updated_at: Json | null
        }
        Insert: {
          action_taken?: string | null
          content_id?: string | null
          content_type?: string | null
          created_at?: Json | null
          description?: string | null
          id: string
          reason?: string | null
          report_type?: string | null
          reporter_id?: string | null
          reviewed_at?: Json | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: Json | null
        }
        Update: {
          action_taken?: string | null
          content_id?: string | null
          content_type?: string | null
          created_at?: Json | null
          description?: string | null
          id?: string
          reason?: string | null
          report_type?: string | null
          reporter_id?: string | null
          reviewed_at?: Json | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: Json | null
        }
        Relationships: []
      }
      decks: {
        Row: {
          algorithm: string | null
          card_ids: Json | null
          collection: string | null
          created_at: Json | null
          description: string | null
          flashcard_count: number | null
          fsrs_enabled: boolean | null
          hierarchy: Json | null
          hierarchy_path: string | null
          id: string | null
          image_url: string | null
          is_public: boolean | null
          name: string | null
          path: string | null
          source: string | null
          tags: Json | null
          title: string | null
          total_cards: number | null
          updated_at: Json | null
          user_id: string | null
        }
        Insert: {
          algorithm?: string | null
          card_ids?: Json | null
          collection?: string | null
          created_at?: Json | null
          description?: string | null
          flashcard_count?: number | null
          fsrs_enabled?: boolean | null
          hierarchy?: Json | null
          hierarchy_path?: string | null
          id?: string | null
          image_url?: string | null
          is_public?: boolean | null
          name?: string | null
          path?: string | null
          source?: string | null
          tags?: Json | null
          title?: string | null
          total_cards?: number | null
          updated_at?: Json | null
          user_id?: string | null
        }
        Update: {
          algorithm?: string | null
          card_ids?: Json | null
          collection?: string | null
          created_at?: Json | null
          description?: string | null
          flashcard_count?: number | null
          fsrs_enabled?: boolean | null
          hierarchy?: Json | null
          hierarchy_path?: string | null
          id?: string | null
          image_url?: string | null
          is_public?: boolean | null
          name?: string | null
          path?: string | null
          source?: string | null
          tags?: Json | null
          title?: string | null
          total_cards?: number | null
          updated_at?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      device_tokens: {
        Row: {
          app_version: string | null
          created_at: Json | null
          device_id: string | null
          device_type: string | null
          id: string | null
          is_active: boolean | null
          last_used: Json | null
          metadata: Json | null
          os_version: string | null
          platform: string | null
          registered_at: Json | null
          token: string | null
          updated_at: Json | null
          user_id: string | null
        }
        Insert: {
          app_version?: string | null
          created_at?: Json | null
          device_id?: string | null
          device_type?: string | null
          id?: string | null
          is_active?: boolean | null
          last_used?: Json | null
          metadata?: Json | null
          os_version?: string | null
          platform?: string | null
          registered_at?: Json | null
          token?: string | null
          updated_at?: Json | null
          user_id?: string | null
        }
        Update: {
          app_version?: string | null
          created_at?: Json | null
          device_id?: string | null
          device_type?: string | null
          id?: string | null
          is_active?: boolean | null
          last_used?: Json | null
          metadata?: Json | null
          os_version?: string | null
          platform?: string | null
          registered_at?: Json | null
          token?: string | null
          updated_at?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          context: Json | null
          created_at: Json | null
          environment: string | null
          error_code: string | null
          error_message: string | null
          error_type: string | null
          id: string | null
          ip_address: string | null
          method: string | null
          notes: string | null
          resolved: boolean | null
          resolved_at: Json | null
          resolved_by: string | null
          severity: string | null
          stack_trace: string | null
          status_code: number | null
          url: string | null
          user_agent: string | null
          user_id: string | null
          version: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: Json | null
          environment?: string | null
          error_code?: string | null
          error_message?: string | null
          error_type?: string | null
          id?: string | null
          ip_address?: string | null
          method?: string | null
          notes?: string | null
          resolved?: boolean | null
          resolved_at?: Json | null
          resolved_by?: string | null
          severity?: string | null
          stack_trace?: string | null
          status_code?: number | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
          version?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: Json | null
          environment?: string | null
          error_code?: string | null
          error_message?: string | null
          error_type?: string | null
          id?: string | null
          ip_address?: string | null
          method?: string | null
          notes?: string | null
          resolved?: boolean | null
          resolved_at?: Json | null
          resolved_by?: string | null
          severity?: string | null
          stack_trace?: string | null
          status_code?: number | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
          version?: string | null
        }
        Relationships: []
      }
      feedbacks: {
        Row: {
          app_version: string | null
          assigned_to: string | null
          attachments: Json | null
          category: string | null
          created_at: Json | null
          description: string | null
          device_info: Json | null
          id: string | null
          metadata: Json | null
          priority: string | null
          rating: number | null
          response: string | null
          response_at: Json | null
          status: string | null
          title: string | null
          type: string | null
          updated_at: Json | null
          user_id: string | null
        }
        Insert: {
          app_version?: string | null
          assigned_to?: string | null
          attachments?: Json | null
          category?: string | null
          created_at?: Json | null
          description?: string | null
          device_info?: Json | null
          id?: string | null
          metadata?: Json | null
          priority?: string | null
          rating?: number | null
          response?: string | null
          response_at?: Json | null
          status?: string | null
          title?: string | null
          type?: string | null
          updated_at?: Json | null
          user_id?: string | null
        }
        Update: {
          app_version?: string | null
          assigned_to?: string | null
          attachments?: Json | null
          category?: string | null
          created_at?: Json | null
          description?: string | null
          device_info?: Json | null
          id?: string | null
          metadata?: Json | null
          priority?: string | null
          rating?: number | null
          response?: string | null
          response_at?: Json | null
          status?: string | null
          title?: string | null
          type?: string | null
          updated_at?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      filters: {
        Row: {
          category: string | null
          children: Json | null
          created_at: Json | null
          filter_type: string | null
          id: string | null
          is_active: boolean | null
          is_global: boolean | null
          level: number | null
          name: string | null
          order: number | null
          status: string | null
          updated_at: Json | null
        }
        Insert: {
          category?: string | null
          children?: Json | null
          created_at?: Json | null
          filter_type?: string | null
          id?: string | null
          is_active?: boolean | null
          is_global?: boolean | null
          level?: number | null
          name?: string | null
          order?: number | null
          status?: string | null
          updated_at?: Json | null
        }
        Update: {
          category?: string | null
          children?: Json | null
          created_at?: Json | null
          filter_type?: string | null
          id?: string | null
          is_active?: boolean | null
          is_global?: boolean | null
          level?: number | null
          name?: string | null
          order?: number | null
          status?: string | null
          updated_at?: Json | null
        }
        Relationships: []
      }
      flashcard_review_history: {
        Row: {
          difficulty: number | null
          due: string
          elapsed_days: number | null
          flashcard_id: string
          grade: number
          id: number
          lapses: number | null
          last_review: string | null
          reps: number | null
          review_time_ms: number | null
          reviewed_at: string | null
          scheduled_days: number | null
          stability: number | null
          state: number
          user_id: string
        }
        Insert: {
          difficulty?: number | null
          due: string
          elapsed_days?: number | null
          flashcard_id: string
          grade: number
          id?: number
          lapses?: number | null
          last_review?: string | null
          reps?: number | null
          review_time_ms?: number | null
          reviewed_at?: string | null
          scheduled_days?: number | null
          stability?: number | null
          state: number
          user_id: string
        }
        Update: {
          difficulty?: number | null
          due?: string
          elapsed_days?: number | null
          flashcard_id?: string
          grade?: number
          id?: number
          lapses?: number | null
          last_review?: string | null
          reps?: number | null
          review_time_ms?: number | null
          reviewed_at?: string | null
          scheduled_days?: number | null
          stability?: number | null
          state?: number
          user_id?: string
        }
        Relationships: []
      }
      review_history: {
        Row: {
          content_id: string
          content_type: string
          created_at: string | null
          difficulty: number | null
          due: string
          elapsed_days: number | null
          grade: number
          id: number
          lapses: number | null
          last_review: string | null
          reps: number | null
          review_time_ms: number | null
          reviewed_at: string
          scheduled_days: number | null
          stability: number | null
          state: string
          user_id: string
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string | null
          difficulty?: number | null
          due: string
          elapsed_days?: number | null
          grade: number
          id?: number
          lapses?: number | null
          last_review?: string | null
          reps?: number | null
          review_time_ms?: number | null
          reviewed_at?: string
          scheduled_days?: number | null
          stability?: number | null
          state: string
          user_id: string
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string | null
          difficulty?: number | null
          due?: string
          elapsed_days?: number | null
          grade?: number
          id?: number
          lapses?: number | null
          last_review?: string | null
          reps?: number | null
          review_time_ms?: number | null
          reviewed_at?: string
          scheduled_days?: number | null
          stability?: number | null
          state?: string
          user_id?: string
        }
        Relationships: []
      }
      // flashcard_search_index removida - agora usa GIN index diretamente na tabela decks
      flashcards: {
        Row: {
          algorithm: string | null
          anki_data: Json | null
          answer: string | null
          back_content: string | null
          created_at: Json | null
          deck_id: string | null
          difficulty: number | null
          front_content: string | null
          id: string
          lapse_count: number | null
          last_review: Json | null
          last_reviewed_at: Json | null
          next_review: Json | null
          next_review_at: Json | null
          question: string | null
          retrievability: number | null
          review_count: number | null
          srs_ease_factor: number | null
          srs_interval: number | null
          srs_lapses: number | null
          srs_repetitions: number | null
          stability: number | null
          state: number | null
          status: string | null
          tags: string | null
          updated_at: Json | null
        }
        Insert: {
          algorithm?: string | null
          anki_data?: Json | null
          answer?: string | null
          back_content?: string | null
          created_at?: Json | null
          deck_id?: string | null
          difficulty?: number | null
          front_content?: string | null
          id: string
          lapse_count?: number | null
          last_review?: Json | null
          last_reviewed_at?: Json | null
          next_review?: Json | null
          next_review_at?: Json | null
          question?: string | null
          retrievability?: number | null
          review_count?: number | null
          srs_ease_factor?: number | null
          srs_interval?: number | null
          srs_lapses?: number | null
          srs_repetitions?: number | null
          stability?: number | null
          state?: number | null
          status?: string | null
          tags?: string | null
          updated_at?: Json | null
        }
        Update: {
          algorithm?: string | null
          anki_data?: Json | null
          answer?: string | null
          back_content?: string | null
          created_at?: Json | null
          deck_id?: string | null
          difficulty?: number | null
          front_content?: string | null
          id?: string
          lapse_count?: number | null
          last_review?: Json | null
          last_reviewed_at?: Json | null
          next_review?: Json | null
          next_review_at?: Json | null
          question?: string | null
          retrievability?: number | null
          review_count?: number | null
          srs_ease_factor?: number | null
          srs_interval?: number | null
          srs_lapses?: number | null
          srs_repetitions?: number | null
          stability?: number | null
          state?: number | null
          status?: string | null
          tags?: string | null
          updated_at?: Json | null
        }
        Relationships: []
      }
      fsrs_cards: {
        Row: {
          content_id: string
          created_at: string
          deck_id: string
          deck_name: string | null
          difficulty: number
          due: string
          elapsed_days: number
          filter_name: string | null
          id: string
          lapses: number
          last_review: string | null
          reps: number
          scheduled_days: number
          stability: number
          state: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content_id: string
          created_at?: string
          deck_id: string
          deck_name?: string | null
          difficulty?: number
          due: string
          elapsed_days?: number
          filter_name?: string | null
          id?: string
          lapses?: number
          last_review?: string | null
          reps?: number
          scheduled_days?: number
          stability?: number
          state?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content_id?: string
          created_at?: string
          deck_id?: string
          deck_name?: string | null
          difficulty?: number
          due?: string
          elapsed_days?: number
          filter_name?: string | null
          id?: string
          lapses?: number
          last_review?: string | null
          reps?: number
          scheduled_days?: number
          stability?: number
          state?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }

      invitations: {
        Row: {
          accepted_at: Json | null
          created_at: Json | null
          declined_at: Json | null
          expires_at: Json | null
          id: string | null
          invitation_type: string | null
          invite_code: string | null
          invitee_email: string | null
          invitee_id: string | null
          inviter_id: string | null
          last_reminder_at: Json | null
          metadata: Json | null
          reminders_sent: number | null
          rewards: Json | null
          sent_at: Json | null
          status: string | null
          updated_at: Json | null
        }
        Insert: {
          accepted_at?: Json | null
          created_at?: Json | null
          declined_at?: Json | null
          expires_at?: Json | null
          id?: string | null
          invitation_type?: string | null
          invite_code?: string | null
          invitee_email?: string | null
          invitee_id?: string | null
          inviter_id?: string | null
          last_reminder_at?: Json | null
          metadata?: Json | null
          reminders_sent?: number | null
          rewards?: Json | null
          sent_at?: Json | null
          status?: string | null
          updated_at?: Json | null
        }
        Update: {
          accepted_at?: Json | null
          created_at?: Json | null
          declined_at?: Json | null
          expires_at?: Json | null
          id?: string | null
          invitation_type?: string | null
          invite_code?: string | null
          invitee_email?: string | null
          invitee_id?: string | null
          inviter_id?: string | null
          last_reminder_at?: Json | null
          metadata?: Json | null
          reminders_sent?: number | null
          rewards?: Json | null
          sent_at?: Json | null
          status?: string | null
          updated_at?: Json | null
        }
        Relationships: []
      }
      leaderboards: {
        Row: {
          achievements: Json | null
          category: string | null
          created_at: Json | null
          id: string | null
          is_active: boolean | null
          last_updated: Json | null
          leaderboard_type: string | null
          metadata: Json | null
          period: string | null
          previous_rank: number | null
          rank: number | null
          score: number | null
          streak: number | null
          user_id: string | null
        }
        Insert: {
          achievements?: Json | null
          category?: string | null
          created_at?: Json | null
          id?: string | null
          is_active?: boolean | null
          last_updated?: Json | null
          leaderboard_type?: string | null
          metadata?: Json | null
          period?: string | null
          previous_rank?: number | null
          rank?: number | null
          score?: number | null
          streak?: number | null
          user_id?: string | null
        }
        Update: {
          achievements?: Json | null
          category?: string | null
          created_at?: Json | null
          id?: string | null
          is_active?: boolean | null
          last_updated?: Json | null
          leaderboard_type?: string | null
          metadata?: Json | null
          period?: string | null
          previous_rank?: number | null
          rank?: number | null
          score?: number | null
          streak?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      likes: {
        Row: {
          content_id: string | null
          content_type: string | null
          created_at: Json | null
          id: string
          like_type: string | null
          updated_at: Json | null
          user_id: string | null
        }
        Insert: {
          content_id?: string | null
          content_type?: string | null
          created_at?: Json | null
          id: string
          like_type?: string | null
          updated_at?: Json | null
          user_id?: string | null
        }
        Update: {
          content_id?: string | null
          content_type?: string | null
          created_at?: Json | null
          id?: string
          like_type?: string | null
          updated_at?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      media: {
        Row: {
          created_at: Json | null
          duration: number | null
          file_name: string | null
          file_size: number | null
          height: number | null
          id: string | null
          is_public: boolean | null
          metadata: Json | null
          mime_type: string | null
          original_name: string | null
          processed_at: Json | null
          storage_path: string | null
          storage_provider: string | null
          tags: Json | null
          thumbnail_url: string | null
          updated_at: Json | null
          uploaded_by: string | null
          url: string | null
          width: number | null
        }
        Insert: {
          created_at?: Json | null
          duration?: number | null
          file_name?: string | null
          file_size?: number | null
          height?: number | null
          id?: string | null
          is_public?: boolean | null
          metadata?: Json | null
          mime_type?: string | null
          original_name?: string | null
          processed_at?: Json | null
          storage_path?: string | null
          storage_provider?: string | null
          tags?: Json | null
          thumbnail_url?: string | null
          updated_at?: Json | null
          uploaded_by?: string | null
          url?: string | null
          width?: number | null
        }
        Update: {
          created_at?: Json | null
          duration?: number | null
          file_name?: string | null
          file_size?: number | null
          height?: number | null
          id?: string | null
          is_public?: boolean | null
          metadata?: Json | null
          mime_type?: string | null
          original_name?: string | null
          processed_at?: Json | null
          storage_path?: string | null
          storage_provider?: string | null
          tags?: Json | null
          thumbnail_url?: string | null
          updated_at?: Json | null
          uploaded_by?: string | null
          url?: string | null
          width?: number | null
        }
        Relationships: []
      }
      media_files: {
        Row: {
          created_at: Json | null
          filename: string | null
          id: string | null
          is_public: boolean | null
          mime_type: string | null
          original_filename: string | null
          size: number | null
          status: string | null
          type: string | null
          updated_at: Json | null
          url: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: Json | null
          filename?: string | null
          id?: string | null
          is_public?: boolean | null
          mime_type?: string | null
          original_filename?: string | null
          size?: number | null
          status?: string | null
          type?: string | null
          updated_at?: Json | null
          url?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: Json | null
          filename?: string | null
          id?: string | null
          is_public?: boolean | null
          mime_type?: string | null
          original_filename?: string | null
          size?: number | null
          status?: string | null
          type?: string | null
          updated_at?: Json | null
          url?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      mentorships: {
        Row: {
          completed_meetings: number | null
          created_at: Json | null
          custom_frequency_days: string | null
          id: string | null
          meeting_frequency: string | null
          mentor_id: string | null
          next_meeting_date: Json | null
          notes: string | null
          objectives: string | null
          start_date: Json | null
          status: string | null
          student_id: string | null
          total_meetings: number | null
          updated_at: Json | null
        }
        Insert: {
          completed_meetings?: number | null
          created_at?: Json | null
          custom_frequency_days?: string | null
          id?: string | null
          meeting_frequency?: string | null
          mentor_id?: string | null
          next_meeting_date?: Json | null
          notes?: string | null
          objectives?: string | null
          start_date?: Json | null
          status?: string | null
          student_id?: string | null
          total_meetings?: number | null
          updated_at?: Json | null
        }
        Update: {
          completed_meetings?: number | null
          created_at?: Json | null
          custom_frequency_days?: string | null
          id?: string | null
          meeting_frequency?: string | null
          mentor_id?: string | null
          next_meeting_date?: Json | null
          notes?: string | null
          objectives?: string | null
          start_date?: Json | null
          status?: string | null
          student_id?: string | null
          total_meetings?: number | null
          updated_at?: Json | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: Json | null
          id: string | null
          is_read: boolean | null
          message: string | null
          priority: string | null
          read_at: Json | null
          related_id: string | null
          related_type: string | null
          title: string | null
          type: string | null
          updated_at: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: Json | null
          id?: string | null
          is_read?: boolean | null
          message?: string | null
          priority?: string | null
          read_at?: Json | null
          related_id?: string | null
          related_type?: string | null
          title?: string | null
          type?: string | null
          updated_at?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: Json | null
          id?: string | null
          is_read?: boolean | null
          message?: string | null
          priority?: string | null
          read_at?: Json | null
          related_id?: string | null
          related_type?: string | null
          title?: string | null
          type?: string | null
          updated_at?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      official_exams: {
        Row: {
          application_date: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          exam_edition: string | null
          exam_name: string | null
          exam_type: string | null
          exam_year: number | null
          id: string | null
          institution: string | null
          instructions: string | null
          is_official: boolean | null
          is_published: boolean | null
          metadata: Json | null
          passing_score: number | null
          published_at: string | null
          question_ids: Json | null
          tags: string[] | null
          time_limit_minutes: number | null
          title: string | null
          total_points: number | null
          total_questions: number | null
          updated_at: string | null
        }
        Insert: {
          application_date?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          exam_edition?: string | null
          exam_name: string
          exam_type: string
          exam_year: number
          id?: string | null
          institution?: string | null
          instructions?: string | null
          is_official?: boolean | null
          is_published?: boolean | null
          metadata?: Json | null
          passing_score?: number | null
          published_at?: string | null
          question_ids?: Json | null
          tags?: string[] | null
          time_limit_minutes?: number | null
          title: string
          total_points?: number | null
          total_questions?: number | null
          updated_at?: string | null
        }
        Update: {
          application_date?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          exam_edition?: string | null
          exam_name?: string
          exam_type?: string
          exam_year?: number
          id?: string | null
          institution?: string | null
          instructions?: string | null
          is_official?: boolean | null
          is_published?: boolean | null
          metadata?: Json | null
          passing_score?: number | null
          published_at?: string | null
          question_ids?: Json | null
          tags?: string[] | null
          time_limit_minutes?: number | null
          title?: string
          total_points?: number | null
          total_questions?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number | null
          created_at: Json | null
          currency: string | null
          due_date: Json | null
          failed_at: Json | null
          failure_reason: string | null
          id: string
          metadata: Json | null
          paid_at: Json | null
          payment_date: Json | null
          payment_method: string | null
          payment_provider: string | null
          status: string | null
          subscription_id: string | null
          transaction_id: string | null
          updated_at: Json | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: Json | null
          currency?: string | null
          due_date?: Json | null
          failed_at?: Json | null
          failure_reason?: string | null
          id: string
          metadata?: Json | null
          paid_at?: Json | null
          payment_date?: Json | null
          payment_method?: string | null
          payment_provider?: string | null
          status?: string | null
          subscription_id?: string | null
          transaction_id?: string | null
          updated_at?: Json | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: Json | null
          currency?: string | null
          due_date?: Json | null
          failed_at?: Json | null
          failure_reason?: string | null
          id?: string
          metadata?: Json | null
          paid_at?: Json | null
          payment_date?: Json | null
          payment_method?: string | null
          payment_provider?: string | null
          status?: string | null
          subscription_id?: string | null
          transaction_id?: string | null
          updated_at?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      performance_metrics: {
        Row: {
          documentsRead: number | null
          executionTimeMs: number | null
          operationType: string | null
          queryFilters: Json | null
          timestamp: Json | null
          userId: string | null
        }
        Insert: {
          documentsRead?: number | null
          executionTimeMs?: number | null
          operationType?: string | null
          queryFilters?: Json | null
          timestamp?: Json | null
          userId?: string | null
        }
        Update: {
          documentsRead?: number | null
          executionTimeMs?: number | null
          operationType?: string | null
          queryFilters?: Json | null
          timestamp?: Json | null
          userId?: string | null
        }
        Relationships: []
      }
      planner_tasks: {
        Row: {
          created_at: string | null
          description: string | null
          id: string | null
          manual_type: string | null
          priority: string | null
          scheduled_date: string | null
          source: string | null
          status: string | null
          target_url: string | null
          title: string | null
          type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          manual_type?: string | null
          priority?: string | null
          scheduled_date?: string | null
          source?: string | null
          status?: string | null
          target_url?: string | null
          title?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          manual_type?: string | null
          priority?: string | null
          scheduled_date?: string | null
          source?: string | null
          status?: string | null
          target_url?: string | null
          title?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      plans: {
        Row: {
          created_at: Json | null
          currency: string | null
          description: string | null
          display_order: number | null
          duration_days: number | null
          features: Json | null
          has_advanced_analytics: boolean | null
          has_error_notebook: boolean | null
          has_mentorship: boolean | null
          id: string | null
          interval: string | null
          interval_count: number | null
          is_active: boolean | null
          is_popular: boolean | null
          is_public: boolean | null
          max_flashcards: number | null
          max_questions: number | null
          max_simulated_exams: number | null
          metadata: Json | null
          name: string | null
          price: number | null
          stripe_price_id: string | null
          stripe_product_id: string | null
          trial_days: number | null
          updated_at: Json | null
        }
        Insert: {
          created_at?: Json | null
          currency?: string | null
          description?: string | null
          display_order?: number | null
          duration_days?: number | null
          features?: Json | null
          has_advanced_analytics?: boolean | null
          has_error_notebook?: boolean | null
          has_mentorship?: boolean | null
          id?: string | null
          interval?: string | null
          interval_count?: number | null
          is_active?: boolean | null
          is_popular?: boolean | null
          is_public?: boolean | null
          max_flashcards?: number | null
          max_questions?: number | null
          max_simulated_exams?: number | null
          metadata?: Json | null
          name?: string | null
          price?: number | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          trial_days?: number | null
          updated_at?: Json | null
        }
        Update: {
          created_at?: Json | null
          currency?: string | null
          description?: string | null
          display_order?: number | null
          duration_days?: number | null
          features?: Json | null
          has_advanced_analytics?: boolean | null
          has_error_notebook?: boolean | null
          has_mentorship?: boolean | null
          id?: string | null
          interval?: string | null
          interval_count?: number | null
          is_active?: boolean | null
          is_popular?: boolean | null
          is_public?: boolean | null
          max_flashcards?: number | null
          max_questions?: number | null
          max_simulated_exams?: number | null
          metadata?: Json | null
          name?: string | null
          price?: number | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          trial_days?: number | null
          updated_at?: Json | null
        }
        Relationships: []
      }
      programmed_reviews: {
        Row: {
          content_id: string | null
          content_type: string | null
          created_at: Json | null
          deck_id: string | null
          ease_factor: number | null
          id: string | null
          interval_days: number | null
          lapses: number | null
          last_reviewed_at: Json | null
          next_review_at: Json | null
          notes: string | null
          original_answer_correct: boolean | null
          repetitions: number | null
          status: string | null
          updated_at: Json | null
          user_id: string | null
        }
        Insert: {
          content_id?: string | null
          content_type?: string | null
          created_at?: Json | null
          deck_id?: string | null
          ease_factor?: number | null
          id?: string | null
          interval_days?: number | null
          lapses?: number | null
          last_reviewed_at?: Json | null
          next_review_at?: Json | null
          notes?: string | null
          original_answer_correct?: boolean | null
          repetitions?: number | null
          status?: string | null
          updated_at?: Json | null
          user_id?: string | null
        }
        Update: {
          content_id?: string | null
          content_type?: string | null
          created_at?: Json | null
          deck_id?: string | null
          ease_factor?: number | null
          id?: string | null
          interval_days?: number | null
          lapses?: number | null
          last_reviewed_at?: Json | null
          next_review_at?: Json | null
          notes?: string | null
          original_answer_correct?: boolean | null
          repetitions?: number | null
          status?: string | null
          updated_at?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      question_list_folders: {
        Row: {
          color: string | null
          created_at: Json | null
          description: string | null
          icon: string | null
          list_count: number | null
          name: string | null
          order: number | null
          status: string | null
          updated_at: Json | null
          user_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: Json | null
          description?: string | null
          icon?: string | null
          list_count?: number | null
          name?: string | null
          order?: number | null
          status?: string | null
          updated_at?: Json | null
          user_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: Json | null
          description?: string | null
          icon?: string | null
          list_count?: number | null
          name?: string | null
          order?: number | null
          status?: string | null
          updated_at?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      question_list_items: {
        Row: {
          added_at: Json | null
          correct_attempts: number | null
          created_at: Json | null
          id: string | null
          incorrect_attempts: number | null
          is_completed: boolean | null
          last_attempted_at: string | null
          order: number | null
          personal_notes: string | null
          question_id: string | null
          question_list_id: string | null
          status: string | null
          updated_at: Json | null
        }
        Insert: {
          added_at?: Json | null
          correct_attempts?: number | null
          created_at?: Json | null
          id?: string | null
          incorrect_attempts?: number | null
          is_completed?: boolean | null
          last_attempted_at?: string | null
          order?: number | null
          personal_notes?: string | null
          question_id?: string | null
          question_list_id?: string | null
          status?: string | null
          updated_at?: Json | null
        }
        Update: {
          added_at?: Json | null
          correct_attempts?: number | null
          created_at?: Json | null
          id?: string | null
          incorrect_attempts?: number | null
          is_completed?: boolean | null
          last_attempted_at?: string | null
          order?: number | null
          personal_notes?: string | null
          question_id?: string | null
          question_list_id?: string | null
          status?: string | null
          updated_at?: Json | null
        }
        Relationships: []
      }
      question_lists: {
        Row: {
          completion_percentage: number | null
          created_at: Json | null
          description: string | null
          favorite_count: number | null
          folder_id: string | null
          id: string | null
          is_public: boolean | null
          last_added_at: Json | null
          last_study_date: string | null
          name: string | null
          question_count: number | null
          questions: Json | null
          status: string | null
          tags: Json | null
          title: string | null
          updated_at: Json | null
          user_id: string | null
          view_count: number | null
        }
        Insert: {
          completion_percentage?: number | null
          created_at?: Json | null
          description?: string | null
          favorite_count?: number | null
          folder_id?: string | null
          id?: string | null
          is_public?: boolean | null
          last_added_at?: Json | null
          last_study_date?: string | null
          name?: string | null
          question_count?: number | null
          questions?: Json | null
          status?: string | null
          tags?: Json | null
          title?: string | null
          updated_at?: Json | null
          user_id?: string | null
          view_count?: number | null
        }
        Update: {
          completion_percentage?: number | null
          created_at?: Json | null
          description?: string | null
          favorite_count?: number | null
          folder_id?: string | null
          id?: string | null
          is_public?: boolean | null
          last_added_at?: Json | null
          last_study_date?: string | null
          name?: string | null
          question_count?: number | null
          questions?: Json | null
          status?: string | null
          tags?: Json | null
          title?: string | null
          updated_at?: Json | null
          user_id?: string | null
          view_count?: number | null
        }
        Relationships: []
      }
      question_responses: {
        Row: {
          answered_at: Json | null
          created_at: Json | null
          ease_factor: number | null
          fail_streak: number | null
          id: string | null
          interval: number | null
          is_correct_on_first_attempt: boolean | null
          is_learning: boolean | null
          is_leech: boolean | null
          last_review_quality: number | null
          last_reviewed_at: Json | null
          next_review_date: Json | null
          programmed_review_id: string | null
          question_id: string | null
          question_list_id: string | null
          repetitions: number | null
          response_time_seconds: number | null
          review_quality: number | null
          selected_alternative_id: string | null
          selected_option_id: string | null
          updated_at: Json | null
          user_id: string | null
        }
        Insert: {
          answered_at?: Json | null
          created_at?: Json | null
          ease_factor?: number | null
          fail_streak?: number | null
          id?: string | null
          interval?: number | null
          is_correct_on_first_attempt?: boolean | null
          is_learning?: boolean | null
          is_leech?: boolean | null
          last_review_quality?: number | null
          last_reviewed_at?: Json | null
          next_review_date?: Json | null
          programmed_review_id?: string | null
          question_id?: string | null
          question_list_id?: string | null
          repetitions?: number | null
          response_time_seconds?: number | null
          review_quality?: number | null
          selected_alternative_id?: string | null
          selected_option_id?: string | null
          updated_at?: Json | null
          user_id?: string | null
        }
        Update: {
          answered_at?: Json | null
          created_at?: Json | null
          ease_factor?: number | null
          fail_streak?: number | null
          id?: string | null
          interval?: number | null
          is_correct_on_first_attempt?: boolean | null
          is_learning?: boolean | null
          is_leech?: boolean | null
          last_review_quality?: number | null
          last_reviewed_at?: Json | null
          next_review_date?: Json | null
          programmed_review_id?: string | null
          question_id?: string | null
          question_list_id?: string | null
          repetitions?: number | null
          response_time_seconds?: number | null
          review_quality?: number | null
          selected_alternative_id?: string | null
          selected_option_id?: string | null
          updated_at?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      questions: {
        Row: {
          answer_count: number | null
          content: string | null
          correct_answer: string | null
          created_at: Json | null
          deck_id: string | null
          difficulty: number | null
          explanation: string | null
          id: string
          is_public: boolean | null
          like_count: number | null
          options: Json | null
          question_type: string | null
          tags: Json | null
          title: string | null
          updated_at: Json | null
          user_id: string | null
          view_count: number | null
        }
        Insert: {
          answer_count?: number | null
          content?: string | null
          correct_answer?: string | null
          created_at?: Json | null
          deck_id?: string | null
          difficulty?: number | null
          explanation?: string | null
          id: string
          is_public?: boolean | null
          like_count?: number | null
          options?: Json | null
          question_type?: string | null
          tags?: Json | null
          title?: string | null
          updated_at?: Json | null
          user_id?: string | null
          view_count?: number | null
        }
        Update: {
          answer_count?: number | null
          content?: string | null
          correct_answer?: string | null
          created_at?: Json | null
          deck_id?: string | null
          difficulty?: number | null
          explanation?: string | null
          id?: string
          is_public?: boolean | null
          like_count?: number | null
          options?: Json | null
          question_type?: string | null
          tags?: Json | null
          title?: string | null
          updated_at?: Json | null
          user_id?: string | null
          view_count?: number | null
        }
        Relationships: []
      }
      rate_limit_violations: {
        Row: {
          api_key_id: string | null
          count: number | null
          endpoint: string | null
          id: string | null
          ip_address: string | null
          key: string | null
          limit: number | null
          timestamp: Json | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          api_key_id?: string | null
          count?: number | null
          endpoint?: string | null
          id?: string | null
          ip_address?: string | null
          key?: string | null
          limit?: number | null
          timestamp?: Json | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          api_key_id?: string | null
          count?: number | null
          endpoint?: string | null
          id?: string | null
          ip_address?: string | null
          key?: string | null
          limit?: number | null
          timestamp?: Json | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          count: number | null
          created_at: Json | null
          id: string | null
          key: string | null
          reset_at: Json | null
          type: string | null
          updated_at: Json | null
        }
        Insert: {
          count?: number | null
          created_at?: Json | null
          id?: string | null
          key?: string | null
          reset_at?: Json | null
          type?: string | null
          updated_at?: Json | null
        }
        Update: {
          count?: number | null
          created_at?: Json | null
          id?: string | null
          key?: string | null
          reset_at?: Json | null
          type?: string | null
          updated_at?: Json | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          algorithm_data: Json | null
          created_at: Json | null
          deck_id: string | null
          ease_factor: number | null
          flashcard_id: string | null
          id: string
          new_interval: number | null
          next_review_date: Json | null
          previous_interval: number | null
          rating: number | null
          response_time: number | null
          review_date: Json | null
          review_type: string | null
          updated_at: Json | null
          user_id: string | null
        }
        Insert: {
          algorithm_data?: Json | null
          created_at?: Json | null
          deck_id?: string | null
          ease_factor?: number | null
          flashcard_id?: string | null
          id: string
          new_interval?: number | null
          next_review_date?: Json | null
          previous_interval?: number | null
          rating?: number | null
          response_time?: number | null
          review_date?: Json | null
          review_type?: string | null
          updated_at?: Json | null
          user_id?: string | null
        }
        Update: {
          algorithm_data?: Json | null
          created_at?: Json | null
          deck_id?: string | null
          ease_factor?: number | null
          flashcard_id?: string | null
          id?: string
          new_interval?: number | null
          next_review_date?: Json | null
          previous_interval?: number | null
          rating?: number | null
          response_time?: number | null
          review_date?: Json | null
          review_type?: string | null
          updated_at?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      scheduled_tasks: {
        Row: {
          created_at: Json | null
          created_by: string | null
          description: string | null
          id: string | null
          is_active: boolean | null
          last_run_at: Json | null
          name: string | null
          next_run_at: Json | null
          parameters: Json | null
          schedule: Json | null
          type: string | null
          updated_at: Json | null
        }
        Insert: {
          created_at?: Json | null
          created_by?: string | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          last_run_at?: Json | null
          name?: string | null
          next_run_at?: Json | null
          parameters?: Json | null
          schedule?: Json | null
          type?: string | null
          updated_at?: Json | null
        }
        Update: {
          created_at?: Json | null
          created_by?: string | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          last_run_at?: Json | null
          name?: string | null
          next_run_at?: Json | null
          parameters?: Json | null
          schedule?: Json | null
          type?: string | null
          updated_at?: Json | null
        }
        Relationships: []
      }
      sessions: {
        Row: {
          created_at: Json | null
          device_id: string | null
          device_type: string | null
          expires_at: Json | null
          id: string | null
          ip_address: string | null
          is_active: boolean | null
          last_activity: Json | null
          location: Json | null
          platform: string | null
          refresh_token: string | null
          session_token: string | null
          updated_at: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: Json | null
          device_id?: string | null
          device_type?: string | null
          expires_at?: Json | null
          id?: string | null
          ip_address?: string | null
          is_active?: boolean | null
          last_activity?: Json | null
          location?: Json | null
          platform?: string | null
          refresh_token?: string | null
          session_token?: string | null
          updated_at?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: Json | null
          device_id?: string | null
          device_type?: string | null
          expires_at?: Json | null
          id?: string | null
          ip_address?: string | null
          is_active?: boolean | null
          last_activity?: Json | null
          location?: Json | null
          platform?: string | null
          refresh_token?: string | null
          session_token?: string | null
          updated_at?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      simulated_exam_results: {
        Row: {
          answered_questions: number | null
          answers: Json | null
          completed_at: Json | null
          correct_answers: number | null
          correct_count: number | null
          created_at: Json | null
          end_time: Json | null
          feedback: string | null
          id: string | null
          incorrect_answers: number | null
          incorrect_count: number | null
          score: string | null
          simulated_exam_id: string | null
          simulated_exam_title: string | null
          skipped_answers: number | null
          start_time: Json | null
          started_at: Json | null
          status: string | null
          time_taken_seconds: number | null
          total_questions: number | null
          total_time_spent_seconds: number | null
          updated_at: Json | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          answered_questions?: number | null
          answers?: Json | null
          completed_at?: Json | null
          correct_answers?: number | null
          correct_count?: number | null
          created_at?: Json | null
          end_time?: Json | null
          feedback?: string | null
          id?: string | null
          incorrect_answers?: number | null
          incorrect_count?: number | null
          score?: string | null
          simulated_exam_id?: string | null
          simulated_exam_title?: string | null
          skipped_answers?: number | null
          start_time?: Json | null
          started_at?: Json | null
          status?: string | null
          time_taken_seconds?: number | null
          total_questions?: number | null
          total_time_spent_seconds?: number | null
          updated_at?: Json | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          answered_questions?: number | null
          answers?: Json | null
          completed_at?: Json | null
          correct_answers?: number | null
          correct_count?: number | null
          created_at?: Json | null
          end_time?: Json | null
          feedback?: string | null
          id?: string | null
          incorrect_answers?: number | null
          incorrect_count?: number | null
          score?: string | null
          simulated_exam_id?: string | null
          simulated_exam_title?: string | null
          skipped_answers?: number | null
          start_time?: Json | null
          started_at?: Json | null
          status?: string | null
          time_taken_seconds?: number | null
          total_questions?: number | null
          total_time_spent_seconds?: number | null
          updated_at?: Json | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      simulated_exams: {
        Row: {
          average_score: string | null
          created_at: Json | null
          created_by: string | null
          creator_name: string | null
          description: string | null
          difficulty: string | null
          filter_ids: Json | null
          id: string | null
          is_public: boolean | null
          last_published_at: Json | null
          question_count: number | null
          question_ids: Json | null
          questions: Json | null
          randomize: boolean | null
          settings: string | null
          source_official_exam_id: string | null
          status: string | null
          sub_filter_ids: Json | null
          tags: Json | null
          time_limit_minutes: number | null
          title: string | null
          total_attempts: number | null
          total_points: number | null
          total_questions: number | null
          updated_at: Json | null
          user_id: string | null
        }
        Insert: {
          average_score?: string | null
          created_at?: Json | null
          created_by?: string | null
          creator_name?: string | null
          description?: string | null
          difficulty?: string | null
          filter_ids?: Json | null
          id?: string | null
          is_public?: boolean | null
          last_published_at?: Json | null
          question_count?: number | null
          question_ids?: Json | null
          questions?: Json | null
          randomize?: boolean | null
          settings?: string | null
          source_official_exam_id?: string | null
          status?: string | null
          sub_filter_ids?: Json | null
          tags?: Json | null
          time_limit_minutes?: number | null
          title?: string | null
          total_attempts?: number | null
          total_points?: number | null
          total_questions?: number | null
          updated_at?: Json | null
          user_id?: string | null
        }
        Update: {
          average_score?: string | null
          created_at?: Json | null
          created_by?: string | null
          creator_name?: string | null
          description?: string | null
          difficulty?: string | null
          filter_ids?: Json | null
          id?: string | null
          is_public?: boolean | null
          last_published_at?: Json | null
          question_count?: number | null
          question_ids?: Json | null
          questions?: Json | null
          randomize?: boolean | null
          settings?: string | null
          source_official_exam_id?: string | null
          status?: string | null
          sub_filter_ids?: Json | null
          tags?: Json | null
          time_limit_minutes?: number | null
          title?: string | null
          total_attempts?: number | null
          total_points?: number | null
          total_questions?: number | null
          updated_at?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      // study_sessions: {
      //   Row: {
      //     accuracy: number | null
      //     average_response_time: number | null
      //     cards_studied: number | null
      //     correct_answers: number | null
      //     created_at: Json | null
      //     deck_id: string | null
      //     duration: number | null
      //     end_time: Json | null
      //     id: string | null
      //     incorrect_answers: number | null
      //     session_data: Json | null
      //     session_type: string | null
      //     start_time: Json | null
      //     updated_at: Json | null
      //     user_id: string | null
      //   }
      //   Insert: {
      //     accuracy?: number | null
      //     average_response_time?: number | null
      //     cards_studied?: number | null
      //     correct_answers?: number | null
      //     created_at?: Json | null
      //     deck_id?: string | null
      //     duration?: number | null
      //     end_time?: Json | null
      //     id?: string | null
      //     incorrect_answers?: number | null
      //     session_data?: Json | null
      //     session_type?: string | null
      //     start_time?: Json | null
      //     updated_at?: Json | null
      //     user_id?: string | null
      //   }
      //   Update: {
      //     accuracy?: number | null
      //     average_response_time?: number | null
      //     cards_studied?: number | null
      //     correct_answers?: number | null
      //     created_at?: Json | null
      //     deck_id?: string | null
      //     duration?: number | null
      //     end_time?: Json | null
      //     id?: string | null
      //     incorrect_answers?: number | null
      //     session_data?: Json | null
      //     session_type?: string | null
      //     start_time?: Json | null
      //     updated_at?: Json | null
      //     user_id?: string | null
      //   }
      //   Relationships: []
      // } // Removed
      sub_filters: {
        Row: {
          created_at: Json | null
          filter_id: string | null
          id: string | null
          is_active: boolean | null
          level: number | null
          name: string | null
          order: number | null
          parent_id: string | null
          status: string | null
          updated_at: Json | null
        }
        Insert: {
          created_at?: Json | null
          filter_id?: string | null
          id?: string | null
          is_active?: boolean | null
          level?: number | null
          name?: string | null
          order?: number | null
          parent_id?: string | null
          status?: string | null
          updated_at?: Json | null
        }
        Update: {
          created_at?: Json | null
          filter_id?: string | null
          id?: string | null
          is_active?: boolean | null
          level?: number | null
          name?: string | null
          order?: number | null
          parent_id?: string | null
          status?: string | null
          updated_at?: Json | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          canceled_at: Json | null
          created_at: Json | null
          current_period_end: Json | null
          current_period_start: Json | null
          id: string
          metadata: Json | null
          plan_id: string | null
          plan_name: string | null
          provider_customer_id: string | null
          provider_subscription_id: string | null
          status: string | null
          subscription_provider: string | null
          trial_end: Json | null
          trial_start: Json | null
          updated_at: Json | null
          user_id: string | null
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          canceled_at?: Json | null
          created_at?: Json | null
          current_period_end?: Json | null
          current_period_start?: Json | null
          id: string
          metadata?: Json | null
          plan_id?: string | null
          plan_name?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string | null
          subscription_provider?: string | null
          trial_end?: Json | null
          trial_start?: Json | null
          updated_at?: Json | null
          user_id?: string | null
        }
        Update: {
          cancel_at_period_end?: boolean | null
          canceled_at?: Json | null
          created_at?: Json | null
          current_period_end?: Json | null
          current_period_start?: Json | null
          id?: string
          metadata?: Json | null
          plan_id?: string | null
          plan_name?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string | null
          subscription_provider?: string | null
          trial_end?: Json | null
          trial_start?: Json | null
          updated_at?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      tags: {
        Row: {
          category: string | null
          color: string | null
          created_at: Json | null
          created_by: string | null
          description: string | null
          hierarchy: Json | null
          icon: string | null
          id: string | null
          is_active: boolean | null
          is_system: boolean | null
          metadata: Json | null
          name: string | null
          parent_id: string | null
          slug: string | null
          updated_at: Json | null
          usage_count: number | null
        }
        Insert: {
          category?: string | null
          color?: string | null
          created_at?: Json | null
          created_by?: string | null
          description?: string | null
          hierarchy?: Json | null
          icon?: string | null
          id?: string | null
          is_active?: boolean | null
          is_system?: boolean | null
          metadata?: Json | null
          name?: string | null
          parent_id?: string | null
          slug?: string | null
          updated_at?: Json | null
          usage_count?: number | null
        }
        Update: {
          category?: string | null
          color?: string | null
          created_at?: Json | null
          created_by?: string | null
          description?: string | null
          hierarchy?: Json | null
          icon?: string | null
          id?: string | null
          is_active?: boolean | null
          is_system?: boolean | null
          metadata?: Json | null
          name?: string | null
          parent_id?: string | null
          slug?: string | null
          updated_at?: Json | null
          usage_count?: number | null
        }
        Relationships: []
      }
      task_execution_logs: {
        Row: {
          completed_at: Json | null
          duration: number | null
          error: string | null
          id: string | null
          metadata: Json | null
          result: Json | null
          started_at: Json | null
          status: string | null
          task_id: string | null
          task_name: string | null
        }
        Insert: {
          completed_at?: Json | null
          duration?: number | null
          error?: string | null
          id?: string | null
          metadata?: Json | null
          result?: Json | null
          started_at?: Json | null
          status?: string | null
          task_id?: string | null
          task_name?: string | null
        }
        Update: {
          completed_at?: Json | null
          duration?: number | null
          error?: string | null
          id?: string | null
          metadata?: Json | null
          result?: Json | null
          started_at?: Json | null
          status?: string | null
          task_id?: string | null
          task_name?: string | null
        }
        Relationships: []
      }
      templates: {
        Row: {
          category: string | null
          created_at: Json | null
          created_by: string | null
          description: string | null
          fields: Json | null
          id: string | null
          is_official: boolean | null
          is_public: boolean | null
          name: string | null
          preview: Json | null
          rating: number | null
          rating_count: number | null
          structure: Json | null
          styling: Json | null
          tags: Json | null
          title: string | null
          type: string | null
          updated_at: Json | null
          usage_count: number | null
          version: string | null
        }
        Insert: {
          category?: string | null
          created_at?: Json | null
          created_by?: string | null
          description?: string | null
          fields?: Json | null
          id?: string | null
          is_official?: boolean | null
          is_public?: boolean | null
          name?: string | null
          preview?: Json | null
          rating?: number | null
          rating_count?: number | null
          structure?: Json | null
          styling?: Json | null
          tags?: Json | null
          title?: string | null
          type?: string | null
          updated_at?: Json | null
          usage_count?: number | null
          version?: string | null
        }
        Update: {
          category?: string | null
          created_at?: Json | null
          created_by?: string | null
          description?: string | null
          fields?: Json | null
          id?: string | null
          is_official?: boolean | null
          is_public?: boolean | null
          name?: string | null
          preview?: Json | null
          rating?: number | null
          rating_count?: number | null
          structure?: Json | null
          styling?: Json | null
          tags?: Json | null
          title?: string | null
          type?: string | null
          updated_at?: Json | null
          usage_count?: number | null
          version?: string | null
        }
        Relationships: []
      }
      test: {
        Row: {
          name: string | null
          value: number | null
        }
        Insert: {
          name?: string | null
          value?: number | null
        }
        Update: {
          name?: string | null
          value?: number | null
        }
        Relationships: []
      }
      user_answers: {
        Row: {
          answer: string | null
          answered_at: Json | null
          attempt_number: number | null
          created_at: Json | null
          deck_id: string | null
          flashcard_id: string | null
          id: string
          is_correct: boolean | null
          question_id: string | null
          response_time: number | null
          session_id: string | null
          updated_at: Json | null
          user_id: string | null
        }
        Insert: {
          answer?: string | null
          answered_at?: Json | null
          attempt_number?: number | null
          created_at?: Json | null
          deck_id?: string | null
          flashcard_id?: string | null
          id: string
          is_correct?: boolean | null
          question_id?: string | null
          response_time?: number | null
          session_id?: string | null
          updated_at?: Json | null
          user_id?: string | null
        }
        Update: {
          answer?: string | null
          answered_at?: Json | null
          attempt_number?: number | null
          created_at?: Json | null
          deck_id?: string | null
          flashcard_id?: string | null
          id?: string
          is_correct?: boolean | null
          question_id?: string | null
          response_time?: number | null
          session_id?: string | null
          updated_at?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_flashcard_interactions: {
        Row: {
          created_at: string | null
          deck_id: string | null
          flashcard_id: string
          id: string
          new_status: string | null
          next_review_at: string | null
          previous_ease_factor: number | null
          previous_interval: number | null
          previous_status: string | null
          review_quality: number
          reviewed_at: string | null
          srs_ease_factor: number | null
          srs_interval: number | null
          srs_lapses: number | null
          srs_repetitions: number | null
          study_time: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          deck_id?: string | null
          flashcard_id: string
          id: string
          new_status?: string | null
          next_review_at?: string | null
          previous_ease_factor?: number | null
          previous_interval?: number | null
          previous_status?: string | null
          review_quality: number
          reviewed_at?: string | null
          srs_ease_factor?: number | null
          srs_interval?: number | null
          srs_lapses?: number | null
          srs_repetitions?: number | null
          study_time?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          deck_id?: string | null
          flashcard_id?: string
          id?: string
          new_status?: string | null
          next_review_at?: string | null
          previous_ease_factor?: number | null
          previous_interval?: number | null
          previous_status?: string | null
          review_quality?: number
          reviewed_at?: string | null
          srs_ease_factor?: number | null
          srs_interval?: number | null
          srs_lapses?: number | null
          srs_repetitions?: number | null
          study_time?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_plans: {
        Row: {
          autoRenew: boolean | null
          cancellationReason: string | null
          cancelledAt: string | null
          cancelReason: string | null
          createdAt: Json | null
          endDate: Json | null
          endsAt: Json | null
          id: string | null
          lastNotificationDate: string | null
          lastPaymentId: string | null
          metadata: string | null
          nextBillingDate: string | null
          paymentId: string | null
          paymentMethod: string | null
          planId: string | null
          startDate: Json | null
          startedAt: Json | null
          status: string | null
          trialEndsAt: string | null
          updatedAt: Json | null
          userId: string | null
        }
        Insert: {
          autoRenew?: boolean | null
          cancellationReason?: string | null
          cancelledAt?: string | null
          cancelReason?: string | null
          createdAt?: Json | null
          endDate?: Json | null
          endsAt?: Json | null
          id?: string | null
          lastNotificationDate?: string | null
          lastPaymentId?: string | null
          metadata?: string | null
          nextBillingDate?: string | null
          paymentId?: string | null
          paymentMethod?: string | null
          planId?: string | null
          startDate?: Json | null
          startedAt?: Json | null
          status?: string | null
          trialEndsAt?: string | null
          updatedAt?: Json | null
          userId?: string | null
        }
        Update: {
          autoRenew?: boolean | null
          cancellationReason?: string | null
          cancelledAt?: string | null
          cancelReason?: string | null
          createdAt?: Json | null
          endDate?: Json | null
          endsAt?: Json | null
          id?: string | null
          lastNotificationDate?: string | null
          lastPaymentId?: string | null
          metadata?: string | null
          nextBillingDate?: string | null
          paymentId?: string | null
          paymentMethod?: string | null
          planId?: string | null
          startDate?: Json | null
          startedAt?: Json | null
          status?: string | null
          trialEndsAt?: string | null
          updatedAt?: Json | null
          userId?: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          address: Json | null
          bio: string | null
          created_at: Json | null
          date_of_birth: Json | null
          email_notifications: boolean | null
          experience_level: string | null
          first_name: string | null
          id: string
          institution: string | null
          last_name: string | null
          phone_number: string | null
          profession: string | null
          profile_visibility: string | null
          push_notifications: boolean | null
          social_links: Json | null
          specialization: string | null
          study_reminders: boolean | null
          updated_at: Json | null
          user_id: string | null
          website: string | null
          weekly_reports: boolean | null
        }
        Insert: {
          address?: Json | null
          bio?: string | null
          created_at?: Json | null
          date_of_birth?: Json | null
          email_notifications?: boolean | null
          experience_level?: string | null
          first_name?: string | null
          id: string
          institution?: string | null
          last_name?: string | null
          phone_number?: string | null
          profession?: string | null
          profile_visibility?: string | null
          push_notifications?: boolean | null
          social_links?: Json | null
          specialization?: string | null
          study_reminders?: boolean | null
          updated_at?: Json | null
          user_id?: string | null
          website?: string | null
          weekly_reports?: boolean | null
        }
        Update: {
          address?: Json | null
          bio?: string | null
          created_at?: Json | null
          date_of_birth?: Json | null
          email_notifications?: boolean | null
          experience_level?: string | null
          first_name?: string | null
          id?: string
          institution?: string | null
          last_name?: string | null
          phone_number?: string | null
          profession?: string | null
          profile_visibility?: string | null
          push_notifications?: boolean | null
          social_links?: Json | null
          specialization?: string | null
          study_reminders?: boolean | null
          updated_at?: Json | null
          user_id?: string | null
          website?: string | null
          weekly_reports?: boolean | null
        }
        Relationships: []
      }
      user_statistics: {
        Row: {
          accuracy_per_day: Json | null
          accuracy_per_difficulty: Json | null
          accuracy_per_filter: Json | null
          average_time: number | null
          correct_answers: number | null
          created_at: Json | null
          current_session: string | null
          exam_metrics: Json | null
          filter_statistics: Json | null
          id: string | null
          improvement_areas: Json | null
          incorrect_answers: number | null
          last_activity_at: Json | null
          last_activity_date: Json | null
          last_calculated: Json | null
          last_study_date: Json | null
          learning_metrics: Json | null
          overall_accuracy: number | null
          peer_comparison: Json | null
          questions_per_day: Json | null
          recommendations: Json | null
          simulated_exams_taken: number | null
          streak_data: Json | null
          streak_days: number | null
          strongest_filters: Json | null
          study_time_analysis: Json | null
          study_time_per_day: Json | null
          total_questions: number | null
          total_questions_answered: number | null
          total_time: number | null
          updated_at: Json | null
          user_id: string | null
          version: string | null
          weakest_filters: Json | null
        }
        Insert: {
          accuracy_per_day?: Json | null
          accuracy_per_difficulty?: Json | null
          accuracy_per_filter?: Json | null
          average_time?: number | null
          correct_answers?: number | null
          created_at?: Json | null
          current_session?: string | null
          exam_metrics?: Json | null
          filter_statistics?: Json | null
          id?: string | null
          improvement_areas?: Json | null
          incorrect_answers?: number | null
          last_activity_at?: Json | null
          last_activity_date?: Json | null
          last_calculated?: Json | null
          last_study_date?: Json | null
          learning_metrics?: Json | null
          overall_accuracy?: number | null
          peer_comparison?: Json | null
          questions_per_day?: Json | null
          recommendations?: Json | null
          simulated_exams_taken?: number | null
          streak_data?: Json | null
          streak_days?: number | null
          strongest_filters?: Json | null
          study_time_analysis?: Json | null
          study_time_per_day?: Json | null
          total_questions?: number | null
          total_questions_answered?: number | null
          total_time?: number | null
          updated_at?: Json | null
          user_id?: string | null
          version?: string | null
          weakest_filters?: Json | null
        }
        Update: {
          accuracy_per_day?: Json | null
          accuracy_per_difficulty?: Json | null
          accuracy_per_filter?: Json | null
          average_time?: number | null
          correct_answers?: number | null
          created_at?: Json | null
          current_session?: string | null
          exam_metrics?: Json | null
          filter_statistics?: Json | null
          id?: string | null
          improvement_areas?: Json | null
          incorrect_answers?: number | null
          last_activity_at?: Json | null
          last_activity_date?: Json | null
          last_calculated?: Json | null
          last_study_date?: Json | null
          learning_metrics?: Json | null
          overall_accuracy?: number | null
          peer_comparison?: Json | null
          questions_per_day?: Json | null
          recommendations?: Json | null
          simulated_exams_taken?: number | null
          streak_data?: Json | null
          streak_days?: number | null
          strongest_filters?: Json | null
          study_time_analysis?: Json | null
          study_time_per_day?: Json | null
          total_questions?: number | null
          total_questions_answered?: number | null
          total_time?: number | null
          updated_at?: Json | null
          user_id?: string | null
          version?: string | null
          weakest_filters?: Json | null
        }
        Relationships: []
      }
      user_topic_performances: {
        Row: {
          correctAnswers: number | null
          createdAt: Json | null
          id: string | null
          lastAnsweredAt: Json | null
          subFilterId: string | null
          totalQuestionsAnswered: number | null
          totalTimeSpentSeconds: number | null
          updatedAt: Json | null
          userId: string | null
        }
        Insert: {
          correctAnswers?: number | null
          createdAt?: Json | null
          id?: string | null
          lastAnsweredAt?: Json | null
          subFilterId?: string | null
          totalQuestionsAnswered?: number | null
          totalTimeSpentSeconds?: number | null
          updatedAt?: Json | null
          userId?: string | null
        }
        Update: {
          correctAnswers?: number | null
          createdAt?: Json | null
          id?: string | null
          lastAnsweredAt?: Json | null
          subFilterId?: string | null
          totalQuestionsAnswered?: number | null
          totalTimeSpentSeconds?: number | null
          updatedAt?: Json | null
          userId?: string | null
        }
        Relationships: []
      }
      userPlans: {
        Row: {
          auto_renew: boolean | null
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: Json | null
          end_date: Json | null
          id: string | null
          last_payment_id: string | null
          metadata: string | null
          next_billing_date: string | null
          payment_method: string | null
          plan_id: string | null
          start_date: Json | null
          status: string | null
          trial_ends_at: string | null
          updated_at: Json | null
          user_id: string | null
        }
        Insert: {
          auto_renew?: boolean | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: Json | null
          end_date?: Json | null
          id?: string | null
          last_payment_id?: string | null
          metadata?: string | null
          next_billing_date?: string | null
          payment_method?: string | null
          plan_id?: string | null
          start_date?: Json | null
          status?: string | null
          trial_ends_at?: string | null
          updated_at?: Json | null
          user_id?: string | null
        }
        Update: {
          auto_renew?: boolean | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: Json | null
          end_date?: Json | null
          id?: string | null
          last_payment_id?: string | null
          metadata?: string | null
          next_billing_date?: string | null
          payment_method?: string | null
          plan_id?: string | null
          start_date?: Json | null
          status?: string | null
          trial_ends_at?: string | null
          updated_at?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          active_flashcards: number | null
          created_at: Json | null
          display_name: string | null
          email: string | null
          id: string | null
          last_login: Json | null
          mastered_flashcards: number | null
          photo_url: string | null
          role: string | null
          total_decks: number | null
          total_flashcards: number | null
          updated_at: Json | null
          username_slug: string | null
        }
        Insert: {
          active_flashcards?: number | null
          created_at?: Json | null
          display_name?: string | null
          email?: string | null
          id?: string | null
          last_login?: Json | null
          mastered_flashcards?: number | null
          photo_url?: string | null
          role?: string | null
          total_decks?: number | null
          total_flashcards?: number | null
          updated_at?: Json | null
          username_slug?: string | null
        }
        Update: {
          active_flashcards?: number | null
          created_at?: Json | null
          display_name?: string | null
          email?: string | null
          id?: string | null
          last_login?: Json | null
          mastered_flashcards?: number | null
          photo_url?: string | null
          role?: string | null
          total_decks?: number | null
          total_flashcards?: number | null
          updated_at?: Json | null
          username_slug?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      exec_sql: {
        Args: { query: string }
        Returns: string
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

// @ts-ignore
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

// @ts-ignore
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

// @ts-ignore
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
