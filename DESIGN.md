# Tableflow Design System & Specification

> **Active Date**: 2026-10-06  
> **Status**: Active, implemented  
> **Scope**: Tableflow — Client-Side Markdown Table Converter & Visual Grid Studio  
> **Target Audience**: Developers, Technical Writers, Product Managers, Data Analysts, Knowledge Workers  

## Editorial image update

Hero copy: “스프레드시트에서 마크다운까지, 가장 깔끔한 표 변환.” The supporting sentence explicitly describes both directions and the paste/edit/copy workflow. The two-column workspace UI emphasizes high visual contrast, intuitive status toggles with active check badges (첫 행 헤더, 너비 정렬, 공백 정리, 빈 행 제거), structured spreadsheet-like column headers with quick alignment cycles, and a tactile primary copy action.

The introduction and guide now use two purpose-made editorial photographs generated with the built-in image generation tool. Cream paper, sage stationery, grid lines, natural light, and soft shadows carry the visual identity. The previous dotted page background has been removed to give the workbench a quieter surface. A two-line headline, compact photography, and a direct workspace anchor keep editing within easy reach.

Images are served from `public/images/` with responsive JPEG sources, reserved dimensions, meaningful alternative text, and lazy loading for the guide. The mobile hero is limited to 160px in height; dark mode uses a modest brightness adjustment. Asset paths and exact generation prompts are recorded in [docs/image-assets.md](docs/image-assets.md).

---

## 1. Source of Truth

- **Active Date**: 2026-10-06.
- **Context**: In the absence of legacy Figma/Sketch design assets, this document serves as the canonical specification for Tableflow's user experience, visual design tokens, component architecture, keyboard interactions, and accessibility guarantees.
- **Reference Foundations**:
  - [Vercel Geist Table Design System](https://vercel.com/geist/table): Dense data grid layouts, monospaced tabular figures, sticky table headers, subtle row hover states.
  - [Vercel Geist Keyboard Input Patterns](https://vercel.com/geist/keyboard-input): Tactile `<kbd>` micro-components, keyboard-first affordances, multi-key sequence badges.
  - [Vercel Geist Toast System](https://vercel.com/geist/toast): Unobtrusive, bottom-docked status feedback with accessible ARIA announcements.
  - [Raycast Keyboard-First Density](https://raycast.com): High-density controls, rapid shortcut-driven navigation, understated monochrome-plus-accent palette, zero visual bloat.
  - [Mobbin](https://mobbin.com/): Public landing reviewed; individual screen references require login/plan access and were not used as screenshot evidence.

---

## 2. Brand

- **Brand Name**: Tableflow
- **Brand Essence**: *Precise, Uncompromising, Frictionless.*
- **Brand Archetype**: The Craftsman’s Precision Instrument. Not a noisy SaaS platform with marketing fluff or animated gradient heroes, but a calibrated, distraction-free workbench that respects the user's workflow and time.
- **Visual Mark**: A structured 4-quadrant table grid mark with crisp 1.5px hairline strokes, featuring a quiet sage-accented primary cell.
- **Brand Architecture & Data Handling Principles**:
  1. **Local Processing**: 100% Client-Side. No telemetry, no remote analytics, no cloud parsers, no external font or image requests. All parsing and conversions happen inside browser memory.
  2. **Accurate Format Escaping & Serialization**:
     - Markdown: Literal pipes are escaped as `\|` and cell line breaks are converted to `<br>`. When first-row headers are disabled, synthetic headers (`열 1`, `열 2`) are generated to comply with Markdown table syntax.
     - CSV/TSV: Delimiters and quotes are preserved using standard RFC 4180 escaping (double quotes `""`).
     - JSON: Nested objects and values are serialized to strings via `JSON.stringify` for tabular display.
  3. **Typographic Alignment**: CJK (Korean, Japanese, Chinese) display-width calculation using `Intl.Segmenter` for monospace markdown tables with consistent column widths.

---

## 3. Product Goals

1. **Bi-Directional Conversion**:
   - Convert between clipboard tabular formats (Excel/Sheets TSV, CSV, JSON arrays) and Markdown table syntax.
   - Support reverse conversion from Markdown to spreadsheet-ready TSV/CSV/JSON in a single click.
2. **Visual & Source Dual-Sync**:
   - Provide direct visual inline editing of table cells while preserving raw input source text.
   - Synchronize edits with atomic undo/redo history.
3. **Local Privacy**:
   - Zero server transmission, allowing local processing of internal reports, spreadsheets, and documentation.
4. **Keyboard-First Workflow**:
   - Enable rapid execution of copy, format toggle, cell navigation, row/column addition, and undo/redo operations without requiring mouse interaction.

---

## 4. Personas and Jobs to be Done

### Persona A: 민우 (Software Engineer / DevOps)
- **Context**: Writing GitHub PR descriptions, engineering RFCs, and open-source documentation.
- **Job**: Copies database query results or JSON API responses and needs clean, readable Markdown tables with correct column alignments (`:---:`, `---:`) without manual pipe formatting.
- **Need**: Accurate Korean character width alignment in monospaced editors.

### Persona B: 서연 (Product Manager / Technical Writer)
- **Context**: Authoring feature specifications and release notes in Notion, Velog, and Obsidian.
- **Job**: Pastes multi-cell selections from Google Sheets into markdown notes, needing immediate `<br>` conversion for multiline cells and one-click copy to clipboard.
- **Need**: Client-side execution without third-party server uploads.

### Persona C: 재호 (Marketer / Data Analyst)
- **Context**: Sharing summary tables and metrics on Slack and internal engineering wikis.
- **Job**: Cleans up messy CSV/TSV exports, trims redundant whitespace, eliminates empty padding rows, and exports sanitized Markdown or CSV with UTF-8 BOM for Excel.

---

## 5. Information Architecture

```
[ Top Navigation Bar ]
  - Brand Mark (Tableflow) + Version Tag (v1.0)
  - Privacy Badge ("100% 로컬 브라우저 처리 · 서버 전송 없음")
  - Quick Actions: [사용 가이드] [단축키 (?)] [테마 토글 (Light/Dark)]

[ Command & Mode Subheader ]
  - Eyebrow: "표 변환 및 시각적 편집기 • 클라이언트 사이드 전용"
  - Page Title & Value Proposition
  - Mode Segmented Control: [시트/데이터 → 마크다운] | [마크다운 → 시트/데이터]
  - View Segmented Control: [스플릿 뷰 (표 + 코드)] | [코드 뷰]

[ Two-Column Workspace (>= 900px, Stacks on Mobile) ]
  ┌────────────────────────────────────────┬────────────────────────────────────────┐
  │ Left Column: 원본 데이터 (Source Panel) │ Right Column: 실시간 표 & 출력 (Output) │
  ├────────────────────────────────────────┼────────────────────────────────────────┤
  │ Header:                                │ Header:                                │
  │ - Format: [자동 감지] [엑셀/시트] [CSV]│ - Output Tabs: [마크다운] [엑셀(Excel)]│
  │ - Auto Badge: [감지: 엑셀 / 시트]       │ - Action: [엑셀 복사] [코드/결과 복사] │
  │ - Actions: [예제] [파일 열기] [지우기] │ - Download Menu: [.md, .csv, 엑셀 등]  │
  ├────────────────────────────────────────┼────────────────────────────────────────┤
  │ Content:                               │ Toolbar:                               │
  │ - Synchronized Line Number Gutter      │ - Undo/Redo [Ctrl+Z / Ctrl+Shift+Z]    │
  │ - Source Textarea [data-source-input]  │ - Toggles: [✓ 첫 행을 제목으로]        │
  │   (Mobile min-h: 260px, Desktop: 460px)│            [✓ 열 간격 예쁘게 맞춤]     │
  │ - File Drag & Drop Target              │            [불필요한 공백 제거]        │
  │ - Parser Error Banner (Conditional)    │            [빈 줄 자동 삭제]           │
  │                                        │ - Grid Edits: [행 추가/삭제] [열 추가] │
  │                                        │ - Alignment: [왼쪽] [가운데] [오른쪽]  │
  ├────────────────────────────────────────┼────────────────────────────────────────┤
  │ Footer:                                │ Content:                               │
  │ - Lines, Characters, Byte Size Stats   │ - Interactive HTML Table Preview       │
  │ - Clipboard Paste Guidance             │   (Capped at 200 rows for display perf,│
  │                                        │    exports preserve all rows)          │
  │                                        │   (Inline double-click/Enter edit)     │
  │                                        │ - Sub-Panel: Live Code Preview         │
  │                                        │ Footer:                                │
  │                                        │ - Row x Col Stats, Output Size, Hint   │
  └────────────────────────────────────────┴────────────────────────────────────────┘

[ Korean SEO & Practical Documentation Guide ]
  - 1. 마크다운 표 기본 문법 & 구분선 규칙
  - 2. 열 정렬 (:---, :---:, ---:) 문법
  - 3. 실무 플랫폼별 호환성 (Excel, GitHub, Notion, Velog, Obsidian)
  - 4. 로컬 처리 및 데이터 지원 특성
  - 5. 자주 묻는 질문 (FAQ) 4선

[ Concise Footer ]
  - Brand Mark, Local Processing Note, Anchor Links (가이드, 단축키, 맨 위로)
```

---

## 6. Design Principles

1. **Restraint Over Decoration**:
   - Avoid generic high-saturation purple gradients, bouncy parallax animations, or oversized hero illustrations.
   - Use clean geometric layouts, hairline borders, and muted functional colors.
2. **Tactile Precision**:
   - Form controls, table cells, and buttons possess clear borders, subtle 1px inset shadows on active states, and instant keyboard response.
3. **Total Transparency & Local Safety**:
   - Explicitly communicate local-only execution at the header, footer, and documentation levels.
4. **Typographic Monospace Respect**:
   - Code inputs, table cells, and output previews utilize monospaced font stacks with explicit line-height and letter-spacing calibration.
5. **No Dead Ends**:
   - When input is invalid, explain exactly why (unclosed quotes, malformed delimiters, invalid JSON) and highlight the correction path.

---

## 7. Visual Language

### 7.1 Color Tokens

| Token Name | Light Mode | Dark Mode (`[data-theme="dark"]`) | Description |
| :--- | :--- | :--- | :--- |
| `--bg-page` | `#F8FAFC` | `#09090B` | Clean Slate/Zinc page canvas |
| `--bg-surface` | `#FFFFFF` | `#141417` | Crisp card & workspace surface |
| `--bg-subtle` | `#F1F5F9` | `#1F1F23` | Secondary surface, toolbar backgrounds |
| `--bg-muted` | `#E2E8F0` | `#27272A` | Elevated dropdowns, active item background |
| `--border-hairline` | `#E2E8F0` | `rgba(255,255,255,0.08)` | 1px clean hairline border |
| `--border-strong` | `#CBD5E1` | `rgba(255,255,255,0.16)` | Emphasized dividers, hover states |
| `--text-main` | `#0F172A` | `#F8FAFC` | High-contrast crisp primary text (>=7:1) |
| `--text-muted` | `#475569` | `#94A3B8` | Secondary descriptions, labels (>=4.5:1) |
| `--text-subtle` | `#64748B` | `#64748B` | Line numbers, hint text, stats (>=4.5:1) |
| `--accent-sage` | `#10B981` | `#10B981` | Vivid Emerald modern spreadsheet accent |
| `--accent-sage-hover` | `#059669` | `#059669` | Interactive hover state for accent |
| `--accent-sage-subtle`| `#ECFDF5` | `rgba(16,185,129,0.14)` | Active cell selection, active badge background |
| `--accent-sage-border`| `#6EE7B7` | `rgba(16,185,129,0.35)` | Border for active badges and selection rings |
| `--text-on-sage` | `#FFFFFF` | `#FFFFFF` | High-contrast text token on top of accent |
| `--focus-ring` | `rgba(16,185,129,0.35)` | `rgba(52,211,153,0.4)` | Accessible focus-visible ring |
| `--grid-dot` | `#E2E8F0` | `#27272A` | Clean canvas dotted background pattern |

### 7.2 Typography

- **System UI Stack**:
  `-apple-system, BlinkMacSystemFont, "Pretendard Variable", Pretendard, "Apple SD Gothic Neo", "Noto Sans KR", "Segoe UI", Roboto, sans-serif;`
- **Monospace Stack**:
  `ui-monospace, SFMono-Regular, "Cascadia Code", Consolas, "Liberation Mono", Menlo, Courier, monospace;`
- **Scale**:
  - `Display / Title`: `24px` (`text-2xl`), semi-bold `700`, `-0.025em` letter-spacing.
  - `Section Header`: `16px` (`text-base`), semi-bold `600`, `-0.015em` letter-spacing.
  - `Body / UI`: `14px` (`text-sm`), regular `400` / medium `500`.
  - `Compact Data / Monospace`: `12px` - `13px` (`text-xs`), line-height `1.5rem` (`leading-6`).
  - `Micro / Badges`: `11px`, font-medium `500`.

### 7.3 Grid & Depth

- **Hairline Borders**: `border: 1px solid var(--border-hairline)` delivers sharp, high-density boundaries.
- **Canvas Dots**: 20px x 20px radial grid dots provide spatial grounding without distracting from tabular data.
- **Elevation**:
  - Surface cards: `box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.03)`
  - Active dropdowns & dialogs: `box-shadow: 0 4px 16px -2px rgba(0, 0, 0, 0.12)`

---

## 8. Components Specification

### 8.1 Top Navigation (`<header>`)
- Fixed at viewport top with `backdrop-filter: blur(12px)`.
- Features custom SVG Tableflow brand icon, version pill, privacy indicator, guide jump link, shortcuts modal trigger with `?` badge, and theme switcher.

### 8.2 Two-Column Workspace (`<main>`)
- Left column provides input format selection (Auto, TSV, CSV, Markdown, JSON, Text), line-numbered code input area, drag-and-drop file target, and parsing diagnostic messages.
- Right column hosts format selection tabs, copy actions (Excel TSV and Markdown), formatting option toggles, row/column structure controls, column alignment controls, and interactive HTML data grid.

### 8.3 Interactive HTML Data Grid (`<table role="grid">`)
- Rendered with semantic `<table>`, `<thead>`, and `<tbody>` tags.
- Column headers (A, B, C...) display column index, title, and current alignment glyph (`AlignLeft`, `AlignCenter`, `AlignRight`). Clicking toggles column alignment.
- Display Capping & Bounded Pagination: The visual preview grid renders 200 rows per page with lightweight Previous/Next controls when total rows exceed 200. Global row indices are preserved so that cells in any page remain selectable and editable. On adding a row, the view navigates to the final page so the new row is immediately reachable; export operations always process all rows without truncation.
- Cell states:
  - Default: Renders formatted cell content with alignment CSS.
  - Selected: Outlined with 2px sage accent ring.
  - Focused: Visible `focus-visible:ring-2 focus-visible:ring-sage` with roving `tabIndex`.
  - Editing: Inline `<input>` with auto-focus. Commits on `Enter` or `blur`, cancels on `Escape`, navigates on `Tab`.

### 8.4 Line-Numbered Editor Gutter
- Bounded Line-Numbered Gutter: Renders only the visible window of line numbers with dynamic top and bottom height spacers synchronized with `textarea.scrollTop`, maintaining lightweight DOM node count even for datasets with 1,000+ lines.
- Line numbers adjust reactively to input line count changes.

### 8.5 Keyboard Shortcuts Modal (`<div role="dialog">`)
- Modal overlay with dark backdrop blur, focus trapping (`Tab`/`Shift+Tab`), and restoration of previous focus on close.
- First close button auto-focused on open; dismisses on `Escape` key.
- Lists structured keyboard combinations with tactile `<kbd>` styling.

### 8.6 Status Toast (`<div role="status" aria-live="polite">`)
- Bottom-docked pill notification with subtle slide-up keyframe animation.
- Communicates clipboard copy confirmations (only on successful clipboard write), file import successes, and error alerts.

---

## 9. Accessibility (a11y)

1. **ARIA Roles & Attributes**:
   - Format switchers and tabs use `role="tablist"` and `role="tab"` with `aria-selected`.
   - Option toggles include `aria-pressed` to communicate active state.
   - Table grid uses `role="grid"` with roving `tabIndex` (`0` for selected/primary cell, `-1` for others).
   - Modal uses `role="dialog"`, `aria-modal="true"`, and `aria-labelledby`.
   - Toast notifications utilize `role="status"` and `aria-live="polite"`.
2. **Keyboard Traversal & Focus Management**:
   - Arrow keys (`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`) move both selection and DOM focus across table grid cells.
   - `Enter` initiates inline cell editing.
   - `Escape` dismisses cell edits and closes dialogs.
   - Focus trapping in modals cycles between focusable elements.
3. **Contrast Compliance**:
   - High contrast ratios maintained in both light and dark themes (text-on-sage `#ffffff` in light and `#131513` in dark; subtle text tokens adjusted to >=4.5:1).
4. **Reduced Motion**:
   - Media query `@media (prefers-reduced-motion: reduce)` disables keyframe animations and transitions.

---

## 10. Responsive Behavior

| Breakpoint | Layout Strategy |
| :--- | :--- |
| **Desktop (>= 1024px)** | Side-by-side balanced 2-column workspace (`grid-cols-2`). Simultaneous view of raw source and interactive table. Min-height: 460px. |
| **Tablet (768px - 1023px)** | Stacked vertical panels (`grid-cols-1`). Input panel on top, preview and table below. Sticky header navigation. |
| **Mobile (360px - 767px)** | Stacked panels. Compact min-height (260px) for input area to allow immediate access to results and toolbar. Horizontal scrolling toolbars. Full-width table with touch scroll. Modal fits viewport with padding. |

---

## 11. Interaction States

- **Default**: Hairline border, neutral background.
- **Hover**: Subtle background tint (`bg-subtle`), darker border (`border-strong`), pointer cursor.
- **Active / Pressed**: Inset border shadow, scaled down slightly, high-contrast text.
- **Focused (`:focus-visible`)**: 2px sage ring with offset.
- **Disabled**: 30% opacity, `pointer-events: none`.
- **Drag & Drop Active**: 2px dashed sage border with semi-transparent sage background overlay.
- **Cell Selected**: 2px solid `--accent-sage` inset outline with `--accent-sage-subtle` background.

---

## 12. Content Voice

- **Language**: Natural, idiomatic Korean.
- **Tone**: Technical, clear, respectful, precise.
- **Terminology Consistency**:
  - `마크다운 표` (Markdown Table)
  - `스프레드시트` (Spreadsheet)
  - `구분자` (Delimiter)
  - `실행 취소 / 다시 실행` (Undo / Redo)
  - `열 정렬` (Column Alignment)
  - `첫 행 헤더` (First Row Header)
  - `너비 정렬` (Pretty Alignment)

---

## 13. Implementation Constraints

- **No Remote Dependencies**: No CDN fonts, Google Fonts, external telemetry, or third-party image URLs.
- **Tailwind CSS v4**: Uses `@import "tailwindcss"` and `@theme` CSS custom property token bindings.
- **Pure Client State**: All grid manipulations operate within React component and hook state in memory. Zero network payloads.
- **File System Boundary**: Agent ownership restricted to `src/components/Workspace.tsx`, `src/styles.css`, and `DESIGN.md`.

---

## 14. Open Questions & Future Considerations

1. **Cell Range Multi-Selection**: Future versions can introduce rectangular shift-click multi-cell selection for batch deletion or formatting.
2. **Column Sorting Affordance**: Clicking a column header could optionally offer ascending/descending alphanumeric sorting before export.
3. **Regex Search & Replace**: A compact search bar within the workspace for batch find-and-replace across table cells.

## 15. Verified integration behavior

- AGY authored the visual workspace, theme tokens, and design brief; final integration corrected page-selection and focus behavior.
- Cells keep global row indices across 200-row pages. Changing pages selects a cell on the target page; old selection must not force navigation backward.
- Focus moves after the React DOM commit with layout effects. Enter/Escape restore cell focus; blur preserves the destination chosen by the user. Tab and Shift+Tab wrap across pages.
- Import and manual source editing start at page one. Grid additions/deletions keep the relevant page, and an added row becomes selected.
- Clipboard callbacks return a boolean; success indicators appear only after a successful copy.
- Browser evidence and limitations are recorded in VERIFICATION.md. Multi-selection, sorting, and search above are optional future scope, not unfinished acceptance criteria.
