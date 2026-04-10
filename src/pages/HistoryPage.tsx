import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase, isMockMode, mockStorage } from '../lib/supabase'
import type { RecipeHistory, RecommendedRecipe } from '../lib/supabase'
import { ArrowLeft, Clock, ChevronRight } from 'lucide-react'

export function HistoryPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [history, setHistory] = useState<RecipeHistory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchHistory()
    }
  }, [user])

  const fetchHistory = async () => {
    if (isMockMode) {
      setHistory(mockStorage.history)
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('recipes_history')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (!error && data) {
      setHistory(data as RecipeHistory[])
    }
    setLoading(false)
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor(diffMs / (1000 * 60))

    // 时间段描述
    const getPeriod = (hour: number) => {
      if (hour < 6) return '凌晨'
      if (hour < 9) return '早上'
      if (hour < 12) return '上午'
      if (hour < 14) return '中午'
      if (hour < 18) return '下午'
      return '晚上'
    }

    const timeStr = `${getPeriod(date.getHours())} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`

    if (diffMinutes < 60) {
      return diffMinutes <= 1 ? '刚刚' : `${diffMinutes}分钟前`
    } else if (diffHours < 24) {
      return `今天 ${timeStr}`
    } else if (diffDays === 1) {
      return `昨天 ${timeStr}`
    } else if (diffDays < 7) {
      return `${diffDays}天前`
    } else {
      return date.toLocaleDateString('zh-CN', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    }
  }

  const handleViewDetail = (item: RecipeHistory) => {
    navigate('/result', {
      state: {
        recipes: item.recommended_recipes,
        shoppingList: item.shopping_list,
      },
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="font-bold text-gray-800 text-lg">历史记录</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-8 text-gray-500">加载中...</div>
        ) : history.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>暂无历史记录</p>
            <p className="text-sm mt-1">推荐菜谱后这里会显示记录</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item) => {
              const recipes = item.recommended_recipes as RecommendedRecipe[]
              const recipeNames = recipes.map((r) => r.name).join('、')

              return (
                <button
                  key={item.id}
                  onClick={() => handleViewDetail(item)}
                  className="w-full bg-white rounded-xl shadow-sm p-4 text-left hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                        <Clock className="w-4 h-4" />
                        {formatDateTime(item.created_at)}
                      </div>
                      <p className="font-medium text-gray-800 truncate">
                        {recipeNames}
                      </p>
                      <p className="text-sm text-gray-500 mt-1 truncate">
                        食材：{item.input_ingredients.join('、')}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" />
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
