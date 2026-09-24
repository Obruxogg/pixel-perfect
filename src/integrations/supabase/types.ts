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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      areas: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_demo: boolean
          name: string
          sort_order: number
          status: Database["public"]["Enums"]["record_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_demo?: boolean
          name: string
          sort_order?: number
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_demo?: boolean
          name?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          new_data: Json | null
          old_data: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          created_at: string
          description: string | null
          ends_at: string | null
          id: string
          is_demo: boolean
          name: string
          starts_at: string | null
          status: Database["public"]["Enums"]["record_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          is_demo?: boolean
          name: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          is_demo?: boolean
          name?: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Relationships: []
      }
      commercial_conditions: {
        Row: {
          allowed_roles: Database["public"]["Enums"]["app_role"][]
          campaign_id: string | null
          course_id: string
          course_price_id: string
          created_at: string
          discount_rule_id: string | null
          id: string
          installment_option_id: string | null
          is_demo: boolean
          manager_extension_minutes: number
          name: string
          payment_method_id: string
          seller_extension_minutes: number
          status: Database["public"]["Enums"]["record_status"]
          updated_at: string
          validity_minutes: number
        }
        Insert: {
          allowed_roles?: Database["public"]["Enums"]["app_role"][]
          campaign_id?: string | null
          course_id: string
          course_price_id: string
          created_at?: string
          discount_rule_id?: string | null
          id?: string
          installment_option_id?: string | null
          is_demo?: boolean
          manager_extension_minutes?: number
          name: string
          payment_method_id: string
          seller_extension_minutes?: number
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
          validity_minutes?: number
        }
        Update: {
          allowed_roles?: Database["public"]["Enums"]["app_role"][]
          campaign_id?: string | null
          course_id?: string
          course_price_id?: string
          created_at?: string
          discount_rule_id?: string | null
          id?: string
          installment_option_id?: string | null
          is_demo?: boolean
          manager_extension_minutes?: number
          name?: string
          payment_method_id?: string
          seller_extension_minutes?: number
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
          validity_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "commercial_conditions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_conditions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_conditions_course_price_id_fkey"
            columns: ["course_price_id"]
            isOneToOne: false
            referencedRelation: "course_prices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_conditions_discount_rule_id_fkey"
            columns: ["discount_rule_id"]
            isOneToOne: false
            referencedRelation: "discount_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_conditions_installment_option_id_fkey"
            columns: ["installment_option_id"]
            isOneToOne: false
            referencedRelation: "installment_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_conditions_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      course_prices: {
        Row: {
          course_id: string
          created_at: string
          id: string
          installment_option_id: string | null
          is_demo: boolean
          label: string | null
          payment_method_id: string | null
          price: number
          status: Database["public"]["Enums"]["record_status"]
          updated_at: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          installment_option_id?: string | null
          is_demo?: boolean
          label?: string | null
          payment_method_id?: string | null
          price: number
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          installment_option_id?: string | null
          is_demo?: boolean
          label?: string | null
          payment_method_id?: string | null
          price?: number
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_prices_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_prices_installment_option_id_fkey"
            columns: ["installment_option_id"]
            isOneToOne: false
            referencedRelation: "installment_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_prices_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          area_id: string
          base_price: number
          created_at: string
          description: string | null
          id: string
          is_demo: boolean
          modality: string
          name: string
          sort_order: number
          status: Database["public"]["Enums"]["record_status"]
          updated_at: string
          workload_hours: number
        }
        Insert: {
          area_id: string
          base_price: number
          created_at?: string
          description?: string | null
          id?: string
          is_demo?: boolean
          modality: string
          name: string
          sort_order?: number
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
          workload_hours: number
        }
        Update: {
          area_id?: string
          base_price?: number
          created_at?: string
          description?: string | null
          id?: string
          is_demo?: boolean
          modality?: string
          name?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
          workload_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "courses_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_stages: {
        Row: {
          color_key: string
          created_at: string
          id: string
          is_demo: boolean
          is_lost: boolean
          is_won: boolean
          name: string
          sort_order: number
          status: Database["public"]["Enums"]["record_status"]
          updated_at: string
        }
        Insert: {
          color_key?: string
          created_at?: string
          id?: string
          is_demo?: boolean
          is_lost?: boolean
          is_won?: boolean
          name: string
          sort_order?: number
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Update: {
          color_key?: string
          created_at?: string
          id?: string
          is_demo?: boolean
          is_lost?: boolean
          is_won?: boolean
          name?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Relationships: []
      }
      discount_rules: {
        Row: {
          allowed_roles: Database["public"]["Enums"]["app_role"][]
          course_ids: string[]
          created_at: string
          exceed_behavior: string
          id: string
          is_default: boolean
          is_demo: boolean
          kind: Database["public"]["Enums"]["discount_kind"]
          max_discount: number | null
          min_final_price: number | null
          name: string
          payment_method_ids: string[]
          status: Database["public"]["Enums"]["record_status"]
          updated_at: string
          valid_from: string | null
          valid_until: string | null
          value: number
        }
        Insert: {
          allowed_roles?: Database["public"]["Enums"]["app_role"][]
          course_ids?: string[]
          created_at?: string
          exceed_behavior?: string
          id?: string
          is_default?: boolean
          is_demo?: boolean
          kind: Database["public"]["Enums"]["discount_kind"]
          max_discount?: number | null
          min_final_price?: number | null
          name: string
          payment_method_ids?: string[]
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
          value: number
        }
        Update: {
          allowed_roles?: Database["public"]["Enums"]["app_role"][]
          course_ids?: string[]
          created_at?: string
          exceed_behavior?: string
          id?: string
          is_default?: boolean
          is_demo?: boolean
          kind?: Database["public"]["Enums"]["discount_kind"]
          max_discount?: number | null
          min_final_price?: number | null
          name?: string
          payment_method_ids?: string[]
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
          value?: number
        }
        Relationships: []
      }
      followups: {
        Row: {
          completed_at: string | null
          created_at: string
          due_at: string
          id: string
          notes: string | null
          seller_id: string
          status: Database["public"]["Enums"]["followup_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          due_at: string
          id?: string
          notes?: string | null
          seller_id: string
          status?: Database["public"]["Enums"]["followup_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          due_at?: string
          id?: string
          notes?: string | null
          seller_id?: string
          status?: Database["public"]["Enums"]["followup_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "followups_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followups_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      installment_options: {
        Row: {
          created_at: string
          id: string
          installments: number
          is_demo: boolean
          label: string
          payment_method_id: string
          sort_order: number
          status: Database["public"]["Enums"]["record_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          installments: number
          is_demo?: boolean
          label: string
          payment_method_id: string
          sort_order?: number
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          installments?: number
          is_demo?: boolean
          label?: string
          payment_method_id?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "installment_options_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          created_at: string
          id: string
          is_demo: boolean
          name: string
          sort_order: number
          status: Database["public"]["Enums"]["record_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_demo?: boolean
          name: string
          sort_order?: number
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_demo?: boolean
          name?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          hired_at: string | null
          id: string
          job_title: string | null
          manager_id: string | null
          phone: string | null
          preferences: Json
          status: Database["public"]["Enums"]["record_status"]
          team_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name: string
          hired_at?: string | null
          id: string
          job_title?: string | null
          manager_id?: string | null
          phone?: string | null
          preferences?: Json
          status?: Database["public"]["Enums"]["record_status"]
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          hired_at?: string | null
          id?: string
          job_title?: string | null
          manager_id?: string | null
          phone?: string | null
          preferences?: Json
          status?: Database["public"]["Enums"]["record_status"]
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_events: {
        Row: {
          action: string
          created_at: string
          id: string
          new_data: Json | null
          notes: string | null
          old_data: Json | null
          proposal_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_data?: Json | null
          notes?: string | null
          old_data?: Json | null
          proposal_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_data?: Json | null
          notes?: string | null
          old_data?: Json | null
          proposal_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_events_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_timer_events: {
        Row: {
          action: string
          created_at: string
          id: string
          new_status: Database["public"]["Enums"]["timer_status"] | null
          new_valid_until: string | null
          notes: string | null
          previous_status: Database["public"]["Enums"]["timer_status"] | null
          previous_valid_until: string | null
          proposal_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["timer_status"] | null
          new_valid_until?: string | null
          notes?: string | null
          previous_status?: Database["public"]["Enums"]["timer_status"] | null
          previous_valid_until?: string | null
          proposal_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["timer_status"] | null
          new_valid_until?: string | null
          notes?: string | null
          previous_status?: Database["public"]["Enums"]["timer_status"] | null
          previous_valid_until?: string | null
          proposal_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_timer_events_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_timer_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          area_name: string
          course_id: string | null
          course_modality: string | null
          course_name: string
          course_workload_hours: number | null
          created_at: string
          discount_amount: number
          discount_kind: Database["public"]["Enums"]["discount_kind"] | null
          discount_name: string | null
          discount_value: number
          final_price: number
          id: string
          installment_value: number
          installments: number
          is_demo: boolean
          notes: string | null
          original_price: number
          payment_method_name: string
          seller_id: string
          status: Database["public"]["Enums"]["proposal_status"]
          student_id: string
          timer_remaining_seconds: number | null
          timer_status: Database["public"]["Enums"]["timer_status"] | null
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          area_name: string
          course_id?: string | null
          course_modality?: string | null
          course_name: string
          course_workload_hours?: number | null
          created_at?: string
          discount_amount?: number
          discount_kind?: Database["public"]["Enums"]["discount_kind"] | null
          discount_name?: string | null
          discount_value?: number
          final_price: number
          id?: string
          installment_value: number
          installments?: number
          is_demo?: boolean
          notes?: string | null
          original_price: number
          payment_method_name: string
          seller_id: string
          status?: Database["public"]["Enums"]["proposal_status"]
          student_id: string
          timer_remaining_seconds?: number | null
          timer_status?: Database["public"]["Enums"]["timer_status"] | null
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          area_name?: string
          course_id?: string | null
          course_modality?: string | null
          course_name?: string
          course_workload_hours?: number | null
          created_at?: string
          discount_amount?: number
          discount_kind?: Database["public"]["Enums"]["discount_kind"] | null
          discount_name?: string | null
          discount_value?: number
          final_price?: number
          id?: string
          installment_value?: number
          installments?: number
          is_demo?: boolean
          notes?: string | null
          original_price?: number
          payment_method_name?: string
          seller_id?: string
          status?: Database["public"]["Enums"]["proposal_status"]
          student_id?: string
          timer_remaining_seconds?: number | null
          timer_status?: Database["public"]["Enums"]["timer_status"] | null
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_assignments: {
        Row: {
          assigned_by: string
          created_at: string
          ended_at: string | null
          id: string
          reason: string | null
          seller_id: string | null
          started_at: string
          student_id: string
        }
        Insert: {
          assigned_by: string
          created_at?: string
          ended_at?: string | null
          id?: string
          reason?: string | null
          seller_id?: string | null
          started_at?: string
          student_id: string
        }
        Update: {
          assigned_by?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          reason?: string | null
          seller_id?: string | null
          started_at?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_assignments_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_interactions: {
        Row: {
          created_at: string
          id: string
          kind: string
          metadata: Json
          notes: string | null
          student_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          metadata?: Json
          notes?: string | null
          student_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          metadata?: Json
          notes?: string | null
          student_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_interactions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_interactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          created_at: string
          crm_stage_id: string | null
          email: string | null
          full_name: string
          id: string
          is_demo: boolean
          notes: string | null
          owner_id: string | null
          source: string | null
          status: Database["public"]["Enums"]["record_status"]
          updated_at: string
          whatsapp: string
        }
        Insert: {
          created_at?: string
          crm_stage_id?: string | null
          email?: string | null
          full_name: string
          id?: string
          is_demo?: boolean
          notes?: string | null
          owner_id?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
          whatsapp: string
        }
        Update: {
          created_at?: string
          crm_stage_id?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_demo?: boolean
          notes?: string | null
          owner_id?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_crm_stage_id_fkey"
            columns: ["crm_stage_id"]
            isOneToOne: false
            referencedRelation: "crm_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_demo: boolean
          name: string
          status: Database["public"]["Enums"]["record_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_demo?: boolean
          name: string
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_demo?: boolean
          name?: string
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
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
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_profile: { Args: { _id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      my_team_id: { Args: never; Returns: string }
    }
    Enums: {
      app_role: "admin" | "manager" | "seller"
      discount_kind: "percentage" | "fixed"
      followup_status: "pending" | "completed" | "cancelled"
      proposal_status:
        | "draft"
        | "sent"
        | "viewed"
        | "awaiting_response"
        | "negotiation"
        | "approved"
        | "refused"
        | "expired"
        | "cancelled"
      record_status: "active" | "inactive"
      timer_status: "active" | "paused" | "expired" | "completed" | "cancelled"
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
      app_role: ["admin", "manager", "seller"],
      discount_kind: ["percentage", "fixed"],
      followup_status: ["pending", "completed", "cancelled"],
      proposal_status: [
        "draft",
        "sent",
        "viewed",
        "awaiting_response",
        "negotiation",
        "approved",
        "refused",
        "expired",
        "cancelled",
      ],
      record_status: ["active", "inactive"],
      timer_status: ["active", "paused", "expired", "completed", "cancelled"],
    },
  },
} as const
