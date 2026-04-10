import { useState } from 'react'
import { Star, ThumbsUp, ThumbsDown, AlertCircle, CheckCircle } from 'lucide-react'
import { supabase, isMockMode } from '../lib/supabase'

interface FeedbackSectionProps {
  recipeHistoryId: string
  userId: string
  onSubmitSuccess?: () => void
}

type FeedbackType = 'helpful' | 'not_helpful' | 'needs_improvement'

const FEEDBACK_OPTIONS: { type: FeedbackType; label: string; icon: React.ReactNode }[] = [
  { type: 'helpful', label: '有帮助', icon: <ThumbsUp className="w-4 h-4" /> },
  { type: 'not_helpful', label: '没帮助', icon: <ThumbsDown className="w-4 h-4" /> },
  { type: 'needs_improvement', label: '需改进', icon: <AlertCircle className="w-4 h-4" /> },
]

export function FeedbackSection({
  recipeHistoryId,
  userId,
  onSubmitSuccess,
}: FeedbackSectionProps) {
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [feedbackType, setFeedbackType] = useState<FeedbackType | null>(null)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (rating === 0 || !feedbackType) {
      setError('请完成评分和反馈类型选择')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      if (isMockMode) {
        // Mock 模式：模拟成功
        console.log('[Mock] Feedback submitted:', { recipeHistoryId, rating, feedbackType, comment })
        setSubmitted(true)
        onSubmitSuccess?.()
        return
      }

      // 检查是否已有反馈
      const { data: existing } = await supabase
        .from('recipe_feedback')
        .select('id')
        .eq('recipe_history_id', recipeHistoryId)
        .eq('user_id', userId)
        .single()

      if (existing) {
        // 更新已有反馈
        const { error: updateError } = await supabase
          .from('recipe_feedback')
          .update({
            rating,
            feedback_type: feedbackType,
            comment: comment.trim() || null,
          })
          .eq('id', existing.id)

        if (updateError) throw updateError
      } else {
        // 插入新反馈
        const { error: insertError } = await supabase.from('recipe_feedback').insert({
          user_id: userId,
          recipe_history_id: recipeHistoryId,
          rating,
          feedback_type: feedbackType,
          comment: comment.trim() || null,
        })

        if (insertError) throw insertError
      }

      setSubmitted(true)
      onSubmitSuccess?.()
    } catch (err) {
      console.error('Feedback submission error:', err)
      setError(err instanceof Error ? err.message : '提交失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
        <CheckCircle className="w-5 h-5 text-green-500" />
        <span className="text-green-700">感谢您的反馈！我们会持续改进推荐质量。</span>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 mt-4">
      <h3 className="font-medium text-gray-800 mb-4">您对这次推荐满意吗？</h3>

      {/* 星级评分 */}
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">评分</p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="p-1 transition-transform hover:scale-110"
            >
              <Star
                className={`w-6 h-6 transition-colors ${
                  star <= (hoveredRating || rating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            </button>
          ))}
          {rating > 0 && (
            <span className="ml-2 text-sm text-gray-500 self-center">{rating} 分</span>
          )}
        </div>
      </div>

      {/* 反馈类型 */}
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">反馈类型</p>
        <div className="flex gap-2">
          {FEEDBACK_OPTIONS.map((option) => (
            <button
              key={option.type}
              type="button"
              onClick={() => setFeedbackType(option.type)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${
                feedbackType === option.type
                  ? option.type === 'helpful'
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : option.type === 'not_helpful'
                      ? 'bg-red-100 text-red-700 border border-red-300'
                      : 'bg-amber-100 text-amber-700 border border-amber-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {option.icon}
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* 评论 */}
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">建议（可选）</p>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="您对推荐有什么建议？菜谱哪里需要改进？"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none resize-none"
          rows={3}
          maxLength={500}
        />
        <p className="text-xs text-gray-400 mt-1 text-right">{comment.length}/500</p>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {/* 提交按钮 */}
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-lg font-medium transition-colors"
      >
        {submitting ? '提交中...' : '提交反馈'}
      </button>
    </div>
  )
}
