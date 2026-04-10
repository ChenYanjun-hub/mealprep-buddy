import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'

// ========== Zod Schemas (内联定义，避免跨目录导入问题) ==========

const RecipeSchema = z.object({
  name: z.string().min(1).max(50),
  ingredients: z.array(z.string().min(1).max(100)).min(1).max(20),
  steps: z.array(z.string().min(1).max(500)).min(1).max(20),
})

const RecommendationResponseSchema = z.object({
  recipes: z.array(RecipeSchema).min(2).max(3),
  shoppingList: z.array(z.string().min(1).max(50)).max(20),
})

type RecommendationResponse = z.infer<typeof RecommendationResponseSchema>

function validateAIResponse(content: string): RecommendationResponse {
  const jsonMatch =
    content.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1] ||
    content.match(/\{[\s\S]*\}/)?.[0]

  if (!jsonMatch) {
    throw new Error('AI_RESPONSE_NO_JSON: 无法从响应中提取 JSON')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonMatch.trim())
  } catch {
    throw new Error('AI_RESPONSE_INVALID_JSON: JSON 格式无效')
  }

  const result = RecommendationResponseSchema.safeParse(parsed)
  if (!result.success) {
    const errors = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new Error(`AI_RESPONSE_VALIDATION_FAILED: ${errors}`)
  }

  return result.data
}

function getFallbackRecipes(ingredients: string[]): RecommendationResponse {
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

// ========== API Handler ==========

interface RecommendRequest {
  ingredients: string[]
  city: string
  hometown: string
  tasteTags: string[]
}

interface APIResponse extends RecommendationResponse {
  _meta?: {
    usedFallback: boolean
    validationError?: string
    attempts?: number
  }
}

const TASTE_LABELS: Record<string, string> = {
  spicy: '辣',
  sour: '酸',
  sweet: '甜',
  light: '清淡',
  salty: '咸鲜',
  heavy: '重口',
}

const MAX_RETRIES = 3
const RETRY_DELAY_BASE = 1000

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

  const { ingredients, city, hometown, tasteTags } = req.body as RecommendRequest

  // 输入验证
  if (!ingredients || ingredients.length === 0) {
    return res.status(400).json({ error: '请提供食材列表' })
  }

  if (ingredients.length > 20) {
    return res.status(400).json({ error: '食材数量过多，最多20种' })
  }

  // 获取 API Keys
  const zhipuApiKey = process.env.ZHIPU_API_KEY
  const claudeApiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY

  // 无 API Key 时返回 mock 数据（开发模式，不显示警告）
  if (!zhipuApiKey && !claudeApiKey) {
    console.log('[recommend] No API key, returning mock data')
    return res.json({
      ...getMockResponse(),
      _meta: { usedFallback: false, devMode: true },
    } as APIResponse)
  }

  try {
    const result = await generateWithRetry({
      ingredients,
      city,
      hometown,
      tasteTags,
      zhipuApiKey,
      claudeApiKey,
    })

    return res.json({
      ...result.data,
      _meta: {
        usedFallback: false,
        attempts: result.attempts,
      },
    } as APIResponse)
  } catch (error) {
    console.error('AI recommendation error:', error)

    const fallback = getFallbackRecipes(ingredients)
    return res.json({
      ...fallback,
      _meta: {
        usedFallback: true,
        validationError: error instanceof Error ? error.message : 'Unknown error',
      },
    } as APIResponse)
  }
}

async function generateWithRetry(params: {
  ingredients: string[]
  city: string
  hometown: string
  tasteTags: string[]
  zhipuApiKey?: string
  claudeApiKey?: string
}): Promise<{ data: RecommendationResponse; attempts: number }> {
  const prompt = buildPrompt(params)

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      let content: string

      if (params.zhipuApiKey) {
        content = await callZhipuAI(params.zhipuApiKey, prompt)
      } else if (params.claudeApiKey) {
        content = await callClaudeAPI(params.claudeApiKey, prompt)
      } else {
        throw new Error('No API key available')
      }

      const data = validateAIResponse(content)
      return { data, attempts: attempt }
    } catch (error) {
      const isLastAttempt = attempt === MAX_RETRIES

      if (error instanceof Error && error.message.startsWith('AI_RESPONSE_') && !isLastAttempt) {
        console.log(`Attempt ${attempt} failed with validation error, retrying...`)
        await delay(RETRY_DELAY_BASE * attempt)
        continue
      }

      throw error
    }
  }

  throw new Error('Max retries exceeded')
}

function buildPrompt(params: {
  ingredients: string[]
  city: string
  hometown: string
  tasteTags: string[]
}): string {
  const tasteLabels = params.tasteTags.map((t) => TASTE_LABELS[t] || t).join('、')

  return `你是一位专业的家庭烹饪顾问，帮助打工人根据现有食材规划菜谱。

【用户信息】
- 所在城市：${params.city || '未知'}
- 口味偏好：${tasteLabels || '无特别偏好'}
- 籍贯：${params.hometown || '未知'}

【现有食材】
${params.ingredients.join('、')}

【任务】
请根据以上信息，推荐 2-3 道适合的菜谱：
1. 考虑用户的口味偏好和籍贯特色
2. 优先使用现有食材
3. 如需额外购买食材，请列出采购清单

【重要】必须严格按以下 JSON 格式返回，不要添加任何说明文字：
{
  "recipes": [
    {
      "name": "菜名",
      "ingredients": ["食材1 用量", "食材2 用量"],
      "steps": ["步骤1", "步骤2"]
    }
  ],
  "shoppingList": ["需要购买的食材1", "需要购买的食材2"]
}

约束条件：
- recipes 数组必须包含 2-3 道菜
- 每道菜的 ingredients 数组至少 1 个元素
- 每道菜的 steps 数组至少 1 个元素`
}

async function callZhipuAI(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'glm-4-flash',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Zhipu API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || ''
}

async function callClaudeAPI(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`)
  }

  const data = await response.json()
  return data.content[0]?.text || ''
}

function getMockResponse(): RecommendationResponse {
  return {
    recipes: [
      {
        name: '番茄炒蛋',
        ingredients: ['番茄 2个', '鸡蛋 3个', '盐 适量', '糖 少许', '葱花 适量'],
        steps: [
          '番茄洗净切块，鸡蛋打散加少许盐',
          '锅中倒油烧热，倒入蛋液快速翻炒至凝固盛出',
          '锅中再加少许油，放入番茄翻炒出汁',
          '加入炒好的鸡蛋，加盐和少许糖调味',
          '撒上葱花即可出锅',
        ],
      },
      {
        name: '蒜蓉青菜',
        ingredients: ['青菜 300g', '蒜 3瓣', '盐 适量', '生抽 1勺'],
        steps: [
          '青菜洗净沥干，蒜切末',
          '锅中烧开水，放入青菜焯烫30秒捞出',
          '锅中倒油烧热，放入蒜末爆香',
          '放入青菜快速翻炒，加盐和生抽调味即可',
        ],
      },
    ],
    shoppingList: ['番茄', '鸡蛋', '青菜', '蒜', '葱'],
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
