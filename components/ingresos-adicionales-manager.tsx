'use client'

import { useRouter } from 'next/navigation'
import type { FormEvent } from 'react'
import { useState } from 'react'

import { AlertError } from '@/components/alerts'
import { requestJson } from '@/lib/client-api'

type Empresa = {
  id: string
  nombre: string
}

export type Ingreso = {
  id: string
  concepto: string
  empresaId: string | null
  empresa: string | null
  anio: number
  mes: number
  moneda: string
  montoOrigen: string
  fechaFacturacion: string | null
  tipoCambioAplicado: string | null
  fuenteTipoCambio: string | null
  fechaTipoCambio: string | null
  montoSinIva: string
  porcentajeIva: string
  iva: string
  montoConIva: string
  observaciones: string | null
  creadoEn?: string
}

type FacturaDesarrollo = {
  id: string
  totalHoras: string | number
  valorHoraUSD: string | number
  totalUSD: string | number
  totalConIva: string | number
  issues?: { id: string; descripcion: string; totalHoras: number }[]
}

// ---------- IngresoAdicionalForm ----------

export function IngresoAdicionalForm({ disabled = false, empresas }: { disabled?: boolean; empresas: Empresa[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const today = new Date().toISOString().slice(0, 10)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const result = await request('/api/ingresos-adicionales', 'POST', payload(new FormData(form)))
    if (result.ok === false) {
      setError(result.error)
      return
    }
    form.reset()
    setOpen(false)
    router.refresh()
  }

  if (!open) {
    return (
      <div>
        <button
          className="h-9 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50"
          disabled={disabled}
          onClick={() => setOpen(true)}
          type="button"
        >
          + Nuevo ingreso
        </button>
      </div>
    )
  }

  return (
    <section className="min-w-0 space-y-4 rounded-md border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-950">Nuevo ingreso adicional</h2>
        <button className="text-sm text-slate-500 hover:text-slate-700" onClick={() => setOpen(false)} type="button">Cerrar</button>
      </div>
      <form className="space-y-4" onSubmit={submit}>
        <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Input label="Concepto" name="concepto" required />
          <EmpresaSelect empresas={empresas} />
          <Input label="Anio" name="anio" required />
          <Input label="Mes" name="mes" required />
        </div>
        <IngresoCurrencyFields defaultFechaFacturacion={today} defaultMoneda="UYU" defaultPorcentajeIva="0.22" disabled={disabled} />
        <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="min-w-0 md:col-span-1 xl:col-span-3">
            <Input label="Observaciones" name="observaciones" />
          </div>
          <div className="flex min-w-0 items-end">
            <button className="h-10 w-full rounded-md bg-slate-950 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={disabled} type="submit">
              Crear ingreso
            </button>
          </div>
        </div>
      </form>
      {error ? <AlertError>{error}</AlertError> : null}
    </section>
  )
}

// ---------- IngresoDetailModal ----------

export function IngresoDetailModal({ ingreso, onClose }: { ingreso: Ingreso; onClose: () => void }) {
  const [factura, setFactura] = useState<FacturaDesarrollo | null>(null)
  const [loadingFactura, setLoadingFactura] = useState(false)
  const [facturaLoaded, setFacturaLoaded] = useState(false)

  async function loadFactura() {
    if (facturaLoaded) return
    setLoadingFactura(true)
    try {
      const res = await fetch(`/api/facturas-desarrollo?ingresoAdicionalId=${ingreso.id}`)
      const data = await res.json() as { facturas?: FacturaDesarrollo[] }
      const f = data.facturas?.[0] ?? null
      setFactura(f)
    } catch {
      // ignore
    } finally {
      setLoadingFactura(false)
      setFacturaLoaded(true)
    }
  }

  // Load factura on mount
  if (!facturaLoaded && !loadingFactura) {
    void loadFactura()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-semibold text-slate-950">{ingreso.concepto}</h2>
          <button className="ml-4 text-slate-400 hover:text-slate-700" onClick={onClose} type="button">✕</button>
        </div>

        <dl className="mb-4 grid gap-2 text-sm sm:grid-cols-2">
          <DetailRow label="Empresa" value={ingreso.empresa ?? 'Sin empresa'} />
          <DetailRow label="Período" value={`${String(ingreso.mes).padStart(2, '0')}/${ingreso.anio}`} />
          <DetailRow label="Fecha facturación" value={ingreso.fechaFacturacion ? ingreso.fechaFacturacion.slice(0, 10) : '—'} />
          <DetailRow label="Moneda" value={ingreso.moneda} />
          <DetailRow label="Monto origen" value={ingreso.montoOrigen} />
          <DetailRow label="Tipo de cambio" value={ingreso.tipoCambioAplicado ?? 'No aplica'} />
          {ingreso.fuenteTipoCambio ? <DetailRow label="Fuente TC" value={ingreso.fuenteTipoCambio} /> : null}
          {ingreso.fechaTipoCambio ? <DetailRow label="Fecha TC" value={ingreso.fechaTipoCambio.slice(0, 10)} /> : null}
          <DetailRow label="Monto s/IVA" value={ingreso.montoSinIva} />
          <DetailRow label="IVA %" value={ingreso.porcentajeIva} />
          <DetailRow label="IVA" value={ingreso.iva} />
          <DetailRow label="Monto c/IVA" value={ingreso.montoConIva} />
          {ingreso.observaciones ? <DetailRow label="Observaciones" value={ingreso.observaciones} /> : null}
        </dl>

        {loadingFactura && <p className="text-sm text-slate-500">Cargando factura de desarrollo…</p>}

        {facturaLoaded && factura && (
          <div className="border-t border-slate-200 pt-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Factura de desarrollo asociada</h3>
            <dl className="mb-3 grid gap-2 text-sm sm:grid-cols-2">
              <DetailRow label="Total horas" value={String(factura.totalHoras)} />
              <DetailRow label="Valor hora USD" value={String(factura.valorHoraUSD)} />
              <DetailRow label="Total USD s/IVA" value={String(factura.totalUSD)} />
              <DetailRow label="Total c/IVA" value={String(factura.totalConIva)} />
            </dl>
            {factura.issues && factura.issues.length > 0 && (
              <>
                <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Issues incluidos</p>
                <div className="overflow-x-auto rounded-md border border-slate-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                      <tr>
                        <th className="px-3 py-2 text-left">Descripción</th>
                        <th className="px-3 py-2 text-right">Horas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {factura.issues.map((issue) => (
                        <tr key={issue.id}>
                          <td className="px-3 py-2 text-slate-700">{issue.descripcion}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-right font-medium">{issue.totalHoras}h</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {facturaLoaded && !factura && (
          <p className="border-t border-slate-200 pt-4 text-sm text-slate-400">No tiene factura de desarrollo asociada.</p>
        )}

        <div className="mt-4 flex justify-end">
          <button className="h-9 rounded-md bg-slate-950 px-5 text-sm font-semibold text-white" onClick={onClose} type="button">Cerrar</button>
        </div>
      </div>
    </div>
  )
}

// ---------- IngresoRowActions ----------

export function IngresoRowActions({ disabled = false, ingreso }: { disabled?: boolean; ingreso: Ingreso }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  async function remove() {
    if (!confirm('¿Eliminar este ingreso adicional?')) return
    const result = await request(`/api/ingresos-adicionales/${ingreso.id}`, 'DELETE', null)
    if (result.ok === false) {
      setError(result.error)
      return
    }
    router.refresh()
  }

  return (
    <>
      {showModal && <IngresoDetailModal ingreso={ingreso} onClose={() => setShowModal(false)} />}
      <div className="flex gap-2">
        <button
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          onClick={() => setShowModal(true)}
          type="button"
        >
          Ver detalle
        </button>
        <button
          className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-60 hover:bg-red-50"
          disabled={disabled}
          onClick={() => void remove()}
          type="button"
        >
          Eliminar
        </button>
      </div>
      {error ? <AlertError>{error}</AlertError> : null}
    </>
  )
}

// ---------- Internal helpers ----------

function payload(form: FormData) {
  return {
    concepto: form.get('concepto'),
    empresaId: form.get('empresaId'),
    anio: form.get('anio'),
    mes: form.get('mes'),
    moneda: form.get('moneda'),
    montoOrigen: form.get('montoOrigen'),
    fechaFacturacion: form.get('fechaFacturacion'),
    tipoCambioAplicado: form.get('tipoCambioAplicado'),
    fuenteTipoCambio: form.get('fuenteTipoCambio'),
    fechaTipoCambio: form.get('fechaTipoCambio'),
    porcentajeIva: form.get('porcentajeIva'),
    observaciones: form.get('observaciones'),
  }
}

function IngresoCurrencyFields({
  compact,
  defaultFechaFacturacion,
  defaultFechaTipoCambio,
  defaultFuenteTipoCambio,
  defaultMoneda,
  defaultMontoOrigen,
  defaultPorcentajeIva,
  defaultTipoCambioAplicado,
  disabled = false,
}: {
  compact?: boolean
  defaultFechaFacturacion: string
  defaultFechaTipoCambio?: string
  defaultFuenteTipoCambio?: string
  defaultMoneda: string
  defaultMontoOrigen?: string
  defaultPorcentajeIva?: string
  defaultTipoCambioAplicado?: string
  disabled?: boolean
}) {
  const [moneda, setMoneda] = useState(defaultMoneda)
  const [montoOrigen, setMontoOrigen] = useState(defaultMontoOrigen ?? '')
  const [fechaFacturacion, setFechaFacturacion] = useState(defaultFechaFacturacion)
  const [tipoCambio, setTipoCambio] = useState(defaultTipoCambioAplicado ?? '')
  const [fuente, setFuente] = useState(defaultFuenteTipoCambio ?? '')
  const [fechaTipoCambio, setFechaTipoCambio] = useState(defaultFechaTipoCambio ?? '')
  const [porcentajeIvaPreview, setPorcentajeIvaPreview] = useState(defaultPorcentajeIva ?? '0.22')
  const [rateError, setRateError] = useState<string | null>(null)
  const montoSinIva = calculateMontoSinIva(moneda, montoOrigen, tipoCambio)
  const iva = montoSinIva * (Number(porcentajeIvaPreview) || 0)
  const montoConIva = montoSinIva + iva
  const inputClass = compact
    ? 'h-9 min-w-0 rounded-md border border-slate-300 px-2 text-sm'
    : 'h-10 w-full min-w-0 rounded-md border border-slate-300 px-3 text-sm'

  async function fetchTipoCambio() {
    setRateError(null)
    const result = await requestJson<{ valor: string; fuente: string; fechaTipoCambio: string }>(
      `/api/tipo-cambio/usd?fecha=${encodeURIComponent(fechaFacturacion)}`,
      undefined,
      'No se pudo obtener el tipo de cambio.',
    )

    if (result.ok === false) {
      setRateError(result.error)
      return
    }

    setTipoCambio(result.data.valor)
    setFuente(result.data.fuente)
    setFechaTipoCambio(result.data.fechaTipoCambio)
  }

  if (compact) {
    return (
      <>
        <select className={inputClass} disabled={disabled} name="moneda" onChange={(event) => setMoneda(event.currentTarget.value)} value={moneda}>
          <option value="UYU">UYU</option>
          <option value="USD">USD</option>
        </select>
        <input
          className={inputClass}
          disabled={disabled}
          name="montoOrigen"
          onChange={(event) => setMontoOrigen(event.currentTarget.value)}
          placeholder="Monto origen"
          required
          value={montoOrigen}
        />
        <input
          className={inputClass}
          disabled={disabled}
          name="fechaFacturacion"
          onChange={(event) => setFechaFacturacion(event.currentTarget.value)}
          required
          type="date"
          value={fechaFacturacion}
        />
        {moneda === 'USD' ? (
          <>
            <input
              className={inputClass}
              disabled={disabled}
              name="tipoCambioAplicado"
              onChange={(event) => setTipoCambio(event.currentTarget.value)}
              placeholder="Tipo cambio aplicado"
              required
              value={tipoCambio}
            />
            <input name="fuenteTipoCambio" type="hidden" value={fuente} />
            <input name="fechaTipoCambio" type="hidden" value={fechaTipoCambio} />
            <button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60" disabled={disabled} onClick={fetchTipoCambio} type="button">
              Obtener tipo de cambio
            </button>
            {rateError ? <AlertError>{rateError}</AlertError> : null}
          </>
        ) : (
          <>
            <input name="tipoCambioAplicado" type="hidden" value={tipoCambio || '1'} />
            <input name="fuenteTipoCambio" type="hidden" value={fuente} />
            <input name="fechaTipoCambio" type="hidden" value={fechaTipoCambio} />
          </>
        )}
        <input
          className={inputClass}
          disabled={disabled}
          name="porcentajeIva"
          onChange={(event) => setPorcentajeIvaPreview(event.currentTarget.value)}
          placeholder="Porcentaje IVA"
          required
          value={porcentajeIvaPreview}
        />
      </>
    )
  }

  return (
    <>
      <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="min-w-0 space-y-1 text-sm font-medium text-slate-700">
          Moneda
          <select className={inputClass} disabled={disabled} name="moneda" onChange={(event) => setMoneda(event.currentTarget.value)} value={moneda}>
            <option value="UYU">UYU</option>
            <option value="USD">USD</option>
          </select>
        </label>
        <label className="min-w-0 space-y-1 text-sm font-medium text-slate-700">
          Monto origen
          <input
            className={inputClass}
            disabled={disabled}
            name="montoOrigen"
            onChange={(event) => setMontoOrigen(event.currentTarget.value)}
            required
            value={montoOrigen}
          />
        </label>
        <label className="min-w-0 space-y-1 text-sm font-medium text-slate-700">
          Fecha facturacion
          <input
            className={inputClass}
            disabled={disabled}
            name="fechaFacturacion"
            onChange={(event) => setFechaFacturacion(event.currentTarget.value)}
            required
            type="date"
            value={fechaFacturacion}
          />
        </label>
        <label className="min-w-0 space-y-1 text-sm font-medium text-slate-700">
          Porcentaje IVA
          <input
            className={inputClass}
            disabled={disabled}
            name="porcentajeIva"
            onChange={(event) => setPorcentajeIvaPreview(event.currentTarget.value)}
            required
            value={porcentajeIvaPreview}
          />
        </label>
      </div>
      {moneda === 'USD' ? (
        <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="min-w-0 space-y-1 text-sm font-medium text-slate-700">
            Tipo cambio aplicado
            <input
              className={inputClass}
              disabled={disabled}
              name="tipoCambioAplicado"
              onChange={(event) => setTipoCambio(event.currentTarget.value)}
              required
              value={tipoCambio}
            />
          </label>
          <input name="fuenteTipoCambio" type="hidden" value={fuente} />
          <input name="fechaTipoCambio" type="hidden" value={fechaTipoCambio} />
          <div className="flex min-w-0 items-end">
            <button className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60" disabled={disabled} onClick={fetchTipoCambio} type="button">
              Obtener tipo de cambio
            </button>
          </div>
          {rateError ? <AlertError className="self-end md:col-span-2">{rateError}</AlertError> : null}
        </div>
      ) : (
        <>
          <input name="tipoCambioAplicado" type="hidden" value={tipoCambio || '1'} />
          <input name="fuenteTipoCambio" type="hidden" value={fuente} />
          <input name="fechaTipoCambio" type="hidden" value={fechaTipoCambio} />
        </>
      )}
      <div className="grid min-w-0 gap-3 rounded-md bg-slate-50 p-3 text-sm md:grid-cols-3">
        <SummaryItem label="Monto sin IVA UYU" value={montoSinIva} />
        <SummaryItem label="IVA UYU" value={iva} />
        <SummaryItem label="Monto con IVA UYU" value={montoConIva} />
      </div>
    </>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-slate-800">{value}</dd>
    </div>
  )
}

function SummaryItem({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 font-semibold tabular-nums text-slate-950">{formatMoney(value)}</p>
    </div>
  )
}

function EmpresaSelect({
  compact,
  defaultValue,
  disabled,
  empresas,
}: {
  compact?: boolean
  defaultValue?: string
  disabled?: boolean
  empresas: Empresa[]
}) {
  return (
    <label className={compact ? 'min-w-0' : 'min-w-0 space-y-1 text-sm font-medium text-slate-700'}>
      {compact ? null : 'Empresa'}
      <select className="h-10 w-full min-w-0 rounded-md border border-slate-300 px-3 text-sm disabled:bg-slate-100" defaultValue={defaultValue} disabled={disabled} name="empresaId">
        <option value="">Sin empresa</option>
        {empresas.map((empresa) => (
          <option key={empresa.id} value={empresa.id}>
            {empresa.nombre}
          </option>
        ))}
      </select>
    </label>
  )
}

function Input({
  defaultValue,
  label,
  name,
  required,
}: {
  defaultValue?: string
  label: string
  name: string
  required?: boolean
}) {
  return (
    <label className="min-w-0 space-y-1 text-sm font-medium text-slate-700">
      {label}
      <input className="h-10 w-full min-w-0 rounded-md border border-slate-300 px-3 text-sm" defaultValue={defaultValue} name={name} required={required} />
    </label>
  )
}

async function request(url: string, method: string, body: Record<string, unknown> | null) {
  const result = await requestJson(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  }, 'No se pudo completar la operación.')

  return result.ok === true ? { ok: true, error: null } : { ok: false, error: result.error }
}

function calculateMontoSinIva(moneda: string, montoOrigen: string, tipoCambio: string) {
  const monto = Number(montoOrigen) || 0
  const cambio = Number(tipoCambio) || 0
  return moneda === 'USD' ? monto * cambio : monto
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('es-UY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}
