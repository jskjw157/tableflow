import React, { useState, useRef, useEffect, useLayoutEffect } from 'react'
import type { EditorController, OutputFormat } from '../types'
import type { Alignment, Format } from '../lib/table'
import {
  Table as TableIcon,
  Plus,
  Minus,
  Trash2,
  Copy,
  Check,
  Download,
  Upload,
  Sparkles,
  Undo2,
  Redo2,
  Sun,
  Moon,
  HelpCircle,
  ShieldCheck,
  AlertTriangle,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Code as CodeIcon,
  Columns as SplitIcon,
  FileSpreadsheet,
  ChevronDown,
  X,
  BookOpen,
  ArrowUpRight
} from 'lucide-react'

const PAGE_SIZE = 200
const LINE_HEIGHT = 24

interface WorkspaceProps {
  editor: EditorController
}

export default function Workspace({ editor }: WorkspaceProps) {
  // Local state for table cell inline editing
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false)
  const [copiedFormat, setCopiedFormat] = useState<OutputFormat | null>(null)
  const [isDownloadOpen, setIsDownloadOpen] = useState(false)
  const [gridPage, setGridPage] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)

  // Refs for line numbers synchronization, focus management, and modal focus trapping
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const gutterRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)
  const shortcutsDialogRef = useRef<HTMLDivElement>(null)
  const firstCloseBtnRef = useRef<HTMLButtonElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)
  const tableContainerRef = useRef<HTMLDivElement>(null)
  const pendingCellFocusRef = useRef<{ row: number; col: number } | null>(null)

  // Sync textarea scrolling with line number gutter and track scroll for bounded gutter rendering
  const handleScroll = () => {
    if (textareaRef.current) {
      const top = textareaRef.current.scrollTop
      if (gutterRef.current) {
        gutterRef.current.scrollTop = top
      }
      setScrollTop(top)
    }
  }

  // Focus inline edit input when cell enters edit mode
  useLayoutEffect(() => {
    if (editingCell && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingCell])

  // Focus trapping and restoration for Shortcuts Dialog
  useLayoutEffect(() => {
    if (isShortcutsOpen) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement | null
      firstCloseBtnRef.current?.focus()
    } else if (previouslyFocusedRef.current) {
      previouslyFocusedRef.current.focus()
      previouslyFocusedRef.current = null
    }
  }, [isShortcutsOpen])

  // Global '?' key shortcut to open help modal when not typing in text field
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target
      const isInput =
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)

      if (e.key === '?' && !isInput && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        setIsShortcutsOpen((prev) => !prev)
      } else if (e.key === 'Escape' && isShortcutsOpen) {
        e.preventDefault()
        setIsShortcutsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isShortcutsOpen])

  // Grid pagination calculations
  const totalGridPages = Math.max(1, Math.ceil(editor.rows.length / PAGE_SIZE))
  const currentGridPage = Math.min(gridPage, totalGridPages - 1)
  const startRowIndex = currentGridPage * PAGE_SIZE
  const endRowIndex = Math.min(startRowIndex + PAGE_SIZE, editor.rows.length)
  const displayedRows = editor.rows.slice(startRowIndex, endRowIndex)

  // Imported data starts on the first page; grid operations keep their page.
  useEffect(() => {
    if (editor.inputFormat === 'auto') setGridPage(0)
  }, [editor.source, editor.inputFormat])

  // Focus after React commits the target page, without waiting for an animation frame.
  useLayoutEffect(() => {
    const target = pendingCellFocusRef.current
    if (!target || editingCell) return
    pendingCellFocusRef.current = null
    tableContainerRef.current
      ?.querySelector<HTMLElement>(`[data-cell-row="${target.row}"][data-cell-col="${target.col}"]`)
      ?.focus()
  })

  // Cell editing handlers
  const startCellEdit = (row: number, col: number) => {
    pendingCellFocusRef.current = null
    setGridPage(Math.floor(row / PAGE_SIZE))
    editor.onSelectCell(row, col)
    setEditingCell({ row, col })
    setEditValue(editor.rows[row]?.[col] ?? '')
  }

  const commitCellEdit = (restoreFocus = true) => {
    if (editingCell) {
      const { row, col } = editingCell
      if (restoreFocus) pendingCellFocusRef.current = { row, col }
      editor.onCellChange(row, col, editValue)
      setEditingCell(null)
    }
  }

  const cancelCellEdit = () => {
    if (editingCell) {
      const { row, col } = editingCell
      pendingCellFocusRef.current = { row, col }
      setEditingCell(null)
    }
  }

  // Move both selection and actual DOM focus to matching td
  const moveCellFocus = (targetRow: number, targetCol: number) => {
    pendingCellFocusRef.current = { row: targetRow, col: targetCol }
    setGridPage(Math.floor(targetRow / PAGE_SIZE))
    editor.onSelectCell(targetRow, targetCol)
  }

  // Handle cell keydown navigation & commit
  const handleCellKeyDown = (
    e: React.KeyboardEvent,
    row: number,
    col: number
  ) => {
    if (editingCell) {
      if (e.key === 'Enter') {
        e.preventDefault()
        commitCellEdit()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        cancelCellEdit()
      } else if (e.key === 'Tab') {
        e.preventDefault()
        commitCellEdit(false)
        const cellCount = editor.rows.length * editor.columns
        const nextIndex = (row * editor.columns + col + (e.shiftKey ? -1 : 1) + cellCount) % cellCount
        startCellEdit(Math.floor(nextIndex / editor.columns), nextIndex % editor.columns)
      }
      return
    }

    // When cell is selected/focused but not in inline edit mode
    if (e.key === 'Enter') {
      e.preventDefault()
      startCellEdit(row, col)
    } else if (e.key === 'ArrowRight' && col + 1 < editor.columns) {
      e.preventDefault()
      moveCellFocus(row, col + 1)
    } else if (e.key === 'ArrowLeft' && col > 0) {
      e.preventDefault()
      moveCellFocus(row, col - 1)
    } else if (e.key === 'ArrowDown' && row + 1 < editor.rows.length) {
      e.preventDefault()
      if (row + 1 >= endRowIndex) {
        setGridPage((p) => Math.min(totalGridPages - 1, p + 1))
      }
      moveCellFocus(row + 1, col)
    } else if (e.key === 'ArrowUp' && row > 0) {
      e.preventDefault()
      if (row - 1 < startRowIndex) {
        setGridPage((p) => Math.max(0, p - 1))
      }
      moveCellFocus(row - 1, col)
    }
  }

  // Copy with UI feedback only when editor.onCopy resolves to true
  const handleCopy = async (format: OutputFormat) => {
    const success = await editor.onCopy(format)
    if (success) {
      setCopiedFormat(format)
      setTimeout(() => {
        setCopiedFormat(null)
      }, 2000)
    }
  }

  // Modal keyboard handling for Escape and focus trapping (Tab / Shift+Tab)
  const handleModalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      setIsShortcutsOpen(false)
      return
    }
    if (e.key === 'Tab' && shortcutsDialogRef.current) {
      const focusables = shortcutsDialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (focusables.length === 0) return
      const firstEl = focusables[0]
      const lastEl = focusables[focusables.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault()
          lastEl.focus()
        }
      } else {
        if (document.activeElement === lastEl) {
          e.preventDefault()
          firstEl.focus()
        }
      }
    }
  }

  // File drag & drop handling
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      await editor.onImportFile(file)
    }
  }

  // Add row and jump to last page so newly added row is visible and immediately editable
  const handleAddRow = () => {
    editor.onAddRow()
    const nextTotal = editor.rows.length + 1
    const lastPage = Math.max(0, Math.ceil(nextTotal / PAGE_SIZE) - 1)
    setGridPage(lastPage)
  }

  // Bounded gutter line calculation (renders window of visible lines with height spacers)
  const lineCount = Math.max(1, (editor.source || '').split('\n').length)
  const startLine = Math.max(1, Math.floor(scrollTop / LINE_HEIGHT) - 5)
  const endLine = Math.min(lineCount, startLine + 44)
  const topSpacer = (startLine - 1) * LINE_HEIGHT
  const bottomSpacer = Math.max(0, (lineCount - endLine) * LINE_HEIGHT)
  const visibleLines = Array.from(
    { length: Math.max(0, endLine - startLine + 1) },
    (_, i) => startLine + i
  )

  // Current selected column (if any cell selected)
  const selectedCol = editor.selectedCell?.col ?? null

  return (
    <div className="min-h-screen flex flex-col bg-page text-main selection:bg-sage-subtle">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.tsv,.md,.txt,.json"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          if (file) {
            await editor.onImportFile(file)
            e.target.value = ''
          }
        }}
      />

      {/* 1. TOP NAVIGATION */}
      <header className="sticky top-0 z-40 w-full border-b border-hairline bg-surface/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          {/* Brand mark & title */}
          <div className="flex items-center gap-3 shrink-0">
            <a
              href="#"
              className="flex items-center gap-2.5 font-semibold text-main hover:opacity-90 transition-opacity"
            >
              {/* Unique Tableflow custom SVG mark */}
              <div className="w-8 h-8 rounded-lg bg-surface border border-hairline flex items-center justify-center p-1.5 shadow-xs">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-full h-full text-sage"
                >
                  <rect width="18" height="18" x="3" y="3" rx="2" />
                  <path d="M3 9h18" />
                  <path d="M3 15h18" />
                  <path d="M9 3v18" />
                  <path d="M15 3v18" />
                  <rect
                    x="3"
                    y="3"
                    width="6"
                    height="6"
                    fill="currentColor"
                    fillOpacity="0.2"
                  />
                </svg>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight">Tableflow</span>
                <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-full bg-subtle border border-hairline text-text-muted">
                  v1.0
                </span>
              </div>
            </a>

            {/* Privacy status badge */}
            <div
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sage-subtle border border-sage-border text-xs text-sage font-medium"
              title="입력한 모든 데이터는 외부 서버로 전송되지 않고 브라우저 내부에서만 처리됩니다."
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>100% 로컬 브라우저 처리 · 서버 전송 없음</span>
            </div>
          </div>

          {/* Navigation actions */}
          <div className="flex items-center gap-2">
            <a
              href="#guide"
              aria-label="가이드"
              className="px-3 py-1.5 text-xs font-medium text-text-muted hover:text-main hover:bg-subtle rounded-md transition-colors flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline whitespace-nowrap">가이드</span>
            </a>

            <button
              type="button"
              onClick={() => setIsShortcutsOpen(true)}
              className="px-2.5 py-1.5 text-xs font-medium text-text-muted hover:text-main hover:bg-subtle rounded-md transition-colors flex items-center gap-1.5"
              aria-label="단축키 안내 열기"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">단축키</span>
              <kbd className="hidden sm:inline-block">?</kbd>
            </button>

            <button
              type="button"
              onClick={editor.onThemeToggle}
              className="p-2 text-text-muted hover:text-main hover:bg-subtle rounded-md transition-colors border border-hairline"
              aria-label={`테마 전환 (현재: ${editor.theme === 'dark' ? '다크 모드' : '라이트 모드'})`}
            >
              {editor.theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Editorial introduction: locally served, purpose-made photography */}
      <section className="w-full border-b border-hairline" aria-labelledby="workspace-title">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="editorial-intro">
            <div className="editorial-copy">
              <div className="editorial-eyebrow text-sage">
                <span className="editorial-rule" aria-hidden="true" />
                <span>마크다운 표 변환기 · TABLEFLOW</span>
              </div>
              <h1 id="workspace-title" className="editorial-title text-main">
                스프레드시트에서 마크다운까지,<br />가장 깔끔한 표 변환.
              </h1>
              <p className="text-sm text-text-muted leading-relaxed max-w-lg">
                엑셀·CSV·JSON 데이터를 즉시 마크다운 표로 변환하고 실시간으로 편집하세요.<br className="hidden sm:block" />
                붙여넣고 편집한 뒤 필요한 형식으로 바로 복사할 수 있습니다.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
                <a href="#workspace" className="inline-flex items-center gap-2 text-sm font-semibold text-sage underline underline-offset-4 decoration-sage-border hover:decoration-sage transition-colors">
                  표 편집 시작하기 <ArrowUpRight className="w-4 h-4" />
                </a>
                <span className="text-[11px] font-mono-code text-text-subtle">엑셀(Excel) · 마크다운 · CSV · JSON</span>
              </div>
            </div>
            <figure className="editorial-figure">
              <img
                src="/images/tableflow-paper-flow-1280.jpg"
                srcSet="/images/tableflow-paper-flow-640.jpg 640w, /images/tableflow-paper-flow-1280.jpg 1280w"
                sizes="(max-width: 639px) calc(100vw - 32px), (max-width: 900px) 42vw, 430px"
                width="1536"
                height="1024"
                alt="세이지색 종이 위의 표가 부드러운 종이 리본으로 이어지는 모습"
                fetchPriority="high"
                decoding="async"
              />
              <figcaption className="editorial-caption">
                <span>EXCEL ↔ MARKDOWN</span>
                <span>Tableflow</span>
              </figcaption>
            </figure>
          </div>
          {/* Workspace Controls Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5 border-t border-hairline">
            {/* Live Status Pill */}
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-hairline/90 shadow-2xs text-xs font-medium text-text-muted">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sage opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-sage"></span>
                </span>
                <span className="font-semibold text-main">실시간 양방향 변환</span>
                <span className="text-text-subtle text-[11px] hidden sm:inline">· 입력 형식 자동 감지</span>
              </div>
            </div>

            {/* Mode & View toggles */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Mode switch */}
              <div
                role="group"
                aria-label="변환 모드 선택"
                className="inline-flex p-1 rounded-xl bg-subtle/80 border border-hairline/90 shadow-2xs"
              >
                <button
                  type="button"
                  onClick={() => editor.onModeChange('to-markdown')}
                  aria-pressed={editor.mode === 'to-markdown'}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-all flex items-center gap-1.5 ${
                    editor.mode === 'to-markdown'
                      ? 'bg-surface text-main font-bold shadow-xs border border-hairline/50'
                      : 'text-text-muted hover:text-main font-medium'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-sage" />
                  <span>시트/데이터 → 마크다운</span>
                </button>
                <button
                  type="button"
                  onClick={() => editor.onModeChange('from-markdown')}
                  aria-pressed={editor.mode === 'from-markdown'}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-all flex items-center gap-1.5 ${
                    editor.mode === 'from-markdown'
                      ? 'bg-surface text-main font-bold shadow-xs border border-hairline/50'
                      : 'text-text-muted hover:text-main font-medium'
                  }`}
                >
                  <CodeIcon className="w-3.5 h-3.5 text-sage" />
                  <span>마크다운 → 시트/데이터</span>
                </button>
              </div>

              {/* View switch */}
              <div
                role="group"
                aria-label="화면 보기 방식 선택"
                className="inline-flex p-1 rounded-xl bg-subtle/80 border border-hairline/90 shadow-2xs"
              >
                <button
                  type="button"
                  onClick={() => editor.onViewChange('split')}
                  aria-pressed={editor.view === 'split'}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-all flex items-center gap-1.5 ${
                    editor.view === 'split'
                      ? 'bg-surface text-main font-bold shadow-xs border border-hairline/50'
                      : 'text-text-muted hover:text-main font-medium'
                  }`}
                >
                  <SplitIcon className="w-3.5 h-3.5" />
                  <span>스플릿 뷰</span>
                </button>
                <button
                  type="button"
                  onClick={() => editor.onViewChange('code')}
                  aria-pressed={editor.view === 'code'}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-all flex items-center gap-1.5 ${
                    editor.view === 'code'
                      ? 'bg-surface text-main font-bold shadow-xs border border-hairline/50'
                      : 'text-text-muted hover:text-main font-medium'
                  }`}
                >
                  <CodeIcon className="w-3.5 h-3.5" />
                  <span>코드 뷰</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. MAIN WORKSPACE 2-COLUMN GRID */}
      <main id="workspace" className="flex-1 max-w-[1680px] mx-auto w-full px-4 sm:px-6 py-6 scroll-mt-20">
        <div className="workspace-layout grid grid-cols-1 lg:grid-cols-2 gap-4 xl:gap-5 items-start">
          {/* =========================================
              LEFT COLUMN: SOURCE INPUT PANEL
             ========================================= */}
          <div className="flex flex-col border border-hairline/90 rounded-2xl bg-surface shadow-xs hover:shadow-sm transition-shadow overflow-hidden">
            {/* Input Header */}
            <div className="px-4 py-3 border-b border-hairline/80 bg-subtle/40 backdrop-blur-xs flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-surface border border-hairline flex items-center justify-center text-sage shadow-2xs">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold tracking-tight text-main">
                    원본 데이터
                  </span>
                  <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-subtle text-text-subtle border border-hairline">
                    Source
                  </span>
                </div>

                {/* Format Selector */}
                <div className="relative flex items-center">
                  <label htmlFor="input-format-select" className="sr-only">
                    입력 포맷 선택
                  </label>
                  <select
                    id="input-format-select"
                    value={editor.inputFormat}
                    onChange={(e) =>
                      editor.onInputFormatChange(
                        e.target.value as 'auto' | Format
                      )
                    }
                    className="appearance-none text-xs font-semibold bg-surface border border-hairline/90 rounded-lg pl-2.5 pr-7 py-1 text-main hover:bg-subtle/50 focus:outline-none focus:ring-2 focus:ring-sage shadow-2xs transition-colors cursor-pointer"
                  >
                    <option value="auto">자동 감지 (Auto)</option>
                    <option value="tsv">엑셀 / 구글 시트 (Excel)</option>
                    <option value="csv">CSV (쉼표 구분)</option>
                    <option value="markdown">마크다운 표 (Markdown)</option>
                    <option value="json">JSON (배열/객체)</option>
                    <option value="text">일반 텍스트 (줄바꿈)</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-text-subtle absolute right-2 pointer-events-none" />
                </div>

                {/* Detected Format pill when auto is selected */}
                {editor.inputFormat === 'auto' && (
                  <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-bold shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                    감지: {editor.detectedFormat === 'tsv' ? '엑셀 / 시트' : editor.detectedFormat === 'markdown' ? '마크다운' : editor.detectedFormat.toUpperCase()}
                  </span>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={editor.onSample}
                  className="px-2.5 py-1 text-xs font-medium text-text-muted hover:text-main bg-surface hover:bg-subtle border border-hairline rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs active:scale-[0.98]"
                  title="기본 샘플 데이터 불러오기"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>예제</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 text-xs font-medium text-text-muted hover:text-main bg-surface hover:bg-subtle border border-hairline rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs active:scale-[0.98]"
                  title="엑셀, CSV, 마크다운, JSON 파일 열기"
                >
                  <Upload className="w-3.5 h-3.5 text-sage" />
                  <span>파일 열기</span>
                </button>

                <button
                  type="button"
                  onClick={editor.onClear}
                  disabled={!editor.source}
                  className="px-2.5 py-1 text-xs font-medium text-text-muted hover:text-red-600 bg-surface hover:bg-red-50 dark:hover:bg-red-950/20 border border-hairline rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none shadow-2xs active:scale-[0.98]"
                  title="입력 내용 모두 지우기"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>비우기</span>
                </button>
              </div>
            </div>

            {/* Error Notification if parsing failed */}
            {editor.error && (
              <div
                role="alert"
                aria-live="assertive"
                className="p-3 bg-red-500/10 border-b border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-start gap-2.5"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">{editor.error}</p>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    CSV 따옴표 닫힘 여부, 탭/쉼표 구분자, 또는 JSON 형식을 점검해주세요.
                  </p>
                </div>
              </div>
            )}

            {/* Input Textarea Area with Bounded Virtualized Gutter & Drag-Drop */}
            {/* Viewport-aware heights keep more rows visible without unbounded gutter DOM. */}
            <div
              className={`workspace-input-area relative flex min-w-0 overflow-hidden ${
                isDragging ? 'ring-2 ring-sage ring-inset bg-sage-subtle/30' : ''
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {/* Bounded line numbers gutter with height spacers to handle 1000+ lines with minimal DOM nodes */}
              <div
                ref={gutterRef}
                aria-hidden="true"
                className="w-12 select-none overflow-hidden text-right pr-2.5 py-3 font-mono-code text-xs leading-6 text-text-subtle bg-subtle/40 border-r border-hairline/80 shrink-0"
              >
                <div style={{ height: topSpacer }} />
                {visibleLines.map((num) => (
                  <div key={num} style={{ height: LINE_HEIGHT }}>
                    {num}
                  </div>
                ))}
                <div style={{ height: bottomSpacer }} />
              </div>

              {/* Source Textarea (data-source-input required for coordinator paste) */}
              <textarea
                ref={textareaRef}
                data-source-input=""
                value={editor.source}
                onChange={(e) => {
                  setGridPage(0)
                  editor.onSourceChange(e.target.value)
                }}
                onScroll={handleScroll}
                placeholder={`Excel, Google Sheets 셀 범위를 복사해 여기에 붙여넣거나,\nCSV, Markdown (| 표 |), JSON 데이터를 입력하세요.\n\n단축키 안내:\n- Ctrl/Cmd+Shift+C: 결과 복사\n- 단축키 도움말: ? 키`}
                className="flex-1 w-full min-w-0 h-full px-3 sm:px-4 py-3 font-mono-code text-sm lg:text-[15px] leading-6 bg-transparent text-main placeholder:text-text-subtle outline-none resize-none custom-scrollbar"
                spellCheck={false}
                aria-label="표 데이터 원본 텍스트"
              />

              {/* Drag overlay */}
              {isDragging && (
                <div className="absolute inset-0 z-20 bg-surface/90 flex flex-col items-center justify-center gap-2 pointer-events-none border-2 border-dashed border-sage m-2 rounded-xl">
                  <Upload className="w-8 h-8 text-sage animate-bounce" />
                  <p className="text-sm font-semibold text-main">
                    파일을 놓으면 바로 변환합니다
                  </p>
                  <p className="text-xs text-text-muted">
                    엑셀(.tsv), .csv, .md, .txt, .json 파일 지원
                  </p>
                </div>
              )}
            </div>

            {/* Input Footer Stats */}
            <div className="px-4 py-2.5 border-t border-hairline/80 bg-subtle/30 text-[11px] text-text-muted flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded bg-surface border border-hairline font-mono-code font-medium">{lineCount}줄</span>
                <span className="px-1.5 py-0.5 rounded bg-surface border border-hairline font-mono-code font-medium">{editor.source.length.toLocaleString()}자</span>
                <span className="px-1.5 py-0.5 rounded bg-surface border border-hairline font-mono-code font-medium">
                  {(new Blob([editor.source]).size / 1024).toFixed(1)} KB
                </span>
              </div>
              <span className="hidden sm:inline text-text-subtle font-medium">
                💡 Excel·스프레드시트 복사 데이터를 바로 붙여넣으세요
              </span>
            </div>
          </div>

          {/* =========================================
              RIGHT COLUMN: LIVE GRID & OUTPUT PANEL
             ========================================= */}
          <div className="flex flex-col border border-hairline/90 rounded-2xl bg-surface shadow-xs hover:shadow-sm transition-shadow overflow-hidden">
            {/* Output Header with Format Tabs & Primary Actions */}
            <div className="px-4 py-2.5 border-b border-hairline/80 bg-subtle/40 backdrop-blur-xs flex flex-wrap items-center justify-between gap-2.5">
              {/* Output format tabs */}
              <div
                role="tablist"
                aria-label="출력 포맷 선택"
                className="inline-flex p-1 rounded-xl bg-subtle/80 border border-hairline/90 shadow-2xs"
              >
                {(
                  [
                    { id: 'markdown', label: '마크다운' },
                    { id: 'tsv', label: '엑셀 (Excel)' },
                    { id: 'csv', label: 'CSV' },
                    { id: 'json', label: 'JSON' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    role="tab"
                    type="button"
                    aria-selected={editor.outputFormat === tab.id}
                    onClick={() => editor.onOutputFormatChange(tab.id)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                      editor.outputFormat === tab.id
                        ? 'bg-sage text-on-sage font-bold shadow-xs'
                        : 'text-text-muted hover:text-main hover:bg-surface/60 font-medium'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Export Buttons */}
              <div className="flex items-center gap-1.5">
                {/* Quick Excel Copy */}
                <button
                  type="button"
                  onClick={() => handleCopy('tsv')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 shadow-2xs active:scale-[0.98] ${
                    copiedFormat === 'tsv'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'bg-surface hover:bg-subtle text-text-muted hover:text-main border-hairline'
                  }`}
                  title="엑셀이나 스프레드시트에 바로 붙여넣을 수 있게 복사"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="hidden sm:inline">
                    {copiedFormat === 'tsv' ? '엑셀 복사됨!' : '엑셀 복사'}
                  </span>
                </button>

                {/* Primary Copy Button */}
                <button
                  type="button"
                  onClick={() => handleCopy(editor.outputFormat)}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-xs active:scale-[0.98] ${
                    copiedFormat === editor.outputFormat
                      ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                      : 'bg-sage text-on-sage hover:bg-sage-hover'
                  }`}
                  title="현재 선택된 포맷 결과를 클립보드에 복사 (Ctrl/Cmd+Shift+C)"
                >
                  {copiedFormat === editor.outputFormat ? (
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {copiedFormat === editor.outputFormat
                      ? '복사 완료!'
                      : `${editor.outputFormat === 'tsv' ? '엑셀' : editor.outputFormat === 'markdown' ? '마크다운' : editor.outputFormat.toUpperCase()} 복사`}
                  </span>
                </button>

                {/* Download Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsDownloadOpen((prev) => !prev)}
                    className="p-1.5 text-xs font-medium text-text-muted hover:text-main bg-surface hover:bg-subtle border border-hairline rounded-lg transition-colors flex items-center gap-1 shadow-2xs active:scale-[0.98]"
                    aria-expanded={isDownloadOpen}
                    aria-label="파일 다운로드 메뉴"
                    title="결과 파일 다운로드 (.md, .csv 등)"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <ChevronDown className="w-3 h-3 text-text-subtle" />
                  </button>

                  {isDownloadOpen && (
                    <div className="absolute right-0 mt-1 w-52 rounded-xl bg-surface border border-hairline shadow-lg py-1.5 z-30">
                      <button
                        type="button"
                        onClick={() => {
                          editor.onDownload('markdown')
                          setIsDownloadOpen(false)
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs text-main hover:bg-subtle flex items-center justify-between font-medium transition-colors"
                      >
                        <span>마크다운 문서</span>
                        <kbd>.md</kbd>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          editor.onDownload('tsv')
                          setIsDownloadOpen(false)
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs text-main hover:bg-subtle flex items-center justify-between font-medium transition-colors"
                      >
                        <span>엑셀 / 시트 파일</span>
                        <kbd>.tsv (엑셀 호환)</kbd>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          editor.onDownload('csv')
                          setIsDownloadOpen(false)
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs text-main hover:bg-subtle flex items-center justify-between font-medium transition-colors"
                      >
                        <span>CSV 파일 (엑셀 한글 BOM)</span>
                        <kbd>.csv</kbd>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          editor.onDownload('json')
                          setIsDownloadOpen(false)
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs text-main hover:bg-subtle flex items-center justify-between font-medium transition-colors"
                      >
                        <span>JSON 데이터</span>
                        <kbd>.json</kbd>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Formatting & Editing Toolbar */}
            <div className="px-3.5 py-2.5 border-b border-hairline/80 bg-subtle/30 flex flex-col gap-2.5">
              {/* Row 1: Formatting Option Toggles with Clear, Intuitive Korean Labels */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Undo / Redo Group */}
                  <div className="inline-flex rounded-lg border border-hairline/90 bg-surface p-0.5 shadow-2xs">
                    <button
                      type="button"
                      onClick={editor.onUndo}
                      disabled={!editor.canUndo}
                      className="p-1.5 rounded-md text-text-muted hover:text-main hover:bg-subtle disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      title="실행 취소 (Ctrl/Cmd+Z)"
                      aria-label="실행 취소"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-[1px] bg-hairline my-0.5" />
                    <button
                      type="button"
                      onClick={editor.onRedo}
                      disabled={!editor.canRedo}
                      className="p-1.5 rounded-md text-text-muted hover:text-main hover:bg-subtle disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      title="다시 실행 (Ctrl/Cmd+Shift+Z 또는 Ctrl/Cmd+Y)"
                      aria-label="다시 실행"
                    >
                      <Redo2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="hidden sm:block h-4 w-[1px] bg-hairline mx-0.5" />

                  {/* Formatting Option Toggles */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Option 1: 첫 행 헤더 */}
                    <button
                      type="button"
                      aria-pressed={editor.options.header}
                      onClick={() =>
                        editor.onOptionsChange({ header: !editor.options.header })
                      }
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border transition-all ${
                        editor.options.header
                          ? 'bg-sage text-on-sage font-bold shadow-xs border-sage'
                          : 'bg-surface border-hairline/80 text-text-muted hover:text-main hover:bg-subtle/50 font-medium'
                      }`}
                      title="첫 번째 줄을 마크다운 표 제목(헤더)으로 지정합니다"
                    >
                      <span
                        className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] font-bold ${
                          editor.options.header
                            ? 'bg-white/20 text-on-sage'
                            : 'border border-hairline text-transparent'
                        }`}
                      >
                        ✓
                      </span>
                      <span>첫 행을 제목으로</span>
                    </button>

                    {/* Option 2: 너비 맞춤 (Pretty) */}
                    <button
                      type="button"
                      aria-pressed={editor.options.pretty}
                      onClick={() =>
                        editor.onOptionsChange({ pretty: !editor.options.pretty })
                      }
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border transition-all ${
                        editor.options.pretty
                          ? 'bg-sage text-on-sage font-bold shadow-xs border-sage'
                          : 'bg-surface border-hairline/80 text-text-muted hover:text-main hover:bg-subtle/50 font-medium'
                      }`}
                      title="한글 및 문자 너비에 맞게 마크다운 열 간격을 가지런히 맞춥니다"
                    >
                      <span
                        className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] font-bold ${
                          editor.options.pretty
                            ? 'bg-white/20 text-on-sage'
                            : 'border border-hairline text-transparent'
                        }`}
                      >
                        ✓
                      </span>
                      <span>열 간격 예쁘게 맞춤</span>
                    </button>

                    {/* Option 3: 공백 정리 (Trim) */}
                    <button
                      type="button"
                      aria-pressed={editor.options.trim}
                      onClick={() =>
                        editor.onOptionsChange({ trim: !editor.options.trim })
                      }
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border transition-all ${
                        editor.options.trim
                          ? 'bg-sage text-on-sage font-bold shadow-xs border-sage'
                          : 'bg-surface border-hairline/80 text-text-muted hover:text-main hover:bg-subtle/50 font-medium'
                      }`}
                      title="각 셀의 앞뒤 불필요한 빈칸을 깔끔하게 제거합니다"
                    >
                      <span
                        className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] font-bold ${
                          editor.options.trim
                            ? 'bg-white/20 text-on-sage'
                            : 'border border-hairline text-transparent'
                        }`}
                      >
                        ✓
                      </span>
                      <span>불필요한 공백 제거</span>
                    </button>

                    {/* Option 4: 빈 행 제거 */}
                    <button
                      type="button"
                      aria-pressed={editor.options.removeEmpty}
                      onClick={() =>
                        editor.onOptionsChange({
                          removeEmpty: !editor.options.removeEmpty,
                        })
                      }
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border transition-all ${
                        editor.options.removeEmpty
                          ? 'bg-sage text-on-sage font-bold shadow-xs border-sage'
                          : 'bg-surface border-hairline/80 text-text-muted hover:text-main hover:bg-subtle/50 font-medium'
                      }`}
                      title="내용이 없는 빈 행을 자동으로 제외합니다"
                    >
                      <span
                        className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] font-bold ${
                          editor.options.removeEmpty
                            ? 'bg-white/20 text-on-sage'
                            : 'border border-hairline text-transparent'
                        }`}
                      >
                        ✓
                      </span>
                      <span>빈 줄 자동 삭제</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 2: Grid Row/Column Actions & Column Alignment */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-hairline/60">
                {/* Structure Editing (Row / Column Actions) */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Row Operations */}
                  <div className="inline-flex items-center rounded-lg border border-hairline/90 bg-surface p-0.5 shadow-2xs text-xs">
                    <span className="text-[11px] font-bold text-main px-2 py-0.5 select-none">
                      행
                    </span>
                    <button
                      type="button"
                      onClick={handleAddRow}
                      className="px-2 py-1 rounded-md text-text-muted hover:text-main hover:bg-subtle flex items-center gap-1 transition-colors font-medium"
                      title="표 맨 끝에 새 행을 추가하고 해당 페이지로 이동합니다"
                    >
                      <Plus className="w-3 h-3 text-sage" />
                      <span>추가</span>
                    </button>
                    <button
                      type="button"
                      onClick={editor.onDeleteRow}
                      disabled={editor.rows.length === 0}
                      className="px-2 py-1 rounded-md text-text-muted hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-1 transition-colors disabled:opacity-30 disabled:pointer-events-none font-medium"
                      title="선택한 행(또는 마지막 행)을 삭제합니다"
                    >
                      <Minus className="w-3 h-3" />
                      <span>삭제</span>
                    </button>
                  </div>

                  {/* Column Operations */}
                  <div className="inline-flex items-center rounded-lg border border-hairline/90 bg-surface p-0.5 shadow-2xs text-xs">
                    <span className="text-[11px] font-bold text-main px-2 py-0.5 select-none">
                      열
                    </span>
                    <button
                      type="button"
                      onClick={editor.onAddColumn}
                      className="px-2 py-1 rounded-md text-text-muted hover:text-main hover:bg-subtle flex items-center gap-1 transition-colors font-medium"
                      title="표 오른쪽에 새 열을 추가합니다"
                    >
                      <Plus className="w-3 h-3 text-sage" />
                      <span>추가</span>
                    </button>
                    <button
                      type="button"
                      onClick={editor.onDeleteColumn}
                      disabled={editor.columns === 0}
                      className="px-2 py-1 rounded-md text-text-muted hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-1 transition-colors disabled:opacity-30 disabled:pointer-events-none font-medium"
                      title="선택한 열(또는 마지막 열)을 삭제합니다"
                    >
                      <Minus className="w-3 h-3" />
                      <span>삭제</span>
                    </button>
                  </div>
                </div>

                {/* Alignment Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Selected Column Alignment (if a cell is selected) */}
                  {selectedCol !== null ? (
                    <div className="inline-flex items-center gap-0.5 bg-surface border border-hairline/90 rounded-lg p-0.5 shadow-2xs text-xs">
                      <span className="text-[11px] font-bold text-sage px-2 py-0.5">
                        {String.fromCharCode(65 + (selectedCol % 26))}열 정렬:
                      </span>
                      <button
                        type="button"
                        onClick={() => editor.onAlignColumn(selectedCol, 'left')}
                        className={`px-2 py-1 rounded-md transition-colors flex items-center gap-1 ${
                          editor.alignments[selectedCol] === 'left'
                            ? 'text-sage font-bold bg-sage-subtle shadow-2xs'
                            : 'text-text-muted hover:text-main hover:bg-subtle'
                        }`}
                        title="선택 열 왼쪽 정렬"
                        aria-label="선택 열 왼쪽 정렬"
                      >
                        <AlignLeft className="w-3 h-3" />
                        <span className="text-[11px]">왼쪽</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          editor.onAlignColumn(selectedCol, 'center')
                        }
                        className={`px-2 py-1 rounded-md transition-colors flex items-center gap-1 ${
                          editor.alignments[selectedCol] === 'center'
                            ? 'text-sage font-bold bg-sage-subtle shadow-2xs'
                            : 'text-text-muted hover:text-main hover:bg-subtle'
                        }`}
                        title="선택 열 가운데 정렬"
                        aria-label="선택 열 가운데 정렬"
                      >
                        <AlignCenter className="w-3 h-3" />
                        <span className="text-[11px]">가운데</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          editor.onAlignColumn(selectedCol, 'right')
                        }
                        className={`px-2 py-1 rounded-md transition-colors flex items-center gap-1 ${
                          editor.alignments[selectedCol] === 'right'
                            ? 'text-sage font-bold bg-sage-subtle shadow-2xs'
                            : 'text-text-muted hover:text-main hover:bg-subtle'
                        }`}
                        title="선택 열 오른쪽 정렬"
                        aria-label="선택 열 오른쪽 정렬"
                      >
                        <AlignRight className="w-3 h-3" />
                        <span className="text-[11px]">오른쪽</span>
                      </button>
                    </div>
                  ) : null}

                  {/* Align All Columns */}
                  <div className="inline-flex items-center gap-0.5 bg-surface border border-hairline/90 rounded-lg p-0.5 shadow-2xs text-xs">
                    <span className="text-[11px] font-semibold text-text-subtle px-2 py-0.5 select-none">
                      전체 정렬:
                    </span>
                    <button
                      type="button"
                      onClick={() => editor.onAlignAll('left')}
                      className="px-1.5 py-1 rounded-md text-text-muted hover:text-main hover:bg-subtle transition-colors flex items-center gap-1"
                      title="모든 열 왼쪽 정렬"
                      aria-label="모든 열 왼쪽 정렬"
                    >
                      <AlignLeft className="w-3 h-3" />
                      <span className="text-[11px]">왼쪽</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => editor.onAlignAll('center')}
                      className="px-1.5 py-1 rounded-md text-text-muted hover:text-main hover:bg-subtle transition-colors flex items-center gap-1"
                      title="모든 열 가운데 정렬"
                      aria-label="모든 열 가운데 정렬"
                    >
                      <AlignCenter className="w-3 h-3" />
                      <span className="text-[11px]">가운데</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => editor.onAlignAll('right')}
                      className="px-1.5 py-1 rounded-md text-text-muted hover:text-main hover:bg-subtle transition-colors flex items-center gap-1"
                      title="모든 열 오른쪽 정렬"
                      aria-label="모든 열 오른쪽 정렬"
                    >
                      <AlignRight className="w-3 h-3" />
                      <span className="text-[11px]">오른쪽</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Area: Split View (Table + Code) OR Code View */}
            {editor.view === 'code' ? (
              /* Dedicated Full Code View */
              <div className="workspace-body flex flex-col overflow-hidden bg-code">
                <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                  <pre className="font-mono-code text-xs sm:text-sm leading-6 text-main whitespace-pre">
                    {editor.output || (
                      <span className="text-text-subtle">
                        변환할 표 데이터를 왼쪽에 입력하면 결과 코드가 여기에 표시됩니다.
                      </span>
                    )}
                  </pre>
                </div>
              </div>
            ) : (
              /* Split View: Live Interactive Table Preview */
              <div className="workspace-body flex flex-col overflow-hidden">
                {/* Live HTML Table Container with ref for DOM focus movement */}
                <div
                  ref={tableContainerRef}
                  className="flex-1 overflow-auto custom-scrollbar border-b border-hairline/80"
                >
                  {editor.rows.length === 0 ? (
                    <div className="h-full min-h-[240px] flex flex-col items-center justify-center p-8 text-center text-text-muted">
                      <div className="w-12 h-12 rounded-xl bg-subtle border border-hairline flex items-center justify-center mb-3">
                        <TableIcon className="w-6 h-6 text-text-subtle" />
                      </div>
                      <p className="text-sm font-semibold text-main">
                        표시할 표 데이터가 없습니다
                      </p>
                      <p className="text-xs text-text-subtle mt-1 max-w-sm">
                        왼쪽 입력창에 표를 붙여넣거나 [예제] 버튼을 눌러 샘플 표를 불러오세요.
                      </p>
                    </div>
                  ) : (
                    <table
                      role="grid"
                      aria-label="실시간 표 편집기"
                      className="w-full border-collapse text-xs sm:text-sm font-mono-code"
                    >
                      {/* Column Header (A, B, C or synthetic titles) */}
                      <thead className="sticky top-0 z-10 bg-subtle/95 backdrop-blur-xs border-b border-hairline shadow-2xs">
                        <tr>
                          {/* Row Number Header Cell */}
                          <th className="w-12 px-2 py-2.5 text-center text-[11px] font-bold text-text-subtle border-r border-hairline bg-subtle/80 select-none">
                            #
                          </th>
                          {/* Column Headers */}
                          {Array.from({ length: editor.columns }).map(
                            (_, colIndex) => {
                              const alignment = editor.alignments[colIndex] ?? 'left'
                              const colLetter = String.fromCharCode(65 + (colIndex % 26))
                              const isColSelected = selectedCol === colIndex

                              return (
                                <th
                                  key={colIndex}
                                  className={`px-3 py-2.5 text-left font-semibold text-text-muted border-r border-hairline select-none transition-colors ${
                                    isColSelected
                                      ? 'bg-sage-subtle text-sage'
                                      : 'hover:bg-subtle/80'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5">
                                      <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold">
                                        {colLetter}
                                      </span>
                                      <span className="text-xs font-bold text-main">
                                        열 {colIndex + 1}
                                      </span>
                                    </div>

                                    {/* Alignment Indicator & Cycle Click */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const nextAlign: Alignment =
                                          alignment === 'left'
                                            ? 'center'
                                            : alignment === 'center'
                                              ? 'right'
                                              : 'left'
                                        editor.onAlignColumn(colIndex, nextAlign)
                                      }}
                                      className="p-1 rounded-md bg-surface/80 hover:bg-surface border border-hairline/70 text-text-subtle hover:text-sage shadow-2xs transition-colors"
                                      title={`열 정렬 변경 (현재: ${alignment === 'left' ? '왼쪽' : alignment === 'center' ? '가운데' : '오른쪽'})`}
                                      aria-label={`${colIndex + 1}번 열 정렬: ${alignment === 'left' ? '왼쪽' : alignment === 'center' ? '가운데' : '오른쪽'}`}
                                    >
                                      {alignment === 'left' && (
                                        <AlignLeft className="w-3 h-3" />
                                      )}
                                      {alignment === 'center' && (
                                        <AlignCenter className="w-3 h-3" />
                                      )}
                                      {alignment === 'right' && (
                                        <AlignRight className="w-3 h-3" />
                                      )}
                                    </button>
                                  </div>
                                </th>
                              )
                            }
                          )}
                        </tr>
                      </thead>

                      {/* Table Body (renders displayedRows for active page with global row indices) */}
                      <tbody className="divide-y divide-hairline bg-surface">
                        {displayedRows.map((row, index) => {
                          const rowIndex = startRowIndex + index
                          const isHeaderRow =
                            editor.options.header && rowIndex === 0

                          return (
                            <tr
                              key={rowIndex}
                              className={`transition-colors ${
                                isHeaderRow
                                  ? 'bg-subtle/60 font-semibold'
                                  : 'even:bg-surface odd:bg-subtle/25 hover:bg-subtle/50'
                              }`}
                            >
                              {/* Row Number Cell */}
                              <td
                                className={`w-12 px-2 py-2 text-center text-[11px] border-r border-hairline select-none font-mono-code ${
                                  isHeaderRow
                                    ? 'bg-subtle/80 text-sage font-bold'
                                    : 'bg-subtle/30 text-text-subtle'
                                }`}
                              >
                                {isHeaderRow ? (
                                  <span className="inline-flex items-center justify-center px-1 py-0.5 rounded bg-sage text-on-sage text-[10px] font-bold">
                                    제목
                                  </span>
                                ) : (
                                  rowIndex + 1
                                )}
                              </td>

                              {/* Data Cells with roving tabIndex and focus-visible ring */}
                              {row.map((cellValue, colIndex) => {
                                const isSelected =
                                  editor.selectedCell?.row === rowIndex &&
                                  editor.selectedCell?.col === colIndex
                                const isDefaultFocus =
                                  !editor.selectedCell && rowIndex === 0 && colIndex === 0
                                const isEditing =
                                  editingCell?.row === rowIndex &&
                                  editingCell?.col === colIndex
                                const alignment =
                                  editor.alignments[colIndex] ?? 'left'

                                const alignClass =
                                  alignment === 'center'
                                    ? 'text-center'
                                    : alignment === 'right'
                                      ? 'text-right'
                                      : 'text-left'

                                return (
                                  <td
                                    key={colIndex}
                                    data-cell-row={rowIndex}
                                    data-cell-col={colIndex}
                                    tabIndex={isSelected || isDefaultFocus ? 0 : -1}
                                    onClick={(e) => {
                                      editor.onSelectCell(rowIndex, colIndex)
                                      ;(e.currentTarget as HTMLElement).focus()
                                    }}
                                    onDoubleClick={() =>
                                      startCellEdit(rowIndex, colIndex)
                                    }
                                    onKeyDown={(e) =>
                                      handleCellKeyDown(e, rowIndex, colIndex)
                                    }
                                    className={`relative px-3.5 py-2.5 border-r border-hairline min-w-[110px] max-w-[280px] break-words cursor-cell transition-all focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-inset focus:outline-none ${alignClass} ${
                                      isSelected
                                        ? 'table-cell-selected'
                                        : isHeaderRow
                                          ? 'font-bold text-main'
                                          : 'hover:bg-subtle/60'
                                    }`}
                                  >
                                    {isEditing ? (
                                      <input
                                        ref={editInputRef}
                                        type="text"
                                        value={editValue}
                                        onChange={(e) =>
                                          setEditValue(e.target.value)
                                        }
                                        onBlur={() => commitCellEdit(false)}
                                        className="w-full px-2 py-1 bg-surface border-2 border-sage rounded-md outline-none text-xs sm:text-sm font-mono-code text-main shadow-xs ring-2 ring-sage/20"
                                        aria-label={`${rowIndex + 1}행 ${colIndex + 1}열 셀 편집`}
                                      />
                                    ) : (
                                      <span className="block whitespace-pre-wrap">
                                        {cellValue || (
                                          <span className="text-text-subtle select-none">
                                            ·
                                          </span>
                                        )}
                                      </span>
                                    )}
                                  </td>
                                )
                              })}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}

                  {/* Lightweight pagination bar when total rows exceed PAGE_SIZE */}
                  {editor.rows.length > PAGE_SIZE && (
                    <div className="px-4 py-2 bg-subtle/80 border-t border-hairline text-xs text-text-muted flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => moveCellFocus(Math.max(0, currentGridPage - 1) * PAGE_SIZE, selectedCol ?? 0)}
                          disabled={currentGridPage === 0}
                          className="px-2.5 py-1 rounded border border-hairline bg-surface hover:bg-subtle text-text-main disabled:opacity-40 disabled:pointer-events-none transition-colors"
                        >
                          이전
                        </button>
                        <span className="font-mono-code font-medium text-main">
                          {currentGridPage + 1} / {totalGridPages} 페이지
                        </span>
                        <button
                          type="button"
                          onClick={() => moveCellFocus(Math.min(totalGridPages - 1, currentGridPage + 1) * PAGE_SIZE, selectedCol ?? 0)}
                          disabled={currentGridPage >= totalGridPages - 1}
                          className="px-2.5 py-1 rounded border border-hairline bg-surface hover:bg-subtle text-text-main disabled:opacity-40 disabled:pointer-events-none transition-colors"
                        >
                          다음
                        </button>
                      </div>
                      <span className="text-[11px] text-text-subtle">
                        {startRowIndex + 1} - {endRowIndex}행 표시 (전체 {editor.rows.length}행) · 내보내기는 전체 행 포함
                      </span>
                    </div>
                  )}
                </div>

                {/* Sub Code Preview Accordion in Split View */}
                <div className="workspace-output-code bg-code border-t border-hairline/80 flex flex-col overflow-hidden">
                  <div className="px-3.5 py-2 bg-subtle/60 border-b border-hairline/80 flex items-center justify-between text-xs text-text-muted">
                    <div className="flex items-center gap-2">
                      <CodeIcon className="w-3.5 h-3.5 text-sage" />
                      <span className="font-bold tracking-tight text-main text-[11px]">
                        실시간 변환 결과 ({editor.outputFormat === 'tsv' ? '엑셀' : editor.outputFormat === 'markdown' ? '마크다운' : editor.outputFormat.toUpperCase()})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(editor.outputFormat)}
                      className="px-2.5 py-0.5 rounded-md bg-surface border border-hairline/80 hover:bg-subtle text-sage hover:text-sage-hover text-[11px] font-semibold flex items-center gap-1 shadow-2xs transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedFormat === editor.outputFormat ? '복사됨!' : '코드 복사'}</span>
                    </button>
                  </div>
                  <div className="flex-1 overflow-auto p-3.5 custom-scrollbar">
                    <pre className="font-mono-code text-xs sm:text-sm leading-6 text-main whitespace-pre">
                      {editor.output || '// 변환 결과 코드가 여기에 표시됩니다'}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {/* Output Footer Stats & Editing Hint */}
            <div className="px-4 py-2.5 border-t border-hairline/80 bg-subtle/30 text-[11px] text-text-muted flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded bg-surface border border-hairline font-mono-code font-semibold">
                  {editor.rows.length}행 × {editor.columns}열
                </span>
                <span className="px-1.5 py-0.5 rounded bg-surface border border-hairline font-mono-code font-semibold">
                  {editor.output.length.toLocaleString()}자
                </span>
                <span className="px-1.5 py-0.5 rounded bg-sage-subtle border border-sage-border text-sage font-mono-code font-semibold">
                  {editor.outputFormat === 'tsv' ? '엑셀' : editor.outputFormat === 'markdown' ? '마크다운' : editor.outputFormat.toUpperCase()} 출력
                </span>
              </div>
              <span className="text-text-subtle font-medium flex items-center gap-1">
                <span>💡</span>
                <span>셀을 더블클릭하거나 선택 후 <kbd>Enter</kbd>로 직접 편집</span>
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* 4. HIGH QUALITY READABLE KOREAN SEO GUIDE SECTION */}
      <section
        id="guide"
        className="w-full border-t border-hairline bg-surface/60 py-20 scroll-mt-14"
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          {/* Guide Header */}
          <div className="guide-intro mb-14">
            <figure className="guide-figure">
              <img
                src="/images/tableflow-syntax-notes-960.jpg"
                srcSet="/images/tableflow-syntax-notes-480.jpg 480w, /images/tableflow-syntax-notes-960.jpg 960w"
                sizes="(max-width: 639px) calc(100vw - 32px), 340px"
                width="1536"
                height="1024"
                alt="모눈 노트와 연필 옆에 놓인 파이프, 콜론, 하이픈 기호 카드"
                loading="lazy"
                decoding="async"
                className="rounded-xl border border-hairline shadow-xs"
              />
            </figure>
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sage-subtle border border-sage-border text-xs font-bold text-sage tracking-wider uppercase mb-3">
                사용 가이드 & 문법 요약
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-main leading-[1.3]">
                좋은 표는 세 가지 기호에서 시작합니다.
              </h2>
              <p className="text-sm sm:text-base text-text-muted mt-4 leading-[1.85] max-w-xl">
                파이프(<code className="font-mono-code font-bold text-main px-1.5 py-0.5 rounded bg-subtle border border-hairline">|</code>), 
                하이픈(<code className="font-mono-code font-bold text-main px-1.5 py-0.5 rounded bg-subtle border border-hairline">-</code>), 
                콜론(<code className="font-mono-code font-bold text-main px-1.5 py-0.5 rounded bg-subtle border border-hairline">:</code>)만 
                이해하면 누구나 마크다운 표를 자유자재로 다룰 수 있습니다.
              </p>
            </div>
          </div>

          {/* Guide Grid Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-7 mb-16">
            {/* Card 1: Markdown Table Grammar */}
            <div className="p-7 sm:p-8 rounded-2xl border border-hairline bg-surface shadow-xs flex flex-col justify-between hover:border-strong transition-colors">
              <div>
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-sage-subtle text-sage border border-sage-border">
                      <TableIcon className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-main tracking-tight">
                      1. 마크다운 표 기본 구조
                    </h3>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-subtle text-text-subtle border border-hairline">
                    GFM 문법
                  </span>
                </div>
                <p className="text-sm sm:text-base text-text-muted leading-[1.85] mb-5">
                  마크다운 표는 파이프(<code className="font-mono-code font-bold text-main">|</code>)로 칸을 구분하고, 
                  두 번째 행에 하이픈 구분선(<code className="font-mono-code font-bold text-sage">---</code>)을 
                  넣어 헤더와 데이터를 명확히 분리합니다.
                </p>
              </div>

              <div className="rounded-xl bg-code p-4 sm:p-5 border border-hairline font-mono-code text-xs sm:text-sm leading-[1.9] shadow-2xs">
                <div className="text-text-subtle text-[11px] mb-1.5">// 기본 마크다운 표 예시</div>
                <div className="text-main font-semibold"><span className="text-sage">|</span> 프로젝트 <span className="text-sage">|</span> 담당자 <span className="text-sage">|</span> 상태 <span className="text-sage">|</span></div>
                <div className="text-sage font-bold"><span className="text-sage">|</span> :--- <span className="text-sage">|</span> :---: <span className="text-sage">|</span> ---: <span className="text-sage">|</span></div>
                <div className="text-text-muted"><span>|</span> 웹사이트 <span>|</span> 김민지 <span>|</span> 진행중 <span>|</span></div>
                <div className="text-text-muted"><span>|</span> 디자인 <span>|</span> 이서준 <span>|</span> 완료 <span>|</span></div>
              </div>
            </div>

            {/* Card 2: Column Alignments */}
            <div className="p-7 sm:p-8 rounded-2xl border border-hairline bg-surface shadow-xs flex flex-col justify-between hover:border-strong transition-colors">
              <div>
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-sage-subtle text-sage border border-sage-border">
                      <AlignLeft className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-main tracking-tight">
                      2. 열 정렬 (Alignments) 문법
                    </h3>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-subtle text-text-subtle border border-hairline">
                    콜론 위치
                  </span>
                </div>
                <p className="text-sm sm:text-base text-text-muted leading-[1.85] mb-5">
                  구분선에 콜론(<code className="font-mono-code font-bold text-main">:</code>)을 어디에 배치하느냐에 따라 
                  열의 텍스트가 좌측, 중앙, 또는 우측으로 정렬됩니다.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-subtle/50 border border-hairline">
                  <div>
                    <span className="text-sm sm:text-base font-semibold text-main block">좌측 정렬</span>
                    <span className="text-xs text-text-subtle">일반 텍스트, 설명, 제목 (기본값)</span>
                  </div>
                  <code className="font-mono-code text-sm sm:text-base text-sage font-bold bg-surface border border-sage-border px-3 py-1.5 rounded-lg shadow-2xs">
                    :---
                  </code>
                </div>
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-subtle/50 border border-hairline">
                  <div>
                    <span className="text-sm sm:text-base font-semibold text-main block">가운데 정렬</span>
                    <span className="text-xs text-text-subtle">날짜, 상태, 뱃지, 태그</span>
                  </div>
                  <code className="font-mono-code text-sm sm:text-base text-sage font-bold bg-surface border border-sage-border px-3 py-1.5 rounded-lg shadow-2xs">
                    :---:
                  </code>
                </div>
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-subtle/50 border border-hairline">
                  <div>
                    <span className="text-sm sm:text-base font-semibold text-main block">우측 정렬</span>
                    <span className="text-xs text-text-subtle">금액, 숫자, 백분율, 수량</span>
                  </div>
                  <code className="font-mono-code text-sm sm:text-base text-sage font-bold bg-surface border border-sage-border px-3 py-1.5 rounded-lg shadow-2xs">
                    ---:
                  </code>
                </div>
              </div>
            </div>

            {/* Card 3: Platform Integrations */}
            <div className="p-7 sm:p-8 rounded-2xl border border-hairline bg-surface shadow-xs flex flex-col justify-between hover:border-strong transition-colors">
              <div>
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-sage-subtle text-sage border border-sage-border">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-main tracking-tight">
                      3. 플랫폼별 연동 팁
                    </h3>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-subtle text-text-subtle border border-hairline">
                    실무 활용
                  </span>
                </div>
                <p className="text-sm sm:text-base text-text-muted leading-[1.85] mb-5">
                  주요 문서 및 개발 도구와의 상호 복사·붙여넣기 팁입니다.
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-subtle/40 border border-hairline">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                      Excel / Google 시트
                    </span>
                    <span className="text-xs font-semibold text-main">셀 범위 복사 붙여넣기</span>
                  </div>
                  <p className="text-xs sm:text-sm text-text-muted leading-[1.8]">
                    엑셀에서 셀을 복사(Ctrl+C)하여 붙여넣으면 즉시 표로 변환됩니다. 표를 다시 엑셀에 넣을 때는 <strong className="text-sage font-semibold">[Excel 복사]</strong> 버튼을 누르고 엑셀에 붙여넣으세요.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-subtle/40 border border-hairline">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                      GitHub PR / Issue
                    </span>
                    <span className="text-xs font-semibold text-main">GFM 파이프 이스케이프</span>
                  </div>
                  <p className="text-xs sm:text-sm text-text-muted leading-[1.8]">
                    셀 내부에 파이프(<code className="font-mono-code font-bold">\|</code>)나 줄바꿈(<code className="font-mono-code font-bold">&lt;br&gt;</code>)이 있어도 마크다운 표준에 맞춰 안전하게 보존됩니다.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-subtle/40 border border-hairline">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20">
                      Notion / Obsidian / Velog
                    </span>
                    <span className="text-xs font-semibold text-main">너비 정렬 (Pretty)</span>
                  </div>
                  <p className="text-xs sm:text-sm text-text-muted leading-[1.8]">
                    [너비 정렬]을 켜면 모노스페이스 에디터와 기술 블로그 소스 코드에서 세로 줄이 흐트러지지 않는 깔끔한 포맷을 얻을 수 있습니다.
                  </p>
                </div>
              </div>
            </div>

            {/* Card 4: Local Processing & Escaping Rules */}
            <div className="p-7 sm:p-8 rounded-2xl border border-hairline bg-surface shadow-xs flex flex-col justify-between hover:border-strong transition-colors">
              <div>
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-sage-subtle text-sage border border-sage-border">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-main tracking-tight">
                      4. 로컬 처리 및 데이터 특성
                    </h3>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sage-subtle text-sage border border-sage-border">
                    100% 로컬
                  </span>
                </div>
                <p className="text-sm sm:text-base text-text-muted leading-[1.85] mb-5">
                  보안 및 문자 폭 계산에 대한 핵심 기술 특성입니다.
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-subtle/40 border border-hairline">
                  <span className="text-xs font-semibold text-main block mb-1">
                    🔒 브라우저 메모리 전용 연산
                  </span>
                  <p className="text-xs sm:text-sm text-text-muted leading-[1.8]">
                    모든 변환 작업은 사용자의 브라우저 JavaScript 메모리에서만 이루어집니다. 외부 서버 전송이 전혀 없어 사내 대외비 문서도 안심하고 작업할 수 있습니다.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-subtle/40 border border-hairline">
                  <span className="text-xs font-semibold text-main block mb-1">
                    📐 한글 · CJK 전각 문자 폭 계산
                  </span>
                  <p className="text-xs sm:text-sm text-text-muted leading-[1.8]">
                    한글, 한자, 이모지가 영문 2칸 너비를 차지하는 특성을 세그멘터 알고리즘으로 계산하여 모노스페이스에서도 열 간격이 정교하게 일치합니다.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-subtle/40 border border-hairline">
                  <span className="text-xs font-semibold text-main block mb-1">
                    ⚡ 원자적 실행 취소 (Undo/Redo)
                  </span>
                  <p className="text-xs sm:text-sm text-text-muted leading-[1.8]">
                    셀 수정, 행·열 추가/삭제 및 정렬 변경 사항 모두 세밀한 되돌리기(Ctrl+Z)와 다시 실행을 지원합니다.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Frequently Asked Questions (FAQ) */}
          <div className="mt-14 border-t border-hairline pt-14">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="text-xs font-bold uppercase tracking-wider text-sage px-3 py-1 rounded-full bg-sage-subtle border border-sage-border inline-block mb-3">
                FAQ
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-main tracking-tight">
                자주 묻는 질문
              </h3>
              <p className="text-sm sm:text-base text-text-muted mt-2.5 leading-relaxed">
                데이터 처리 보안, 파일 호환성, 특수문자 규칙에 대한 안내입니다.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
              <div className="p-6 sm:p-7 rounded-2xl bg-surface border border-hairline shadow-xs hover:border-strong transition-colors flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-lg bg-sage-subtle border border-sage-border text-sage font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    Q
                  </span>
                  <h4 className="text-base sm:text-lg font-bold text-main leading-snug">
                    회사 업무용 데이터를 변환해도 안전한가요?
                  </h4>
                </div>
                <div className="pl-9">
                  <p className="text-sm sm:text-base text-text-muted leading-[1.85]">
                    네, 완전히 안전합니다. Tableflow는 모든 데이터 변환을 사용자의 브라우저 내부 메모리에서만 처리하며 외부 서버로 데이터를 전송하지 않습니다. 인터넷 연결 없이도 로컬에서 직접 표를 변환할 수 있습니다.
                  </p>
                </div>
              </div>

              <div className="p-6 sm:p-7 rounded-2xl bg-surface border border-hairline shadow-xs hover:border-strong transition-colors flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-lg bg-sage-subtle border border-sage-border text-sage font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    Q
                  </span>
                  <h4 className="text-base sm:text-lg font-bold text-main leading-snug">
                    엑셀 파일(.xlsx)을 직접 업로드할 수 있나요?
                  </h4>
                </div>
                <div className="pl-9">
                  <p className="text-sm sm:text-base text-text-muted leading-[1.85]">
                    바이너리 파일 대신, 엑셀에서 변환할 셀 범위를 복사(Ctrl+C)한 뒤 Tableflow에 붙여넣기(Ctrl+V)하시면 즉시 자동 인식됩니다. 또는 엑셀에서 [다른 이름으로 저장 - CSV]로 저장한 파일을 [파일 열기] 버튼으로 불러올 수 있습니다.
                  </p>
                </div>
              </div>

              <div className="p-6 sm:p-7 rounded-2xl bg-surface border border-hairline shadow-xs hover:border-strong transition-colors flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-lg bg-sage-subtle border border-sage-border text-sage font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    Q
                  </span>
                  <h4 className="text-base sm:text-lg font-bold text-main leading-snug">
                    셀 안에 줄바꿈이나 파이프(|) 기호가 있으면 어떻게 되나요?
                  </h4>
                </div>
                <div className="pl-9">
                  <p className="text-sm sm:text-base text-text-muted leading-[1.85]">
                    마크다운 규격에 맞게 파이프 기호는 자동으로 이스케이프(<code className="font-mono-code font-bold text-main">\|</code>) 처리되고, 셀 내부 줄바꿈은 <code className="font-mono-code font-bold text-main">&lt;br&gt;</code> 태그로 변환되어 표 레이아웃이 무너지지 않습니다.
                  </p>
                </div>
              </div>

              <div className="p-6 sm:p-7 rounded-2xl bg-surface border border-hairline shadow-xs hover:border-strong transition-colors flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-lg bg-sage-subtle border border-sage-border text-sage font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    Q
                  </span>
                  <h4 className="text-base sm:text-lg font-bold text-main leading-snug">
                    첫 행 헤더가 없는 데이터는 어떻게 마크다운으로 변환되나요?
                  </h4>
                </div>
                <div className="pl-9">
                  <p className="text-sm sm:text-base text-text-muted leading-[1.85]">
                    마크다운 표에는 필수적으로 헤더 구분선 행이 필요합니다. [첫 행 헤더] 옵션을 끄면 기존 데이터를 손실 없이 유지하면서 '열 1', '열 2' 등의 대체 헤더를 자동 생성하여 유효한 마크다운 표로 만들어 줍니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. FOOTER */}
      <footer className="w-full border-t border-hairline bg-surface py-6 text-xs text-text-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-main">Tableflow</span>
            <span>•</span>
            <span>브라우저 메모리 기반의 로컬 표 변환 및 편집 도구</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#guide" className="hover:text-main transition-colors">
              가이드
            </a>
            <button
              type="button"
              onClick={() => setIsShortcutsOpen(true)}
              className="hover:text-main transition-colors"
            >
              단축키
            </button>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault()
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className="hover:text-main transition-colors"
            >
              맨 위로
            </a>
          </div>
        </div>
      </footer>

      {/* 6. KEYBOARD SHORTCUTS MODAL DIALOG (Focus-trapped and accessible) */}
      {isShortcutsOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="shortcuts-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn"
          onClick={() => setIsShortcutsOpen(false)}
          onKeyDown={handleModalKeyDown}
        >
          <div
            ref={shortcutsDialogRef}
            className="w-full max-w-md rounded-xl bg-surface border border-hairline shadow-lg overflow-hidden animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-hairline flex items-center justify-between bg-subtle/50">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-sage" />
                <h3
                  id="shortcuts-dialog-title"
                  className="text-sm font-bold text-main"
                >
                  키보드 단축키 안내
                </h3>
              </div>
              <button
                ref={firstCloseBtnRef}
                type="button"
                onClick={() => setIsShortcutsOpen(false)}
                className="p-1 rounded text-text-muted hover:text-main hover:bg-subtle transition-colors"
                aria-label="닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <h4 className="font-semibold text-text-subtle mb-2 uppercase tracking-wider text-[11px]">
                  클립보드 및 내보내기
                </h4>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between py-1 border-b border-hairline/60">
                    <span className="text-main">현재 결과 클립보드 복사</span>
                    <div className="flex gap-1">
                      <kbd>Ctrl/Cmd</kbd>
                      <kbd>Shift</kbd>
                      <kbd>C</kbd>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-text-subtle mb-2 uppercase tracking-wider text-[11px]">
                  작업 내역 (입력창 외부)
                </h4>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between py-1 border-b border-hairline/60">
                    <span className="text-main">실행 취소 (Undo)</span>
                    <div className="flex gap-1">
                      <kbd>Ctrl/Cmd</kbd>
                      <kbd>Z</kbd>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-hairline/60">
                    <span className="text-main">다시 실행 (Redo)</span>
                    <div className="flex gap-1">
                      <kbd>Ctrl/Cmd</kbd>
                      <kbd>Shift</kbd>
                      <kbd>Z</kbd>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-text-subtle mb-2 uppercase tracking-wider text-[11px]">
                  실시간 표 편집
                </h4>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between py-1 border-b border-hairline/60">
                    <span className="text-main">셀 인라인 편집 시작</span>
                    <div className="flex gap-1">
                      <kbd>더블클릭</kbd>
                      <span>또는</span>
                      <kbd>Enter</kbd>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-hairline/60">
                    <span className="text-main">셀 편집 완료 및 반영</span>
                    <kbd>Enter</kbd>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-hairline/60">
                    <span className="text-main">다음 셀로 이동하며 편집</span>
                    <kbd>Tab</kbd>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-hairline/60">
                    <span className="text-main">편집 취소</span>
                    <kbd>Escape</kbd>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-hairline/60">
                    <span className="text-main">셀 선택 이동</span>
                    <div className="flex gap-1">
                      <kbd>방향키 ↑↓←→</kbd>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-text-subtle mb-2 uppercase tracking-wider text-[11px]">
                  일반
                </h4>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between py-1">
                    <span className="text-main">단축키 도움말 열기/닫기</span>
                    <kbd>?</kbd>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-hairline bg-subtle/30 text-right">
              <button
                type="button"
                onClick={() => setIsShortcutsOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold bg-sage text-on-sage rounded-md hover:bg-sage-hover transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. TOAST NOTIFICATION (Vercel Geist style) */}
      {editor.toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
        >
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-main text-page border border-hairline shadow-lg text-xs font-semibold animate-toast">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{editor.toast}</span>
          </div>
        </div>
      )}
    </div>
  )
}
