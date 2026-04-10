import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

// ========== Zod Schema (内联定义) ==========

const FeedbackSchema = z.object({
  recipeHistoryId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  feedbackType: z.enum(['helpful', 'not_helpful', 'needs_improvement']),
  comment: z.string().max(500).optional(),
})

// ========== Supabase Client ==========

function getSupabaseClient() {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase credentials')
  }

  return createClient(url, key)
}

// ========== API Handler ==========

interface FeedbackRequest {
  recipeHistoryId: string
  rating: number
  feedbackType: 'helpful' | 'not_helpful' | 'needs_improvement'
  comment?: string
  userId: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { recipeHistoryId, rating, feedbackType, comment, userId } = req.body as FeedbackRequest

    console.log('[feedback] Request:', { recipeHistoryId, rating, feedbackType, userId })

    // 验证用户
    if (!userId) {
      return res.status(401).json({ error: '请先登录' })
    }

    // Zod 验证
    const validation = FeedbackSchema.safeParse({
      recipeHistoryId,
      rating,
      feedbackType,
      comment,
    })

    if (!validation.success) {
      return res.status(400).json({
        error: '数据验证失败',
        details: validation.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
      })
    }

    const supabase = getSupabaseClient()
    const data = validation.data

    // 检查历史记录是否存在且属于该用户
    const { data: history, error: historyError } = await supabase
      .from('recipes_history')
      .select('id')
      .eq('id', data.recipeHistoryId)
      .eq('user_id', userId)
      .single()

    console.log('[feedback] History check:', { history, historyError })

    if (historyError || !history) {
      return res.status(404).json({ error: '历史记录不存在或无权访问' })
    }

    // 检查是否已反馈
    const { data: existing } = await supabase
      .from('recipe_feedback')
      .select('id')
      .eq('recipe_history_id', data.recipeHistoryId)
      .eq('user_id', userId)
      .single()

    if (existing) {
      // 更新已有反馈
      const { error: updateError } = await supabase
        .from('recipe_feedback')
        .update({
          rating: data.rating,
          feedback_type: data.feedbackType,
          comment: data.comment,
        })
        .eq('id', existing.id)

      if (updateError) {
        console.error('[feedback] Update error:', updateError)
        throw updateError
      }

      return res.json({ success: true, message: '反馈已更新' })
    }

    // 插入新反馈
    const { error: insertError } = await supabase.from('recipe_feedback').insert({
      user_id: userId,
      recipe_history_id: data.recipeHistoryId,
      rating: data.rating,
      feedback_type: data.feedbackType,
      comment: data.comment,
    })

    if (insertError) {
      console.error('[feedback] Insert error:', insertError)
      throw insertError
    }

    return res.json({ success: true, message: '感谢您的反馈！' })
  } catch (error) {
    console.error('[feedback] Error:', error)
    return res.status(500).json({ error: '提交失败，请稍后重试' })
  }
}
