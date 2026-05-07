# Web Article Assistant Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Next.js app that fetches a single article URL, extracts readable content, and returns a fallback or AI summary.

**Architecture:** Use a Next.js App Router UI with a Route Handler backend. The backend validates the URL, fetches HTML, extracts article content with Readability, and summarizes it with either OpenAI or a local fallback path.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, `@mozilla/readability`, `jsdom`, `openai`

---

### Task 1: Define shared extraction types

**Files:**
- Create: `src/types/extract.ts`

### Task 2: Implement backend utilities

**Files:**
- Create: `src/lib/validators.ts`
- Create: `src/lib/extractor.ts`
- Create: `src/lib/summarizer.ts`

### Task 3: Add extraction API route

**Files:**
- Create: `src/app/api/extract/route.ts`

### Task 4: Build the UI

**Files:**
- Create: `src/components/url-form.tsx`
- Create: `src/components/result-card.tsx`
- Create: `src/components/article-workbench.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

### Task 5: Verify app behavior

**Files:**
- Modify: `package.json`
- Modify: `README.md`
