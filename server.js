import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

// Taste labels mapping
const TASTE_LABELS = {
  spicy: '辣',
  sour: '酸',
  sweet: '甜',
  light: '清淡',
  salty: '咸鲜',
  heavy: '重口',
}

// Zhipu AI API call
async function callZhipuAI(apiKey, prompt) {
  const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'glm-4-flash',
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`智谱 AI 请求失败: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  const content = data.choices[0]?.message?.content || ''
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('无法解析 AI 响应')
  }
  return JSON.parse(jsonMatch[0])
}

// Claude API call (backup)
async function callClaudeAPI(apiKey, prompt) {
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
    throw new Error(`Claude API 请求失败: ${response.status}`)
  }

  const data = await response.json()
  const content = data.content[0]?.text || ''
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('无法解析 AI 响应')
  }
  return JSON.parse(jsonMatch[0])
}

// API endpoint
app.post('/api/recommend', async (req, res) => {
  const { ingredients, city, hometown, tasteTags } = req.body

  if (!ingredients || ingredients.length === 0) {
    return res.status(400).json({ error: '请提供食材列表' })
  }

  const zhipuApiKey = process.env.ZHIPU_API_KEY
  const claudeApiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY

  if (!zhipuApiKey && !claudeApiKey) {
    return res.json({
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
    })
  }

  try {
    const tasteLabels = tasteTags.map((t) => TASTE_LABELS[t] || t).join('、')

    const prompt = `你是一位专业的家庭烹饪顾问，帮助打工人根据现有食材规划菜谱。

【用户信息】
- 所在城市：${city || '未知'}
- 口味偏好：${tasteLabels || '无特别偏好'}
- 籍贯：${hometown || '未知'}

【现有食材】
${ingredients.join('、')}

【任务】
请根据以上信息，推荐 2-3 道适合的菜谱：
1. 考虑用户的口味偏好和籍贯特色
2. 优先使用现有食材
3. 如需额外购买食材，请列出采购清单

请以 JSON 格式返回，格式如下：
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

只返回 JSON，不要其他说明文字。`

    let result
    if (zhipuApiKey) {
      result = await callZhipuAI(zhipuApiKey, prompt)
    } else if (claudeApiKey) {
      result = await callClaudeAPI(claudeApiKey, prompt)
    }

    res.json(result)
  } catch (error) {
    console.error('AI recommendation error:', error)
    res.status(500).json({ error: '推荐生成失败，请稍后重试' })
  }
})

// Serve static files
app.use(express.static(path.join(__dirname, 'dist')))

// Handle SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
