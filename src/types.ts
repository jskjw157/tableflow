import type { Alignment, Format } from './lib/table'

export type OutputFormat = 'markdown' | 'tsv' | 'csv' | 'json'
export type EditorOptions = { header: boolean; pretty: boolean; trim: boolean; removeEmpty: boolean }
export type EditorController = {
  source: string
  rows: string[][]
  columns: number
  alignments: Alignment[]
  options: EditorOptions
  detectedFormat: Format
  inputFormat: 'auto' | Format
  outputFormat: OutputFormat
  output: string
  mode: 'to-markdown' | 'from-markdown'
  view: 'split' | 'code'
  theme: 'light' | 'dark'
  error: string
  toast: string
  selectedCell: { row: number; col: number } | null
  canUndo: boolean
  canRedo: boolean
  onSourceChange: (text: string) => void
  onInputFormatChange: (format: 'auto' | Format) => void
  onOutputFormatChange: (format: OutputFormat) => void
  onModeChange: (mode: 'to-markdown' | 'from-markdown') => void
  onViewChange: (view: 'split' | 'code') => void
  onOptionsChange: (options: Partial<EditorOptions>) => void
  onThemeToggle: () => void
  onSample: () => void
  onClear: () => void
  onCopy: (format: OutputFormat) => Promise<boolean>
  onDownload: (format: OutputFormat) => void
  onImportFile: (file: File) => Promise<void>
  onAddRow: () => void
  onDeleteRow: () => void
  onAddColumn: () => void
  onDeleteColumn: () => void
  onAlignColumn: (column: number, alignment: Alignment) => void
  onAlignAll: (alignment: Alignment) => void
  onCellChange: (row: number, column: number, value: string) => void
  onSelectCell: (row: number, column: number) => void
  onUndo: () => void
  onRedo: () => void
}
