export type EmpresaDecision = 'pendiente' | 'sobreescribir' | 'omitir'

export type EmpresaInfo = {
  nombre: string
  yaExiste: boolean | null
  decision: EmpresaDecision
}

export type PeriodoResumen = {
  periodo: string
  anio: number
  mes: number
  filas: number
  empresas: EmpresaInfo[]
}

export type ParsedFile = {
  headers: string[]
  byPeriod: Map<string, Record<string, string>[]>
  periodos: PeriodoResumen[]
}

export type PeriodoStatus =
  | { state: 'pending' }
  | { state: 'checking' }
  | { state: 'ready' }
  | { state: 'processing' }
  | { state: 'done'; procesadas: number; importacionId: string | null }
  | { state: 'error'; message: string }

export const MONTHS = ['', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

export function periodoLabel(anio: number, mes: number) {
  return `${MONTHS[mes] ?? mes} ${anio}`
}

export function formatBytes(b: number) {
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}
