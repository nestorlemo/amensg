import { prisma } from '@/lib/prisma'

export type CobrosFilters = {
  tipo?: string
  empresaId?: string
  anio?: number
  mes?: number
  estado?: string
  page?: number
}

export async function getCobrosUnificados(filters: CobrosFilters = {}) {
  const { tipo, empresaId, anio, mes, estado, page = 1 } = filters
  const pageSize = 50

  const where: Record<string, unknown> = {}
  if (tipo)      where.tipo      = tipo
  if (empresaId) where.empresaId = empresaId
  if (anio)      where.anio      = anio
  if (mes)       where.mes       = mes
  if (estado)    where.estado    = estado

  const [data, total, allRows, tipoCambioParam] = await Promise.all([
    prisma.cobro.findMany({
      where,
      include: {
        empresa: { select: { id: true, nombre: true } },
        cobroFacturaciones: {
          include: {
            facturacionMensual: {
              include: { empresa: { select: { id: true, nombre: true } } },
            },
          },
        },
      },
      orderBy: [{ anio: 'desc' }, { mes: 'desc' }, { creadoEn: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.cobro.count({ where }),
    prisma.cobro.findMany({
      where,
      select: { montoSinIva: true, iva: true, montoConIva: true, moneda: true, estado: true },
    }),
    prisma.parametro.findUnique({ where: { clave: 'tipo_cambio_usd' }, select: { valor: true } }),
  ])

  const tipoCambio = tipoCambioParam ? Number(tipoCambioParam.valor) : 1

  let totSinIvaPendiente = 0, totSinIvaCobrado = 0
  let totIva = 0
  let totConIvaPendiente = 0, totConIvaCobrado = 0
  for (const r of allRows) {
    const tc = r.moneda === 'USD' ? tipoCambio : 1
    const sinIva = Number(r.montoSinIva) * tc
    const ivaAmt = Number(r.iva) * tc
    const conIva = Number(r.montoConIva) * tc
    totIva += ivaAmt
    if (r.estado === 'COBRADO') {
      totSinIvaCobrado += sinIva
      totConIvaCobrado += conIva
    } else {
      totSinIvaPendiente += sinIva
      totConIvaPendiente += conIva
    }
  }

  const rows = data.map((r) => {
    const facturaciones = r.cobroFacturaciones.map((cf) => ({
      empresaId:   cf.facturacionMensual.empresa.id,
      empresa:     cf.facturacionMensual.empresa.nombre,
      totalSinIva: cf.facturacionMensual.totalSinIva.toString(),
      iva:         cf.facturacionMensual.iva.toString(),
      totalConIva: cf.facturacionMensual.totalConIva.toString(),
    }))

    const empresasMap = new Map<string, { id: string; nombre: string }>()
    if (facturaciones.length > 0) {
      for (const f of facturaciones) empresasMap.set(f.empresaId, { id: f.empresaId, nombre: f.empresa })
    } else {
      empresasMap.set(r.empresaId, { id: r.empresaId, nombre: r.empresa?.nombre ?? '' })
    }
    const empresas = [...empresasMap.values()]

    const montoSinIva = facturaciones.length > 0
      ? facturaciones.reduce((s, f) => s + Number(f.totalSinIva), 0).toFixed(2)
      : r.montoSinIva.toString()
    const iva = facturaciones.length > 0
      ? facturaciones.reduce((s, f) => s + Number(f.iva), 0).toFixed(2)
      : r.iva.toString()
    const montoConIva = facturaciones.length > 0
      ? facturaciones.reduce((s, f) => s + Number(f.totalConIva), 0).toFixed(2)
      : r.montoConIva.toString()

    return {
      id: r.id,
      tipo: r.tipo,
      empresa: r.empresa?.nombre ?? empresas[0]?.nombre ?? '',
      empresaId: r.empresaId,
      empresas,
      anio: r.anio,
      mes: r.mes,
      montoSinIva,
      iva,
      montoConIva,
      moneda: r.moneda,
      estado: r.estado,
      fechaCobro: r.fechaCobro?.toISOString() ?? null,
      urlPdfFactura: r.urlPdfFactura ?? null,
    }
  })

  return {
    data: rows,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    totals: {
      sinIvaPendiente: totSinIvaPendiente.toFixed(2),
      sinIvaCobrado: totSinIvaCobrado.toFixed(2),
      iva: totIva.toFixed(2),
      conIvaPendiente: totConIvaPendiente.toFixed(2),
      conIvaCobrado: totConIvaCobrado.toFixed(2),
    },
  }
}

export async function marcarCobrado(
  id: string,
  fields: { estado?: string; fechaCobro?: string | null; urlPdfFactura?: string },
  usuarioId: string,
) {
  const cobro = await prisma.cobro.findUnique({
    where: { id },
    select: { tipo: true, montoConIva: true, moneda: true, empresa: { select: { nombre: true } } },
  })

  const data: Record<string, unknown> = {}
  if (fields.estado !== undefined) data.estado = fields.estado
  if (fields.fechaCobro !== undefined) data.fechaCobro = fields.fechaCobro ? new Date(fields.fechaCobro) : null
  if (fields.urlPdfFactura !== undefined) data.urlPdfFactura = fields.urlPdfFactura

  const updated = await prisma.cobro.update({ where: { id }, data })

  await prisma.auditoria.create({
    data: {
      usuarioId,
      entidad: 'Cobro',
      entidadId: id,
      accion: 'MARCAR_COBRADO',
      detalle: {
        tipo: cobro?.tipo,
        empresa: cobro?.empresa?.nombre,
        montoConIva: cobro?.montoConIva?.toString(),
        moneda: cobro?.moneda,
        fechaCobro: fields.fechaCobro ?? null,
      },
    },
  })

  return updated
}

export async function eliminarCobro(id: string, usuarioId: string) {
  const cobro = await prisma.cobro.findUnique({
    where: { id },
    select: { tipo: true, montoConIva: true, moneda: true, empresa: { select: { nombre: true } } },
  })

  await prisma.cobro.delete({ where: { id } })

  await prisma.auditoria.create({
    data: {
      usuarioId,
      entidad: 'Cobro',
      entidadId: id,
      accion: 'ELIMINAR_COBRO',
      detalle: {
        tipo: cobro?.tipo,
        empresa: cobro?.empresa?.nombre,
        montoConIva: cobro?.montoConIva?.toString(),
        moneda: cobro?.moneda,
      },
    },
  })

  return { ok: true }
}
