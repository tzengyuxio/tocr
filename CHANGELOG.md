# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Conventional Commits](https://www.conventionalcommits.org/).

## [Unreleased]

### Added

- **Issue drag-and-drop reorder** — 期數列表支援拖曳排序，使用 @dnd-kit，樂觀更新 + 錯誤回滾 (`9c030c7`)
- **OCR editor redesign** — 雙欄佈局（左側圖片預覽 + 右側文章列表），支援 inline 編輯 (`9c030c7`)
- **Tag detail page** — 標籤詳情頁，依期刊/期數分組顯示關聯文章，可展開/收合樹狀結構 (`9c030c7`)
- **Game detail page** — 遊戲詳情頁，依期刊/期數分組顯示關聯文章 (`9c030c7`)
- **Multi-image OCR** — 目錄頁支援多張圖片上傳與辨識，OCR 頁自動帶入已上傳圖片 (`26dd3c0`)
- **Gemini OCR provider** — 啟用 Google Gemini AI 辨識，動態偵測可用 AI 服務 (`dbde834`)
- **CSV batch import** — 支援 CSV 批次匯入期刊與期數資料 (`f5c8361`)
- **Local file storage fallback** — 本地開發環境自動 fallback 至檔案系統儲存 (`b36c799`)
- **Dev auth bypass** — 開發模式免登入繞過 Auth（`DEV_BYPASS_AUTH=true`）(`3b54244`)
- **Auto admin role** — 首位使用者自動指定 ADMIN 角色 (`47f0a7b`)
- **Magazine detail three-column layout** — 期刊詳情頁三欄佈局 + 可搜尋下拉選單 (`381a251`)
- Shared `groupArticles` utility extracted from tag/game pages (`f090dde`)
- Shared `resolveImageUrl` utility extracted from OCR route (`f090dde`)
- Shared `reorderSchema` validator extracted from reorder route (`f090dde`)
- Unit tests for `order` field, `groupArticles`, `resolveImageUrl`, `reorderSchema` — 19 new test cases (`f090dde`)

### Fixed

- Fix relative image URL resolution in OCR route (`dbde834`)
- Fix upload image placeholder token bug (`f5c8361`)
- Fix `SelectItem` empty string value causing runtime error (`a59d10f`)
- Fix local development environment issues (`cab6a73`)

## [0.1.0] - 2026-02-02

### Added

- **Project foundation** — Next.js 16 App Router, TypeScript, Prisma, PostgreSQL (`670ff6b`)
- **Magazine & Issue CRUD** — 期刊與期數的完整 CRUD 功能 (`612d6f4`)
- **AI OCR** — Claude Vision API 目錄辨識，策略模式 + 工廠模式架構 (`2aecf9c`)
- **Tag & Game management** — 標籤（6 種類型）與遊戲管理，前台瀏覽頁面 (`633b1ac`)
- **Article editing** — 文章個別編輯與批次建立 (`55c8e53`)
- **Multi AI provider** — 支援 Claude / OpenAI / Gemini 三大 Provider (`b6d2e73`)
- **Frontend pages** — 首頁儀表板、搜尋功能、期刊/遊戲/標籤瀏覽 (`e933a41`)
- **User management** — Google OAuth 登入，Viewer/Editor/Admin 三種角色 (`e933a41`)
- **Unit tests** — Jest 測試，涵蓋所有 validators 與工具函式 (`5b96a9d`)
- **Deployment support** — Dockerfile、docker-compose.yml、Vercel 部署文件 (`f66cff9`)
