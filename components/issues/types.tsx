export const ESTADOS = ['PENDIENTE', 'EN_DESARROLLO', 'EN_TEST', 'EN_PRODUCCION', 'CANCELADO'] as const
export const PRIORIDADES = ['ALTA', 'MEDIA', 'BAJA'] as const
export const SISTEMAS = ['creditoamigo.com.py', 'agentesdeventas.com.uy', 'cargamas.com.uy', 'phonehouse.uy', 'todas']

export type Issue = {
  id: string
  fecha: string
  descripcion: string
  horasDesarrollo: number
  horasTest: number
  horasRework: number
  totalHoras: number
  estado: string
  fechaProduccion: string | null
  motivoCancelacion: string | null
  reportadoPor: string
  prioridad: string
  empresa: { id: string; nombre: string } | null
  sistema: string | null
  facturado: boolean
}

export type Empresa = { id: string; nombre: string }
export type IssueConfig = { porcentajeTest: number; porcentajeRework: number; valorHoraUSD: number }

export const EMPTY_FORM = {
  fecha: '',
  descripcion: '',
  empresaId: '',
  sistema: '',
  horasDesarrollo: '',
  prioridad: 'MEDIA',
  estado: 'PENDIENTE',
  reportadoPor: '',
  fechaProduccion: '',
}

export type FormState = typeof EMPTY_FORM

export function calcHoras(devStr: string, pctTest: number, pctRework: number) {
  const dev    = parseFloat(devStr) || 0
  const test   = Math.round(dev * pctTest   / 100 * 100) / 100
  const rework = Math.round(dev * pctRework / 100 * 100) / 100
  const total  = Math.round((dev + test + rework) * 100) / 100
  return { dev, test, rework, total }
}

export function ReadonlyField({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <label className="block text-sm font-medium text-slate-500">
      {label}
      <div className={`mt-1 flex h-9 w-full items-center rounded-md border px-3 text-sm font-semibold ${
        highlight
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-slate-200 bg-slate-100 text-slate-700'
      }`}>
        {value}
      </div>
    </label>
  )
}
