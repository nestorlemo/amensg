export const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
export const CURRENT_YEAR = new Date().getFullYear()
export const COMP_COLOR = '#94a3b8'

export const EMPRESA_COLORS: Record<string, string> = {
  Elared: '#1769E0',
  Relpont: '#20E0B2',
  VOS: '#F0B840',
  'Ciudad Móvil': '#a78bfa',
}
export const EMPRESA_FALLBACK = '#19C3FF'

export const ESTADO_COLORS: Record<string, string> = {
  PENDIENTE: '#94a3b8',
  EN_DESARROLLO: '#1769E0',
  EN_TEST: '#F0B840',
  EN_PRODUCCION: '#20E0B2',
  CANCELADO: '#f87171',
}

export function empresaColor(nombre: string) {
  return EMPRESA_COLORS[nombre] ?? EMPRESA_FALLBACK
}

export function fmt(n: number) {
  return new Intl.NumberFormat('es-UY', { maximumFractionDigits: 2 }).format(n)
}

export function fmtShort(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `${new Intl.NumberFormat('es-UY', { maximumFractionDigits: 1 }).format(n / 1_000_000)}M`
  if (abs >= 1_000) return `${new Intl.NumberFormat('es-UY', { maximumFractionDigits: 1 }).format(n / 1_000)}K`
  return new Intl.NumberFormat('es-UY', { maximumFractionDigits: 1 }).format(n)
}

export function pivotByEmpresa(rows: { mes: number; empresa: string; [k: string]: number | string }[], valueKey: string) {
  const empresas = [...new Set(rows.map(r => r.empresa))]
  const byMes = new Map<number, Record<string, number | string>>()
  for (let m = 1; m <= 12; m++) byMes.set(m, { mes: m })
  for (const row of rows) {
    byMes.get(row.mes)![row.empresa] = Number(row[valueKey])
  }
  return { data: Array.from(byMes.values()).sort((a, b) => Number(a.mes) - Number(b.mes)), empresas }
}

export function mergeComparativo<T extends { mes: number }>(main: T[], comp: { mes: number; [k: string]: number }[], fields: string[], suffix: string): (T & Record<string, number>)[] {
  const compMap = new Map<number, { [k: string]: number }>()
  for (const r of comp) compMap.set(r.mes, r)
  return main.map(row => {
    const compRow = compMap.get(row.mes)
    const extra: Record<string, number> = {}
    for (const f of fields) extra[`${f}${suffix}`] = compRow ? (compRow[f] ?? 0) : 0
    return { ...row, ...extra }
  })
}

export type AnioData = {
  activacionesPorMesEmpresa: { mes: number; empresa: string; cantidad: number }[]
  facturacionPorMesEmpresa: { mes: number; empresa: string; totalSinIva: number }[]
  resultadoMensual: { mes: number; ingresos: number; gastos: number; resultado: number }[]
  resultadoFinancieroTotal: { mes: number; ingresosActivaciones: number; ingresosAdicionales: number; desarrolloUYU: number; gastos: number; resultado: number }[]
  horasDesarrolloPorMes: { mes: number; horas: number }[]
  facturacionDesarrolloPorMes: { mes: number; totalUSD: number; acumulado: number }[]
  activacionesTotalesPorMes: { mes: number; total: number }[]
}

export type GraficosData = AnioData & {
  distribucionSocios: { socio: string; monto: number }[]
  issuesPorEstado: { estado: string; count: number }[]
  comparativo: (AnioData & { anio: number }) | null
}

export type EmpresaOpt = { id: string; nombre: string }

export type Kpis = {
  activaciones: number
  facturadoActivaciones: number
  facturadoDesarrollo: number
  resultado: number
}
