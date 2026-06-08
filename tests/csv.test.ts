import assert from 'node:assert/strict'
import test from 'node:test'

import { parseSemicolonCsv, serializeSemicolonCsv } from '../lib/import-preview/csv'

test('campo simple', () => {
  const { headers, rows } = parseSemicolonCsv('nombre;valor\nfoo;bar')
  assert.deepEqual(headers, ['nombre', 'valor'])
  assert.deepEqual(rows, [{ nombre: 'foo', valor: 'bar' }])
})

test('campo con punto y coma dentro de comillas', () => {
  const { rows } = parseSemicolonCsv('a;b\n"x;y";z')
  assert.equal(rows[0].a, 'x;y')
  assert.equal(rows[0].b, 'z')
})

test('campo con comillas escapadas', () => {
  const { rows } = parseSemicolonCsv('col\n"say ""hello"""')
  assert.equal(rows[0].col, 'say "hello"')
})

test('campo con salto de línea dentro de comillas', () => {
  const { rows } = parseSemicolonCsv('desc\n"line1\nline2"')
  assert.equal(rows[0].desc, 'line1\nline2')
})

test('campo vacío', () => {
  const { rows } = parseSemicolonCsv('a;b;c\n1;;3')
  assert.equal(rows[0].a, '1')
  assert.equal(rows[0].b, '')
  assert.equal(rows[0].c, '3')
})

test('roundtrip parse → serialize → parse', () => {
  const original = 'nombre;nota;descripcion\nfoo;"tiene;punto";normal\nbar;say ""hi"";con\nnewline'
  const { headers, rows } = parseSemicolonCsv(original)
  const serialized = serializeSemicolonCsv(headers, rows)
  const { headers: h2, rows: r2 } = parseSemicolonCsv(serialized)
  assert.deepEqual(h2, headers)
  assert.deepEqual(r2, rows)
})

test('serializer: envuelve en comillas si contiene punto y coma', () => {
  const out = serializeSemicolonCsv(['a'], [{ a: 'x;y' }])
  assert.equal(out, 'a\n"x;y"')
})

test('serializer: escapa comillas duplicándolas', () => {
  const out = serializeSemicolonCsv(['a'], [{ a: 'say "hi"' }])
  assert.equal(out, 'a\n"say ""hi"""')
})

test('serializer: preserva campo vacío', () => {
  const out = serializeSemicolonCsv(['a', 'b'], [{ a: 'foo', b: '' }])
  assert.equal(out, 'a;b\nfoo;')
})
