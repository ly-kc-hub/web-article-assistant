# Web Article Assistant

Single-URL article extraction, summarization, export, and article QA app built with Next.js.

## Features

- Extract a single public article URL
- Parse readable article content from static HTML
- Retry extraction with Playwright on JS-rendered pages
- Summarize and answer questions with DeepSeek when `DEEPSEEK_API_KEY` is present
- Fall back to deterministic local summary and QA behavior without a key
- Ask one grounded question against the current article
- Export the article to Markdown or TXT
- Save recent successful extractions in local browser history

## Local setup

```bash
npm install
```

Copy the environment template if you want DeepSeek-backed summaries and QA:

```powershell
Copy-Item .env.example .env.local
```

For the current PowerShell session, set:

```powershell
$env:DEEPSEEK_API_KEY="your_key"
$env:DEEPSEEK_MODEL="deepseek-v4-flash"
```

Start the app:

```bash
npm run dev
```

Open `http://localhost:3000` or the port shown in the terminal.

## DeepSeek API settings

This project uses the official DeepSeek OpenAI-compatible endpoint:

- Base URL: `https://api.deepseek.com`
- Default model: `deepseek-v4-flash`

Official docs:

- https://api-docs.deepseek.com/
- https://api-docs.deepseek.com/api/list-models/
- https://api-docs.deepseek.com/quick_start/pricing

## Playwright browser runtime

Dynamic-page fallback requires a Chromium runtime:

```powershell
npx playwright install chromium
```

## Demo URLs verified in this environment

- `https://www.anthropic.com/news`
- `https://www.anthropic.com/news/claude-is-a-space-to-think`
- `https://www.microsoft.com/en-us/worklab/work-trend-index`
- `https://blog.cloudflare.com/`
- `https://developer.mozilla.org/en-US/docs/Web/JavaScript`
- `https://aws.amazon.com/blogs/machine-learning/`

## Test and quality checks

```bash
npm run test
npm run lint
npm run build
```

## Deploy

### Vercel

Recommended path:

1. Push the project to GitHub
2. Import the repo into Vercel
3. Set `DEEPSEEK_API_KEY` in Vercel project environment variables
4. Optionally set `DEEPSEEK_MODEL`
5. If you rely on dynamic-page fallback, verify your target runtime supports Playwright

### Notes on Playwright in deployment

- Static extraction works without Playwright
- Dynamic fallback depends on a browser runtime being available
- If your deployment target does not support Playwright cleanly, the app still works for static article pages
- Some public sites block server-side fetches; keep a known-good demo URL list for presentations

## Current scope

- Single article URL in
- Extracted content, metadata, summary, key points, and single-turn QA out
- No login flows
- No crawling
- No multi-document retrieval
