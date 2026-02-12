# Issue Order, CRUD Improvements & OCR Fix Design

Date: 2026-02-13

## Overview

Three improvements to the TOCR journal management system:

1. Add `order` field to issues with drag-to-reorder UI
2. Add issue creation from magazine list + delete button per issue
3. Fix OCR relative URL error

---

## Feature 1: Issue Ordering

### Database

- Add `order Int @default(0)` to `Issue` model in Prisma schema
- Migration: backfill existing issues with sequential order (by `publishDate` or `issueNumber`)

### API

- `PUT /api/issues/reorder` — accepts `{ magazineId: string, issueIds: string[] }`, updates `order` for all issues in one transaction
- All issue list queries order by `order ASC` (both admin and public)
- New issues get `order = max(current) + 1` automatically

### Frontend

- Use `@dnd-kit/core` + `@dnd-kit/sortable` for drag-and-drop
- Optimistic UI update on drag end, then call reorder API
- Apply to issue list in magazine detail page (`/admin/magazines/[id]`)

---

## Feature 2: Issue CRUD from Magazine List

### Add Issue from Magazine List

- Add "+" button per magazine row in `/admin/magazines` list
- Click opens a Dialog with simplified IssueForm (issueNumber, publishDate required; volumeNumber, title, coverImage optional)
- On success: close dialog, refresh list, toast confirmation

### Delete Issue

- Add trash icon button per issue row in the issue list (magazine detail page)
- Click opens confirmation Dialog showing article count: "This issue contains N articles. Delete?"
- `DELETE /api/issues/[id]` cascades: deletes articles, article-tag relations, article-game relations, OCR records
- Backend uses Prisma cascading deletes or transaction

---

## Feature 3: OCR URL Fix

### Root Cause

Local file uploads produce relative paths (e.g., `/issues/toc/xxx.jpeg`). The OCR API route uses `fetch(url)` which requires absolute URLs.

### Fix

In `/api/ocr/route.ts`, before fetching image URLs:

```typescript
const origin = new URL(request.url).origin;
const absoluteUrl = url.startsWith('http') ? url : `${origin}${url}`;
const response = await fetch(absoluteUrl);
```

---

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Reorder strategy | Batch update (all IDs at once) | Single request, better UX |
| Add issue interaction | Dialog | Quick, no page navigation |
| Delete with articles | Cascade delete with confirmation | Simpler UX, clear warning |
| Order scope | Front and back end | Consistent display order |
