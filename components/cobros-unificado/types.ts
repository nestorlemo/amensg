export type CobroRow = {
  id: string
  tipo: string
  empresa: string
  empresaId: string
  anio: number
  mes: number
  montoSinIva: string
  iva: string
  montoConIva: string
  moneda: string
  estado: string
  fechaCobro: string | null
  urlPdfFactura: string | null
}

export type EmpresaResumen = {
  empresa: string
  facturas: number
  sinIva: string
  iva: string
  conIva: string
}

export type ResumenData = {
  pendienteUYU: { total: string; porEmpresa: EmpresaResumen[] }
  pendienteUSD: { total: string; porEmpresa: EmpresaResumen[] }
  cobradoEsteMesUYU: string
  facturasPendientes: number
  empresasConDeuda: number
}

export type Totals = {
  sinIvaPendiente: string
  sinIvaCobrado: string
  iva: string
  conIvaPendiente: string
  conIvaCobrado: string
}

export type ApiResponse = {
  data: CobroRow[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  totals: Totals
}

export type Filters = {
  tipo: string
  empresaId: string
  anio: string
  mes: string
  estado: string
}

export const fmt = (val: string) =>
  new Intl.NumberFormat('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(val))

export function formatPeriod(anio: number, mes: number) {
  return `${String(mes).padStart(2, '0')}/${anio}`
}
