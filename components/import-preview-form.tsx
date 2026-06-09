'use client'

import { useState } from 'react'

import { parseSemicolonCsv } from '@/lib/import-preview/csv'
import { PreviewTable } from './import-preview/PreviewTable'
import { UploadZone } from './import-preview/UploadZone'
import { type EmpresaDecision, type EmpresaInfo, type ParsedFile, type PeriodoResumen, type PeriodoStatus, periodoLabel } from './import-preview/types'

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
        initial.set(p.periodo, { state: 'ready' })
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
      <UploadZone
        isChecking={isChecking}
        isParsing={isParsing}
        isProcessing={isProcessing}
        onChange={handleFileChange}
      />

      {parseError ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">{parseError}</div>
      ) : null}

      {parsed && !isParsing && !isChecking ? (
        <PreviewTable
          allDone={allDone}
          anyError={anyError}
          doneCount={doneCount}
          fileName={fileName}
          fileSize={fileSize}
          hasPendingDecisions={hasPendingDecisions}
          isProcessing={isProcessing}
          onConfirmAll={() => void handleConfirmAll()}
          onDecision={setEmpresaDecision}
          onRetry={handleRetry}
          parsed={parsed}
          progressPct={progressPct}
          statuses={statuses}
          totalPeriodos={totalPeriodos}
        />
      ) : null}
    </div>
  )
}
