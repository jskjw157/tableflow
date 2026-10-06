import assert from 'node:assert/strict'
import test from 'node:test'
import { detectFormat, normalizeRows, parseTable, toDelimited, toJson, toMarkdown } from './table.ts'

test('detects supported formats, preferring markdown divider over cell punctuation', () => {
  assert.equal(detectFormat('name\tcount\nA\t1'), 'tsv')
  assert.equal(detectFormat('name,count\nA,1'), 'csv')
  assert.equal(detectFormat('| a,b | c |\n| --- | :---: |'), 'markdown')
  assert.equal(detectFormat('[{"name":"A"}]'), 'json')
  assert.equal(detectFormat('plain\ntext'), 'text')
  assert.equal(detectFormat('\uFEFFa,b'), 'csv')
  assert.equal(detectFormat('a,"b\tc"'), 'csv')
  assert.equal(detectFormat('"a,b"'), 'csv')
  assert.equal(detectFormat('\ta\t'), 'tsv')
  assert.deepEqual(parseTable('\ta\t').rows, [['', 'a', '']])
})

test('CSV and TSV roundtrip quotes, embedded linebreaks, delimiters and empty edge cells', () => {
  const rows = [['', 'a,b', 'a\tb', ''], ['line\nnext', 'say "hello"', '한글', ''], ['', '\r\n', '', 'end']]
  for (const delimiter of [',', '\t']) {
    assert.deepEqual(parseTable(toDelimited(rows, delimiter), delimiter === ',' ? 'csv' : 'tsv').rows, rows)
  }
  assert.deepEqual(parseTable(',a,\r\n,b,\r\n', 'csv').rows, [['', 'a', ''], ['', 'b', '']])
  assert.deepEqual(parseTable('a,b\n\nc,d', 'csv').rows, [['a', 'b'], ['', ''], ['c', 'd']])
  assert.deepEqual(parseTable(toDelimited([['a'], ['']], ','), 'csv').rows, [['a'], ['']])
})

test('smart paste detects single-row TSV whose only delimiter borders an empty cell', () => {
  const examples: [string, string[][]][] = [
    ['\ta', [['', 'a']]],
    ['a\t', [['a', '']]],
    ['\t', [['', '']]],
    ['\uFEFF\ta', [['', 'a']]],
  ]
  for (const [source, rows] of examples) {
    assert.equal(detectFormat(source), 'tsv')
    assert.deepEqual(parseTable(source).rows, rows)
  }
})

test('reports malformed quoted CSV and malformed JSON with actionable Korean errors', () => {
  assert.throws(() => parseTable('a,"b', 'csv'), /따옴표가 닫히지/)
  assert.throws(() => parseTable('"a"oops,b', 'csv'), /구분자나 줄바꿈/)
  assert.throws(() => parseTable('[oops'), /올바른 JSON/)
  assert.throws(() => parseTable('{}'), /객체 배열/)
  assert.throws(() => parseTable('[1,2]'), /객체만 또는 배열만/)
  assert.throws(() => parseTable('[{},[]]'), /객체만 또는 배열만/)
})

test('markdown retains escaped pipes, backslashes, empty edge columns and alignment', () => {
  const rows = [['left', 'center', 'right', ''], ['a|b', 'C:\\files\\x', 'line\nnext', ''], ['', '\\|', '**text**', 'end']]
  const alignments = ['left', 'center', 'right', 'left'] as const
  for (const pretty of [true, false]) {
    const markdown = toMarkdown(rows, [...alignments], { header: true, pretty })
    assert.deepEqual(parseTable(markdown, 'markdown'), { rows, alignments: [...alignments] })
    assert.match(markdown, /:---/)
  }
  assert.deepEqual(parseTable('A | B\n--- | ---:\nx | y').alignments, ['left', 'right'])
})

test('synthetic markdown headers retain all input rows and ragged rows are padded', () => {
  const markdown = toMarkdown([['a'], ['b', 'c']], [], { header: false, pretty: false })
  assert.deepEqual(parseTable(markdown).rows, [['열 1', '열 2'], ['a', ''], ['b', 'c']])
  assert.equal(toMarkdown([], [], { header: true, pretty: true }), '')
  assert.equal(toMarkdown([[]], [], { header: true, pretty: true }), '')
})

test('pretty markdown aligns Korean, CJK, ASCII, combining marks and emoji by display columns', () => {
  const rows = [['이름', '값'], ['한글표', 'ASCII'], ['A', '東京'], ['e\u0301', '👩🏽‍💻'], ['🇰🇷', '♥️'], ['1️⃣', '끝']]
  const markdown = toMarkdown(rows, ['left', 'center'], { header: true, pretty: true })
  assert.equal(markdown, [
    '| 이름   | 값    |',
    '| :----- | :---: |',
    '| 한글표 | ASCII |',
    '| A      | 東京  |',
    '| e\u0301      | 👩🏽‍💻    |',
    '| 🇰🇷     | ♥️    |',
    '| 1️⃣     | 끝    |',
  ].join('\n'))
  assert.deepEqual(parseTable(markdown).rows, rows)
  assert.deepEqual(parseTable(toMarkdown(rows, [], { header: true, pretty: false })).rows, rows)
})

test('JSON object input unions keys, preserves dangerous keys and serializes nested values', () => {
  const result = parseTable('[{"name":"A","__proto__":"safe"},{"extra":true,"nested":{"n":1},"name":null}]')
  assert.deepEqual(result.rows, [
    ['name', '__proto__', 'extra', 'nested'],
    ['A', 'safe', '', ''],
    ['', '', 'true', '{"n":1}'],
  ])
  assert.deepEqual(JSON.parse(toJson(result.rows, true))[0], { name: 'A', ['__proto__']: 'safe', extra: '', nested: '' })
  assert.deepEqual(parseTable('[[1,null],[true]]').rows, [['1', ''], ['true', '']])
})

test('JSON duplicate headers remain unique even when suffixes already exist', () => {
  const result = JSON.parse(toJson([['a', 'a', 'a_2', 'a', '', '열 5', '__proto__', 'constructor'], ['1', '2', '3', '4', '5', '6', 'safe', 'value']], true))
  assert.deepEqual(Object.keys(result[0]), ['a', 'a_3', 'a_2', 'a_4', '열 5', '열 5_2', '__proto__', 'constructor'])
  assert.deepEqual(Object.values(result[0]), ['1', '2', '3', '4', '5', '6', 'safe', 'value'])
  assert.deepEqual(JSON.parse(toJson([['a', 'b'], ['c']], false)), [{ '열 1': 'a', '열 2': 'b' }, { '열 1': 'c', '열 2': '' }])
  assert.equal(toJson([], true), '[]')
})

test('normalization is nonmutating and applies trim and empty row options independently', () => {
  const rows = [[' A ', ' B '], [' ', ''], [' C ']]
  assert.deepEqual(normalizeRows(rows, { trim: true, removeEmpty: true }), [['A', 'B'], ['C', '']])
  assert.deepEqual(normalizeRows(rows, { trim: false, removeEmpty: true }), [[' A ', ' B '], [' C ', '']])
  assert.equal(normalizeRows(rows, { trim: true, removeEmpty: false }).length, 3)
  assert.equal(rows[0][0], ' A ')
})

test('empty inputs and terminal linebreaks do not invent extra rows', () => {
  assert.deepEqual(parseTable(''), { rows: [], alignments: [] })
  assert.deepEqual(parseTable('[]'), { rows: [], alignments: [] })
  assert.deepEqual(parseTable('a\nb\n', 'text').rows, [['a'], ['b']])
  assert.deepEqual(parseTable('""', 'csv').rows, [['']])
})
