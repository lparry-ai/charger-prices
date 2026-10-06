export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      connectors: {
        Row: {
          connector_type: Database["public"]["Enums"]["connector_type"];
          created_at: string;
          current_type: Database["public"]["Enums"]["current_type"];
          id: number;
          power_kw: number | null;
          quantity: number;
          station_id: number;
          tethered: boolean | null;
        };
        Insert: {
          connector_type: Database["public"]["Enums"]["connector_type"];
          created_at?: string;
          current_type: Database["public"]["Enums"]["current_type"];
          id?: never;
          power_kw?: number | null;
          quantity?: number;
          station_id: number;
          tethered?: boolean | null;
        };
        Update: {
          connector_type?: Database["public"]["Enums"]["connector_type"];
          created_at?: string;
          current_type?: Database["public"]["Enums"]["current_type"];
          id?: never;
          power_kw?: number | null;
          quantity?: number;
          station_id?: number;
          tethered?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: "connectors_station_id_fkey";
            columns: ["station_id"];
            isOneToOne: false;
            referencedRelation: "station_summaries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "connectors_station_id_fkey";
            columns: ["station_id"];
            isOneToOne: false;
            referencedRelation: "stations";
            referencedColumns: ["id"];
          },
        ];
      };
      flags: {
        Row: {
          created_at: string;
          flagged_by: string;
          id: number;
          note: string | null;
          reason: Database["public"]["Enums"]["flag_reason"];
          resolution: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          target_id: number;
          target_type: Database["public"]["Enums"]["flag_target"];
        };
        Insert: {
          created_at?: string;
          flagged_by?: string;
          id?: never;
          note?: string | null;
          reason: Database["public"]["Enums"]["flag_reason"];
          resolution?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          target_id: number;
          target_type: Database["public"]["Enums"]["flag_target"];
        };
        Update: {
          created_at?: string;
          flagged_by?: string;
          id?: never;
          note?: string | null;
          reason?: Database["public"]["Enums"]["flag_reason"];
          resolution?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          target_id?: number;
          target_type?: Database["public"]["Enums"]["flag_target"];
        };
        Relationships: [
          {
            foreignKeyName: "flags_flagged_by_fkey";
            columns: ["flagged_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "flags_resolved_by_fkey";
            columns: ["resolved_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      operators: {
        Row: {
          created_at: string;
          id: number;
          name: string;
          ocm_operator_id: number | null;
          website: string | null;
        };
        Insert: {
          created_at?: string;
          id?: never;
          name: string;
          ocm_operator_id?: number | null;
          website?: string | null;
        };
        Update: {
          created_at?: string;
          id?: never;
          name?: string;
          ocm_operator_id?: number | null;
          website?: string | null;
        };
        Relationships: [];
      };
      price_confirmations: {
        Row: {
          confirmed_at: string;
          report_id: number;
          user_id: string;
        };
        Insert: {
          confirmed_at?: string;
          report_id: number;
          user_id?: string;
        };
        Update: {
          confirmed_at?: string;
          report_id?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "price_confirmations_report_id_fkey";
            columns: ["report_id"];
            isOneToOne: false;
            referencedRelation: "current_prices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "price_confirmations_report_id_fkey";
            columns: ["report_id"];
            isOneToOne: false;
            referencedRelation: "price_reports";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "price_confirmations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      price_reports: {
        Row: {
          connector_type: Database["public"]["Enums"]["connector_type"] | null;
          created_at: string;
          days_of_week: number[] | null;
          hidden_at: string | null;
          id: number;
          idle_fee_grace_minutes: number | null;
          idle_fee_per_minute: number | null;
          is_free: boolean;
          notes: string | null;
          observed_at: string;
          per_kwh: number | null;
          per_minute: number | null;
          photo_path: string | null;
          plan_name: string | null;
          reported_by: string;
          session_fee: number | null;
          station_id: number;
          tier: Database["public"]["Enums"]["price_tier"];
          time_window_end: string | null;
          time_window_start: string | null;
        };
        Insert: {
          connector_type?: Database["public"]["Enums"]["connector_type"] | null;
          created_at?: string;
          days_of_week?: number[] | null;
          hidden_at?: string | null;
          id?: never;
          idle_fee_grace_minutes?: number | null;
          idle_fee_per_minute?: number | null;
          is_free?: boolean;
          notes?: string | null;
          observed_at?: string;
          per_kwh?: number | null;
          per_minute?: number | null;
          photo_path?: string | null;
          plan_name?: string | null;
          reported_by?: string;
          session_fee?: number | null;
          station_id: number;
          tier?: Database["public"]["Enums"]["price_tier"];
          time_window_end?: string | null;
          time_window_start?: string | null;
        };
        Update: {
          connector_type?: Database["public"]["Enums"]["connector_type"] | null;
          created_at?: string;
          days_of_week?: number[] | null;
          hidden_at?: string | null;
          id?: never;
          idle_fee_grace_minutes?: number | null;
          idle_fee_per_minute?: number | null;
          is_free?: boolean;
          notes?: string | null;
          observed_at?: string;
          per_kwh?: number | null;
          per_minute?: number | null;
          photo_path?: string | null;
          plan_name?: string | null;
          reported_by?: string;
          session_fee?: number | null;
          station_id?: number;
          tier?: Database["public"]["Enums"]["price_tier"];
          time_window_end?: string | null;
          time_window_start?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "price_reports_reported_by_fkey";
            columns: ["reported_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "price_reports_station_id_fkey";
            columns: ["station_id"];
            isOneToOne: false;
            referencedRelation: "station_summaries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "price_reports_station_id_fkey";
            columns: ["station_id"];
            isOneToOne: false;
            referencedRelation: "stations";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string;
          id: string;
          reputation: number;
        };
        Insert: {
          created_at?: string;
          display_name: string;
          id: string;
          reputation?: number;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          id?: string;
          reputation?: number;
        };
        Relationships: [];
      };
      station_edits: {
        Row: {
          changes: NonNullable<Json>;
          created_at: string;
          id: number;
          note: string | null;
          proposed_by: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          station_id: number;
          status: Database["public"]["Enums"]["edit_status"];
        };
        Insert: {
          changes: NonNullable<Json>;
          created_at?: string;
          id?: never;
          note?: string | null;
          proposed_by?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          station_id: number;
          status?: Database["public"]["Enums"]["edit_status"];
        };
        Update: {
          changes?: NonNullable<Json>;
          created_at?: string;
          id?: never;
          note?: string | null;
          proposed_by?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          station_id?: number;
          status?: Database["public"]["Enums"]["edit_status"];
        };
        Relationships: [
          {
            foreignKeyName: "station_edits_proposed_by_fkey";
            columns: ["proposed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "station_edits_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "station_edits_station_id_fkey";
            columns: ["station_id"];
            isOneToOne: false;
            referencedRelation: "station_summaries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "station_edits_station_id_fkey";
            columns: ["station_id"];
            isOneToOne: false;
            referencedRelation: "stations";
            referencedColumns: ["id"];
          },
        ];
      };
      stations: {
        Row: {
          access_hours: string | null;
          access_type: Database["public"]["Enums"]["access_type"];
          address: string | null;
          amenities: string[];
          created_at: string;
          created_by: string | null;
          hidden_at: string | null;
          id: number;
          is_24_7: boolean | null;
          location: unknown;
          name: string;
          ocm_id: number | null;
          operator_id: number | null;
          parking_fee_note: string | null;
          payment_methods: Database["public"]["Enums"]["payment_method"][];
          postcode: string | null;
          source: Database["public"]["Enums"]["station_source"];
          state: string | null;
          suburb: string | null;
          updated_at: string;
        };
        Insert: {
          access_hours?: string | null;
          access_type?: Database["public"]["Enums"]["access_type"];
          address?: string | null;
          amenities?: string[];
          created_at?: string;
          created_by?: string | null;
          hidden_at?: string | null;
          id?: never;
          is_24_7?: boolean | null;
          location: unknown;
          name: string;
          ocm_id?: number | null;
          operator_id?: number | null;
          parking_fee_note?: string | null;
          payment_methods?: Database["public"]["Enums"]["payment_method"][];
          postcode?: string | null;
          source: Database["public"]["Enums"]["station_source"];
          state?: string | null;
          suburb?: string | null;
          updated_at?: string;
        };
        Update: {
          access_hours?: string | null;
          access_type?: Database["public"]["Enums"]["access_type"];
          address?: string | null;
          amenities?: string[];
          created_at?: string;
          created_by?: string | null;
          hidden_at?: string | null;
          id?: never;
          is_24_7?: boolean | null;
          location?: unknown;
          name?: string;
          ocm_id?: number | null;
          operator_id?: number | null;
          parking_fee_note?: string | null;
          payment_methods?: Database["public"]["Enums"]["payment_method"][];
          postcode?: string | null;
          source?: Database["public"]["Enums"]["station_source"];
          state?: string | null;
          suburb?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stations_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stations_operator_id_fkey";
            columns: ["operator_id"];
            isOneToOne: false;
            referencedRelation: "operators";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stations_operator_id_fkey";
            columns: ["operator_id"];
            isOneToOne: false;
            referencedRelation: "station_summaries";
            referencedColumns: ["operator_id"];
          },
        ];
      };
      status_reports: {
        Row: {
          connector_id: number | null;
          created_at: string;
          hidden_at: string | null;
          id: number;
          notes: string | null;
          observed_at: string;
          reported_by: string;
          station_id: number;
          status: Database["public"]["Enums"]["charger_status"];
        };
        Insert: {
          connector_id?: number | null;
          created_at?: string;
          hidden_at?: string | null;
          id?: never;
          notes?: string | null;
          observed_at?: string;
          reported_by?: string;
          station_id: number;
          status: Database["public"]["Enums"]["charger_status"];
        };
        Update: {
          connector_id?: number | null;
          created_at?: string;
          hidden_at?: string | null;
          id?: never;
          notes?: string | null;
          observed_at?: string;
          reported_by?: string;
          station_id?: number;
          status?: Database["public"]["Enums"]["charger_status"];
        };
        Relationships: [
          {
            foreignKeyName: "status_reports_connector_id_fkey";
            columns: ["connector_id"];
            isOneToOne: false;
            referencedRelation: "connectors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "status_reports_reported_by_fkey";
            columns: ["reported_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "status_reports_station_id_fkey";
            columns: ["station_id"];
            isOneToOne: false;
            referencedRelation: "station_summaries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "status_reports_station_id_fkey";
            columns: ["station_id"];
            isOneToOne: false;
            referencedRelation: "stations";
            referencedColumns: ["id"];
          },
        ];
      };
      user_moderation: {
        Row: {
          role: Database["public"]["Enums"]["user_role"];
          shadowban_reason: string | null;
          shadowbanned_at: string | null;
          shadowbanned_by: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          role?: Database["public"]["Enums"]["user_role"];
          shadowban_reason?: string | null;
          shadowbanned_at?: string | null;
          shadowbanned_by?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          role?: Database["public"]["Enums"]["user_role"];
          shadowban_reason?: string | null;
          shadowbanned_at?: string | null;
          shadowbanned_by?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_moderation_shadowbanned_by_fkey";
            columns: ["shadowbanned_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_moderation_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      current_prices: {
        Row: {
          confirmation_count: number | null;
          connector_type: Database["public"]["Enums"]["connector_type"] | null;
          created_at: string | null;
          days_of_week: number[] | null;
          hidden_at: string | null;
          id: number | null;
          idle_fee_grace_minutes: number | null;
          idle_fee_per_minute: number | null;
          is_free: boolean | null;
          last_seen_at: string | null;
          notes: string | null;
          observed_at: string | null;
          per_kwh: number | null;
          per_minute: number | null;
          photo_path: string | null;
          plan_name: string | null;
          reported_by: string | null;
          session_fee: number | null;
          station_id: number | null;
          tier: Database["public"]["Enums"]["price_tier"] | null;
          time_window_end: string | null;
          time_window_start: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "price_reports_reported_by_fkey";
            columns: ["reported_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "price_reports_station_id_fkey";
            columns: ["station_id"];
            isOneToOne: false;
            referencedRelation: "station_summaries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "price_reports_station_id_fkey";
            columns: ["station_id"];
            isOneToOne: false;
            referencedRelation: "stations";
            referencedColumns: ["id"];
          },
        ];
      };
      station_summaries: {
        Row: {
          access_hours: string | null;
          access_type: Database["public"]["Enums"]["access_type"] | null;
          address: string | null;
          amenities: string[] | null;
          cheapest_kwh: number | null;
          connector_types:
            | Database["public"]["Enums"]["connector_type"][]
            | null;
          has_dc: boolean | null;
          id: number | null;
          is_24_7: boolean | null;
          is_free: boolean | null;
          lat: number | null;
          lng: number | null;
          location: unknown;
          max_power_kw: number | null;
          name: string | null;
          operator_id: number | null;
          operator_name: string | null;
          operator_website: string | null;
          parking_fee_note: string | null;
          payment_methods:
            | Database["public"]["Enums"]["payment_method"][]
            | null;
          postcode: string | null;
          price_seen_at: string | null;
          state: string | null;
          suburb: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      author_visible: { Args: { author: string }; Returns: boolean };
      is_moderator: { Args: Record<PropertyKey, never>; Returns: boolean };
      row_visible: {
        Args: { author: string; hidden_at: string };
        Returns: boolean;
      };
      stations_in_bbox: {
        Args: {
          max_lat: number;
          max_lng: number;
          max_results?: number;
          min_lat: number;
          min_lng: number;
        };
        Returns: {
          access_hours: string | null;
          access_type: Database["public"]["Enums"]["access_type"] | null;
          address: string | null;
          amenities: string[] | null;
          cheapest_kwh: number | null;
          connector_types:
            | Database["public"]["Enums"]["connector_type"][]
            | null;
          has_dc: boolean | null;
          id: number | null;
          is_24_7: boolean | null;
          is_free: boolean | null;
          lat: number | null;
          lng: number | null;
          location: unknown;
          max_power_kw: number | null;
          name: string | null;
          operator_id: number | null;
          operator_name: string | null;
          operator_website: string | null;
          parking_fee_note: string | null;
          payment_methods:
            | Database["public"]["Enums"]["payment_method"][]
            | null;
          postcode: string | null;
          price_seen_at: string | null;
          state: string | null;
          suburb: string | null;
        }[];
        SetofOptions: {
          from: "*";
          to: "station_summaries";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      stations_near: {
        Args: {
          lat: number;
          lng: number;
          max_results?: number;
          radius_m?: number;
        };
        Returns: {
          access_hours: string | null;
          access_type: Database["public"]["Enums"]["access_type"] | null;
          address: string | null;
          amenities: string[] | null;
          cheapest_kwh: number | null;
          connector_types:
            | Database["public"]["Enums"]["connector_type"][]
            | null;
          has_dc: boolean | null;
          id: number | null;
          is_24_7: boolean | null;
          is_free: boolean | null;
          lat: number | null;
          lng: number | null;
          location: unknown;
          max_power_kw: number | null;
          name: string | null;
          operator_id: number | null;
          operator_name: string | null;
          operator_website: string | null;
          parking_fee_note: string | null;
          payment_methods:
            | Database["public"]["Enums"]["payment_method"][]
            | null;
          postcode: string | null;
          price_seen_at: string | null;
          state: string | null;
          suburb: string | null;
        }[];
        SetofOptions: {
          from: "*";
          to: "station_summaries";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
    };
    Enums: {
      access_type: "public" | "customers" | "restricted";
      charger_status: "working" | "faulty" | "blocked";
      connector_type: "type2" | "ccs2" | "chademo" | "type1" | "nacs";
      current_type: "ac" | "dc";
      edit_status: "pending" | "applied" | "rejected";
      flag_reason: "wrong" | "spam" | "offensive" | "duplicate" | "other";
      flag_target: "price_report" | "status_report" | "station";
      payment_method: "credit_card" | "app" | "rfid" | "plug_and_charge";
      price_tier: "casual" | "member" | "subscription";
      station_source: "ocm" | "user";
      user_role: "user" | "moderator" | "admin";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      access_type: ["public", "customers", "restricted"],
      charger_status: ["working", "faulty", "blocked"],
      connector_type: ["type2", "ccs2", "chademo", "type1", "nacs"],
      current_type: ["ac", "dc"],
      edit_status: ["pending", "applied", "rejected"],
      flag_reason: ["wrong", "spam", "offensive", "duplicate", "other"],
      flag_target: ["price_report", "status_report", "station"],
      payment_method: ["credit_card", "app", "rfid", "plug_and_charge"],
      price_tier: ["casual", "member", "subscription"],
      station_source: ["ocm", "user"],
      user_role: ["user", "moderator", "admin"],
    },
  },
} as const;
