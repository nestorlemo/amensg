export type IssueDisponible = {
  id: string
  fecha: string
  descripcion: string
  totalHoras: number
  estado: string
  empresa: { id: string; nombre: string } | null
}

export type SocioState = {
  id: string
  nombre: string
  porcentaje: string // editable string, e.g. "50"
}

export type EmpresaOption = { id: string; nombre: string }

export type FacturaHistorial = {
  id: string
  anio: number
  mes: number
  creadoEn: string
  empresa: { id: string; nombre: string }
  totalHoras: number
  totalUSD: number
  iva: number
  totalConIva: number
  tipoCambio: number
  estado: string
  ingresoAdicionalId: string | null
  cobroId: string | null
  urlPdfFactura: string | null
  fechaCobro: string | null
  distribuciones: {
    id: string
    porcentaje: number
    montoUYU: number
    socio: { id: string; nombre: string }
  }[]
  issues: { id: string; descripcion: string; totalHoras: number; fechaProduccion: string | null; estado: string }[]
}

export const fmt = (n: number) =>
  new Intl.NumberFormat('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

export function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('es-UY').format(new Date(iso))
}
