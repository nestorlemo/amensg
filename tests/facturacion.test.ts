import assert from 'node:assert/strict'
import test from 'node:test'

import { Prisma } from '@prisma/client'

const IVA_RATE = new Prisma.Decimal('0.22')

function money(value: Prisma.Decimal.Value) {
  return new Prisma.Decimal(value)
}

function calcularIva(montoSinIva: Prisma.Decimal.Value) {
  const base = money(montoSinIva)
  const iva = base.mul(IVA_RATE).toDecimalPlaces(2)
  const conIva = base.add(iva).toDecimalPlaces(2)
  return { iva: iva.toFixed(2), conIva: conIva.toFixed(2) }
}

function calcularFacturaDesarrollo(
  totalHoras: Prisma.Decimal.Value,
  valorHoraUSD: Prisma.Decimal.Value,
  tipoCambio: Prisma.Decimal.Value,
) {
  const totalUSD = money(totalHoras).mul(valorHoraUSD).toDecimalPlaces(2)
  const ivaUSD = totalUSD.mul(IVA_RATE).toDecimalPlaces(2)
  const totalConIvaUSD = totalUSD.add(ivaUSD).toDecimalPlaces(2)
  const totalUYU = totalUSD.mul(tipoCambio).toDecimalPlaces(2)
  return {
    totalUSD: totalUSD.toFixed(2),
    ivaUSD: ivaUSD.toFixed(2),
    totalConIvaUSD: totalConIvaUSD.toFixed(2),
    totalUYU: totalUYU.toFixed(2),
  }
}

test('IVA 22% sobre monto sin IVA', () => {
  const { iva, conIva } = calcularIva('1000')
  assert.equal(iva, '220.00')
  assert.equal(conIva, '1220.00')
})

test('factura desarrollo: totalUSD = horas * valorHora', () => {
  const { totalUSD } = calcularFacturaDesarrollo('40', '25.00', '42')
  assert.equal(totalUSD, '1000.00')
})

test('factura desarrollo: IVA USD = totalUSD * 0.22', () => {
  const { ivaUSD, totalConIvaUSD } = calcularFacturaDesarrollo('40', '25.00', '42')
  assert.equal(ivaUSD, '220.00')
  assert.equal(totalConIvaUSD, '1220.00')
})

test('conversión USD a UYU usa tipo de cambio correcto', () => {
  const { totalUSD, totalUYU } = calcularFacturaDesarrollo('10', '50.00', '45')
  assert.equal(totalUSD, '500.00')
  assert.equal(totalUYU, '22500.00')

  const { totalUYU: uyu2 } = calcularFacturaDesarrollo('10', '50.00', '42.50')
  assert.equal(uyu2, '21250.00')
})
