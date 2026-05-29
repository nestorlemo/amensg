import assert from 'node:assert/strict'
import test from 'node:test'

import { canViewRouteForRole, isAdminRole } from '../lib/permissions'

test('ADMIN has admin role permissions', () => {
  assert.equal(isAdminRole('ADMIN'), true)
  assert.equal(canViewRouteForRole('ADMIN', '/auditoria'), true)
  assert.equal(canViewRouteForRole('ADMIN', '/parametros'), true)
})

test('OPERADOR cannot view admin-only routes', () => {
  assert.equal(isAdminRole('OPERADOR'), false)
  assert.equal(canViewRouteForRole('OPERADOR', '/auditoria'), false)
  assert.equal(canViewRouteForRole('OPERADOR', '/usuarios'), false)
  assert.equal(canViewRouteForRole('OPERADOR', '/reportes'), true)
})
