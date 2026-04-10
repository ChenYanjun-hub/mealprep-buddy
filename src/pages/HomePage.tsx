import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase, INGREDIENT_CATEGORIES, isMockMode, mockStorage } from '../lib/supabase'
import type { Ingredient } from '../lib/supabase'
import {
  Plus,
  Trash2,
  ChefHat,
  Settings,
  History,
  LogOut,
  Carrot,
  Beef,
  Leaf,
  Sparkles
} from 'lucide-react'

// 中文分类对应的图标
const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  '肉类': Beef,
  '蔬菜': Carrot,
  '调料': Leaf,
  '其他': Sparkles,
}

export function HomePage() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [newIngredient, setNewIngredient] = useState<{
    name: string
    category: '肉类' | '蔬菜' | '调料' | '其他'
    quantity: string
  }>({
    name: '',
    category: '蔬菜',
    quantity: '',
  })
  const [loading, setLoading] = useState(true)
  const [recommending, setRecommending] = useState(false)

  useEffect(() => {
    if (user) {
      fetchIngredients()
    }
  }, [user])

  const fetchIngredients = async () => {
    if (isMockMode) {
      setIngredients(mockStorage.ingredients)
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('ingredients')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setIngredients(data as Ingredient[])
    }
    setLoading(false)
  }

  const handleAddIngredient = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newIngredient.name.trim()) return

    if (isMockMode) {
      const newIng: Ingredient = {
        id: `mock-${Date.now()}`,
        user_id: user!.id,
        name: newIngredient.name.trim(),
        category: newIngredient.category,
        quantity: newIngredient.quantity || null,
        created_at: new Date().toISOString(),
      }
      mockStorage.ingredients.unshift(newIng)
      setIngredients([...mockStorage.ingredients])
      setNewIngredient({ name: '', category: '蔬菜', quantity: '' })
      setShowAddForm(false)
      return
    }

    const { error } = await supabase.from('ingredients').insert({
      user_id: user!.id,
      name: newIngredient.name.trim(),
      category: newIngredient.category,
      quantity: newIngredient.quantity || null,
    })

    if (!error) {
      await fetchIngredients()
      setNewIngredient({ name: '', category: '蔬菜', quantity: '' })
      setShowAddForm(false)
    }
  }

  const handleDeleteIngredient = async (id: string) => {
    if (isMockMode) {
      mockStorage.ingredients = mockStorage.ingredients.filter((i) => i.id !== id)
      setIngredients([...mockStorage.ingredients])
      return
    }

    const { error } = await supabase
      .from('ingredients')
      .delete()
      .eq('id', id)

    if (!error) {
      setIngredients(ingredients.filter((i) => i.id !== id))
    }
  }

  const handleRecommend = async () => {
    if (ingredients.length === 0) {
      alert('请先添加一些食材')
      return
    }

    setRecommending(true)
    try {
      const response = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredients: ingredients.map((i) => i.name),
          city: profile?.city || '',
          hometown: profile?.hometown || '',
          tasteTags: profile?.taste_tags || [],
        }),
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      // Save to history (mock or real)
      let historyId: string

      if (isMockMode) {
        historyId = `mock-${Date.now()}`
        mockStorage.history.unshift({
          id: historyId,
          user_id: user!.id,
          input_ingredients: ingredients.map((i) => i.name),
          recommended_recipes: data.recipes,
          shopping_list: data.shoppingList,
          created_at: new Date().toISOString(),
        })
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('recipes_history')
          .insert({
            user_id: user!.id,
            input_ingredients: ingredients.map((i) => i.name),
            recommended_recipes: data.recipes,
            shopping_list: data.shoppingList,
          })
          .select('id')
          .single()

        if (insertError || !inserted) {
          console.error('Failed to save history:', insertError)
          // 继续但不保存反馈
          historyId = ''
        } else {
          historyId = inserted.id
          console.log('History saved:', historyId)
        }
      }

      // Navigate to result page with data
      navigate('/result', {
        state: {
          recipes: data.recipes,
          shoppingList: data.shoppingList,
          historyId,
          _meta: data._meta,
        }
      })
    } catch (error) {
      console.error('Recommendation failed:', error)
      alert('推荐失败，请稍后重试')
    } finally {
      setRecommending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-800">备菜助手</h1>
              <p className="text-xs text-gray-500">
                {profile?.city || '未设置城市'}
                {isMockMode && ' · 演示模式'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/history')}
              className="p-2 text-gray-500 hover:text-orange-500 transition-colors"
              title="历史记录"
            >
              <History className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="p-2 text-gray-500 hover:text-orange-500 transition-colors"
              title="设置"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={signOut}
              className="p-2 text-gray-500 hover:text-red-500 transition-colors"
              title="退出登录"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {/* Add Ingredient Section */}
        {!showAddForm ? (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full py-4 border-2 border-dashed border-orange-300 rounded-xl text-orange-500 hover:bg-orange-50 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            添加食材
          </button>
        ) : (
          <form
            onSubmit={handleAddIngredient}
            className="bg-white rounded-xl shadow-sm p-4 mb-4"
          >
            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  食材名称
                </label>
                <input
                  type="text"
                  value={newIngredient.name}
                  onChange={(e) =>
                    setNewIngredient({ ...newIngredient, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  placeholder="如：土豆、牛肉、酱油"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    分类
                  </label>
                  <select
                    value={newIngredient.category}
                    onChange={(e) =>
                      setNewIngredient({
                        ...newIngredient,
                        category: e.target.value as '肉类' | '蔬菜' | '调料' | '其他',
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  >
                    {INGREDIENT_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    数量（可选）
                  </label>
                  <input
                    type="text"
                    value={newIngredient.quantity}
                    onChange={(e) =>
                      setNewIngredient({
                        ...newIngredient,
                        quantity: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                    placeholder="如：2个、500g"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
                >
                  添加
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Ingredients List */}
        {loading ? (
          <div className="text-center py-8 text-gray-500">加载中...</div>
        ) : ingredients.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <ChefHat className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>还没有添加食材</p>
            <p className="text-sm mt-1">点击上方按钮开始添加</p>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {ingredients.map((ingredient) => {
              const IconComponent = CATEGORY_ICONS[ingredient.category] || Sparkles
              return (
                <div
                  key={ingredient.id}
                  className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                      <IconComponent className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">
                        {ingredient.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {ingredient.category}
                        {ingredient.quantity && ` · ${ingredient.quantity}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteIngredient(ingredient.id)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Recommend Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={handleRecommend}
            disabled={recommending || ingredients.length === 0}
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            {recommending ? 'AI 推荐中...' : '推荐菜谱'}
          </button>
        </div>
      </div>
    </div>
  )
}
