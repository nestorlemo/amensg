export type FacturacionRow = {
  id: string
  empresaId: string
  empresa: string
  anio: number
  mes: number
  cantidadActivaciones: number
  totalSinIva: string
  iva: string
  totalConIva: string
  estadoCobro: string
}

export type CobroHistorial = {
  id: string
  empresa: string
  empresaId: string
  empresas: { id: string; nombre: string }[]
  anio: number
  mes: number
  montoSinIva: string
  iva: string
  montoConIva: string
  moneda: string
  estado: string
  fechaCobro: string | null
  urlPdfFactura: string | null
  facturaId: string | null
}

export type EmpresaOption = { id: string; nombre: string }

export const fmt = (val: string | number) =>
  new Intl.NumberFormat('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(val))

export function formatPeriod(anio: number, mes: number) {
  return `${String(mes).padStart(2, '0')}/${anio}`
}

export function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('es-UY').format(new Date(iso))
}

export function EstadoBadge({ estado }: { estado: string }) {
  if (estado === 'COBRADO')   return <span className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800">COBRADO</span>
  if (estado === 'FACTURADO') return <span className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-800">FACTURADO</span>
  return <span className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold bg-slate-100 text-slate-700">{estado}</span>
}
