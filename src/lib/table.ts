export type Alignment = 'left' | 'center' | 'right'
export type TableData = { rows: string[][]; alignments: Alignment[] }
export type Format = 'markdown' | 'csv' | 'tsv' | 'json' | 'text'

function rectangular(rows: string[][]): string[][] {
  const width = rows.reduce((max, row) => Math.max(max, row.length), 0)
  return rows.map((row) => Array.from({ length: width }, (_, index) => row[index] ?? ''))
}

function markdownCells(line: string): string[] {
  const text = line.trim()
  const cells: string[] = []
  let cell = ''
  let endedWithPipe = false
  for (let index = 0; index < text.length; index++) {
    const char = text[index]
    if (char === '\\' && (text[index + 1] === '|' || text[index + 1] === '\\')) {
      cell += text[++index]
      endedWithPipe = false
    } else if (char === '|') {
      cells.push(cell.trim())
      cell = ''
      endedWithPipe = true
    } else {
      cell += char
      endedWithPipe = false
    }
  }
  cells.push(cell.trim())
  if (text.startsWith('|')) cells.shift()
  if (endedWithPipe) cells.pop()
  return cells.map((value) => value.replace(/<br\s*\/?\s*>/gi, '\n'))
}

function isDivider(cells: string[]): boolean {
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell))
}

export function detectFormat(text: string): Format {
  const raw = text.replace(/^\uFEFF/, '')
  const source = raw.trim()
  if (source.startsWith('[') || source.startsWith('{')) return 'json'
  const lines = source.split(/\r?\n/)
  if (lines.length > 1 && isDivider(markdownCells(lines[1]))) return 'markdown'
  // Delimiters inside CSV quotes are cell content, not format signals.
  let quoted = false
  let hasTab = false
  let hasComma = false
  for (let index = 0; index < raw.length; index++) {
    if (raw[index] === '"') {
      if (quoted && raw[index + 1] === '"') index++
      else quoted = !quoted
    } else if (!quoted) {
      if (raw[index] === '\t') hasTab = true
      if (raw[index] === ',') hasComma = true
    }
  }
  if (hasTab) return 'tsv'
  if (lines.some((line) => /^\s*\|.*\|\s*$/.test(line))) return 'markdown'
  if (hasComma || source.startsWith('"')) return 'csv'
  return 'text'
}

function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  let closedQuote = false
  for (let index = 0; index < text.length; index++) {
    const char = text[index]
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') { cell += '"'; index++ }
        else { quoted = false; closedQuote = true }
      } else cell += char
      continue
    }
    if (char === delimiter) {
      row.push(cell); cell = ''; closedQuote = false
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') index++
      row.push(cell); rows.push(row); row = []; cell = ''; closedQuote = false
    } else if (char === '"' && cell === '' && !closedQuote) {
      quoted = true
    } else if (closedQuote) {
      if (char !== ' ') throw new Error('닫는 따옴표 뒤에는 구분자나 줄바꿈이 필요합니다.')
    } else {
      cell += char
    }
  }
  if (quoted) throw new Error('따옴표가 닫히지 않았습니다. CSV/TSV의 큰따옴표를 확인해주세요.')
  if (row.length || cell !== '' || closedQuote || !/[\r\n]$/.test(text)) {
    row.push(cell); rows.push(row)
  }
  return rows
}

function jsonCell(value: unknown): string {
  if (value == null) return ''
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}

export function parseTable(text: string, format: Format = detectFormat(text)): TableData {
  const source = text.replace(/^\uFEFF/, '')
  if (source === '') return { rows: [], alignments: [] }
  let rows: string[][]
  let alignments: Alignment[] = []
  if (format === 'json') {
    let parsed: unknown
    try { parsed = JSON.parse(source) }
    catch { throw new Error('올바른 JSON이 아닙니다. 대괄호와 큰따옴표를 확인해주세요.') }
    if (!Array.isArray(parsed)) throw new Error('JSON은 객체 배열 또는 배열의 배열이어야 합니다.')
    if (parsed.length === 0) rows = []
    else if (parsed.every(Array.isArray)) rows = parsed.map((row) => row.map(jsonCell))
    else if (parsed.every((row) => row !== null && typeof row === 'object' && !Array.isArray(row))) {
      const keys = [...new Set(parsed.flatMap((row) => Object.keys(row)))]
      rows = [keys, ...parsed.map((row) => keys.map((key) => Object.hasOwn(row, key) ? jsonCell(row[key]) : ''))]
    } else throw new Error('JSON 배열에는 객체만 또는 배열만 넣어주세요.')
  } else if (format === 'markdown') {
    rows = source.trim().split(/\r?\n/).map(markdownCells)
    if (rows.length > 1 && isDivider(rows[1])) {
      alignments = rows[1].map((cell) => cell.startsWith(':') && cell.endsWith(':') ? 'center' : cell.endsWith(':') ? 'right' : 'left')
      rows.splice(1, 1)
    }
  } else if (format === 'text') {
    rows = source.split(/\r\n|\r|\n/).map((line) => [line])
    if (/[\r\n]$/.test(source)) rows.pop()
  } else rows = parseDelimited(source, format === 'tsv' ? '\t' : ',')
  rows = rectangular(rows)
  return { rows, alignments: Array.from({ length: rows[0]?.length ?? 0 }, (_, index) => alignments[index] ?? 'left') }
}

export function normalizeRows(rows: string[][], options: { trim: boolean; removeEmpty: boolean }): string[][] {
  const normalized = rows.map((row) => row.map((cell) => options.trim ? cell.trim() : cell))
  return rectangular(options.removeEmpty ? normalized.filter((row) => row.some((cell) => cell.trim() !== '')) : normalized)
}

function markdownEscape(cell: string): string {
  return cell.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\r\n|\r|\n/g, '<br>')
}

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

// Monospace convention: CJK and emoji occupy two columns; combining marks
// and joiners add no width. Count joined emoji as one grapheme, not code units.
function displayWidth(text: string): number {
  let width = 0
  for (const { segment } of graphemes.segment(text)) {
    const emoji = /\p{Emoji_Presentation}|\p{Regional_Indicator}|[0-9#*]\uFE0F?\u20E3/u.test(segment)
      || (/\p{Extended_Pictographic}/u.test(segment) && /[\uFE0F\u200D]/u.test(segment))
    if (emoji) {
      width += 2
      continue
    }
    let clusterWidth = 0
    for (const char of segment) {
      if (/[\p{Mark}\p{Default_Ignorable_Code_Point}\p{Control}]/u.test(char)) continue
      const point = char.codePointAt(0)!
      const wide = (point >= 0x1100 && point <= 0x115f) || point === 0x2329 || point === 0x232a
        || (point >= 0x2e80 && point <= 0xa4cf && point !== 0x303f)
        || (point >= 0xac00 && point <= 0xd7a3) || (point >= 0xf900 && point <= 0xfaff)
        || (point >= 0xfe10 && point <= 0xfe19) || (point >= 0xfe30 && point <= 0xfe6f)
        || (point >= 0xff00 && point <= 0xff60) || (point >= 0xffe0 && point <= 0xffe6)
        || (point >= 0x1b000 && point <= 0x1b2ff) || (point >= 0x20000 && point <= 0x3fffd)
      clusterWidth = Math.max(clusterWidth, wide ? 2 : 1)
    }
    width += clusterWidth
  }
  return width
}

export function toMarkdown(rows: string[][], alignments: Alignment[], options: { header: boolean; pretty: boolean }): string {
  if (!rows.length || !rows.some((row) => row.length)) return ''
  const data = rectangular(rows).map((row) => row.map(markdownEscape))
  const width = data[0].length
  if (!options.header) data.unshift(Array.from({ length: width }, (_, index) => `열 ${index + 1}`))
  const dividers = Array.from({ length: width }, (_, index) => alignments[index] === 'center' ? ':---:' : alignments[index] === 'right' ? '---:' : ':---')
  const widths = Array.from({ length: width }, (_, index) => data.reduce((max, row) => Math.max(max, displayWidth(row[index])), dividers[index].length))
  const render = (row: string[]) => options.pretty
    ? `| ${row.map((cell, index) => cell + ' '.repeat(widths[index] - displayWidth(cell))).join(' | ')} |`
    : `|${row.join('|')}|`
  const divider = dividers.map((cell, index) => options.pretty ? cell.replace('---', '-'.repeat(widths[index] - (cell.startsWith(':') ? 1 : 0) - (cell.endsWith(':') ? 1 : 0))) : cell)
  return [render(data[0]), render(divider), ...data.slice(1).map(render)].join('\n')
}

export function toDelimited(rows: string[][], delimiter: string): string {
  return rectangular(rows).map((row) => row.map((cell) => /["\r\n]/.test(cell) || cell.includes(delimiter) || (row.length === 1 && cell === '')
    ? `"${cell.replace(/"/g, '""')}"` : cell).join(delimiter)).join('\r\n')
}

export function toJson(rows: string[][], header: boolean): string {
  if (!rows.length || !rows.some((row) => row.length)) return '[]'
  const data = rectangular(rows)
  const baseKeys = header ? data[0].map((cell, index) => cell || `열 ${index + 1}`) : data[0].map((_, index) => `열 ${index + 1}`)
  const reserved = new Set(baseKeys)
  const used = new Set<string>()
  const keys = baseKeys.map((key) => {
    let unique = key
    let suffix = 2
    if (used.has(unique)) {
      do { unique = `${key}_${suffix++}` } while (used.has(unique) || reserved.has(unique))
    }
    used.add(unique)
    return unique
  })
  return JSON.stringify((header ? data.slice(1) : data).map((row) => Object.fromEntries(keys.map((key, index) => [key, row[index]]))), null, 2)
}
