// Database schema types for Supabase
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          city: string | null
          hometown: string | null
          taste_tags: string[] | null
          created_at: string
        }
        Insert: {
          id: string
          city?: string | null
          hometown?: string | null
          taste_tags?: string[] | null
          created_at?: string
        }
        Update: {
          id?: string
          city?: string | null
          hometown?: string | null
          taste_tags?: string[] | null
          created_at?: string
        }
      }
      ingredients: {
        Row: {
          id: string
          user_id: string
          name: string
          category: string
          quantity: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          category?: string
          quantity?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          category?: string
          quantity?: string | null
          created_at?: string
        }
      }
      recipes_history: {
        Row: {
          id: string
          user_id: string
          input_ingredients: string[]
          recommended_recipes: Json
          shopping_list: string[]
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          input_ingredients: string[]
          recommended_recipes: Json
          shopping_list: string[]
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          input_ingredients?: string[]
          recommended_recipes?: Json
          shopping_list?: string[]
          created_at?: string
        }
      }
    }
  }
}
