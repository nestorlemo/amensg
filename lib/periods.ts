import { prisma } from '@/lib/prisma'

export type PeriodClosedError = {
  error: 'PERIODO_CERRADO'
  message: string
}

export async function isPeriodClosed(anio: number, mes: number) {
  const cierre = await prisma.cierreMensual.findFirst({
    where: {
      anio,
      mes,
      estado: 'CERRADO',
    },
    select: { id: true },
  })

  return Boolean(cierre)
}

export async function getClosedPeriodKeys(periods: Array<{ anio: number; mes: number }>) {
  const uniquePeriods = [...new Map(periods.map((period) => [`${period.anio}-${period.mes}`, period])).values()]

  if (uniquePeriods.length === 0) {
    return new Set<string>()
  }

  const cierres = await prisma.cierreMensual.findMany({
    where: {
      estado: 'CERRADO',
      OR: uniquePeriods.map((period) => ({
        anio: period.anio,
        mes: period.mes,
      })),
    },
    select: {
      anio: true,
      mes: true,
    },
  })

  return new Set(cierres.map((cierre) => periodKey(cierre.anio, cierre.mes)))
}

export function periodKey(anio: number, mes: number) {
  return `${anio}-${mes}`
}

export function closedPeriodError(message: string): PeriodClosedError {
  return {
    error: 'PERIODO_CERRADO',
    message,
  }
}
