import { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'

export type TipoCambioResponse = {
  moneda: 'USD'
  fecha: string
  valor: string
  fuente: 'BCU' | 'PARAMETRO'
  fechaTipoCambio: string
}

export async function getTipoCambioUsd(fecha: string) {
  const parsedDate = parseIsoDate(fecha)
  if (!parsedDate) {
    return {
      error: { error: 'FECHA_INVALIDA', message: 'La fecha debe tener formato YYYY-MM-DD.' },
      status: 422,
    }
  }

  const parametro = await prisma.parametro.findUnique({
    where: { clave: 'tipo_cambio_usd' },
    select: { valor: true },
  })

  if (!parametro || parametro.valor.lessThanOrEqualTo(0)) {
    return {
      error: {
        error: 'TIPO_CAMBIO_NO_CONFIGURADO',
        message: 'No hay tipo_cambio_usd parametrizado para usar como fallback local.',
      },
      status: 422,
    }
  }

  return {
    data: {
      moneda: 'USD',
      fecha,
      valor: moneyRate(parametro.valor),
      fuente: 'PARAMETRO',
      fechaTipoCambio: fecha,
    } satisfies TipoCambioResponse,
    status: 200,
  }
}

function parseIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null
  }

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null
  }

  return date
}

function moneyRate(value: Prisma.Decimal) {
  return value.toDecimalPlaces(6).toString()
}
