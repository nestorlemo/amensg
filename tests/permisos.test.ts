import assert from 'node:assert/strict'
import test from 'node:test'

import { canViewRouteForRole } from '../lib/permissions'

// ISSUES
test('ISSUES no accede a /issues/facturar', () => {
  assert.equal(canViewRouteForRole('ISSUES', '/issues/facturar'), false)
})

test('ISSUES no accede a /issues/valor-hora', () => {
  assert.equal(canViewRouteForRole('ISSUES', '/issues/valor-hora'), false)
})

test('ISSUES no accede a /cobros', () => {
  assert.equal(canViewRouteForRole('ISSUES', '/cobros'), false)
})

test('ISSUES no accede a /liquidaciones', () => {
  assert.equal(canViewRouteForRole('ISSUES', '/liquidaciones'), false)
})

// OPERADOR
test('OPERADOR no accede a /usuarios', () => {
  assert.equal(canViewRouteForRole('OPERADOR', '/usuarios'), false)
})

test('OPERADOR no accede a /socios', () => {
  assert.equal(canViewRouteForRole('OPERADOR', '/socios'), false)
})

// ADMIN
test('ADMIN accede a /issues/facturar', () => {
  assert.equal(canViewRouteForRole('ADMIN', '/issues/facturar'), true)
})

test('ADMIN accede a /cobros', () => {
  assert.equal(canViewRouteForRole('ADMIN', '/cobros'), true)
})

test('ADMIN accede a /liquidaciones', () => {
  assert.equal(canViewRouteForRole('ADMIN', '/liquidaciones'), true)
})

test('ADMIN accede a /usuarios', () => {
  assert.equal(canViewRouteForRole('ADMIN', '/usuarios'), true)
})

test('ADMIN accede a /socios', () => {
  assert.equal(canViewRouteForRole('ADMIN', '/socios'), true)
})
