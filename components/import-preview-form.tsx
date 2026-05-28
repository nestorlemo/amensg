'use client'

import Link from 'next/link'
import type { FormEvent } from 'react'
import { useState } from 'react'

import type { ImportPreviewResult } from '@/lib/import-preview/types'

type ConfirmResult = {
  importacionId: string
  facturaciones: Array<{
    id: string
    empresaId: string
    empresaNombreArchivo: string
    anio: number
    mes: number
    cantidadActivaciones: number
    subtotal: string
    iva: string
    total: string
  }>
}

type ApiPayload = {
  error?: string
  message?: string
  missingCompanies?: string[]
}

export function ImportPreviewForm() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null)
  const [confirmResult, setConfirmResult] = useState<ConfirmResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [missingCompanies, setMissingCompanies] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [showConfirmStep, setShowConfirmStep] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!file) {
      setError('Seleccione un archivo CSV para previsualizar.')
      return
    }

    setIsLoading(true)
    setError(null)
    setConfirmError(null)
    setMissingCompanies([])
    setPreview(null)
    setConfirmResult(null)
    setShowConfirmStep(false)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/importaciones/preview', {
        method: 'POST',
        body: formData,
      })

      const payload = await parseResponsePayload(response)

      if (!response.ok) {
        setError(apiErrorMessage(payload, 'No se pudo generar la vista previa.'))
        return
      }

      setPreview(payload as ImportPreviewResult)
    } catch {
      setError('No se pudo conectar con el endpoint de vista previa.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleConfirm() {
    if (!file || !preview || preview.validation.hasBlockingErrors) {
      return
    }

    setIsConfirming(true)
    setConfirmError(null)
    setMissingCompanies([])
    setConfirmResult(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/importaciones/confirmar', {
        method: 'POST',
        body: formData,
      })
      const payload = (await parseResponsePayload(response)) as ApiPayload & ConfirmResult

      if (!response.ok) {
        setConfirmError(payload.message ?? payload.error ?? 'No se pudo confirmar la importación.')
        setMissingCompanies('missingCompanies' in payload && Array.isArray(payload.missingCompanies) ? payload.missingCompanies : [])
        return
      }

      setShowConfirmStep(false)
      setConfirmResult(payload as ConfirmResult)
    } catch {
      setConfirmError('No se pudo conectar con el endpoint de confirmación.')
    } finally {
      setIsConfirming(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="csv-file">
              Archivo CSV
            </label>
            <input
              accept=".csv,text/csv"
              className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              id="csv-file"
              name="file"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              type="file"
            />
          </div>
          <button
            className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading}
            type="submit"
          >
            {isLoading ? 'Generando preview...' : 'Generar preview'}
          </button>
        </form>
      </section>

      {error ? (
        <section className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</section>
      ) : null}

      {preview ? (
        <PreviewResult
          confirmError={confirmError}
          confirmResult={confirmResult}
          isConfirming={isConfirming}
          missingCompanies={missingCompanies}
          onCancelConfirm={() => setShowConfirmStep(false)}
          onConfirm={handleConfirm}
          onRequestConfirm={() => setShowConfirmStep(true)}
          preview={preview}
          showConfirmStep={showConfirmStep}
        />
      ) : null}
    </div>
  )
}

function PreviewResult({
  confirmError,
  confirmResult,
  isConfirming,
  missingCompanies,
  onCancelConfirm,
  onConfirm,
  onRequestConfirm,
  preview,
  showConfirmStep,
}: {
  confirmError: string | null
  confirmResult: ConfirmResult | null
  isConfirming: boolean
  missingCompanies: string[]
  onCancelConfirm: () => void
  onConfirm: () => void
  onRequestConfirm: () => void
  preview: ImportPreviewResult
  showConfirmStep: boolean
}) {
  const period = preview.detectedPeriod
    ? `${String(preview.detectedPeriod.mes).padStart(2, '0')}/${preview.detectedPeriod.anio}`
    : 'No detectado'

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-950">Resultado de preview</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Archivo" value={preview.file.name} />
          <Metric label="Tamaño" value={`${preview.file.size} bytes`} />
          <Metric label="Periodo" value={period} />
          <Metric label="Hash SHA-256" value={preview.file.hash} wide />
          <Metric label="Filas totales" value={preview.totalRows} />
          <Metric label="Filas importables" value={preview.importableRows} />
          <Metric label="Filas facturables" value={preview.facturableRows} />
          <Metric label="Empresas" value={preview.detectedCompaniesCount} />
          <Metric label="Lotes" value={preview.detectedLotsCount} />
          <Metric label="Estados" value={preview.detectedStatesCount} />
          <Metric label="Completadas" value={preview.completedActivationsCount} />
          <Metric label="Sin fecha real" value={preview.activationsWithoutRealActivationDateCount} />
        </div>
      </section>

      <ValidationPanel preview={preview} />

      {!preview.validation.hasBlockingErrors && !confirmResult ? (
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-950">Confirmar importación</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            La confirmación persiste la importación, todas las filas del CSV y genera una facturación mensual por
            empresa. Esta acción no implementa cancelación ni edición de filas importadas.
          </p>
          {!showConfirmStep ? (
            <button
              className="mt-4 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
              onClick={onRequestConfirm}
              type="button"
            >
              Confirmar importación
            </button>
          ) : (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-950">Confirme que desea guardar esta importación.</p>
              <div className="mt-3 flex gap-3">
                <button
                  className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isConfirming}
                  onClick={onConfirm}
                  type="button"
                >
                  {isConfirming ? 'Confirmando...' : 'Sí, confirmar'}
                </button>
                <button
                  className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  disabled={isConfirming}
                  onClick={onCancelConfirm}
                  type="button"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </section>
      ) : null}

      {confirmError ? (
        <section className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-900">
          <p className="font-semibold">{confirmError}</p>
          {missingCompanies.length > 0 ? (
            <ul className="mt-3 list-inside list-disc">
              {missingCompanies.map((company) => (
                <li key={company}>{company}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {confirmResult ? <ConfirmationResult result={confirmResult} /> : null}

      <section className="grid gap-6 xl:grid-cols-3">
        <SummaryTable title="Empresas" rows={preview.companySummary} />
        <SummaryTable title="Estados" rows={preview.stateSummary} />
        <SummaryTable title="Lotes" rows={preview.lotSummary} />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-950">Preview económico</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Metric label="Precio unitario" value={preview.economicPreview.precioUnitarioActivacion} />
          <Metric label="IVA %" value={preview.economicPreview.porcentajeIva} />
          <Metric label="Total sin IVA" value={preview.economicPreview.totalSinIva} />
          <Metric label="IVA" value={preview.economicPreview.iva} />
          <Metric label="Total con IVA" value={preview.economicPreview.totalConIva} />
        </div>
      </section>
    </div>
  )
}

function ConfirmationResult({ result }: { result: ConfirmResult }) {
  return (
    <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
      <h2 className="text-lg font-semibold text-emerald-950">Importación confirmada</h2>
      <p className="mt-2 text-sm text-emerald-900">Importacion ID: {result.importacionId}</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-emerald-900">
            <tr>
              <th className="border-b border-emerald-200 py-2 pr-3 font-medium">Empresa</th>
              <th className="border-b border-emerald-200 py-2 pr-3 font-medium">Activaciones</th>
              <th className="border-b border-emerald-200 py-2 pr-3 font-medium">Subtotal</th>
              <th className="border-b border-emerald-200 py-2 pr-3 font-medium">IVA</th>
              <th className="border-b border-emerald-200 py-2 pr-3 font-medium">Total</th>
              <th className="border-b border-emerald-200 py-2 pr-3 font-medium">Facturación ID</th>
            </tr>
          </thead>
          <tbody>
            {result.facturaciones.map((facturacion) => (
              <tr key={facturacion.id}>
                <td className="border-b border-emerald-100 py-2 pr-3">{facturacion.empresaNombreArchivo}</td>
                <td className="border-b border-emerald-100 py-2 pr-3">{facturacion.cantidadActivaciones}</td>
                <td className="border-b border-emerald-100 py-2 pr-3">{facturacion.subtotal}</td>
                <td className="border-b border-emerald-100 py-2 pr-3">{facturacion.iva}</td>
                <td className="border-b border-emerald-100 py-2 pr-3">{facturacion.total}</td>
                <td className="border-b border-emerald-100 py-2 pr-3">{facturacion.id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Link className="mt-4 inline-flex text-sm font-semibold text-emerald-950 underline" href="/importaciones">
        Ver importaciones
      </Link>
    </section>
  )
}

function ValidationPanel({ preview }: { preview: ImportPreviewResult }) {
  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <IssueList
        emptyText="No hay errores bloqueantes."
        items={preview.validation.errors}
        tone="error"
        title="Errores bloqueantes"
      />
      <IssueList
        emptyText="No hay advertencias."
        items={preview.validation.warnings}
        tone="warning"
        title="Advertencias"
      />
    </section>
  )
}

function IssueList({
  emptyText,
  items,
  title,
  tone,
}: {
  emptyText: string
  items: ImportPreviewResult['validation']['errors']
  title: string
  tone: 'error' | 'warning'
}) {
  const classes =
    tone === 'error'
      ? 'border-red-200 bg-red-50 text-red-900'
      : 'border-amber-200 bg-amber-50 text-amber-900'

  if (tone === 'warning') {
    return <WarningList classes={classes} emptyText={emptyText} items={items} title={title} />
  }

  return (
    <div className={`rounded-lg border p-5 ${classes}`}>
      <h2 className="text-lg font-semibold">{title}</h2>
      {items.length > 0 ? (
        <ul className="mt-3 space-y-2 text-sm">
          {items.map((item, index) => (
            <li key={`${item.code}-${item.row ?? 'global'}-${index}`}>
              {item.row ? `Fila ${item.row}: ` : ''}
              {item.message}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm">{emptyText}</p>
      )}
    </div>
  )
}

function WarningList({
  classes,
  emptyText,
  items,
  title,
}: {
  classes: string
  emptyText: string
  items: ImportPreviewResult['validation']['warnings']
  title: string
}) {
  const [expanded, setExpanded] = useState(false)
  const grouped = groupWarnings(items)

  return (
    <div className={`rounded-lg border p-5 ${classes}`}>
      <h2 className="text-lg font-semibold">{title}</h2>
      {items.length > 0 ? (
        <div className="mt-3 space-y-3 text-sm">
          <p className="font-medium">Total de advertencias: {items.length}</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {grouped.map((item) => (
              <li className="rounded-md bg-white/60 px-3 py-2" key={item.code}>
                <span className="font-semibold">{warningLabel(item.code)}:</span> {item.count}
              </li>
            ))}
          </ul>
          <button
            className="rounded-md border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100"
            type="button"
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? 'Ocultar detalle de advertencias' : 'Ver detalle de advertencias'}
          </button>
          {expanded ? (
            <div className="max-h-80 overflow-y-auto rounded-md border border-amber-200 bg-white/70 p-3">
              <ul className="space-y-2">
                {items.map((item, index) => (
                  <li key={`${item.code}-${item.row ?? 'global'}-${index}`}>
                    {item.row ? `Fila ${item.row}: ` : ''}
                    {item.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-sm">{emptyText}</p>
      )}
    </div>
  )
}

function SummaryTable({
  title,
  rows,
}: {
  title: string
  rows: Array<{ name: string; count: number; importableRows?: number; facturableRows?: number }>
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="border-b border-slate-200 py-2 pr-3 font-medium">Nombre</th>
              <th className="border-b border-slate-200 py-2 pr-3 font-medium">Filas</th>
              {rows.some((row) => row.importableRows !== undefined) ? (
                <th className="border-b border-slate-200 py-2 pr-3 font-medium">Importables</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name}>
                <td className="border-b border-slate-100 py-2 pr-3 text-slate-900">{row.name}</td>
                <td className="border-b border-slate-100 py-2 pr-3 text-slate-700">{row.count}</td>
                {row.importableRows !== undefined ? (
                  <td className="border-b border-slate-100 py-2 pr-3 text-slate-700">{row.importableRows}</td>
                ) : null}
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="py-2 text-slate-500" colSpan={3}>
                  Sin datos.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function Metric({ label, value, wide = false }: { label: string; value: string | number; wide?: boolean }) {
  return (
    <div className={`rounded-md border border-slate-200 bg-slate-50 p-3 ${wide ? 'lg:col-span-3' : ''}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-950">{value}</p>
    </div>
  )
}

async function parseResponsePayload(response: Response): Promise<ApiPayload | ImportPreviewResult | ConfirmResult> {
  const contentType = response.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    return (await response.json()) as ApiPayload | ImportPreviewResult | ConfirmResult
  }

  const text = await response.text().catch(() => '')
  return {
    error: text || `${response.status} ${response.statusText}`,
  }
}

function apiErrorMessage(payload: ApiPayload | ImportPreviewResult | ConfirmResult, fallback: string) {
  if ('message' in payload && payload.message) {
    return payload.message
  }

  if ('error' in payload && payload.error) {
    return payload.error
  }

  return fallback
}

function groupWarnings(items: ImportPreviewResult['validation']['warnings']) {
  const counts = new Map<string, number>()

  for (const item of items) {
    counts.set(item.code, (counts.get(item.code) ?? 0) + 1)
  }

  return [...counts.entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((left, right) => right.count - left.count || left.code.localeCompare(right.code))
}

function warningLabel(code: string) {
  const labels: Record<string, string> = {
    FECHA_TECNICA: 'Fechas técnicas',
    ESTADO_NO_OK: 'Estados no OK',
    TECHNICAL_ACTIVATION_DATE: 'Fechas técnicas',
    NON_OK_STATE: 'Estados no OK',
    PARAMETERS_UNAVAILABLE: 'Parámetros no disponibles',
  }

  return labels[code] ?? code
}
