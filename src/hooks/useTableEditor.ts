import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { detectFormat, normalizeRows, parseTable, toDelimited, toJson, toMarkdown } from '../lib/table'
import type { Alignment } from '../lib/table'
import type { EditorController, EditorOptions, OutputFormat } from '../types'

const SAMPLE = '프로젝트\t담당자\t상태\t진행률\n웹사이트 리뉴얼\t김민지\t진행 중\t75%\n브랜드 가이드\t이서준\t검토 중\t90%\n콘텐츠 캘린더\t박지우\t완료\t100%\nAPI 문서 작성\t최유진\t진행 중\t45%\n사용자 인터뷰\t정하늘\t예정\t0%'
const MAX_INPUT = 2_000_000
type Snapshot = {
  source: string
  inputFormat: EditorController['inputFormat']
  options: EditorOptions
  alignments: Alignment[] | null
}
type History = { past: Snapshot[]; current: Snapshot; future: Snapshot[] }
const INITIAL: Snapshot = {
  source: SAMPLE,
  inputFormat: 'auto',
  options: { header: true, pretty: true, trim: true, removeEmpty: true },
  alignments: null,
}

function initialTheme(): 'light' | 'dark' {
  try {
    const preference = localStorage.getItem('tableflow-theme')
    if (preference === 'light' || preference === 'dark') return preference
  } catch { /* Storage can be disabled; the editor still works. */ }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

async function writeClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const previousFocus = document.activeElement as HTMLElement | null
    const input = document.createElement('textarea')
    input.value = text
    input.style.cssText = 'position:fixed;left:-9999px;top:0;'
    document.body.append(input)
    input.select()
    const copied = document.execCommand('copy')
    input.remove()
    previousFocus?.focus()
    if (!copied) throw new Error('클립보드 접근이 제한되었습니다. 결과 코드를 선택해 직접 복사해주세요.')
  }
}

export function useTableEditor(): EditorController {
  const [history, setHistory] = useState<History>({ past: [], current: INITIAL, future: [] })
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('markdown')
  const [mode, setMode] = useState<EditorController['mode']>('to-markdown')
  const [view, setView] = useState<EditorController['view']>('split')
  const [theme, setTheme] = useState(initialTheme)
  const [toast, setToast] = useState('')
  const [selectedCell, setSelectedCell] = useState<EditorController['selectedCell']>(null)
  const lastChange = useRef({ at: 0, kind: '' })
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const notify = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(message)
    toastTimer.current = setTimeout(() => setToast(''), 3500)
  }, [])

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current) }, [])
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#171a17' : '#faf9f6')
    try { localStorage.setItem('tableflow-theme', theme) } catch { /* Optional preference only. */ }
  }, [theme])

  const change = useCallback((update: (current: Snapshot) => Snapshot, kind = 'action') => {
    const now = Date.now()
    const merge = kind === 'typing' && lastChange.current.kind === 'typing' && now - lastChange.current.at < 650
    lastChange.current = { at: now, kind }
    setHistory((previous) => ({
      past: merge ? previous.past : [...previous.past, previous.current].slice(-60),
      current: update(previous.current),
      future: [],
    }))
  }, [])

  const { source, inputFormat, options } = history.current
  const parsed = useMemo(() => {
    try {
      if (source.length > MAX_INPUT) throw new Error('한 번에 2MB 이하의 표를 입력해주세요.')
      const data = parseTable(source, inputFormat === 'auto' ? undefined : inputFormat)
      return { ...data, error: '' }
    } catch (error) {
      return { rows: [], alignments: [], error: error instanceof Error ? error.message : '표를 읽을 수 없습니다.' }
    }
  }, [source, inputFormat])
  const rows = useMemo(() => normalizeRows(parsed.rows, options), [parsed.rows, options])
  const columns = rows[0]?.length ?? 0
  const alignments = Array.from({ length: columns }, (_, index) => history.current.alignments?.[index] ?? parsed.alignments[index] ?? 'left')

  const serialize = (format: OutputFormat) => {
    if (parsed.error || !rows.length) return ''
    switch (format) {
      case 'markdown': return toMarkdown(rows, alignments, options)
      case 'json': return toJson(rows, options.header)
      default: return toDelimited(rows, format === 'tsv' ? '\t' : ',')
    }
  }
  const output = serialize(outputFormat)
  const onSourceChange = (text: string) => {
    change((current) => ({ ...current, source: text, alignments: null }), 'typing')
    setSelectedCell(null)
  }
  const onUndo = useCallback(() => {
    lastChange.current = { at: 0, kind: '' }
    setHistory((previous) => previous.past.length ? {
      past: previous.past.slice(0, -1),
      current: previous.past[previous.past.length - 1],
      future: [previous.current, ...previous.future],
    } : previous)
    setSelectedCell(null)
  }, [])
  const onRedo = useCallback(() => {
    lastChange.current = { at: 0, kind: '' }
    setHistory((previous) => previous.future.length ? {
      past: [...previous.past, previous.current], current: previous.future[0], future: previous.future.slice(1),
    } : previous)
    setSelectedCell(null)
  }, [])

  const importText = useCallback((text: string, showFeedback = true) => {
    if (text.length > MAX_INPUT) { notify('한 번에 2MB 이하의 표를 입력해주세요.'); return }
    change((current) => ({ ...current, source: text, inputFormat: 'auto', alignments: null }))
    setSelectedCell(null)
    if (showFeedback) notify(`${detectFormat(text).toUpperCase()} 데이터를 불러왔습니다.`)
  }, [change, notify])

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const target = event.target
      if (target instanceof Element && target.closest('input, [contenteditable="true"], textarea:not([data-source-input])')) return
      const text = event.clipboardData?.getData('text/plain')
      if (!text || detectFormat(text) === 'text') return
      event.preventDefault()
      importText(text)
    }
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [importText])

  const onCopy = async (format: OutputFormat) => {
    const text = serialize(format)
    if (!text) { notify('먼저 변환할 표를 입력해주세요.'); return false }
    try {
      await writeClipboard(text)
      notify(`${format === 'tsv' ? '엑셀 붙여넣기용 데이터' : format.toUpperCase()} 복사됨!`)
      return true
    } catch (error) { notify(error instanceof Error ? error.message : '복사하지 못했습니다.'); return false }
  }
  const copyCurrentRef = useRef<() => Promise<unknown>>(async () => {})
  copyCurrentRef.current = () => onCopy(outputFormat)
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      const target = event.target
      const inInput = target instanceof Element && Boolean(target.closest('input, textarea, [contenteditable="true"]'))
      const modifier = event.ctrlKey || event.metaKey
      if (modifier && event.shiftKey && event.key.toLowerCase() === 'c') {
        event.preventDefault()
        void copyCurrentRef.current()
      } else if (modifier && !inInput && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) onRedo(); else onUndo()
      } else if (modifier && !inInput && event.key.toLowerCase() === 'y') {
        event.preventDefault(); onRedo()
      }
    }
    document.addEventListener('keydown', keyboard)
    return () => document.removeEventListener('keydown', keyboard)
  }, [onUndo, onRedo])

  const setGrid = (nextRows: string[][], nextAlignments = alignments, optionPatch: Partial<EditorOptions> = {}) => {
    // TSV retains multiline and literal pipe content and remains directly editable.
    change((current) => ({
      ...current, source: toDelimited(nextRows, '\t'), inputFormat: 'tsv', alignments: nextAlignments,
      options: { ...current.options, ...optionPatch },
    }))
  }

  return {
    source, rows, columns, alignments, options, detectedFormat: detectFormat(source), inputFormat,
    outputFormat, output, mode, view, theme, error: parsed.error, toast, selectedCell,
    canUndo: history.past.length > 0, canRedo: history.future.length > 0,
    onSourceChange,
    onInputFormatChange: (format) => change((current) => ({ ...current, inputFormat: format, alignments: null })),
    onOutputFormatChange: setOutputFormat,
    onModeChange: (nextMode) => {
      setMode(nextMode)
      setOutputFormat(nextMode === 'to-markdown' ? 'markdown' : 'tsv')
      if (nextMode === 'from-markdown' && rows.length && !parsed.error) {
        // Convert the current data into the Markdown input expected by this mode.
        change((current) => ({ ...current, source: toMarkdown(rows, alignments, options), inputFormat: 'markdown', alignments: null, options: { ...current.options, header: true } }))
      }
    },
    onViewChange: setView,
    onOptionsChange: (patch) => change((current) => ({ ...current, options: { ...current.options, ...patch } })),
    onThemeToggle: () => setTheme((current) => current === 'dark' ? 'light' : 'dark'),
    onSample: () => importText(SAMPLE),
    onClear: () => importText('', false),
    onCopy,
    onDownload: (format) => {
      const content = serialize(format)
      if (!content) { notify('먼저 변환할 표를 입력해주세요.'); return }
      const mime = { markdown: 'text/markdown', tsv: 'text/tab-separated-values', csv: 'text/csv', json: 'application/json' }
      const extension = format === 'markdown' ? 'md' : format
      const url = URL.createObjectURL(new Blob([format === 'csv' ? '\uFEFF' + content : content], { type: `${mime[format]};charset=utf-8` }))
      const link = document.createElement('a')
      link.href = url; link.download = `tableflow.${extension}`
      document.body.append(link); link.click(); link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      notify(`tableflow.${extension} 파일을 다운로드했습니다.`)
    },
    onImportFile: async (file) => {
      if (file.size > MAX_INPUT) { notify('2MB 이하의 텍스트 파일을 선택해주세요.'); return }
      if (!/\.(csv|tsv|md|txt|json)$/i.test(file.name)) {
        notify('CSV, TSV, MD, TXT, JSON 파일을 지원합니다. Excel에서는 셀을 복사해 붙여넣으세요.')
        return
      }
      try { importText(await file.text()) } catch { notify('파일을 읽지 못했습니다. 다시 시도해주세요.') }
    },
    onAddRow: () => {
      if (parsed.error) { notify('입력 오류를 먼저 수정해주세요.'); return }
      // Keep an intentionally added empty row visible; undo is one atomic action.
      setGrid([...rows, Array.from({ length: columns || 3 }, () => '')], alignments, { removeEmpty: false })
      setSelectedCell({ row: rows.length, col: 0 })
    },
    onDeleteRow: () => {
      if (!rows.length) return
      const index = selectedCell?.row ?? rows.length - 1
      setGrid(rows.filter((_, row) => row !== index)); setSelectedCell(null)
    },
    onAddColumn: () => {
      if (parsed.error) { notify('입력 오류를 먼저 수정해주세요.'); return }
      const data = rows.length ? rows.map((row, index) => [...row, index === 0 && options.header ? `열 ${columns + 1}` : '']) : [['열 1'], ['']]
      setGrid(data, [...alignments, 'left'])
    },
    onDeleteColumn: () => {
      if (!columns) return
      const index = selectedCell?.col ?? columns - 1
      setGrid(columns === 1 ? [] : rows.map((row) => row.filter((_, column) => column !== index)), alignments.filter((_, column) => column !== index))
      setSelectedCell(null)
    },
    onAlignColumn: (column, alignment) => change((current) => ({ ...current, alignments: alignments.map((existing, index) => index === column ? alignment : existing) })),
    onAlignAll: (alignment) => change((current) => ({ ...current, alignments: Array.from({ length: columns }, () => alignment) })),
    onCellChange: (row, column, value) => setGrid(rows.map((existing, index) => index === row ? existing.map((cell, cellIndex) => cellIndex === column ? value : cell) : existing)),
    onSelectCell: (row, col) => setSelectedCell({ row, col }),
    onUndo, onRedo,
  }
}
