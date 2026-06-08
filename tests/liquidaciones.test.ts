import assert from 'node:assert/strict'
import test from 'node:test'

import { Prisma } from '@prisma/client'

const D = (v: Prisma.Decimal.Value) => new Prisma.Decimal(v)
const IVA = D('0.22')

function sumarIngresossinIva(montos: string[]) {
  return montos.reduce((acc, m) => acc.add(D(m)), D(0)).toDecimalPlaces(2)
}

function calcularIva(sinIva: Prisma.Decimal) {
  return sinIva.mul(IVA).toDecimalPlaces(2)
}

function resultadoDistribuible(ingresosSinIva: Prisma.Decimal, gastos: Prisma.Decimal) {
  return ingresosSinIva.sub(gastos).toDecimalPlaces(2)
}

function distribuir(resultado: Prisma.Decimal, porcentajes: number[]) {
  return porcentajes.map((pct) => resultado.mul(D(pct)).toDecimalPlaces(2))
}

test('suma de ingresos sin IVA', () => {
  const total = sumarIngresossinIva(['1000', '2000', '500'])
  assert.equal(total.toFixed(2), '3500.00')
})

test('cálculo de IVA 22%', () => {
  const iva = calcularIva(D('1000'))
  assert.equal(iva.toFixed(2), '220.00')
})

test('resultado distribuible = ingresos s/IVA - gastos', () => {
  const ingresos = D('3500')
  const gastos = D('800')
  const resultado = resultadoDistribuible(ingresos, gastos)
  assert.equal(resultado.toFixed(2), '2700.00')
})

test('distribución por porcentaje de socio (fracción 0.44 / 0.44 / 0.12)', () => {
  const resultado = D('2700')
  const [a, b, c] = distribuir(resultado, [0.44, 0.44, 0.12])
  assert.equal(a.toFixed(2), '1188.00')
  assert.equal(b.toFixed(2), '1188.00')
  assert.equal(c.toFixed(2), '324.00')
})

test('suma de distribuciones = resultado distribuible', () => {
  const resultado = D('2700')
  const parts = distribuir(resultado, [0.44, 0.44, 0.12])
  const suma = parts.reduce((acc, p) => acc.add(p), D(0)).toDecimalPlaces(2)
  assert.equal(suma.toFixed(2), resultado.toFixed(2))
})
