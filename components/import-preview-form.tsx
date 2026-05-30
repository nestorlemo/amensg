'use client'

import Link from 'next/link'
import { useState } from 'react'

import type { MultiPeriodPreview, PeriodoResumen } from '@/app/api/importaciones/preview/route'

type PeriodoStatus =
  | { state: 'pending' }
  | { state: 'processing'; procesadas: number; total: number }
  | { state: 'done'; procesadas: number; importacionId: string }
  | { state: 'error'; message: string }

const MONTH_NAMES = ['', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

function formatPeriodoLabel(anio: number, mes: number) {
  return `${MONTH_NAMES[mes] ?? mes} ${anio}`
}

export function ImportPreviewForm() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<MultiPeriodPreview | null>(null)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [statuses, setStatuses] = useState<Map<string, PeriodoStatus>>(new Map())
  const [isProcessing, setIsProcessing] = useState(false)
  const [completedCount, setCompletedCount] = useState(0)

  async function handlePreview(event: React.FormEvent) {
    event.preventDefault()
    if (!file) return

    setIsPreviewing(true)
    setPreviewError(null)
    setPreview(null)
    setStatuses(new Map())
    setCompletedCount(0)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/importaciones/preview', { method: 'POST', body: formData })
      const data: MultiPeriodPreview = await res.json()

      if (!res.ok || data.validation.hasBlockingErrors) {
        const msg = data.validation.errors[0]?.message ?? 'Error al generar el preview.'
        setPreviewError(msg)
        setIsPreviewing(false)
        return
      }

      setPreview(data)
      const initial = new Map<string, PeriodoStatus>()
      for (const p of data.periodos) initial.set(p.periodo, { state: 'pending' })
      setStatuses(initial)
    } catch {
      setPreviewError('No se pudo conectar con el servidor.')
    }

    setIsPreviewing(false)
  }

  async function processPeriodo(periodo: PeriodoResumen) {
    if (!file) return

    setStatuses((prev) => new Map(prev).set(periodo.periodo, { state: 'processing', procesadas: 0, total: periodo.filas }))

    const formData = new FormData()
    formData.append('file', file)
    formData.append('periodo', periodo.periodo)

    try {
      const res = await fetch('/api/importaciones/confirmar', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) {
        const msg = data.message ?? 'Error al procesar el período.'
        setStatuses((prev) => new Map(prev).set(periodo.periodo, { state: 'error', message: msg }))
        return false
      }

      setStatuses((prev) =>
        new Map(prev).set(periodo.periodo, {
          state: 'done',
          procesadas: data.procesadas,
          importacionId: data.importacionId,
        }),
      )
      return true
    } catch {
      setStatuses((prev) =>
        new Map(prev).set(periodo.periodo, { state: 'error', message: 'Error de conexión.' }),
      )
      return false
    }
  }

  async function handleConfirmAll() {
    if (!preview || !file || isProcessing) return

    setIsProcessing(true)
    setCompletedCount(0)

    // Reset pending statuses (keep errors for retry context)
    setStatuses((prev) => {
      const next = new Map(prev)
      for (const p of preview.periodos) {
        const current = next.get(p.periodo)
        if (!current || current.state === 'pending' || current.state === 'error') {
          next.set(p.periodo, { state: 'pending' })
        }
      }
      return next
    })

    let done = 0
    for (const periodo of preview.periodos) {
      const current = statuses.get(periodo.periodo)
      if (current?.state === 'done') {
        done++
        setCompletedCount(done)
        continue
      }
      const ok = await processPeriodo(periodo)
      if (ok) {
        done++
        setCompletedCount(done)
      }
    }

    setIsProcessing(false)
  }

  async function handleRetry(periodo: PeriodoResumen) {
    if (!file || isProcessing) return
    setIsProcessing(true)
    const ok = await processPeriodo(periodo)
    if (ok) setCompletedCount((c) => c + 1)
    setIsProcessing(false)
  }

  const totalPeriodos = preview?.periodos.length ?? 0
  const doneCount = [...statuses.values()].filter((s) => s.state === 'done').length
  const allDone = totalPeriodos > 0 && doneCount === totalPeriodos
  const anyError = [...statuses.values()].some((s) => s.state === 'error')

  return (
    <div className="space-y-6">
      {/* File picker */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <form className="space-y-4" onSubmit={handlePreview}>
          <label className="block text-sm font-medium text-slate-700" htmlFor="csv-file">
            Archivo CSV
          </label>
          <input
            accept=".csv,text/csv"
            className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            id="csv-file"
            name="file"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null)
              setPreview(null)
              setStatuses(new Map())
              setCompletedCount(0)
            }}
            type="file"
          />
          <button
            className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPreviewing || !file}
            type="submit"
          >
            {isPreviewing ? 'Analizando archivo...' : 'Analizar CSV'}
          </button>
        </form>
      </section>

      {previewError ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">{previewError}</div>
      ) : null}

      {preview ? (
        <>
          {/* File summary */}
          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-base font-semibold text-slate-950">Resumen del archivo</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <InfoCard label="Archivo" value={preview.file.name} />
              <InfoCard label="Tamaño" value={formatBytes(preview.file.size)} />
              <InfoCard label="Total filas válidas" value={String(preview.totalFilas)} />
            </div>
            {preview.validation.warnings.length > 0 ? (
              <ul className="mt-4 space-y-1">
                {preview.validation.warnings.map((w, i) => (
                  <li className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900" key={i}>{w.message}</li>
                ))}
              </ul>
            ) : null}
          </section>

          {/* Periods table */}
          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  Períodos detectados — {totalPeriodos} {totalPeriodos === 1 ? 'mes' : 'meses'}
                </h2>
                {isProcessing ? (
                  <p className="mt-1 text-sm text-slate-500">{completedCount} de {totalPeriodos} meses completados</p>
                ) : allDone ? (
                  <p className="mt-1 text-sm font-medium text-emerald-700">✅ Todos los meses fueron importados.</p>
                ) : anyError ? (
                  <p className="mt-1 text-sm text-red-700">Algunos meses fallaron. Podés reintentarlos individualmente.</p>
                ) : null}
              </div>
              {!allDone ? (
                <button
                  className="shrink-0 rounded-md px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isProcessing}
                  onClick={handleConfirmAll}
                  style={{ background: isProcessing ? '#94a3b8' : 'linear-gradient(135deg,#1769E0,#19C3FF)' }}
                  type="button"
                >
                  {isProcessing ? 'Procesando...' : anyError ? 'Reintentar pendientes' : 'Confirmar todo'}
                </button>
              ) : (
                <Link
                  className="shrink-0 rounded-md px-4 py-2 text-sm font-semibold text-white"
                  href="/importaciones"
                  style={{ background: 'linear-gradient(135deg,#1769E0,#19C3FF)' }}
                >
                  Ver importaciones
                </Link>
              )}
            </div>

            {/* Global progress bar */}
            {isProcessing || allDone ? (
              <div className="mt-4">
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${totalPeriodos > 0 ? (doneCount / totalPeriodos) * 100 : 0}%`,
                      background: 'linear-gradient(90deg,#1769E0,#19C3FF)',
                    }}
                  />
                </div>
                <p className="mt-1 text-right text-xs text-slate-500">{doneCount} / {totalPeriodos}</p>
              </div>
            ) : null}

            <div className="mt-5 space-y-3">
              {preview.periodos.map((periodo) => (
                <PeriodoRow
                  key={periodo.periodo}
                  isProcessing={isProcessing}
                  onRetry={() => handleRetry(periodo)}
                  periodo={periodo}
                  status={statuses.get(periodo.periodo) ?? { state: 'pending' }}
                />
              ))}
            </div>
          </section>
        </>
      ) : null}
    </div>
  )
}

function PeriodoRow({
  isProcessing,
  onRetry,
  periodo,
  status,
}: {
  isProcessing: boolean
  onRetry: () => void
  periodo: PeriodoResumen
  status: PeriodoStatus
}) {
  const label = formatPeriodoLabel(periodo.anio, periodo.mes)

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-900 capitalize">{label}</span>
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
              {periodo.filas.toLocaleString('es-UY')} filas
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {periodo.empresas.length === 1
              ? periodo.empresas[0]
              : `${periodo.empresas.length} empresas: ${periodo.empresas.join(', ')}`}
          </p>

          {status.state === 'processing' ? (
            <div className="mt-3">
              <p className="text-xs text-slate-600">
                Procesando {label}... {status.procesadas.toLocaleString('es-UY')} / {status.total.toLocaleString('es-UY')}
              </p>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-1.5 animate-pulse rounded-full"
                  style={{ width: status.total > 0 ? `${(status.procesadas / status.total) * 100}%` : '5%', background: 'linear-gradient(90deg,#1769E0,#19C3FF)' }}
                />
              </div>
            </div>
          ) : null}

          {status.state === 'done' ? (
            <p className="mt-2 text-xs font-medium text-emerald-700">
              ✅ {status.procesadas.toLocaleString('es-UY')} filas importadas — ID: {status.importacionId}
            </p>
          ) : null}

          {status.state === 'error' ? (
            <p className="mt-2 text-xs text-red-700">❌ {status.message}</p>
          ) : null}
        </div>

        <div className="shrink-0">
          {status.state === 'pending' ? (
            <span className="rounded-full bg-slate-200 px-2 py-1 text-xs text-slate-500">Pendiente</span>
          ) : status.state === 'processing' ? (
            <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">Procesando...</span>
          ) : status.state === 'done' ? (
            <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">Completado</span>
          ) : (
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

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 break-all text-sm font-semibold text-slate-950">{value}</p>
    </div>
  )
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
