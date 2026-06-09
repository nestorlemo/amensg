import { periodoLabel, type EmpresaDecision, type EmpresaInfo, type PeriodoResumen, type PeriodoStatus } from '@/components/import-preview/types'

type PeriodoRowProps = {
  isProcessing: boolean
  onDecision: (empresa: string, decision: EmpresaDecision) => void
  onRetry: () => void
  periodo: PeriodoResumen
  status: PeriodoStatus
}

function EmpresaRow({
  empresa,
  isProcessing,
  onDecision,
}: {
  empresa: EmpresaInfo
  isProcessing: boolean
  onDecision: (decision: EmpresaDecision) => void
}) {
  if (!empresa.yaExiste) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-600">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
        <span>{empresa.nombre}</span>
      </div>
    )
  }

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-xs font-medium text-amber-900">{empresa.nombre}</span>
          <span className="ml-2 text-xs text-amber-700">— ya existe importación para este período</span>
        </div>
        <div className="flex gap-2">
          <button
            className={`rounded px-2 py-1 text-xs font-semibold transition-colors ${
              empresa.decision === 'sobreescribir'
                ? 'bg-amber-600 text-white'
                : 'border border-amber-400 bg-white text-amber-800 hover:bg-amber-100'
            } disabled:opacity-50`}
            disabled={isProcessing}
            onClick={() => onDecision('sobreescribir')}
            type="button"
          >
            Sobreescribir
          </button>
          <button
            className={`rounded px-2 py-1 text-xs font-semibold transition-colors ${
              empresa.decision === 'omitir'
                ? 'bg-slate-600 text-white'
                : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
            } disabled:opacity-50`}
            disabled={isProcessing}
            onClick={() => onDecision('omitir')}
            type="button"
          >
            Omitir
          </button>
          {empresa.decision === 'pendiente' ? (
            <span className="self-center text-xs font-medium text-amber-700">← Decidí</span>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function PeriodoRow({ isProcessing, onDecision, onRetry, periodo, status }: PeriodoRowProps) {
  const label = periodoLabel(periodo.anio, periodo.mes)
  const conflicts = periodo.empresas.filter((e) => e.yaExiste)
  const hasConflicts = conflicts.length > 0
  const allSkipped = periodo.empresas.every((e) => e.yaExiste && e.decision === 'omitir')

  return (
    <div className={`rounded-lg border bg-slate-50 p-4 ${hasConflicts && status.state !== 'done' ? 'border-amber-300' : 'border-slate-200'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium capitalize text-slate-900">{label}</span>
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
              {periodo.filas.toLocaleString('es-UY')} filas
            </span>
            {hasConflicts && status.state !== 'done' ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                {conflicts.length} empresa{conflicts.length > 1 ? 's' : ''} ya importada{conflicts.length > 1 ? 's' : ''}
              </span>
            ) : null}
          </div>

          {status.state !== 'done' && status.state !== 'processing' ? (
            <div className="mt-3 space-y-2">
              {periodo.empresas.map((empresa) => (
                <EmpresaRow
                  key={empresa.nombre}
                  empresa={empresa}
                  isProcessing={isProcessing}
                  onDecision={(decision) => onDecision(empresa.nombre, decision)}
                />
              ))}
            </div>
          ) : null}

          {status.state === 'processing' ? (
            <div className="mt-3">
              <p className="flex items-center gap-2 text-xs text-slate-600">
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
                Procesando {label}... {periodo.filas.toLocaleString('es-UY')} filas
              </p>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-1.5 animate-pulse rounded-full"
                  style={{ width: '60%', background: 'linear-gradient(90deg,#1769E0,#19C3FF)' }}
                />
              </div>
            </div>
          ) : null}

          {status.state === 'done' ? (
            <p className="mt-2 text-xs font-medium text-emerald-700">
              {allSkipped
                ? '⏭️ Omitido — todas las empresas ya importadas fueron salteadas'
                : `✅ ${status.procesadas.toLocaleString('es-UY')} filas importadas`}
              {status.importacionId ? (
                <span className="ml-2 font-normal text-slate-400">ID: {status.importacionId}</span>
              ) : null}
            </p>
          ) : null}

          {status.state === 'error' ? (
            <p className="mt-2 text-xs text-red-700">❌ {status.message}</p>
          ) : null}
        </div>

        <div className="shrink-0">
          {status.state === 'ready' && (
            <span className="rounded-full bg-slate-200 px-2 py-1 text-xs text-slate-500">Pendiente</span>
          )}
          {status.state === 'processing' && (
            <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">Procesando...</span>
          )}
          {status.state === 'done' && (
            <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">Completado</span>
          )}
          {status.state === 'error' && (
            <button
              className="rounded-md border border-red-300 bg-white px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
              disabled={isProcessing}
              onClick={onRetry}
              type="button"
            >
              Reintentar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
