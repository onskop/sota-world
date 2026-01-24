/**
 * Database TypeScript Types
 * Generated from Supabase schema after migration 001
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// =====================================================
// USER & BILLING TYPES
// =====================================================

export interface Profile {
  id: string // UUID
  email: string
  full_name: string | null
  avatar_url: string | null
  timezone: string
  preferences: Json
  is_admin: boolean
  account_status: 'pending' | 'approved' | 'rejected'
  onboarding_completed: boolean
  created_at: string // timestamptz
  updated_at: string // timestamptz
}

export interface SubscriptionTier {
  id: string // UUID
  name: 'free' | 'pro' | 'unlimited'
  display_name: string
  price_monthly_cents: number
  price_yearly_cents: number | null
  features: Json
  limits: {
    notes_per_month?: number
    actions_per_day?: number
    tools_count?: number
    voice_minutes?: number
  }
  is_active: boolean
  created_at: string
}

export interface BillingSubscription {
  id: string // UUID
  user_id: string // FK to profiles
  tier_id: string // FK to subscription_tiers
  status: 'active' | 'canceled' | 'past_due' | 'trialing'
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  created_at: string
  updated_at: string
}

// =====================================================
// VOICE RECORDING TYPES
// =====================================================

export interface VoiceRecording {
  id: string // UUID
  user_id: string // FK to profiles
  storage_path: string
  file_size_bytes: number | null
  duration_seconds: number | null
  transcription_text: string
  list_item_id: string | null // FK to list_items (added in migration 001)
  created_at: string
  updated_at: string
}

// =====================================================
// LISTS & ITEMS TYPES (NEW in migration 001)
// =====================================================

export type ListType = 'inbox' | 'shopping' | 'movies' | 'tasks' | 'custom'

export interface List {
  id: string // UUID
  user_id: string // FK to profiles
  name: string
  type: ListType
  icon: string | null
  color: string | null
  position: number
  created_at: string
  updated_at: string
}

export interface ListItem {
  id: string // UUID
  list_id: string // FK to lists
  user_id: string // FK to profiles
  content: string
  is_checked: boolean
  position: number
  metadata: {
    source_type?: 'text' | 'voice' | 'agent_action'
    voice_recording_id?: string
    migrated_from_note_id?: string
    [key: string]: any
  }
  created_at: string
  updated_at: string
}

// =====================================================
// TASKS TYPES (NEW in migration 001)
// =====================================================

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type TaskPriority = 'low' | 'medium' | 'high'

export interface Task {
  id: string // UUID
  user_id: string // FK to profiles
  content: string
  description: string | null
  due_date: string | null // timestamptz
  status: TaskStatus
  priority: TaskPriority | null
  tags: string[] | null
  position: number
  created_at: string
  updated_at: string
  completed_at: string | null
}

// =====================================================
// FUTURE TYPES (for research subscriptions - Phase 4+)
// =====================================================

export type ResearchFrequency = 'daily' | 'weekly' | 'monthly'

export interface ResearchSubscription {
  id: string // UUID
  user_id: string // FK to profiles
  topic: string
  search_query: string
  frequency: ResearchFrequency
  status: 'active' | 'paused' | 'cancelled'
  last_run_at: string | null
  next_run_at: string | null
  research_config: Json
  created_at: string
  updated_at: string
}

export interface Briefing {
  id: string // UUID
  subscription_id: string // FK to research_subscriptions
  user_id: string // FK to profiles
  summary_content: string
  sources: {
    title: string
    url: string
    date?: string
  }[]
  run_date: string
  created_at: string
}

// =====================================================
// DATABASE SCHEMA TYPE
// =====================================================

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
      }
      subscription_tiers: {
        Row: SubscriptionTier
        Insert: Omit<SubscriptionTier, 'id' | 'created_at'>
        Update: Partial<Omit<SubscriptionTier, 'id' | 'created_at'>>
      }
      billing_subscriptions: {
        Row: BillingSubscription
        Insert: Omit<BillingSubscription, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<BillingSubscription, 'id' | 'created_at'>>
      }
      voice_recordings: {
        Row: VoiceRecording
        Insert: Omit<VoiceRecording, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<VoiceRecording, 'id' | 'created_at'>>
      }
      lists: {
        Row: List
        Insert: Omit<List, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<List, 'id' | 'created_at'>>
      }
      list_items: {
        Row: ListItem
        Insert: Omit<ListItem, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ListItem, 'id' | 'created_at'>>
      }
      tasks: {
        Row: Task
        Insert: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'completed_at'>
        Update: Partial<Omit<Task, 'id' | 'created_at'>>
      }
      // Future tables (Phase 4+)
      research_subscriptions: {
        Row: ResearchSubscription
        Insert: Omit<ResearchSubscription, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ResearchSubscription, 'id' | 'created_at'>>
      }
      briefings: {
        Row: Briefing
        Insert: Omit<Briefing, 'id' | 'created_at'>
        Update: Partial<Omit<Briefing, 'id' | 'created_at'>>
      }
    }
  }
}

// =====================================================
// UTILITY TYPES
// =====================================================

// Typed Supabase client (use with createClient)
export type TypedSupabaseClient = any // Will be properly typed when using @supabase/supabase-js with Database generic

// Insert types for convenience
export type InsertProfile = Database['public']['Tables']['profiles']['Insert']
export type InsertList = Database['public']['Tables']['lists']['Insert']
export type InsertListItem = Database['public']['Tables']['list_items']['Insert']
export type InsertTask = Database['public']['Tables']['tasks']['Insert']
export type InsertVoiceRecording = Database['public']['Tables']['voice_recordings']['Insert']
export type InsertBillingSubscription = Database['public']['Tables']['billing_subscriptions']['Insert']

// Update types for convenience
export type UpdateProfile = Database['public']['Tables']['profiles']['Update']
export type UpdateList = Database['public']['Tables']['lists']['Update']
export type UpdateListItem = Database['public']['Tables']['list_items']['Update']
export type UpdateTask = Database['public']['Tables']['tasks']['Update']

// List with items (joined type)
export type ListWithItems = List & {
  items: ListItem[]
  item_count?: number
}

// Task with user info (for admin views)
export type TaskWithUser = Task & {
  user: Pick<Profile, 'email' | 'full_name'>
}
