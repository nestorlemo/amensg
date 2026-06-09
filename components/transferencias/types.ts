export type Cobro = {
  id: string
  tipo: string
  empresa: string
  empresaId: string
  anio: number
  mes: number
  moneda: string
  montoSinIva: string
  montoConIva: string
  estado: string
  fechaCobro: string | null
}

export type CobroDetalle = {
  empresa: string
  tipo: string
  periodo: string
  montoSinIva: string
  moneda: string
}

export type Transferencia = {
  id: string
  socioId: string
  socio: string
  cobroId: string
  cobroTipo: string
  cobroAnio: number
  cobroMes: number
  empresa: string
  moneda: string
  monto: string
  cuentaDestino: string | null
  fecha: string | null
  estado: string
  concepto: string
  creadoEn: string
  periodoDesde: { anio: number; mes: number }
  periodoHasta: { anio: number; mes: number }
  cobrosDetalle: CobroDetalle[]
}

export type Socio = { id: string; nombre: string }
export type Empresa = { id: string; nombre: string }

export const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export const TIPO_BADGE: Record<string, string> = {
  ACTIVACIONES: 'bg-blue-100 text-blue-800',
  DESARROLLO:   'bg-purple-100 text-purple-800',
  ADICIONAL:    'bg-teal-100 text-teal-800',
}

export const ESTADO_BADGE: Record<string, string> = {
  PENDIENTE:   'bg-amber-100 text-amber-700',
  TRANSFERIDO: 'bg-emerald-100 text-emerald-800',
}

export function fmt(v: string | number) {
  return new Intl.NumberFormat('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(v))
}

export function mesNombre(m: number) { return MESES[m - 1] ?? '' }
