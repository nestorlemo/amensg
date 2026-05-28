import assert from 'node:assert/strict'
import test from 'node:test'

import { Prisma } from '@prisma/client'

import { normalizeChip } from '../lib/import-preview/preview'

function money(value: Prisma.Decimal.Value) {
  return new Prisma.Decimal(value)
}

function calculateBilling(quantity: number, unitPrice: Prisma.Decimal.Value, ivaRate: Prisma.Decimal.Value) {
  const totalSinIva = money(unitPrice).mul(quantity)
  const iva = totalSinIva.mul(ivaRate)
  const totalConIva = totalSinIva.add(iva)

  return {
    totalSinIva: totalSinIva.toDecimalPlaces(2).toFixed(2),
    iva: iva.toDecimalPlaces(2).toFixed(2),
    totalConIva: totalConIva.toDecimalPlaces(2).toFixed(2),
  }
}

function calculateAdditionalIncomeUsd(
  amountUsd: Prisma.Decimal.Value,
  exchangeRate: Prisma.Decimal.Value,
  ivaRate: Prisma.Decimal.Value,
) {
  const montoSinIva = money(amountUsd).mul(exchangeRate)
  const iva = montoSinIva.mul(ivaRate)
  const montoConIva = montoSinIva.add(iva)

  return {
    montoSinIva: montoSinIva.toDecimalPlaces(2).toFixed(2),
    iva: iva.toDecimalPlaces(2).toFixed(2),
    montoConIva: montoConIva.toDecimalPlaces(2).toFixed(2),
  }
}

test('normalizes chip values without converting them to numbers', () => {
  const normalized = normalizeChip("'895980162544091030")

  assert.equal(normalized, '895980162544091030')
  assert.equal(normalizeChip('001234'), '001234')
  assert.equal(normalizeChip("  '000987  "), '000987')
  assert.equal(typeof normalized, 'string')
})

test('calculates April VOS billing amounts with Decimal arithmetic', () => {
  assert.deepEqual(calculateBilling(13492, '4.00', '0.22'), {
    totalSinIva: '53968.00',
    iva: '11872.96',
    totalConIva: '65840.96',
  })
})

test('converts USD additional income to UYU before IVA', () => {
  assert.deepEqual(calculateAdditionalIncomeUsd('100', '40', '0.22'), {
    montoSinIva: '4000.00',
    iva: '880.00',
    montoConIva: '4880.00',
  })
})

test('validates active socios percentages sum to 100%', () => {
  const total = money('0.1200').add('0.4400').add('0.4400')

  assert.equal(total.toDecimalPlaces(4).toFixed(4), '1.0000')
})
