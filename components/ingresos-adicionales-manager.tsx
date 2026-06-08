'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'

import { AlertError } from '@/components/alerts'
import { DateInput } from '@/components/date-input'
import { requestJson } from '@/lib/client-api'

// ── Types ────────────────────────────────────────────────────────────────────

type Empresa = { id: string; nombre: string }

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

type ApiResponse = {
  rows: Ingreso[]
  empresas: Empresa[]
  periodoCerrado: boolean
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(v: number) {
  return new Intl.NumberFormat('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)
}

function formatPeriod(anio: number, mes: number) {
  return `${String(mes).padStart(2, '0')}/${anio}`
}

function calcMontoSinIva(moneda: string, montoOrigen: string, tipoCambio: string) {
  const monto = Number(montoOrigen) || 0
  const cambio = Number(tipoCambio) || 0
  return moneda === 'USD' ? monto * cambio : monto
}

async function apiCall(url: string, method: string, body: Record<string, unknown> | null) {
  const res = await requestJson(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  }, 'No se pudo completar la operación.')
  return res.ok === true ? { ok: true, error: null } : { ok: false, error: res.error }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block space-y-1 text-sm font-medium text-slate-700">{children}</label>
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
      {...props}
    />
  )
}

function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  const { children, ...rest } = props
  return (
    <select
      className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
      {...rest}
    >
      {children}
    </select>
  )
}

function SummaryItem({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 font-semibold tabular-nums text-slate-950">{fmt(value)}</p>
    </div>
  )
}

// ── CurrencyFields ────────────────────────────────────────────────────────────

function CurrencyFields({
  disabled,
  moneda, setMoneda,
  montoOrigen, setMontoOrigen,
  fechaFacturacion, setFechaFacturacion,
  tipoCambio, setTipoCambio,
  fuente, setFuente,
  fechaTipoCambio, setFechaTipoCambio,
  porcentajeIva, setPorcentajeIva,
}: {
  disabled: boolean
  moneda: string; setMoneda: (v: string) => void
  montoOrigen: string; setMontoOrigen: (v: string) => void
  fechaFacturacion: string; setFechaFacturacion: (v: string) => void
  tipoCambio: string; setTipoCambio: (v: string) => void
  fuente: string; setFuente: (v: string) => void
  fechaTipoCambio: string; setFechaTipoCambio: (v: string) => void
  porcentajeIva: string; setPorcentajeIva: (v: string) => void
}) {
  const [rateError, setRateError] = useState<string | null>(null)
  const montoSinIva = calcMontoSinIva(moneda, montoOrigen, tipoCambio)
  const iva = montoSinIva * (Number(porcentajeIva) || 0)
  const montoConIva = montoSinIva + iva

  async function fetchTipoCambio() {
    setRateError(null)
    const result = await requestJson<{ valor: string; fuente: string; fechaTipoCambio: string }>(
      `/api/tipo-cambio/usd?fecha=${encodeURIComponent(fechaFacturacion)}`,
      undefined,
      'No se pudo obtener el tipo de cambio.',
    )
    if (result.ok === false) { setRateError(result.error); return }
    setTipoCambio(result.data.valor)
    setFuente(result.data.fuente)
    setFechaTipoCambio(result.data.fechaTipoCambio)
  }

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <FieldLabel>
          Moneda
          <SelectInput disabled={disabled} name="moneda" value={moneda} onChange={e => setMoneda(e.target.value)}>
            <option value="UYU">UYU</option>
            <option value="USD">USD</option>
          </SelectInput>
        </FieldLabel>
        <FieldLabel>
          Monto origen
          <TextInput disabled={disabled} name="montoOrigen" required value={montoOrigen} onChange={e => setMontoOrigen(e.target.value)} />
        </FieldLabel>
        <FieldLabel>
          Fecha facturación
          <DateInput
            className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
            disabled={disabled} value={fechaFacturacion} onChange={setFechaFacturacion} required
          />
          <input type="hidden" name="fechaFacturacion" value={fechaFacturacion} />
        </FieldLabel>
        <FieldLabel>
          Porcentaje IVA
          <TextInput disabled={disabled} name="porcentajeIva" required value={porcentajeIva} onChange={e => setPorcentajeIva(e.target.value)} />
        </FieldLabel>
      </div>

      {moneda === 'USD' ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <FieldLabel>
            Tipo cambio aplicado
            <TextInput disabled={disabled} name="tipoCambioAplicado" required value={tipoCambio} onChange={e => setTipoCambio(e.target.value)} />
          </FieldLabel>
          <input type="hidden" name="fuenteTipoCambio" value={fuente} />
          <input type="hidden" name="fechaTipoCambio" value={fechaTipoCambio} />
          <div className="flex items-end">
            <button
              className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              disabled={disabled} onClick={() => void fetchTipoCambio()} type="button"
            >
              Obtener tipo de cambio
            </button>
          </div>
          {rateError ? <AlertError className="md:col-span-2">{rateError}</AlertError> : null}
        </div>
      ) : (
        <>
          <input type="hidden" name="tipoCambioAplicado" value={tipoCambio || '1'} />
          <input type="hidden" name="fuenteTipoCambio" value={fuente} />
          <input type="hidden" name="fechaTipoCambio" value={fechaTipoCambio} />
        </>
      )}

      <div className="grid gap-3 rounded-md bg-slate-50 p-3 text-sm md:grid-cols-3">
        <SummaryItem label="Monto s/IVA (UYU)" value={montoSinIva} />
        <SummaryItem label="IVA (UYU)" value={iva} />
        <SummaryItem label="Monto c/IVA (UYU)" value={montoConIva} />
      </div>
    </>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function IngresosAdicionalesManager() {
  const now = new Date()
  const [rows, setRows] = useState<Ingreso[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [periodoCerrado, setPeriodoCerrado] = useState(false)
  const [loading, setLoading] = useState(false)

  // Filters
  const [fAnio, setFAnio] = useState(now.getFullYear())
  const [fMes, setFMes] = useState(now.getMonth() + 1)
  const [fEmpresaId, setFEmpresaId] = useState('')

  // Form fields
  const [concepto, setConcepto] = useState('')
  const [formEmpresaId, setFormEmpresaId] = useState('')
  const [formAnio, setFormAnio] = useState(String(now.getFullYear()))
  const [formMes, setFormMes] = useState(String(now.getMonth() + 1))
  const [moneda, setMoneda] = useState('UYU')
  const [montoOrigen, setMontoOrigen] = useState('')
  const [fechaFacturacion, setFechaFacturacion] = useState(now.toISOString().slice(0, 10))
  const [tipoCambio, setTipoCambio] = useState('')
  const [fuente, setFuente] = useState('')
  const [fechaTipoCambio, setFechaTipoCambio] = useState('')
  const [porcentajeIva, setPorcentajeIva] = useState('0.22')
  const [observaciones, setObservaciones] = useState('')

  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  async function fetchData(anio = fAnio, mes = fMes, empresaId = fEmpresaId) {
    setLoading(true)
    try {
      const params = new URLSearchParams({ anio: String(anio), mes: String(mes) })
      if (empresaId) params.set('empresaId', empresaId)
      const res = await fetch(`/api/ingresos-adicionales?${params}`)
      const data = await res.json() as ApiResponse
      setRows(data.rows ?? [])
      setEmpresas(data.empresas ?? [])
      setPeriodoCerrado(data.periodoCerrado ?? false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void fetchData() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    void fetchData(fAnio, fMes, fEmpresaId)
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)
    setSaving(true)
    try {
      const result = await apiCall('/api/ingresos-adicionales', 'POST', {
        concepto, empresaId: formEmpresaId || null,
        anio: formAnio, mes: formMes,
        moneda, montoOrigen, fechaFacturacion,
        tipoCambioAplicado: moneda === 'USD' ? tipoCambio : '1',
        fuenteTipoCambio: fuente || null,
        fechaTipoCambio: fechaTipoCambio || null,
        porcentajeIva, observaciones: observaciones || null,
      })
      if (!result.ok) { setFormError(result.error ?? 'Error al crear.'); return }
      // Reset form
      setConcepto(''); setMontoOrigen(''); setObservaciones(''); setTipoCambio(''); setFuente(''); setFechaTipoCambio('')
      void fetchData()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este ingreso adicional?')) return
    await apiCall(`/api/ingresos-adicionales/${id}`, 'DELETE', null)
    void fetchData()
  }

  return (
    <div className="space-y-6">
      {/* ── Section 1: Creation form ── */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-950">Nuevo ingreso adicional</h2>
          <p className="mt-0.5 text-sm text-slate-500">Ingreso no proveniente de activaciones, con IVA calculado automáticamente.</p>
        </div>

        {periodoCerrado ? (
          <div className="flex items-center gap-3 border-b border-amber-200 bg-amber-50 px-6 py-3">
            <AlertTriangle size={15} className="shrink-0 text-amber-600" />
            <p className="text-sm font-medium text-amber-800">
              Este período está cerrado. Para modificar ingresos adicionales debe reabrirse el cierre.
            </p>
          </div>
        ) : null}

        <form className="space-y-4 px-6 py-5" onSubmit={handleCreate}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <FieldLabel>
              Concepto
              <TextInput required disabled={periodoCerrado} value={concepto} onChange={e => setConcepto(e.target.value)} />
            </FieldLabel>
            <FieldLabel>
              Empresa
              <SelectInput disabled={periodoCerrado} value={formEmpresaId} onChange={e => setFormEmpresaId(e.target.value)}>
                <option value="">Sin empresa</option>
                {empresas.map(emp => <option key={emp.id} value={emp.id}>{emp.nombre}</option>)}
              </SelectInput>
            </FieldLabel>
            <FieldLabel>
              Año
              <TextInput required disabled={periodoCerrado} value={formAnio} onChange={e => setFormAnio(e.target.value)} />
            </FieldLabel>
            <FieldLabel>
              Mes
              <TextInput required disabled={periodoCerrado} value={formMes} onChange={e => setFormMes(e.target.value)} />
            </FieldLabel>
          </div>

          <CurrencyFields
            disabled={periodoCerrado}
            moneda={moneda} setMoneda={setMoneda}
            montoOrigen={montoOrigen} setMontoOrigen={setMontoOrigen}
            fechaFacturacion={fechaFacturacion} setFechaFacturacion={setFechaFacturacion}
            tipoCambio={tipoCambio} setTipoCambio={setTipoCambio}
            fuente={fuente} setFuente={setFuente}
            fechaTipoCambio={fechaTipoCambio} setFechaTipoCambio={setFechaTipoCambio}
            porcentajeIva={porcentajeIva} setPorcentajeIva={setPorcentajeIva}
          />

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <FieldLabel>
              Observaciones
              <TextInput disabled={periodoCerrado} value={observaciones} onChange={e => setObservaciones(e.target.value)} />
            </FieldLabel>
            <div className="flex items-end xl:col-start-4">
              <button
                className="h-10 w-full rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                disabled={saving || periodoCerrado} type="submit"
              >
                {saving ? 'Agregando…' : 'Agregar ingreso'}
              </button>
            </div>
          </div>

          {formError ? <AlertError>{formError}</AlertError> : null}
        </form>
      </section>

      {/* ── Section 2: Historial ── */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-950">Historial de ingresos adicionales</h2>
          <form className="flex flex-wrap items-end gap-3" onSubmit={handleSearch}>
            <label className="block text-xs font-medium text-slate-600">
              Año
              <input
                className="mt-1 block h-8 w-20 rounded-md border border-slate-300 px-2 text-xs"
                value={fAnio} onChange={e => setFAnio(Number(e.target.value))}
              />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              Mes
              <input
                className="mt-1 block h-8 w-16 rounded-md border border-slate-300 px-2 text-xs"
                value={fMes} onChange={e => setFMes(Number(e.target.value))}
              />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              Empresa
              <select
                className="mt-1 block h-8 w-44 rounded-md border border-slate-300 px-2 text-xs"
                value={fEmpresaId} onChange={e => setFEmpresaId(e.target.value)}
              >
                <option value="">Todas</option>
                {empresas.map(emp => <option key={emp.id} value={emp.id}>{emp.nombre}</option>)}
              </select>
            </label>
            <button
              className="h-8 rounded-md bg-slate-950 px-4 text-xs font-semibold text-white hover:bg-slate-800"
              type="submit"
            >
              Buscar
            </button>
          </form>
        </div>

        {loading ? (
          <p className="p-6 text-sm text-slate-400">Cargando…</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-slate-400">No hay ingresos adicionales para los filtros seleccionados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Período</th>
                  <th className="px-4 py-3 text-left">Empresa</th>
                  <th className="px-4 py-3 text-left">Concepto</th>
                  <th className="px-4 py-3 text-left">Moneda</th>
                  <th className="px-4 py-3 text-right">Monto S/IVA</th>
                  <th className="px-4 py-3 text-right">IVA</th>
                  <th className="px-4 py-3 text-right">Monto C/IVA</th>
                  <th className="px-4 py-3 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(row => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatPeriod(row.anio, row.mes)}</td>
                    <td className="px-4 py-3 text-slate-700">{row.empresa ?? <span className="text-slate-400">Sin empresa</span>}</td>
                    <td className="px-4 py-3 text-slate-700">{row.concepto}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${row.moneda === 'USD' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                        {row.moneda}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-700">{row.montoSinIva}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-700">{row.iva}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums font-semibold text-slate-900">{row.montoConIva}</td>
                    <td className="px-4 py-3">
                      <button
                        className="rounded border border-red-300 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                        disabled={periodoCerrado}
                        onClick={() => void handleDelete(row.id)}
                        type="button"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

// Keep legacy exports for any remaining references
export { IngresosAdicionalesManager as IngresoAdicionalForm }
