const ESTADOS_VALIDOS   = new Set(['PENDIENTE', 'EN_DESARROLLO', 'EN_TEST', 'EN_PRODUCCION', 'CANCELADO'])
const PRIORIDADES_VALIDAS = new Set(['ALTA', 'MEDIA', 'BAJA'])
const SISTEMAS_VALIDOS = new Set(['creditoamigo.com.py', 'agentesdeventas.com.uy', 'cargamas.com.uy', 'phonehouse.uy', 'todas'])

export function parseIssueBody(body: Record<string, unknown>) {
  const descripcion = typeof body.descripcion === 'string' ? body.descripcion.trim() : ''
  if (!descripcion) return { error: { error: 'VALIDATION_ERROR', message: 'La descripción es requerida.' } }

  const reportadoPor = typeof body.reportadoPor === 'string' ? body.reportadoPor.trim() : ''
  if (!reportadoPor) return { error: { error: 'VALIDATION_ERROR', message: 'El campo reportado por es requerido.' } }

  const estado    = typeof body.estado    === 'string' ? body.estado    : 'PENDIENTE'
  const prioridad = typeof body.prioridad === 'string' ? body.prioridad : 'MEDIA'
  if (!ESTADOS_VALIDOS.has(estado))       return { error: { error: 'VALIDATION_ERROR', message: 'Estado inválido.' } }
  if (!PRIORIDADES_VALIDAS.has(prioridad)) return { error: { error: 'VALIDATION_ERROR', message: 'Prioridad inválida.' } }

  const fecha = body.fecha ? new Date(body.fecha as string) : new Date()
  if (isNaN(fecha.getTime())) return { error: { error: 'VALIDATION_ERROR', message: 'Fecha inválida.' } }

  const horasDesarrollo = parseDecimal(body.horasDesarrollo)
  const horasTest       = parseDecimal(body.horasTest) ?? 0
  const horasRework     = parseDecimal(body.horasRework) ?? 0

  if (horasDesarrollo === null || horasDesarrollo === undefined) {
    return { error: { error: 'VALIDATION_ERROR', message: 'Las horas de desarrollo son requeridas.' } }
  }

  const totalHoras = horasDesarrollo + horasTest + horasRework
  const empresaId  = typeof body.empresaId === 'string' && body.empresaId ? body.empresaId : null

  if (estado === 'EN_PRODUCCION' && !body.fechaProduccion) {
    return { error: { error: 'VALIDATION_ERROR', message: 'La fecha en producción es requerida.' } }
  }
  const fechaProduccion = estado === 'EN_PRODUCCION' && body.fechaProduccion
    ? new Date(body.fechaProduccion as string)
    : null

  const motivoCancelacion = estado === 'CANCELADO'
    ? (typeof body.motivoCancelacion === 'string' ? body.motivoCancelacion.trim() : null)
    : null

  if (estado === 'CANCELADO' && !motivoCancelacion) {
    return { error: { error: 'VALIDATION_ERROR', message: 'El motivo de cancelación es requerido.' } }
  }

  const sistemaRaw = typeof body.sistema === 'string' && body.sistema ? body.sistema : null
  if (sistemaRaw && !SISTEMAS_VALIDOS.has(sistemaRaw)) {
    return { error: { error: 'VALIDATION_ERROR', message: 'Sistema inválido.' } }
  }
  const sistema = sistemaRaw

  return {
    data: {
      fecha,
      descripcion,
      horasDesarrollo,
      horasTest,
      horasRework,
      totalHoras,
      estado,
      reportadoPor,
      prioridad,
      empresaId,
      fechaProduccion,
      motivoCancelacion,
      sistema,
    },
  }
}

export function serializeIssue(issue: {
  id: string
  fecha: Date
  descripcion: string
  horasDesarrollo: { toString(): string }
  horasTest: { toString(): string }
  horasRework: { toString(): string }
  totalHoras: { toString(): string }
  estado: string
  fechaProduccion: Date | null
  motivoCancelacion?: string | null
  reportadoPor: string
  prioridad: string
  sistema?: string | null
  creadoEn: Date
  empresa?: { id: string; nombre: string } | null
}) {
  return {
    id: issue.id,
    fecha: issue.fecha.toISOString().split('T')[0],
    descripcion: issue.descripcion,
    horasDesarrollo: Number(issue.horasDesarrollo),
    horasTest: Number(issue.horasTest),
    horasRework: Number(issue.horasRework),
    totalHoras: Number(issue.totalHoras),
    estado: issue.estado,
    fechaProduccion: issue.fechaProduccion ? issue.fechaProduccion.toISOString().split('T')[0] : null,
    motivoCancelacion: issue.motivoCancelacion ?? null,
    reportadoPor: issue.reportadoPor,
    prioridad: issue.prioridad,
    sistema: issue.sistema ?? null,
    creadoEn: issue.creadoEn.toISOString(),
    empresa: issue.empresa ?? null,
  }
}

function parseDecimal(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return isNaN(n) ? null : Math.round(n * 100) / 100
}

export function serializeFactura(f: {
  id: string; anio: number; mes: number; creadoEn: Date
  totalHoras: { toString(): string }; valorHoraUSD: { toString(): string }
  totalUSD: { toString(): string }; tipoCambio: { toString(): string }
  totalUYU: { toString(): string }; iva: { toString(): string }; totalConIva: { toString(): string }
  ingresoAdicionalId: string | null
  estado: string
  empresa: { id: string; nombre: string }
  distribuciones: { id: string; porcentaje: { toString(): string }; montoUYU: { toString(): string }; socio: { id: string; nombre: string } }[]
  facturaIssues: { issue: { id: string; descripcion: string; totalHoras: { toString(): string } } }[]
  cobros?: { id: string; urlPdfFactura: string | null; fechaCobro?: Date | null }[]
}) {
  const cobro = f.cobros?.[0] ?? null
  return {
    id: f.id,
    anio: f.anio,
    mes: f.mes,
    empresa: f.empresa,
    totalHoras: Number(f.totalHoras),
    valorHoraUSD: Number(f.valorHoraUSD),
    totalUSD: Number(f.totalUSD),
    tipoCambio: Number(f.tipoCambio),
    totalUYU: Number(f.totalUYU),
    iva: Number(f.iva),
    totalConIva: Number(f.totalConIva),
    ingresoAdicionalId: f.ingresoAdicionalId,
    estado: f.estado,
    creadoEn: f.creadoEn.toISOString(),
    cobroId: cobro?.id ?? null,
    urlPdfFactura: cobro?.urlPdfFactura ?? null,
    fechaCobro: cobro?.fechaCobro?.toISOString() ?? null,
    distribuciones: f.distribuciones.map((d) => ({
      id: d.id,
      socio: d.socio,
      porcentaje: Number(d.porcentaje),
      montoUYU: Number(d.montoUYU),
    })),
    issues: f.facturaIssues.map((fi) => ({
      id: fi.issue.id,
      descripcion: fi.issue.descripcion,
      totalHoras: Number(fi.issue.totalHoras),
    })),
  }
}
