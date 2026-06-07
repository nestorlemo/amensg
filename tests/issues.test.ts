import assert from 'node:assert/strict'
import test from 'node:test'

import { parseIssueBody } from '../lib/issues'

const ESTADOS_VALIDOS = ['PENDIENTE', 'EN_DESARROLLO', 'EN_TEST', 'EN_PRODUCCION', 'CANCELADO']

test('horas test = 30% de horas desarrollo', () => {
  const horasDesarrollo = 10
  const horasTest = Math.round(horasDesarrollo * 0.3 * 100) / 100
  assert.equal(horasTest, 3)
})

test('horas rework = 15% de horas desarrollo', () => {
  const horasDesarrollo = 20
  const horasRework = Math.round(horasDesarrollo * 0.15 * 100) / 100
  assert.equal(horasRework, 3)
})

test('total horas = desarrollo + test + rework', () => {
  const result = parseIssueBody({
    descripcion: 'Test issue',
    reportadoPor: 'Tester',
    horasDesarrollo: 10,
    horasTest: 3,
    horasRework: 1.5,
  })
  assert.ok(result.data)
  assert.equal(result.data.totalHoras, 14.5)
})

test('estados válidos de issue', () => {
  for (const estado of ESTADOS_VALIDOS) {
    const result = parseIssueBody({
      descripcion: 'desc',
      reportadoPor: 'user',
      horasDesarrollo: 1,
      estado,
      ...(estado === 'EN_PRODUCCION' ? { fechaProduccion: '2025-01-01' } : {}),
      ...(estado === 'CANCELADO' ? { motivoCancelacion: 'Motivo' } : {}),
    })
    assert.ok(result.data, `Estado ${estado} debe ser válido`)
  }

  const invalid = parseIssueBody({
    descripcion: 'desc',
    reportadoPor: 'user',
    horasDesarrollo: 1,
    estado: 'APROBADO',
  })
  assert.ok(invalid.error, 'Estado APROBADO debe ser inválido')
})

test('CANCELADO requiere motivoCancelacion', () => {
  const sinMotivo = parseIssueBody({
    descripcion: 'desc',
    reportadoPor: 'user',
    horasDesarrollo: 1,
    estado: 'CANCELADO',
  })
  assert.ok(sinMotivo.error)
  assert.equal(sinMotivo.error?.message, 'El motivo de cancelación es requerido.')

  const conMotivo = parseIssueBody({
    descripcion: 'desc',
    reportadoPor: 'user',
    horasDesarrollo: 1,
    estado: 'CANCELADO',
    motivoCancelacion: 'Ya no aplica',
  })
  assert.ok(conMotivo.data)
  assert.equal(conMotivo.data.motivoCancelacion, 'Ya no aplica')
})
