import assert from 'node:assert/strict'
import test from 'node:test'

import { Prisma } from '@prisma/client'

const ESTADOS_COBRO = new Set(['FACTURADO', 'COBRADO'])

function money(value: Prisma.Decimal.Value) {
  return new Prisma.Decimal(value)
}

function distribuirMonto(monto: Prisma.Decimal.Value, porcentajes: Prisma.Decimal.Value[]) {
  const base = money(monto)
  return porcentajes.map((p) => base.mul(p).toDecimalPlaces(2))
}

function validarCobroEstado(estado: string, fechaCobro: string | null) {
  if (!ESTADOS_COBRO.has(estado)) return { error: 'Estado inválido.' }
  if (estado === 'COBRADO' && !fechaCobro) return { error: 'COBRADO requiere fechaCobro.' }
  return { ok: true }
}

test('cobro estados válidos son FACTURADO y COBRADO', () => {
  assert.equal(ESTADOS_COBRO.has('FACTURADO'), true)
  assert.equal(ESTADOS_COBRO.has('COBRADO'), true)
  assert.equal(ESTADOS_COBRO.has('PENDIENTE'), false)
  assert.equal(ESTADOS_COBRO.has('ANULADO'), false)
})

test('distribución 50/50 entre dos socios calcula correctamente', () => {
  const [a, b] = distribuirMonto('10000', ['0.50', '0.50'])
  assert.equal(a.toFixed(2), '5000.00')
  assert.equal(b.toFixed(2), '5000.00')
  assert.equal(a.add(b).toFixed(2), '10000.00')
})

test('distribución 44/44/12 entre tres socios suma 100%', () => {
  const porcentajes: Prisma.Decimal.Value[] = ['0.44', '0.44', '0.12']
  const suma = porcentajes.reduce((acc, p) => acc.add(p), money(0))
  assert.equal(suma.toDecimalPlaces(4).toFixed(4), '1.0000')

  const partes = distribuirMonto('20000', porcentajes)
  assert.equal(partes[0].toFixed(2), '8800.00')
  assert.equal(partes[1].toFixed(2), '8800.00')
  assert.equal(partes[2].toFixed(2), '2400.00')
  assert.equal(partes.reduce((acc, p) => acc.add(p), money(0)).toFixed(2), '20000.00')
})

test('estado COBRADO requiere fechaCobro', () => {
  assert.deepEqual(validarCobroEstado('COBRADO', null), { error: 'COBRADO requiere fechaCobro.' })
  assert.deepEqual(validarCobroEstado('COBRADO', '2025-05-01'), { ok: true })
  assert.deepEqual(validarCobroEstado('FACTURADO', null), { ok: true })
  assert.deepEqual(validarCobroEstado('INVALIDO', null), { error: 'Estado inválido.' })
})
