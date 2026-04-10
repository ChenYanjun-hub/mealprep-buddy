import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, ShoppingCart, ChefHat, Copy, Check, AlertTriangle } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { FeedbackSection } from '../components/FeedbackSection'

interface Recipe {
  name: string
  ingredients: string[]
  steps: string[]
}

interface LocationState {
  recipes: Recipe[]
  shoppingList: string[]
  historyId?: string
  _meta?: {
    usedFallback?: boolean
    validationError?: string
    attempts?: number
  }
}

export function ResultPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [copied, setCopied] = useState(false)
  const state = location.state as LocationState | undefined

  if (!state?.recipes) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">没有找到推荐结果</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg"
          >
            返回首页
          </button>
        </div>
      </div>
    )
  }

  const { recipes, shoppingList, historyId, _meta } = state

  const handleCopyShoppingList = () => {
    const text = shoppingList.map((item) => `□ ${item}`).join('\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="font-bold text-gray-800 text-lg">推荐结果</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 pb-8">
        {/* 验证状态提示 */}
        {_meta?.usedFallback && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-700 font-medium">使用了预设菜谱</p>
              <p className="text-amber-600 text-sm mt-1">
                AI 响应验证失败，已为您推荐通用菜谱。如需更精准推荐，请稍后重试。
              </p>
            </div>
          </div>
        )}

        {/* Recipes */}
        <div className="space-y-4 mb-6">
          {recipes.map((recipe, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-sm overflow-hidden"
            >
              <div className="bg-orange-500 px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <ChefHat className="w-4 h-4 text-white" />
                </div>
                <h2 className="font-bold text-white text-lg">{recipe.name}</h2>
              </div>

              <div className="p-4">
                {/* Ingredients */}
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">
                    用料
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {recipe.ingredients.map((ing, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-sm"
                      >
                        {ing}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Steps */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">
                    做法
                  </h3>
                  <ol className="space-y-2">
                    {recipe.steps.map((step, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm font-medium">
                          {i + 1}
                        </span>
                        <p className="text-gray-700 flex-1">{step}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Shopping List */}
        {shoppingList.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <h2 className="font-medium text-gray-800">采购清单</h2>
                  <p className="text-sm text-gray-500">
                    需要额外购买的食材
                  </p>
                </div>
              </div>
              <button
                onClick={handleCopyShoppingList}
                className="px-3 py-1.5 text-sm text-orange-600 hover:bg-orange-50 rounded-lg transition-colors flex items-center gap-1"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    已复制
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    复制
                  </>
                )}
              </button>
            </div>

            <ul className="space-y-2">
              {shoppingList.map((item, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0"
                >
                  <span className="text-gray-400">□</span>
                  <span className="text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Feedback Section - 仅当有 historyId 时显示 */}
        {historyId && user?.id ? (
          <FeedbackSection
            recipeHistoryId={historyId}
            userId={user.id}
          />
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center text-gray-500">
            历史记录保存失败，无法提交反馈
          </div>
        )}
      </main>
    </div>
  )
}
