export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          name: string;
          slug: string;
          domain: string | null;
          plan: string;
          plan_status: string;
          trial_ends_at: string | null;
          settings: Json;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          max_repos: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug?: string;
          domain?: string | null;
          plan?: string;
          plan_status?: string;
          trial_ends_at?: string | null;
          settings?: Json;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          max_repos?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          domain?: string | null;
          plan?: string;
          plan_status?: string;
          trial_ends_at?: string | null;
          settings?: Json;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          max_repos?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          company_id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          role: string;
          job_title: string | null;
          github_username: string | null;
          github_token: string | null;
          onboarding_completed: boolean;
          last_active_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          company_id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: string;
          job_title?: string | null;
          github_username?: string | null;
          github_token?: string | null;
          onboarding_completed?: boolean;
          last_active_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: string;
          job_title?: string | null;
          github_username?: string | null;
          github_token?: string | null;
          onboarding_completed?: boolean;
          last_active_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "users_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      repositories: {
        Row: {
          id: string;
          company_id: string;
          github_id: number;
          name: string;
          full_name: string;
          description: string | null;
          default_branch: string;
          language: string | null;
          is_private: boolean;
          is_active: boolean;
          webhook_id: number | null;
          webhook_secret: string | null;
          last_scan_at: string | null;
          last_scan_status: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          github_id: number;
          name: string;
          full_name: string;
          description?: string | null;
          default_branch?: string;
          language?: string | null;
          is_private?: boolean;
          is_active?: boolean;
          webhook_id?: number | null;
          webhook_secret?: string | null;
          last_scan_at?: string | null;
          last_scan_status?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          github_id?: number;
          name?: string;
          full_name?: string;
          description?: string | null;
          default_branch?: string;
          language?: string | null;
          is_private?: boolean;
          is_active?: boolean;
          webhook_id?: number | null;
          webhook_secret?: string | null;
          last_scan_at?: string | null;
          last_scan_status?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "repositories_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      scans: {
        Row: {
          id: string;
          company_id: string;
          repository_id: string;
          triggered_by: string | null;
          scan_type: string;
          status: string;
          progress: number;
          scan_from: string | null;
          scan_to: string | null;
          summary: Json;
          error_message: string | null;
          commit_sha: string | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          repository_id: string;
          triggered_by?: string | null;
          scan_type?: string;
          status?: string;
          progress?: number;
          scan_from?: string | null;
          scan_to?: string | null;
          summary?: Json;
          error_message?: string | null;
          commit_sha?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          repository_id?: string;
          triggered_by?: string | null;
          scan_type?: string;
          status?: string;
          progress?: number;
          scan_from?: string | null;
          scan_to?: string | null;
          summary?: Json;
          error_message?: string | null;
          commit_sha?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "scans_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scans_repository_id_fkey";
            columns: ["repository_id"];
            isOneToOne: false;
            referencedRelation: "repositories";
            referencedColumns: ["id"];
          },
        ];
      };
      scan_results: {
        Row: {
          id: string;
          scan_id: string;
          company_id: string;
          repository_id: string;
          file_path: string;
          language: string | null;
          total_loc: number;
          ai_loc: number;
          ai_probability: number;
          risk_level: string;
          detection_signals: Json;
          ai_code_snippet: string | null;
          snippet_start_line: number | null;
          snippet_end_line: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          scan_id: string;
          company_id: string;
          repository_id: string;
          file_path: string;
          language?: string | null;
          total_loc?: number;
          ai_loc?: number;
          ai_probability?: number;
          risk_level?: string;
          detection_signals?: Json;
          ai_code_snippet?: string | null;
          snippet_start_line?: number | null;
          snippet_end_line?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          scan_id?: string;
          company_id?: string;
          repository_id?: string;
          file_path?: string;
          language?: string | null;
          total_loc?: number;
          ai_loc?: number;
          ai_probability?: number;
          risk_level?: string;
          detection_signals?: Json;
          ai_code_snippet?: string | null;
          snippet_start_line?: number | null;
          snippet_end_line?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "scan_results_scan_id_fkey";
            columns: ["scan_id"];
            isOneToOne: false;
            referencedRelation: "scans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scan_results_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scan_results_repository_id_fkey";
            columns: ["repository_id"];
            isOneToOne: false;
            referencedRelation: "repositories";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_debt_scores: {
        Row: {
          id: string;
          company_id: string;
          repository_id: string | null;
          scan_id: string | null;
          score: number;
          previous_score: number | null;
          score_change: number | null;
          risk_zone: string;
          breakdown: Json;
          calculated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          repository_id?: string | null;
          scan_id?: string | null;
          score: number;
          previous_score?: number | null;
          score_change?: number | null;
          risk_zone: string;
          breakdown?: Json;
          calculated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          repository_id?: string | null;
          scan_id?: string | null;
          score?: number;
          previous_score?: number | null;
          score_change?: number | null;
          risk_zone?: string;
          breakdown?: Json;
          calculated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_debt_scores_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      pull_requests: {
        Row: {
          id: string;
          company_id: string;
          repository_id: string;
          github_pr_number: number;
          github_pr_id: number;
          title: string;
          author: string;
          state: string;
          ai_generated: boolean;
          ai_probability: number;
          ai_loc_added: number;
          total_loc_added: number;
          files_changed: number;
          human_reviewed: boolean;
          review_count: number;
          approved: boolean | null;
          pr_created_at: string | null;
          pr_merged_at: string | null;
          analyzed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          repository_id: string;
          github_pr_number: number;
          github_pr_id: number;
          title: string;
          author: string;
          state: string;
          ai_generated?: boolean;
          ai_probability?: number;
          ai_loc_added?: number;
          total_loc_added?: number;
          files_changed?: number;
          human_reviewed?: boolean;
          review_count?: number;
          approved?: boolean | null;
          pr_created_at?: string | null;
          pr_merged_at?: string | null;
          analyzed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          repository_id?: string;
          github_pr_number?: number;
          github_pr_id?: number;
          title?: string;
          author?: string;
          state?: string;
          ai_generated?: boolean;
          ai_probability?: number;
          ai_loc_added?: number;
          total_loc_added?: number;
          files_changed?: number;
          human_reviewed?: boolean;
          review_count?: number;
          approved?: boolean | null;
          pr_created_at?: string | null;
          pr_merged_at?: string | null;
          analyzed_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pull_requests_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pull_requests_repository_id_fkey";
            columns: ["repository_id"];
            isOneToOne: false;
            referencedRelation: "repositories";
            referencedColumns: ["id"];
          },
        ];
      };
      alerts: {
        Row: {
          id: string;
          company_id: string;
          repository_id: string | null;
          scan_id: string | null;
          severity: string;
          category: string;
          title: string;
          description: string;
          context: Json;
          status: string;
          acknowledged_by: string | null;
          acknowledged_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          repository_id?: string | null;
          scan_id?: string | null;
          severity: string;
          category: string;
          title: string;
          description: string;
          context?: Json;
          status?: string;
          acknowledged_by?: string | null;
          acknowledged_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          repository_id?: string | null;
          scan_id?: string | null;
          severity?: string;
          category?: string;
          title?: string;
          description?: string;
          context?: Json;
          status?: string;
          acknowledged_by?: string | null;
          acknowledged_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "alerts_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alerts_repository_id_fkey";
            columns: ["repository_id"];
            isOneToOne: false;
            referencedRelation: "repositories";
            referencedColumns: ["id"];
          },
        ];
      };
      team_metrics: {
        Row: {
          id: string;
          company_id: string;
          github_username: string;
          display_name: string | null;
          avatar_url: string | null;
          period_start: string;
          period_end: string;
          ai_usage_level: string;
          review_quality: string;
          risk_index: string;
          governance_score: number;
          total_prs: number;
          ai_prs: number;
          prs_reviewed: number;
          ai_loc_authored: number;
          coaching_suggestions: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          github_username: string;
          display_name?: string | null;
          avatar_url?: string | null;
          period_start: string;
          period_end: string;
          ai_usage_level?: string;
          review_quality?: string;
          risk_index?: string;
          governance_score?: number;
          total_prs?: number;
          ai_prs?: number;
          prs_reviewed?: number;
          ai_loc_authored?: number;
          coaching_suggestions?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          github_username?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          period_start?: string;
          period_end?: string;
          ai_usage_level?: string;
          review_quality?: string;
          risk_index?: string;
          governance_score?: number;
          total_prs?: number;
          ai_prs?: number;
          prs_reviewed?: number;
          ai_loc_authored?: number;
          coaching_suggestions?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "team_metrics_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      integrations: {
        Row: {
          id: string;
          company_id: string;
          provider: string;
          status: string;
          access_token: string | null;
          refresh_token: string | null;
          webhook_url: string | null;
          config: Json;
          last_synced_at: string | null;
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          provider: string;
          status?: string;
          access_token?: string | null;
          refresh_token?: string | null;
          webhook_url?: string | null;
          config?: Json;
          last_synced_at?: string | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          provider?: string;
          status?: string;
          access_token?: string | null;
          refresh_token?: string | null;
          webhook_url?: string | null;
          config?: Json;
          last_synced_at?: string | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "integrations_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          id: string;
          company_id: string;
          user_id: string | null;
          action: string;
          resource_type: string;
          resource_id: string | null;
          details: Json;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          user_id?: string | null;
          action: string;
          resource_type: string;
          resource_id?: string | null;
          details?: Json;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          user_id?: string | null;
          action?: string;
          resource_type?: string;
          resource_id?: string | null;
          details?: Json;
          ip_address?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      governance_reports: {
        Row: {
          id: string;
          company_id: string;
          report_type: string;
          period_start: string;
          period_end: string;
          content: Json;
          pdf_storage_path: string | null;
          status: string;
          sent_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          report_type?: string;
          period_start: string;
          period_end: string;
          content?: Json;
          pdf_storage_path?: string | null;
          status?: string;
          sent_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          report_type?: string;
          period_start?: string;
          period_end?: string;
          content?: Json;
          pdf_storage_path?: string | null;
          status?: string;
          sent_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "governance_reports_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_user_company_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      is_company_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      calculate_ai_debt_score: {
        Args: { p_company_id: string; p_repository_id?: string };
        Returns: number;
      };
      refresh_dashboard_views: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      claim_next_scan_job: {
        Args: Record<PropertyKey, never>;
        Returns: Database["public"]["Tables"]["scans"]["Row"] | null;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
