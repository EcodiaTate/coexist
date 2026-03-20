export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          pronouns: string | null
          bio: string | null
          avatar_url: string | null
          date_of_birth: string | null
          location: string | null
          location_point: unknown | null
          phone: string | null
          instagram_handle: string | null
          interests: string[]
          membership_level: string
          points: number
          role: Database['public']['Enums']['user_role']
          is_suspended: boolean
          suspended_reason: string | null
          suspended_until: string | null
          tos_accepted_version: string | null
          tos_accepted_at: string | null
          onboarding_completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          pronouns?: string | null
          bio?: string | null
          avatar_url?: string | null
          date_of_birth?: string | null
          location?: string | null
          location_point?: unknown | null
          phone?: string | null
          instagram_handle?: string | null
          interests?: string[]
          membership_level?: string
          points?: number
          role?: Database['public']['Enums']['user_role']
          is_suspended?: boolean
          suspended_reason?: string | null
          suspended_until?: string | null
          tos_accepted_version?: string | null
          tos_accepted_at?: string | null
          onboarding_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          pronouns?: string | null
          bio?: string | null
          avatar_url?: string | null
          date_of_birth?: string | null
          location?: string | null
          location_point?: unknown | null
          phone?: string | null
          instagram_handle?: string | null
          interests?: string[]
          membership_level?: string
          points?: number
          role?: Database['public']['Enums']['user_role']
          is_suspended?: boolean
          suspended_reason?: string | null
          suspended_until?: string | null
          tos_accepted_version?: string | null
          tos_accepted_at?: string | null
          onboarding_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      collectives: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          location_point: unknown | null
          region: string | null
          state: string | null
          cover_image_url: string | null
          leader_id: string | null
          member_count: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          location_point?: unknown | null
          region?: string | null
          state?: string | null
          cover_image_url?: string | null
          leader_id?: string | null
          member_count?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          location_point?: unknown | null
          region?: string | null
          state?: string | null
          cover_image_url?: string | null
          leader_id?: string | null
          member_count?: number
          is_active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'collectives_leader_id_fkey'
            columns: ['leader_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      collective_members: {
        Row: {
          id: string
          collective_id: string
          user_id: string
          role: Database['public']['Enums']['collective_role']
          joined_at: string
          status: string
        }
        Insert: {
          id?: string
          collective_id: string
          user_id: string
          role?: Database['public']['Enums']['collective_role']
          joined_at?: string
          status?: string
        }
        Update: {
          id?: string
          collective_id?: string
          user_id?: string
          role?: Database['public']['Enums']['collective_role']
          joined_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: 'collective_members_collective_id_fkey'
            columns: ['collective_id']
            isOneToOne: false
            referencedRelation: 'collectives'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'collective_members_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      events: {
        Row: {
          id: string
          collective_id: string
          series_id: string | null
          created_by: string
          title: string
          description: string | null
          activity_type: Database['public']['Enums']['activity_type']
          location_point: unknown | null
          address: string | null
          date_start: string
          date_end: string | null
          capacity: number | null
          cover_image_url: string | null
          is_public: boolean
          status: Database['public']['Enums']['event_status']
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          collective_id: string
          series_id?: string | null
          created_by: string
          title: string
          description?: string | null
          activity_type: Database['public']['Enums']['activity_type']
          location_point?: unknown | null
          address?: string | null
          date_start: string
          date_end?: string | null
          capacity?: number | null
          cover_image_url?: string | null
          is_public?: boolean
          status?: Database['public']['Enums']['event_status']
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          collective_id?: string
          series_id?: string | null
          created_by?: string
          title?: string
          description?: string | null
          activity_type?: Database['public']['Enums']['activity_type']
          location_point?: unknown | null
          address?: string | null
          date_start?: string
          date_end?: string | null
          capacity?: number | null
          cover_image_url?: string | null
          is_public?: boolean
          status?: Database['public']['Enums']['event_status']
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'events_collective_id_fkey'
            columns: ['collective_id']
            isOneToOne: false
            referencedRelation: 'collectives'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'events_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'events_series_id_fkey'
            columns: ['series_id']
            isOneToOne: false
            referencedRelation: 'event_series'
            referencedColumns: ['id']
          }
        ]
      }
      event_registrations: {
        Row: {
          id: string
          event_id: string
          user_id: string
          status: Database['public']['Enums']['registration_status']
          registered_at: string
          checked_in_at: string | null
          invited_at: string | null
        }
        Insert: {
          id?: string
          event_id: string
          user_id: string
          status?: Database['public']['Enums']['registration_status']
          registered_at?: string
          checked_in_at?: string | null
          invited_at?: string | null
        }
        Update: {
          id?: string
          event_id?: string
          user_id?: string
          status?: Database['public']['Enums']['registration_status']
          registered_at?: string
          checked_in_at?: string | null
          invited_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'event_registrations_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'event_registrations_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      event_invites: {
        Row: {
          id: string
          event_id: string
          collective_id: string
          invited_by: string
          message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          collective_id: string
          invited_by: string
          message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          collective_id?: string
          invited_by?: string
          message?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'event_invites_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'event_invites_collective_id_fkey'
            columns: ['collective_id']
            isOneToOne: false
            referencedRelation: 'collectives'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'event_invites_invited_by_fkey'
            columns: ['invited_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      event_impact: {
        Row: {
          id: string
          event_id: string
          logged_by: string
          trees_planted: number
          rubbish_kg: number
          coastline_cleaned_m: number
          hours_total: number
          area_restored_sqm: number
          native_plants: number
          wildlife_sightings: number
          custom_metrics: Json
          notes: string | null
          logged_at: string
        }
        Insert: {
          id?: string
          event_id: string
          logged_by: string
          trees_planted?: number
          rubbish_kg?: number
          coastline_cleaned_m?: number
          hours_total?: number
          area_restored_sqm?: number
          native_plants?: number
          wildlife_sightings?: number
          custom_metrics?: Json
          notes?: string | null
          logged_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          logged_by?: string
          trees_planted?: number
          rubbish_kg?: number
          coastline_cleaned_m?: number
          hours_total?: number
          area_restored_sqm?: number
          native_plants?: number
          wildlife_sightings?: number
          custom_metrics?: Json
          notes?: string | null
          logged_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'event_impact_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'event_impact_logged_by_fkey'
            columns: ['logged_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      badges: {
        Row: {
          id: string
          name: string
          description: string | null
          icon_url: string | null
          category: string | null
          criteria: Json
          points_value: number
          tier: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          icon_url?: string | null
          category?: string | null
          criteria?: Json
          points_value?: number
          tier?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          icon_url?: string | null
          category?: string | null
          criteria?: Json
          points_value?: number
          tier?: string | null
          created_at?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          id: string
          user_id: string
          badge_id: string
          earned_at: string
          event_id: string | null
        }
        Insert: {
          id?: string
          user_id: string
          badge_id: string
          earned_at?: string
          event_id?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          badge_id?: string
          earned_at?: string
          event_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'user_badges_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'user_badges_badge_id_fkey'
            columns: ['badge_id']
            isOneToOne: false
            referencedRelation: 'badges'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'user_badges_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          }
        ]
      }
      points_ledger: {
        Row: {
          id: string
          user_id: string
          amount: number
          reason: string
          event_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          reason: string
          event_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          reason?: string
          event_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'points_ledger_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'points_ledger_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          }
        ]
      }
      push_tokens: {
        Row: {
          id: string
          user_id: string
          token: string
          platform: string
          device_info: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          token: string
          platform: string
          device_info?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          token?: string
          platform?: string
          device_info?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'push_tokens_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          body: string | null
          data: Json
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          body?: string | null
          data?: Json
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          body?: string | null
          data?: Json
          read_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      posts: {
        Row: {
          id: string
          user_id: string
          collective_id: string | null
          event_id: string | null
          content: string | null
          images: string[]
          type: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          collective_id?: string | null
          event_id?: string | null
          content?: string | null
          images?: string[]
          type?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          collective_id?: string | null
          event_id?: string | null
          content?: string | null
          images?: string[]
          type?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'posts_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'posts_collective_id_fkey'
            columns: ['collective_id']
            isOneToOne: false
            referencedRelation: 'collectives'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'posts_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          }
        ]
      }
      post_likes: {
        Row: {
          id: string
          post_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'post_likes_post_id_fkey'
            columns: ['post_id']
            isOneToOne: false
            referencedRelation: 'posts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'post_likes_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      post_comments: {
        Row: {
          id: string
          post_id: string
          user_id: string
          content: string
          is_deleted: boolean
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          content: string
          is_deleted?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          content?: string
          is_deleted?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'post_comments_post_id_fkey'
            columns: ['post_id']
            isOneToOne: false
            referencedRelation: 'posts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'post_comments_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      chat_messages: {
        Row: {
          id: string
          collective_id: string
          user_id: string | null
          content: string | null
          image_url: string | null
          voice_url: string | null
          video_url: string | null
          reply_to_id: string | null
          is_pinned: boolean
          is_deleted: boolean
          created_at: string
        }
        Insert: {
          id?: string
          collective_id: string
          user_id?: string | null
          content?: string | null
          image_url?: string | null
          voice_url?: string | null
          video_url?: string | null
          reply_to_id?: string | null
          is_pinned?: boolean
          is_deleted?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          collective_id?: string
          user_id?: string | null
          content?: string | null
          image_url?: string | null
          voice_url?: string | null
          video_url?: string | null
          reply_to_id?: string | null
          is_pinned?: boolean
          is_deleted?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'chat_messages_collective_id_fkey'
            columns: ['collective_id']
            isOneToOne: false
            referencedRelation: 'collectives'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'chat_messages_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'chat_messages_reply_to_id_fkey'
            columns: ['reply_to_id']
            isOneToOne: false
            referencedRelation: 'chat_messages'
            referencedColumns: ['id']
          }
        ]
      }
      chat_read_receipts: {
        Row: {
          id: string
          collective_id: string
          user_id: string
          last_read_at: string
        }
        Insert: {
          id?: string
          collective_id: string
          user_id: string
          last_read_at?: string
        }
        Update: {
          id?: string
          collective_id?: string
          user_id?: string
          last_read_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'chat_read_receipts_collective_id_fkey'
            columns: ['collective_id']
            isOneToOne: false
            referencedRelation: 'collectives'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'chat_read_receipts_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      surveys: {
        Row: {
          id: string
          event_id: string
          created_by: string
          title: string
          questions: Json
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          created_by: string
          title: string
          questions?: Json
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          created_by?: string
          title?: string
          questions?: Json
          is_active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'surveys_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'surveys_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      survey_responses: {
        Row: {
          id: string
          survey_id: string
          user_id: string
          answers: Json
          submitted_at: string
        }
        Insert: {
          id?: string
          survey_id: string
          user_id: string
          answers?: Json
          submitted_at?: string
        }
        Update: {
          id?: string
          survey_id?: string
          user_id?: string
          answers?: Json
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'survey_responses_survey_id_fkey'
            columns: ['survey_id']
            isOneToOne: false
            referencedRelation: 'surveys'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'survey_responses_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      partner_offers: {
        Row: {
          id: string
          partner_name: string
          description: string | null
          offer_details: string | null
          code: string | null
          image_url: string | null
          points_cost: number
          valid_from: string | null
          valid_to: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          partner_name: string
          description?: string | null
          offer_details?: string | null
          code?: string | null
          image_url?: string | null
          points_cost?: number
          valid_from?: string | null
          valid_to?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          partner_name?: string
          description?: string | null
          offer_details?: string | null
          code?: string | null
          image_url?: string | null
          points_cost?: number
          valid_from?: string | null
          valid_to?: string | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      offer_redemptions: {
        Row: {
          id: string
          offer_id: string
          user_id: string
          redeemed_at: string
        }
        Insert: {
          id?: string
          offer_id: string
          user_id: string
          redeemed_at?: string
        }
        Update: {
          id?: string
          offer_id?: string
          user_id?: string
          redeemed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'offer_redemptions_offer_id_fkey'
            columns: ['offer_id']
            isOneToOne: false
            referencedRelation: 'partner_offers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'offer_redemptions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      challenges: {
        Row: {
          id: string
          title: string
          description: string | null
          cover_image_url: string | null
          start_date: string
          end_date: string
          goal_type: string
          goal_value: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          cover_image_url?: string | null
          start_date: string
          end_date: string
          goal_type: string
          goal_value: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          cover_image_url?: string | null
          start_date?: string
          end_date?: string
          goal_type?: string
          goal_value?: number
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      challenge_participants: {
        Row: {
          id: string
          challenge_id: string
          user_id: string | null
          collective_id: string | null
          progress: number
          joined_at: string
        }
        Insert: {
          id?: string
          challenge_id: string
          user_id?: string | null
          collective_id?: string | null
          progress?: number
          joined_at?: string
        }
        Update: {
          id?: string
          challenge_id?: string
          user_id?: string | null
          collective_id?: string | null
          progress?: number
          joined_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'challenge_participants_challenge_id_fkey'
            columns: ['challenge_id']
            isOneToOne: false
            referencedRelation: 'challenges'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'challenge_participants_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'challenge_participants_collective_id_fkey'
            columns: ['collective_id']
            isOneToOne: false
            referencedRelation: 'collectives'
            referencedColumns: ['id']
          }
        ]
      }
      donations: {
        Row: {
          id: string
          user_id: string
          amount: number
          currency: string
          stripe_payment_id: string | null
          project_name: string | null
          message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          currency?: string
          stripe_payment_id?: string | null
          project_name?: string | null
          message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          currency?: string
          stripe_payment_id?: string | null
          project_name?: string | null
          message?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'donations_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      recurring_donations: {
        Row: {
          id: string
          user_id: string
          stripe_subscription_id: string
          amount: number
          currency: string
          status: string
          created_at: string
          cancelled_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          stripe_subscription_id: string
          amount: number
          currency?: string
          status?: string
          created_at?: string
          cancelled_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          stripe_subscription_id?: string
          amount?: number
          currency?: string
          status?: string
          created_at?: string
          cancelled_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'recurring_donations_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      merch_products: {
        Row: {
          id: string
          name: string
          description: string | null
          price: number
          images: string[]
          variants: Json
          is_active: boolean
          stripe_price_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          price: number
          images?: string[]
          variants?: Json
          is_active?: boolean
          stripe_price_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          price?: number
          images?: string[]
          variants?: Json
          is_active?: boolean
          stripe_price_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      merch_inventory: {
        Row: {
          id: string
          product_id: string
          variant_key: string
          stock_count: number
          low_stock_threshold: number
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          variant_key: string
          stock_count?: number
          low_stock_threshold?: number
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          variant_key?: string
          stock_count?: number
          low_stock_threshold?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'merch_inventory_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'merch_products'
            referencedColumns: ['id']
          }
        ]
      }
      merch_orders: {
        Row: {
          id: string
          user_id: string
          items: Json
          total: number
          stripe_payment_id: string | null
          shipping_address: Json
          status: Database['public']['Enums']['order_status']
          tracking_number: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          items: Json
          total: number
          stripe_payment_id?: string | null
          shipping_address?: Json
          status?: Database['public']['Enums']['order_status']
          tracking_number?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          items?: Json
          total?: number
          stripe_payment_id?: string | null
          shipping_address?: Json
          status?: Database['public']['Enums']['order_status']
          tracking_number?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'merch_orders_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      invites: {
        Row: {
          id: string
          inviter_id: string
          invitee_email: string
          code: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          inviter_id: string
          invitee_email: string
          code?: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          inviter_id?: string
          invitee_email?: string
          code?: string
          status?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'invites_inviter_id_fkey'
            columns: ['inviter_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      global_announcements: {
        Row: {
          id: string
          author_id: string
          title: string
          content: string
          image_url: string | null
          priority: Database['public']['Enums']['announcement_priority']
          target_audience: Database['public']['Enums']['announcement_target']
          target_collective_id: string | null
          is_pinned: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          author_id: string
          title: string
          content: string
          image_url?: string | null
          priority?: Database['public']['Enums']['announcement_priority']
          target_audience?: Database['public']['Enums']['announcement_target']
          target_collective_id?: string | null
          is_pinned?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          author_id?: string
          title?: string
          content?: string
          image_url?: string | null
          priority?: Database['public']['Enums']['announcement_priority']
          target_audience?: Database['public']['Enums']['announcement_target']
          target_collective_id?: string | null
          is_pinned?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'global_announcements_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'global_announcements_target_collective_id_fkey'
            columns: ['target_collective_id']
            isOneToOne: false
            referencedRelation: 'collectives'
            referencedColumns: ['id']
          }
        ]
      }
      announcement_reads: {
        Row: {
          id: string
          announcement_id: string
          user_id: string
          read_at: string
        }
        Insert: {
          id?: string
          announcement_id: string
          user_id: string
          read_at?: string
        }
        Update: {
          id?: string
          announcement_id?: string
          user_id?: string
          read_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'announcement_reads_announcement_id_fkey'
            columns: ['announcement_id']
            isOneToOne: false
            referencedRelation: 'global_announcements'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'announcement_reads_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      staff_roles: {
        Row: {
          id: string
          user_id: string
          permissions: Json
          assigned_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          permissions?: Json
          assigned_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          permissions?: Json
          assigned_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'staff_roles_user_id_fkey'
            columns: ['user_id']
            isOneToOne: true
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'staff_roles_assigned_by_fkey'
            columns: ['assigned_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      audit_log: {
        Row: {
          id: string
          user_id: string
          action: string
          target_type: string | null
          target_id: string | null
          details: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action: string
          target_type?: string | null
          target_id?: string | null
          details?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          action?: string
          target_type?: string | null
          target_id?: string | null
          details?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'audit_log_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      organisations: {
        Row: {
          id: string
          name: string
          logo_url: string | null
          website: string | null
          type: string | null
          contact_name: string | null
          contact_email: string | null
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          logo_url?: string | null
          website?: string | null
          type?: string | null
          contact_name?: string | null
          contact_email?: string | null
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          logo_url?: string | null
          website?: string | null
          type?: string | null
          contact_name?: string | null
          contact_email?: string | null
          description?: string | null
          created_at?: string
        }
        Relationships: []
      }
      event_organisations: {
        Row: {
          id: string
          event_id: string
          organisation_id: string
          role: string | null
        }
        Insert: {
          id?: string
          event_id: string
          organisation_id: string
          role?: string | null
        }
        Update: {
          id?: string
          event_id?: string
          organisation_id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'event_organisations_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'event_organisations_organisation_id_fkey'
            columns: ['organisation_id']
            isOneToOne: false
            referencedRelation: 'organisations'
            referencedColumns: ['id']
          }
        ]
      }
      promo_codes: {
        Row: {
          id: string
          code: string
          type: Database['public']['Enums']['promo_type']
          value: number
          min_order_amount: number
          max_uses: number | null
          uses_count: number
          valid_from: string | null
          valid_to: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          type: Database['public']['Enums']['promo_type']
          value: number
          min_order_amount?: number
          max_uses?: number | null
          uses_count?: number
          valid_from?: string | null
          valid_to?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          code?: string
          type?: Database['public']['Enums']['promo_type']
          value?: number
          min_order_amount?: number
          max_uses?: number | null
          uses_count?: number
          valid_from?: string | null
          valid_to?: string | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      product_reviews: {
        Row: {
          id: string
          product_id: string
          user_id: string
          rating: number
          review_text: string | null
          is_approved: boolean
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          user_id: string
          rating: number
          review_text?: string | null
          is_approved?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          user_id?: string
          rating?: number
          review_text?: string | null
          is_approved?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'product_reviews_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'merch_products'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'product_reviews_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      feature_flags: {
        Row: {
          id: string
          key: string
          enabled: boolean
          target_collectives: string[] | null
          description: string | null
          updated_by: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          enabled?: boolean
          target_collectives?: string[] | null
          description?: string | null
          updated_by?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          enabled?: boolean
          target_collectives?: string[] | null
          description?: string | null
          updated_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'feature_flags_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      content_reports: {
        Row: {
          id: string
          reporter_id: string
          content_type: string
          content_id: string
          reason: string
          status: Database['public']['Enums']['report_status']
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          reporter_id: string
          content_type: string
          content_id: string
          reason: string
          status?: Database['public']['Enums']['report_status']
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          reporter_id?: string
          content_type?: string
          content_id?: string
          reason?: string
          status?: Database['public']['Enums']['report_status']
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'content_reports_reporter_id_fkey'
            columns: ['reporter_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'content_reports_reviewed_by_fkey'
            columns: ['reviewed_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      impact_species: {
        Row: {
          id: string
          event_impact_id: string
          species_name: string
          count: number
          is_native: boolean
        }
        Insert: {
          id?: string
          event_impact_id: string
          species_name: string
          count?: number
          is_native?: boolean
        }
        Update: {
          id?: string
          event_impact_id?: string
          species_name?: string
          count?: number
          is_native?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'impact_species_event_impact_id_fkey'
            columns: ['event_impact_id']
            isOneToOne: false
            referencedRelation: 'event_impact'
            referencedColumns: ['id']
          }
        ]
      }
      impact_areas: {
        Row: {
          id: string
          event_impact_id: string
          polygon: unknown
          area_sqm: number | null
        }
        Insert: {
          id?: string
          event_impact_id: string
          polygon: unknown
          area_sqm?: number | null
        }
        Update: {
          id?: string
          event_impact_id?: string
          polygon?: unknown
          area_sqm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'impact_areas_event_impact_id_fkey'
            columns: ['event_impact_id']
            isOneToOne: false
            referencedRelation: 'event_impact'
            referencedColumns: ['id']
          }
        ]
      }
      event_series: {
        Row: {
          id: string
          collective_id: string
          title_template: string
          recurrence_rule: Json
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          collective_id: string
          title_template: string
          recurrence_rule?: Json
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          collective_id?: string
          title_template?: string
          recurrence_rule?: Json
          created_by?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'event_series_collective_id_fkey'
            columns: ['collective_id']
            isOneToOne: false
            referencedRelation: 'collectives'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'event_series_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin_or_staff: {
        Args: { uid: string }
        Returns: boolean
      }
      is_super_admin: {
        Args: { uid: string }
        Returns: boolean
      }
      is_collective_leader_or_above: {
        Args: { uid: string; cid: string }
        Returns: boolean
      }
      is_collective_member: {
        Args: { uid: string; cid: string }
        Returns: boolean
      }
      get_user_impact_stats: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_collective_stats: {
        Args: { p_collective_id: string }
        Returns: Json
      }
      get_national_stats: {
        Args: Record<string, never>
        Returns: Json
      }
      award_points: {
        Args: { p_user_id: string; p_amount: number; p_reason: string; p_event_id?: string }
        Returns: undefined
      }
      check_badge_criteria: {
        Args: { p_user_id: string }
        Returns: string[]
      }
      get_leaderboard: {
        Args: { p_collective_id: string; p_period?: string }
        Returns: {
          user_id: string
          display_name: string
          avatar_url: string
          total_points: number
          events_attended: number
        }[]
      }
      get_collective_leaderboard: {
        Args: { p_period?: string }
        Returns: {
          collective_id: string
          collective_name: string
          cover_image_url: string
          total_events: number
          total_trees: number
          total_rubbish_kg: number
          total_hours: number
        }[]
      }
      get_charity_impact_report: {
        Args: { p_date_from: string; p_date_to: string; p_scope?: string }
        Returns: Json
      }
      invite_collective_to_event: {
        Args: { p_event_id: string; p_collective_id: string }
        Returns: undefined
      }
    }
    Enums: {
      activity_type:
        | 'tree_planting'
        | 'beach_cleanup'
        | 'habitat_restoration'
        | 'nature_walk'
        | 'education'
        | 'wildlife_survey'
        | 'seed_collecting'
        | 'weed_removal'
        | 'waterway_cleanup'
        | 'community_garden'
        | 'other'
      user_role:
        | 'participant'
        | 'national_staff'
        | 'national_admin'
        | 'super_admin'
      event_status:
        | 'draft'
        | 'published'
        | 'cancelled'
        | 'completed'
      registration_status:
        | 'registered'
        | 'waitlisted'
        | 'cancelled'
        | 'attended'
        | 'invited'
      collective_role:
        | 'member'
        | 'assist_leader'
        | 'co_leader'
        | 'leader'
      order_status:
        | 'pending'
        | 'processing'
        | 'shipped'
        | 'delivered'
        | 'cancelled'
        | 'refunded'
      report_status:
        | 'pending'
        | 'approved'
        | 'removed'
        | 'dismissed'
      promo_type:
        | 'percentage'
        | 'flat'
        | 'free_shipping'
      announcement_priority:
        | 'normal'
        | 'urgent'
      announcement_target:
        | 'all'
        | 'leaders'
        | 'collective_specific'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Convenience type aliases
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]

// Common row types for easy import
export type Profile = Tables<'profiles'>
export type Collective = Tables<'collectives'>
export type CollectiveMember = Tables<'collective_members'>
export type Event = Tables<'events'>
export type EventRegistration = Tables<'event_registrations'>
export type EventInvite = Tables<'event_invites'>
export type EventImpact = Tables<'event_impact'>
export type Badge = Tables<'badges'>
export type UserBadge = Tables<'user_badges'>
export type PointsLedger = Tables<'points_ledger'>
export type PushToken = Tables<'push_tokens'>
export type Notification = Tables<'notifications'>
export type Post = Tables<'posts'>
export type PostLike = Tables<'post_likes'>
export type PostComment = Tables<'post_comments'>
export type ChatMessage = Tables<'chat_messages'>
export type ChatReadReceipt = Tables<'chat_read_receipts'>
export type Survey = Tables<'surveys'>
export type SurveyResponse = Tables<'survey_responses'>
export type PartnerOffer = Tables<'partner_offers'>
export type OfferRedemption = Tables<'offer_redemptions'>
export type Challenge = Tables<'challenges'>
export type ChallengeParticipant = Tables<'challenge_participants'>
export type Donation = Tables<'donations'>
export type RecurringDonation = Tables<'recurring_donations'>
export type MerchProduct = Tables<'merch_products'>
export type MerchInventory = Tables<'merch_inventory'>
export type MerchOrder = Tables<'merch_orders'>
export type Invite = Tables<'invites'>
export type GlobalAnnouncement = Tables<'global_announcements'>
export type AnnouncementRead = Tables<'announcement_reads'>
export type StaffRole = Tables<'staff_roles'>
export type AuditLog = Tables<'audit_log'>
export type Organisation = Tables<'organisations'>
export type EventOrganisation = Tables<'event_organisations'>
export type PromoCode = Tables<'promo_codes'>
export type ProductReview = Tables<'product_reviews'>
export type FeatureFlag = Tables<'feature_flags'>
export type ContentReport = Tables<'content_reports'>
export type ImpactSpecies = Tables<'impact_species'>
export type ImpactArea = Tables<'impact_areas'>
export type EventSeries = Tables<'event_series'>
