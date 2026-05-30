'use client'

import Link from 'next/link'
import { useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type PeriodoResumen = {
  periodo: string // 'YYYY-MM'
  anio: number
  mes: number
  filas: number
  empresas: string[]
}

type ParsedFile = {
  header: string
  byPeriod: Map<string, string[]> // periodo → raw CSV lines (no header)
  periodos: PeriodoResumen[]
}

type PeriodoStatus =
  | { state: 'pending' }
  | { state: 'processing' }
  | { state: 'done'; procesadas: number; importacionId: string }
  | { state: 'error'; message: string }

// ─── CSV parsing (client-side, no server round-trip) ─────────────────────────

const FECHA_IMPORTACION_IDX = 6 // column index in the spec
const EMPRESA_IDX = 2

function parseCSVClient(text: string): ParsedFile {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalized.split('\n')
  const header = lines[0] ?? ''

  // Determine actual column indices from header (fallback to spec defaults)
  const headers = header.split(';').map((h) => h.trim().replace(/^﻿/, ''))
  const fechaIdx = headers.indexOf('Fecha de importación') !== -1 ? headers.indexOf('Fecha de importación') : FECHA_IMPORTACION_IDX
  const empresaIdx = headers.indexOf('Empresa') !== -1 ? headers.indexOf('Empresa') : EMPRESA_IDX

  const byPeriod = new Map<string, string[]>()
  const empresasByPeriod = new Map<string, Set<string>>()

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line || !line.trim()) continue

    // Fast field extraction — split by ; (dates/names don't contain semicolons)
    const fields = line.split(';')
    const fechaStr = (fields[fechaIdx] ?? '').trim()
    const periodo = extractPeriodo(fechaStr)
    if (!periodo) continue

    const rows = byPeriod.get(periodo)
    if (rows) {
      rows.push(line)
    } else {
      byPeriod.set(periodo, [line])
      empresasByPeriod.set(periodo, new Set())
    }

    const empresa = (fields[empresaIdx] ?? '').trim()
    if (empresa) empresasByPeriod.get(periodo)!.add(empresa)
  }

  const periodos: PeriodoResumen[] = [...byPeriod.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([periodo, rows]) => {
      const [anioStr, mesStr] = periodo.split('-')
      return {
        periodo,
        anio: Number(anioStr),
        mes: Number(mesStr),
        filas: rows.length,
        empresas: [...(empresasByPeriod.get(periodo) ?? [])].sort(),
      }
    })

  return { header, byPeriod, periodos }
}

function extractPeriodo(fechaStr: string): string | null {
  const m = fechaStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return null
  return `${m[3]}-${m[2]}` // YYYY-MM
}

function buildPartialFile(header: string, lines: string[], periodo: string): File {
  const csv = [header, ...lines].join('\n')
  return new File([csv], `importacion-${periodo}.csv`, { type: 'text/csv' })
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
      // Read file async (non-blocking)
      const text = await file.text()
      // Yield to browser so spinner renders before synchronous parsing
      await new Promise<void>((r) => setTimeout(r, 0))
      const result = parseCSVClient(text)

      if (result.periodos.length === 0) {
        setParseError('No se encontraron períodos válidos. Verificá que la columna "Fecha de importación" tenga fechas en formato dd/mm/yyyy.')
        setIsParsing(false)
        return
      }

      setParsed(result)
      const initial = new Map<string, PeriodoStatus>()
      for (const p of result.periodos) initial.set(p.periodo, { state: 'pending' })
      setStatuses(initial)
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Error al leer el archivo.')
    }

    setIsParsing(false)
  }

  function setStatus(periodo: string, status: PeriodoStatus) {
    setStatuses((prev) => new Map(prev).set(periodo, status))
  }

  async function processPeriodo(resumen: PeriodoResumen, parsedData: ParsedFile): Promise<boolean> {
    const lines = parsedData.byPeriod.get(resumen.periodo) ?? []
    const csvFile = buildPartialFile(parsedData.header, lines, resumen.periodo)

    setStatus(resumen.periodo, { state: 'processing' })

    const formData = new FormData()
    formData.append('file', csvFile)
    formData.append('periodo', resumen.periodo)

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
  const progressPct = totalPeriodos > 0 ? (doneCount / totalPeriodos) * 100 : 0

  return (
    <div className="space-y-6">
      {/* File picker */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <label className="block text-sm font-medium text-slate-700" htmlFor="csv-file">
          Archivo CSV
        </label>
        <p className="mt-1 text-xs text-slate-500">
          El archivo se procesa directamente en tu navegador — no se sube completo al servidor.
        </p>
        <input
          accept=".csv,text/csv"
          className="mt-3 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
          disabled={isParsing || isProcessing}
          id="csv-file"
          name="file"
          onChange={handleFileChange}
          type="file"
        />
        {isParsing ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-slate-600">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
            Analizando archivo...
          </p>
        ) : null}
      </section>

      {parseError ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">{parseError}</div>
      ) : null}

      {parsed && !isParsing ? (
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
                {isProcessing ? (
                  <p className="mt-1 text-sm text-slate-500">{doneCount} de {totalPeriodos} meses completados</p>
                ) : allDone ? (
                  <p className="mt-1 text-sm font-medium text-emerald-700">✅ Todos los meses fueron importados.</p>
                ) : anyError ? (
                  <p className="mt-1 text-sm text-red-700">Algunos meses fallaron. Podés reintentarlos.</p>
                ) : null}
              </div>

              {!allDone ? (
                <button
                  className="shrink-0 rounded-md px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isProcessing}
                  onClick={handleConfirmAll}
                  style={{ background: isProcessing ? '#94a3b8' : 'linear-gradient(135deg,#1769E0,#19C3FF)' }}
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
                  onRetry={() => handleRetry(p)}
                  periodo={p}
                  status={statuses.get(p.periodo) ?? { state: 'pending' }}
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
  onRetry,
  periodo,
  status,
}: {
  isProcessing: boolean
  onRetry: () => void
  periodo: PeriodoResumen
  status: PeriodoStatus
}) {
  const label = periodoLabel(periodo.anio, periodo.mes)

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium capitalize text-slate-900">{label}</span>
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
              {periodo.filas.toLocaleString('es-UY')} filas
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 truncate">
            {periodo.empresas.length === 1
              ? periodo.empresas[0]
              : `${periodo.empresas.length} empresas: ${periodo.empresas.join(', ')}`}
          </p>

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
              ✅ {status.procesadas.toLocaleString('es-UY')} filas importadas
              <span className="ml-2 font-normal text-slate-400">ID: {status.importacionId}</span>
            </p>
          ) : null}

          {status.state === 'error' ? (
            <p className="mt-2 text-xs text-red-700">❌ {status.message}</p>
          ) : null}
        </div>

        <div className="shrink-0">
          {status.state === 'pending' && (
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

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 break-all text-sm font-semibold text-slate-950">{value}</p>
    </div>
  )
}
