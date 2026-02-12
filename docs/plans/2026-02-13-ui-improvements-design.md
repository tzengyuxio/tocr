# UI Improvements: Tooltips, OCR Editor Redesign & Tag Detail View

Date: 2026-02-13

## Overview

Three UI improvements:

1. Add hover text (title) to all icon-only buttons
2. Redesign OCR result editor with side-by-side image viewer + in-place editing
3. Add tag/game detail view with grouped article display

---

## Feature 1: Icon Button Hover Text

Add `title` attribute to all icon-only `<Button size="icon">` elements:

- `MagazineListClient.tsx`: Edit ("編輯期刊"), Plus ("新增期數")
- `IssueListClient.tsx`: GripVertical ("拖曳排序"), Edit ("編輯期數"), Trash2 ("刪除期數")
- `OcrResultEditor.tsx`: Edit ("編輯"), Trash2 ("刪除")

---

## Feature 2: OCR Result Editor Redesign

### Layout

Two-column layout:
- Left (sticky, ~40%): TOC image viewer
- Right (scrollable, ~60%): Article list with in-place editing

### Left Column — Image Viewer

- Display current TOC page image
- Prev/Next navigation buttons ("< 1/3 >")
- Click to enlarge in Dialog (full-size view)
- Sticky positioning so it stays visible while scrolling articles

### Right Column — In-Place Editing

- Default: compact display rows (page range, title, authors, category)
- Click a row → expands into edit mode with all fields as inputs:
  - Title, subtitle, page start/end, authors (comma-separated), category, suggested games (comma-separated), summary (textarea)
- Confirm (checkmark) / Cancel (X or Esc) buttons per row
- Only one row editable at a time
- Delete button per row
- "Add article" and "Save all" buttons at bottom

### Props Change

`OcrResultEditor` receives new prop: `tocImages: string[]`
Passed from `OcrPageClient` which already has access to `selectedIssue.tocImages`.

---

## Feature 3: Tag/Game Detail View

### Inline Preview (List Page)

- Click tag/game row in admin list → expand 3-5 article previews below
- Show "查看全部 (N 篇)" button linking to detail page
- Only one row expanded at a time
- Fetch via existing `GET /api/tags/[id]` or `GET /api/games/[id]`

### Detail Page (New)

- New pages: `/admin/tags/[id]` and `/admin/games/[id]`
- Header: tag/game info (name, type, description, etc.)
- Body: hierarchical grouped view:

```
Magazine Name
  ├── Issue #42 (2024/01/15) — 3 articles
  │   ├── Article Title 1 (p.12-15) [category]
  │   ├── Article Title 2 (p.20-23) [category]
  │   └── Article Title 3 (p.45-48) [category]
  └── Issue #38 (2023/09/15) — 1 article
      └── Article Title 4 (p.30-35) [category]
```

- Magazine/issue levels collapsible (default expanded)
- Articles clickable → navigate to issue edit page
- Needs new API endpoint or query to get articles grouped by magazine/issue

### API

New or enhanced endpoint to return articles with full magazine → issue hierarchy:

`GET /api/tags/[id]/articles` or enhance existing `GET /api/tags/[id]`:
- Return articles with `issue.magazine` included
- Remove the 20-article limit for the detail page (or paginate)
- Group by magazine → issue on the frontend

Same pattern for `GET /api/games/[id]`.

---

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Tooltip approach | HTML `title` attribute | Zero dependency, native browser support |
| OCR editor layout | Side-by-side sticky image + scrollable list | Reference image while editing |
| Article editing | In-place expand per row | No Dialog context switching |
| Tag detail grouping | Magazine → Issue → Article tree | Shows both "which books" and "which articles" |
| Inline preview limit | 3-5 items + "view all" link | Prevents list bloat |
