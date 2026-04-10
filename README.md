# 备菜助手 (Meal Prep Buddy)

面向打工人的智能备菜助手，输入家里现有食材，AI 推荐菜谱并生成采购清单。

## 功能特点

- 用户认证（邮箱注册/登录）
- 食材管理（添加/删除/分类）
- 口味偏好设置（城市、籍贯、口味标签）
- AI 智能菜谱推荐
- 历史记录查看

## 技术栈

- 前端：React + Vite + TypeScript + Tailwind CSS
- 后端：Supabase（数据库 + 用户认证）
- AI：Claude API
- 部署：Vercel

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 到 `.env` 并填入你的配置：

```bash
cp .env.example .env
```

需要配置：
- `VITE_SUPABASE_URL`: Supabase 项目 URL
- `VITE_SUPABASE_ANON_KEY`: Supabase 匿名密钥
- `ANTHROPIC_API_KEY`: Claude API 密钥（可选，用于 AI 推荐）

### 3. 创建 Supabase 数据库

在 Supabase SQL Editor 中运行 `supabase-schema.sql` 文件。

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:5173

### 5. 启动 API 服务器（可选，用于本地测试 AI 功能）

```bash
node api-server.js
```

## 部署到 Vercel

### 1. 推送代码到 Git

```bash
git init
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. 在 Vercel 部署

1. 访问 [vercel.com](https://vercel.com)
2. 导入你的 Git 仓库
3. 配置环境变量：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `ANTHROPIC_API_KEY`

### 3. 部署完成后即可访问

## 项目结构

```
mealprep-buddy/
├── api/                    # Vercel Serverless Functions
│   └── recommend.ts        # AI 推荐接口
├── src/
│   ├── components/         # React 组件
│   ├── context/            # React Context
│   ├── hooks/              # 自定义 Hooks
│   ├── lib/                # 工具库和类型定义
│   ├── pages/              # 页面组件
│   ├── App.tsx             # 主应用组件
│   ├── main.tsx            # 入口文件
│   └── index.css           # 全局样式
├── public/                 # 静态资源
├── supabase-schema.sql     # 数据库 Schema
└── .env.example            # 环境变量示例
```

## License

MIT
