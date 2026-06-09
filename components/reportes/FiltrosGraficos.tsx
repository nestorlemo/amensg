import { CURRENT_YEAR, type AnioData, type EmpresaOpt } from './types'

type Props = {
  anio: number
  anioComparativo: number | null
  empresaId: string
  empresas: EmpresaOpt[]
  comp: (AnioData & { anio: number }) | null
  onAnio: (v: number) => void
  onAnioComparativo: (v: number | null) => void
  onEmpresaId: (v: string) => void
}

export function FiltrosGraficos({ anio, anioComparativo, empresaId, empresas, comp, onAnio, onAnioComparativo, onEmpresaId }: Props) {
  const years = Array.from({ length: CURRENT_YEAR - 2022 }, (_, i) => 2023 + i)

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-4">
      <label className="text-sm font-medium text-slate-700">
        Año
        <select
          className="ml-2 h-9 rounded-md border border-slate-300 px-3 text-sm"
          value={anio}
          onChange={e => { onAnio(Number(e.target.value)); onAnioComparativo(null) }}
        >
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </label>
      <label className="text-sm font-medium text-slate-700">
        Comparar con
        <select
          className="ml-2 h-9 rounded-md border border-slate-300 px-3 text-sm"
          value={anioComparativo ?? ''}
          onChange={e => onAnioComparativo(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">Sin comparativo</option>
          {years.filter(y => y !== anio).map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </label>
      <label className="text-sm font-medium text-slate-700">
        Empresa
        <select
          className="ml-2 h-9 rounded-md border border-slate-300 px-3 text-sm"
          value={empresaId}
          onChange={e => onEmpresaId(e.target.value)}
        >
          <option value="">Todas las empresas</option>
          {empresas.map(emp => <option key={emp.id} value={emp.id}>{emp.nombre}</option>)}
        </select>
      </label>
      {comp && (
        <span className="flex items-center gap-2 rounded-md bg-slate-100 px-3 py-1.5 text-xs text-slate-600">
          <span className="inline-block h-2 w-6 rounded border-b-2 border-dashed border-slate-400" />
          {comp.anio} (comparativo)
          <span className="ml-1 inline-block h-2 w-6 rounded border-b-2 border-solid border-[#1769E0]" />
          {anio} (principal)
        </span>
      )}
    </div>
  )
}
