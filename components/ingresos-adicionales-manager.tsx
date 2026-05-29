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

type Ingreso = {
  id: string
  concepto: string
  empresaId: string | null
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
}

export function IngresoAdicionalForm({ disabled = false, empresas }: { disabled?: boolean; empresas: Empresa[] }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const today = new Date().toISOString().slice(0, 10)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const result = await request('/api/ingresos-adicionales', 'POST', payload(new FormData(form)))
    if (!result.ok) {
      setError(result.error)
      return
    }
    form.reset()
    router.refresh()
  }

  return (
    <section className="min-w-0 space-y-4 rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-semibold text-slate-950">Nuevo ingreso adicional</h2>
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

export function IngresoRowActions({ disabled = false, empresas, ingreso }: { disabled?: boolean; empresas: Empresa[]; ingreso: Ingreso }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  async function update(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = await request(`/api/ingresos-adicionales/${ingreso.id}`, 'PUT', payload(new FormData(event.currentTarget)))
    if (!result.ok) {
      setError(result.error)
      return
    }
    router.refresh()
  }

  async function remove() {
    const result = await request(`/api/ingresos-adicionales/${ingreso.id}`, 'DELETE', null)
    if (!result.ok) {
      setError(result.error)
      return
    }
    router.refresh()
  }

  return (
    <form className="grid min-w-0 gap-2 md:grid-cols-2 xl:grid-cols-3" onSubmit={update}>
      <input className="h-9 rounded-md border border-slate-300 px-2 text-sm disabled:bg-slate-100" defaultValue={ingreso.concepto} disabled={disabled} name="concepto" />
      <EmpresaSelect compact defaultValue={ingreso.empresaId ?? ''} disabled={disabled} empresas={empresas} />
      <input className="h-9 rounded-md border border-slate-300 px-2 text-sm disabled:bg-slate-100" defaultValue={ingreso.anio} disabled={disabled} name="anio" />
      <input className="h-9 rounded-md border border-slate-300 px-2 text-sm disabled:bg-slate-100" defaultValue={ingreso.mes} disabled={disabled} name="mes" />
      <IngresoCurrencyFields
        compact
        defaultFechaFacturacion={dateValue(ingreso.fechaFacturacion)}
        defaultFechaTipoCambio={dateValue(ingreso.fechaTipoCambio)}
        defaultFuenteTipoCambio={ingreso.fuenteTipoCambio ?? ''}
        defaultMoneda={ingreso.moneda}
        defaultMontoOrigen={ingreso.montoOrigen}
        defaultPorcentajeIva={ingreso.porcentajeIva}
        defaultTipoCambioAplicado={ingreso.tipoCambioAplicado ?? ''}
        disabled={disabled}
      />
      <input className="h-9 rounded-md border border-slate-300 px-2 text-sm disabled:bg-slate-100" defaultValue={ingreso.observaciones ?? ''} disabled={disabled} name="observaciones" placeholder="Observaciones" />
      <button className="rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={disabled} type="submit">Guardar</button>
      <button className="rounded-md border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-60" disabled={disabled} onClick={remove} type="button">Eliminar</button>
      {error ? <AlertError className="md:col-span-3">{error}</AlertError> : null}
    </form>
  )
}

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

    if (!result.ok) {
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

  return result.ok ? { ok: true, error: null } : { ok: false, error: result.error }
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

function dateValue(value: string | null | undefined) {
  return value ? value.slice(0, 10) : new Date().toISOString().slice(0, 10)
}
