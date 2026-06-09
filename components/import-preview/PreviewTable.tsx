import Link from 'next/link'

import { formatBytes, type EmpresaDecision, type ParsedFile, type PeriodoStatus } from '@/components/import-preview/types'
import { PeriodoRow } from './PeriodoRow'

type Props = {
  parsed: ParsedFile
  fileName: string | null
  fileSize: number
  totalPeriodos: number
  allDone: boolean
  anyError: boolean
  hasPendingDecisions: boolean
  isProcessing: boolean
  doneCount: number
  progressPct: number
  statuses: Map<string, PeriodoStatus>
  onConfirmAll: () => void
  onRetry: (periodo: ParsedFile['periodos'][number]) => void
  onDecision: (periodo: string, empresa: string, decision: EmpresaDecision) => void
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 break-all text-sm font-semibold text-slate-950">{value}</p>
    </div>
  )
}

export function PreviewTable({
  parsed,
  fileName,
  fileSize,
  totalPeriodos,
  allDone,
  anyError,
  hasPendingDecisions,
  isProcessing,
  doneCount,
  progressPct,
  statuses,
  onConfirmAll,
  onRetry,
  onDecision,
}: Props) {
  return (
    <>
      {/* File summary */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-base font-semibold text-slate-950">Resumen del archivo</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <InfoCard label="Archivo" value={fileName ?? ''} />
          <InfoCard label="Tamaño" value={formatBytes(fileSize)} />
          <InfoCard
            label="Total filas válidas"
            value={parsed.periodos.reduce((s, p) => s + p.filas, 0).toLocaleString('es-UY')}
          />
        </div>
      </section>

      {/* Periods table */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-950">
              Períodos detectados — {totalPeriodos} {totalPeriodos === 1 ? 'mes' : 'meses'}
            </h2>
            {hasPendingDecisions ? (
              <p className="mt-1 text-sm text-amber-700">
                ⚠️ Hay empresas con importación existente. Definí qué hacer con cada una antes de continuar.
              </p>
            ) : isProcessing ? (
              <p className="mt-1 text-sm text-slate-500">{doneCount} de {totalPeriodos} meses completados</p>
            ) : allDone ? (
              <p className="mt-1 text-sm font-medium text-emerald-700">✅ Todos los meses fueron importados.</p>
            ) : anyError ? (
              <p className="mt-1 text-sm text-red-700">Algunos meses fallaron. Podés reintentarlos.</p>
            ) : null}
          </div>

          {!allDone ? (
            <button
              className="shrink-0 rounded-md px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isProcessing || hasPendingDecisions}
              onClick={onConfirmAll}
              style={{ background: (isProcessing || hasPendingDecisions) ? '#94a3b8' : 'linear-gradient(135deg,#1769E0,#19C3FF)' }}
              title={hasPendingDecisions ? 'Resolvé los conflictos antes de confirmar' : undefined}
              type="button"
            >
              {isProcessing ? 'Procesando...' : anyError ? 'Reintentar pendientes' : 'Confirmar todo'}
            </button>
          ) : (
            <Link
              className="shrink-0 rounded-md px-5 py-2 text-sm font-semibold text-white"
              href="/importaciones"
              style={{ background: 'linear-gradient(135deg,#1769E0,#19C3FF)' }}
            >
              Ver importaciones
            </Link>
          )}
        </div>

        {/* Global progress bar */}
        {(isProcessing || allDone) && totalPeriodos > 0 ? (
          <div className="mt-4">
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg,#1769E0,#19C3FF)' }}
              />
            </div>
            <p className="mt-1 text-right text-xs text-slate-500">{doneCount} / {totalPeriodos} meses</p>
          </div>
        ) : null}

        <div className="mt-5 space-y-3">
          {parsed.periodos.map((p) => (
            <PeriodoRow
              key={p.periodo}
              isProcessing={isProcessing}
              onDecision={(empresa, decision) => onDecision(p.periodo, empresa, decision)}
              onRetry={() => onRetry(p)}
              periodo={p}
              status={statuses.get(p.periodo) ?? { state: 'ready' }}
            />
          ))}
        </div>
      </section>
    </>
  )
}
