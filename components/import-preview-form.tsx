'use client'

import Link from 'next/link'
import { useState } from 'react'

import { parseSemicolonCsv } from '@/lib/import-preview/csv'

// ─── Types ────────────────────────────────────────────────────────────────────

type EmpresaDecision = 'pendiente' | 'sobreescribir' | 'omitir'

type EmpresaInfo = {
  nombre: string
  yaExiste: boolean | null // null = loading
  decision: EmpresaDecision
}

type PeriodoResumen = {
  periodo: string // 'YYYY-MM'
  anio: number
  mes: number
  filas: number
  empresas: EmpresaInfo[]
}

type ParsedFile = {
  headers: string[]
  byPeriod: Map<string, Record<string, string>[]>
  periodos: PeriodoResumen[]
}

type PeriodoStatus =
  | { state: 'pending' }
  | { state: 'checking' }
  | { state: 'ready' } // checked, no conflicts or all resolved
  | { state: 'processing' }
  | { state: 'done'; procesadas: number; importacionId: string | null }
  | { state: 'error'; message: string }

// ─── CSV client-side parsing ──────────────────────────────────────────────────

const FECHA_FIELD = 'Fecha de importación'
const EMPRESA_FIELD = 'Empresa'

function parseCsvByPeriod(text: string): Omit<ParsedFile, 'periodos'> & { periodos: (Omit<PeriodoResumen, 'empresas'> & { empresasNombres: string[] })[] } {
  const { headers, rows } = parseSemicolonCsv(text)

  const byPeriod = new Map<string, Record<string, string>[]>()
  const empresasByPeriod = new Map<string, Set<string>>()

  for (const row of rows) {
    const fechaStr = row[FECHA_FIELD] ?? ''
    const periodo = extractPeriodo(fechaStr)
    if (!periodo) continue

    const existing = byPeriod.get(periodo)
    if (existing) {
      existing.push(row)
    } else {
      byPeriod.set(periodo, [row])
      empresasByPeriod.set(periodo, new Set())
    }

    const empresa = row[EMPRESA_FIELD] ?? ''
    if (empresa) empresasByPeriod.get(periodo)!.add(empresa)
  }

  const periodos = [...byPeriod.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([periodo, periodRows]) => {
      const [anioStr, mesStr] = periodo.split('-')
      return {
        periodo,
        anio: Number(anioStr),
        mes: Number(mesStr),
        filas: periodRows.length,
        empresasNombres: [...(empresasByPeriod.get(periodo) ?? [])].sort(),
      }
    })

  return { headers, byPeriod, periodos }
}

function extractPeriodo(fechaStr: string): string | null {
  const m = fechaStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return null
  return `${m[3]}-${m[2]}`
}

function buildPartialFile(headers: string[], rows: Record<string, string>[], periodo: string): File {
  const header = headers.join(';')
  const lines = rows.map((row) => headers.map((h) => row[h] ?? '').join(';'))
  const csv = [header, ...lines].join('\n')
  return new File([csv], `importacion-${periodo}.csv`, { type: 'text/csv' })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS = ['', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

function periodoLabel(anio: number, mes: number) {
  return `${MONTHS[mes] ?? mes} ${anio}`
}

function formatBytes(b: number) {
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ImportPreviewForm() {
  const [fileName, setFileName] = useState<string | null>(null)
  const [fileSize, setFileSize] = useState<number>(0)
  const [parsed, setParsed] = useState<ParsedFile | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [statuses, setStatuses] = useState<Map<string, PeriodoStatus>>(new Map())
  const [isProcessing, setIsProcessing] = useState(false)
  const [doneCount, setDoneCount] = useState(0)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setIsParsing(true)
    setParseError(null)
    setParsed(null)
    setStatuses(new Map())
    setDoneCount(0)
    setFileName(file.name)
    setFileSize(file.size)

    try {
      const text = await file.text()
      await new Promise<void>((r) => setTimeout(r, 0))
      const raw = parseCsvByPeriod(text)

      if (raw.periodos.length === 0) {
        setParseError('No se encontraron períodos válidos. Verificá que "Fecha de importación" tenga fechas en formato dd/mm/yyyy.')
        setIsParsing(false)
        return
      }

      setIsParsing(false)
      setIsChecking(true)

      // Build full PeriodoResumen with empresa state, checking duplicates via API
      const periodos: PeriodoResumen[] = []
      for (const p of raw.periodos) {
        const empresas: EmpresaInfo[] = []
        for (const nombre of p.empresasNombres) {
          const res = await fetch(`/api/importaciones/existe?empresa=${encodeURIComponent(nombre)}&anio=${p.anio}&mes=${p.mes}`)
          const data = await res.json()
          empresas.push({
            nombre,
            yaExiste: res.ok ? (data.existe as boolean) : false,
            decision: data.existe ? 'pendiente' : 'sobreescribir', // 'sobreescribir' here means "proceed normally"
          })
        }
        periodos.push({ periodo: p.periodo, anio: p.anio, mes: p.mes, filas: p.filas, empresas })
      }

      const result: ParsedFile = { headers: raw.headers, byPeriod: raw.byPeriod, periodos }
      setParsed(result)

      const initial = new Map<string, PeriodoStatus>()
      for (const p of periodos) {
        const hasConflict = p.empresas.some((e) => e.yaExiste)
        initial.set(p.periodo, hasConflict ? { state: 'ready' } : { state: 'ready' })
      }
      setStatuses(initial)
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Error al leer el archivo.')
      setIsParsing(false)
    }

    setIsChecking(false)
  }

  function setEmpresaDecision(periodo: string, empresa: string, decision: EmpresaDecision) {
    setParsed((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        periodos: prev.periodos.map((p) =>
          p.periodo === periodo
            ? { ...p, empresas: p.empresas.map((e) => (e.nombre === empresa ? { ...e, decision } : e)) }
            : p,
        ),
      }
    })
  }

  function setStatus(periodo: string, status: PeriodoStatus) {
    setStatuses((prev) => new Map(prev).set(periodo, status))
  }

  async function processPeriodo(resumen: PeriodoResumen, parsedData: ParsedFile): Promise<boolean> {
    const rows = parsedData.byPeriod.get(resumen.periodo) ?? []

    // Determine empresa sets based on user decisions
    const sobreescribir = resumen.empresas
      .filter((e) => e.yaExiste && e.decision === 'sobreescribir')
      .map((e) => e.nombre)
    const omitir = resumen.empresas
      .filter((e) => e.yaExiste && e.decision === 'omitir')
      .map((e) => e.nombre)

    // Check if all companies are being skipped
    const todasOmitidas = resumen.empresas.every((e) => e.yaExiste && e.decision === 'omitir')
    if (todasOmitidas) {
      setStatus(resumen.periodo, { state: 'done', procesadas: 0, importacionId: null })
      return true
    }

    const csvFile = buildPartialFile(parsedData.headers, rows, resumen.periodo)
    setStatus(resumen.periodo, { state: 'processing' })

    const formData = new FormData()
    formData.append('file', csvFile)
    formData.append('periodo', resumen.periodo)
    if (sobreescribir.length > 0) formData.append('sobreescribir', sobreescribir.join('|'))
    if (omitir.length > 0) formData.append('omitir', omitir.join('|'))

    try {
      const res = await fetch('/api/importaciones/confirmar', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) {
        setStatus(resumen.periodo, { state: 'error', message: data.message ?? 'Error al procesar.' })
        return false
      }

      setStatus(resumen.periodo, { state: 'done', procesadas: data.procesadas, importacionId: data.importacionId })
      return true
    } catch {
      setStatus(resumen.periodo, { state: 'error', message: 'Error de conexión.' })
      return false
    }
  }

  async function handleConfirmAll() {
    if (!parsed || isProcessing) return

    // Check all conflicting empresas have a decision
    const pending = parsed.periodos.flatMap((p) =>
      p.empresas.filter((e) => e.yaExiste && e.decision === 'pendiente').map((e) => `${e.nombre} (${periodoLabel(p.anio, p.mes)})`)
    )
    if (pending.length > 0) return // button disabled when pending decisions exist

    setIsProcessing(true)
    let done = [...statuses.values()].filter((s) => s.state === 'done').length

    for (const periodo of parsed.periodos) {
      const current = statuses.get(periodo.periodo)
      if (current?.state === 'done') continue
      const ok = await processPeriodo(periodo, parsed)
      if (ok) {
        done++
        setDoneCount(done)
      }
    }

    setIsProcessing(false)
  }

  async function handleRetry(resumen: PeriodoResumen) {
    if (!parsed || isProcessing) return
    setIsProcessing(true)
    const ok = await processPeriodo(resumen, parsed)
    if (ok) setDoneCount((c) => c + 1)
    setIsProcessing(false)
  }

  const totalPeriodos = parsed?.periodos.length ?? 0
  const allDone = totalPeriodos > 0 && doneCount === totalPeriodos
  const anyError = [...statuses.values()].some((s) => s.state === 'error')
  const hasPendingDecisions = parsed?.periodos.some((p) =>
    p.empresas.some((e) => e.yaExiste && e.decision === 'pendiente')
  ) ?? false
  const progressPct = totalPeriodos > 0 ? (doneCount / totalPeriodos) * 100 : 0

  return (
    <div className="space-y-6">
      {/* File picker */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <label className="block text-sm font-medium text-slate-700" htmlFor="csv-file">
          Archivo CSV
        </label>
        <p className="mt-1 text-xs text-slate-500">
          El archivo se procesa en tu navegador — cada mes se envía al servidor por separado.
        </p>
        <input
          accept=".csv,text/csv"
          className="mt-3 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
          disabled={isParsing || isChecking || isProcessing}
          id="csv-file"
          name="file"
          onChange={handleFileChange}
          type="file"
        />
        {(isParsing || isChecking) ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-slate-600">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
            {isParsing ? 'Analizando archivo...' : 'Verificando importaciones existentes...'}
          </p>
        ) : null}
      </section>

      {parseError ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">{parseError}</div>
      ) : null}

      {parsed && !isParsing && !isChecking ? (
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
                  onClick={handleConfirmAll}
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
                  onDecision={(empresa, decision) => setEmpresaDecision(p.periodo, empresa, decision)}
                  onRetry={() => handleRetry(p)}
                  periodo={p}
                  status={statuses.get(p.periodo) ?? { state: 'ready' }}
                />
              ))}
            </div>
          </section>
        </>
      ) : null}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PeriodoRow({
  isProcessing,
  onDecision,
  onRetry,
  periodo,
  status,
}: {
  isProcessing: boolean
  onDecision: (empresa: string, decision: EmpresaDecision) => void
  onRetry: () => void
  periodo: PeriodoResumen
  status: PeriodoStatus
}) {
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

          {/* Empresa list — only show if period is not yet done */}
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
    // No conflict — just show the empresa name
    return (
      <div className="flex items-center gap-2 text-xs text-slate-600">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
        <span>{empresa.nombre}</span>
      </div>
    )
  }

  // Conflict — show decision controls
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

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 break-all text-sm font-semibold text-slate-950">{value}</p>
    </div>
  )
}
