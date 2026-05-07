# Web Article Assistant

一个基于 `Next.js` 的网页文章助手。  
输入一篇公开文章链接后，它可以提取正文、生成摘要、列出要点、导出内容，并基于文章做单轮问答。

当前版本已经支持：
- 中英文界面切换
- 摘要长度切换
- 结果“只看核心要点”模式
- 摘要 / 问答输出语言跟随当前界面语言
- 已提取文章的“按当前语言重生成摘要”

## 功能概览

- 输入单个文章 URL 并提取正文
- 优先从静态 HTML 提取可读正文
- 静态提取失败时，可回退到 `Playwright + Chromium` 处理依赖 JS 的页面
- 使用 `DeepSeek` 生成摘要和问答
- 未配置 `DEEPSEEK_API_KEY` 时，自动回退到本地摘要和问答逻辑
- 支持摘要长度：
  - `Short`
  - `Medium`
  - `Long`
- 支持结果视图：
  - 完整结果
  - 只看核心要点
- 支持导出：
  - `Markdown`
  - `TXT`
- 支持浏览器本地历史记录

## 当前技术栈

- `Next.js 16`
- `React 19`
- `TypeScript`
- `Tailwind CSS 4`
- `@mozilla/readability`
- `jsdom`
- `playwright`
- `openai` SDK（用于调用 DeepSeek 的 OpenAI 兼容接口）
- `vitest`

## 运行环境

建议环境：

- `Node.js 18+`
- `npm`
- Windows PowerShell、macOS Terminal 或 Linux Shell 均可

## 本地启动

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

如果你想使用 `DeepSeek` 生成摘要和问答，先复制环境变量模板：

```powershell
Copy-Item .env.example .env.local
```

然后把 `.env.local` 里的内容改成你自己的：

```env
DEEPSEEK_API_KEY=your_deepseek_api_key_here
DEEPSEEK_MODEL=deepseek-v4-flash
```

说明：

- `DEEPSEEK_API_KEY`：你的 DeepSeek API Key
- `DEEPSEEK_MODEL`：可选，不填时默认使用 `deepseek-v4-flash`

如果你**没有**配置 `DEEPSEEK_API_KEY`：

- 页面仍然可以提取文章
- 摘要和问答会自动使用本地 fallback 逻辑
- 但效果通常不如 DeepSeek

### 3. 启动开发环境

```bash
npm run dev
```

启动后打开：

- `http://localhost:3000`

如果 `3000` 端口被占用，Next.js 会自动切换到其他端口，例如：

- `http://localhost:3001`

## 使用方法

### 基本流程

1. 打开页面
2. 在左侧输入文章 URL
3. 选择摘要长度：
   - `Short`
   - `Medium`
   - `Long`
4. 点击“提取文章 / Extract article”
5. 查看结果区：
   - 摘要
   - 要点
   - 摘录
   - 正文预览
   - 可读正文
   - 单轮问答

### 中英文切换

页面右上角可以切换：

- `中文`
- `English`

切换后会影响：

- UI 文案
- 示例问题
- 导出内容标签
- 新生成的摘要语言
- 新生成的问答语言

### 摘要语言说明

当前版本里，摘要和问答的输出语言会**跟随当前界面语言**。

例如：

- 当前界面是中文 → 新提取摘要优先输出中文
- 当前界面是英文 → 新提取摘要优先输出英文

如果你已经提取过一篇文章，然后再切换界面语言，结果区会在语言不一致时显示一个按钮：

- `按当前语言重生成摘要`
- `Regenerate summary in current language`

这个操作：

- 不会重新抓取网页
- 只会基于已经提取好的文章内容重新生成摘要和要点

### 结果视图

结果区支持两种模式：

- `完整结果 / Full result`
- `只看核心要点 / Core only`

其中“只看核心要点”模式只保留：

- 摘要
- 关键要点

适合快速浏览。

### 导出

支持导出为：

- `Markdown`
- `TXT`

导出内容会跟随当前界面语言使用对应的标题标签，例如：

- 中文模式下导出 `标题 / 来源 / 摘要 / 要点`
- 英文模式下导出 `Title / Source / Summary / Key Points`

## Playwright 说明

有些网页正文依赖浏览器执行 JavaScript 后才会出现。  
这种情况下，项目会尝试走动态提取流程，因此你最好提前安装 Chromium：

```powershell
npx playwright install chromium
```

说明：

- 不安装也能处理很多普通静态文章页
- 安装后，对依赖 JS 的文章页兼容性更好

## DeepSeek 接口说明

本项目通过 DeepSeek 的 OpenAI 兼容接口调用模型：

- Base URL: `https://api.deepseek.com`
- 默认模型: `deepseek-v4-flash`

官方文档：

- https://api-docs.deepseek.com/
- https://api-docs.deepseek.com/api/list-models/

## 已验证的演示链接

以下链接在当前开发环境中验证过：

- `https://www.anthropic.com/news`
- `https://www.anthropic.com/news/claude-is-a-space-to-think`
- `https://www.microsoft.com/en-us/worklab/work-trend-index`
- `https://blog.cloudflare.com/`
- `https://developer.mozilla.org/en-US/docs/Web/JavaScript`
- `https://aws.amazon.com/blogs/machine-learning/`

## 质量检查

本项目当前可用的检查命令：

```bash
npm run test
npm run lint
npm run build
```

含义：

- `npm run test`：运行单元测试
- `npm run lint`：运行 ESLint
- `npm run build`：验证生产构建是否通过

## GitHub 更新

如果你已经在本地完成修改并提交，可以这样推送到 GitHub：

```bash
git push origin main
```

## 部署

### 推荐：Vercel

部署步骤：

1. 把项目推到 GitHub
2. 在 Vercel 中导入这个仓库
3. 在 Vercel 项目环境变量里配置：
   - `DEEPSEEK_API_KEY`
   - 可选：`DEEPSEEK_MODEL`
4. 重新部署

### 部署时要注意

- 静态提取通常更稳定
- 动态提取依赖浏览器运行时
- 如果部署环境对 `Playwright` 支持有限，依赖 JS 的网页可能会提取失败
- 公开文章页比登录页更适合演示和部署

## 当前范围

当前项目聚焦在：

- 单篇文章提取
- 摘要
- 要点整理
- 导出
- 单轮问答

当前**不包含**：

- 登录态网页采集
- 网站爬虫
- 多文档检索
- 多轮对话记忆

## 仓库地址

- GitHub: `https://github.com/ly-kc-hub/web-article-assistant`

