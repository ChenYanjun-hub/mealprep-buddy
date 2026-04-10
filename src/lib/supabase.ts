import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mock.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'mock-anon-key'
// 是否为 Mock 模式（可通过 VITE_MOCK_MODE=true 强制启用）
export const isMockMode =
  import.meta.env.VITE_MOCK_MODE === 'true' ||
  !import.meta.env.VITE_SUPABASE_URL ||
  !import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Profile {
  id: string
  city: string | null
  hometown: string | null
  taste_tags: string[] | null
  created_at: string
}

export interface Ingredient {
  id: string
  user_id: string
  name: string
  category: '肉类' | '蔬菜' | '调料' | '其他'
  quantity: string | null
  created_at: string
}

export interface RecipeHistory {
  id: string
  user_id: string
  input_ingredients: string[]
  recommended_recipes: RecommendedRecipe[]
  shopping_list: string[]
  created_at: string
}

export interface RecommendedRecipe {
  name: string
  ingredients: string[]
  steps: string[]
}

export interface RecipeFeedback {
  id: string
  user_id: string
  recipe_history_id: string
  rating: number
  feedback_type: 'helpful' | 'not_helpful' | 'needs_improvement'
  comment: string | null
  created_at: string
}

export const INGREDIENT_CATEGORIES = [
  { id: '肉类', label: '肉类' },
  { id: '蔬菜', label: '蔬菜' },
  { id: '调料', label: '调料' },
  { id: '其他', label: '其他' },
] as const

export const TASTE_TAGS = [
  { id: 'spicy', label: '辣' },
  { id: 'sour', label: '酸' },
  { id: 'sweet', label: '甜' },
  { id: 'light', label: '清淡' },
  { id: 'salty', label: '咸鲜' },
  { id: 'heavy', label: '重口' },
] as const

// Mock 数据存储（仅 Mock 模式使用）
export const mockStorage = {
  ingredients: [] as Ingredient[],
  profile: {
    id: 'mock-user',
    city: '北京',
    hometown: '四川',
    taste_tags: ['spicy', 'salty'],
    created_at: new Date().toISOString(),
  } as Profile,
  history: [] as RecipeHistory[],
}
