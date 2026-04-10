import { z } from 'zod'

/**
 * 单个菜谱 Schema
 */
export const RecipeSchema = z.object({
  name: z.string().min(1, '菜名不能为空').max(50, '菜名过长'),
  ingredients: z
    .array(z.string().min(1).max(100))
    .min(1, '至少需要一种食材')
    .max(20, '食材数量过多'),
  steps: z
    .array(z.string().min(1).max(500))
    .min(1, '至少需要一个步骤')
    .max(20, '步骤数量过多'),
})

/**
 * AI 推荐响应 Schema
 */
export const RecommendationResponseSchema = z.object({
  recipes: z.array(RecipeSchema).min(2, '至少推荐2道菜').max(3, '最多推荐3道菜'),
  shoppingList: z.array(z.string().min(1).max(50)).max(20),
})

/**
 * 用户反馈 Schema
 */
export const FeedbackSchema = z.object({
  recipeHistoryId: z.string().min(1, '历史记录ID不能为空'),
  rating: z.number().int('评分必须是整数').min(1, '最低1分').max(5, '最高5分'),
  feedbackType: z.enum(['helpful', 'not_helpful', 'needs_improvement']),
  comment: z.string().max(500, '评论过长').optional(),
})

// Type exports
export type Recipe = z.infer<typeof RecipeSchema>
export type RecommendationResponse = z.infer<typeof RecommendationResponseSchema>
export type Feedback = z.infer<typeof FeedbackSchema>

/**
 * 验证 AI 响应
 * 从文本中提取 JSON 并验证
 */
export function validateAIResponse(content: string): RecommendationResponse {
  // 1. 尝试提取 JSON（支持 markdown 代码块）
  const jsonMatch =
    content.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1] ||
    content.match(/\{[\s\S]*\}/)?.[0]

  if (!jsonMatch) {
    throw new Error('AI_RESPONSE_NO_JSON: 无法从响应中提取 JSON')
  }

  // 2. 解析 JSON
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonMatch.trim())
  } catch {
    throw new Error('AI_RESPONSE_INVALID_JSON: JSON 格式无效')
  }

  // 3. Zod 验证
  const result = RecommendationResponseSchema.safeParse(parsed)
  if (!result.success) {
    const errors = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new Error(`AI_RESPONSE_VALIDATION_FAILED: ${errors}`)
  }

  return result.data
}

/**
 * 降级菜谱生成
 * 当 AI 验证失败时返回预设菜谱
 */
export function getFallbackRecipes(ingredients: string[]): RecommendationResponse {
  const availableIngredients = ingredients.slice(0, 5)

  return {
    recipes: [
      {
        name: '家常小炒',
        ingredients: [...availableIngredients.map((i) => `${i} 适量`), '盐 少许', '食用油 适量'],
        steps: [
          '将所有食材洗净切好备用',
          '热锅下油，油温适中',
          '依次放入食材翻炒',
          '加盐调味，翻炒均匀即可出锅',
        ],
      },
      {
        name: '营养汤品',
        ingredients: [...ingredients.slice(0, 3).map((i) => `${i} 适量`), '盐 适量', '清水 适量'],
        steps: [
          '食材洗净切块',
          '放入锅中，加入适量清水',
          '大火煮开后转小火慢炖',
          '出锅前加盐调味即可',
        ],
      },
    ],
    shoppingList: ['盐', '食用油'],
  }
}
