'use client'

import { useEffect, useState } from 'react'

import { DateInput } from '@/components/date-input'
import { PageHeader } from '@/components/page-header'

type ValorHora = { id: string; valorUSD: number; vigenciaDesde: string; creadoEn: string }

export default function ValorHoraPage() {
  const [actual, setActual]     = useState<ValorHora | null>(null)
  const [historial, setHistorial] = useState<ValorHora[]>([])
  const [loading, setLoading]   = useState(true)
  const [valorUSD, setValorUSD] = useState('')
  const [vigencia, setVigencia] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [success, setSuccess]   = useState(false)

  useEffect(() => { void fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const res = await fetch('/api/valor-hora')
    const data = await res.json()
    setActual(data.actual)
    setHistorial(data.historial ?? [])
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setSaving(true)
    try {
      const res = await fetch('/api/valor-hora', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valorUSD: Number(valorUSD), vigenciaDesde: vigencia }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message ?? 'Error al guardar.'); return }
      setSuccess(true)
      setValorUSD('')
      void fetchData()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader section="DESARROLLO" title="Valor hora" description="Historial del valor hora de desarrollo en USD." />

      {/* Valor actual */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">Valor hora actual</h2>
        {loading ? (
          <p className="mt-2 text-slate-400">Cargando…</p>
        ) : actual ? (
          <div className="mt-3 flex items-baseline gap-3">
            <span className="text-4xl font-bold text-slate-950">${actual.valorUSD.toFixed(2)}</span>
            <span className="text-sm text-slate-500">USD · vigente desde {actual.vigenciaDesde}</span>
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-500">No hay valor hora registrado.</p>
        )}
      </section>

      {/* Formulario nuevo valor */}
      <section className="rounded-xl border border-blue-200 bg-blue-50 p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-950">Registrar nuevo valor</h2>
        <form className="flex flex-wrap items-end gap-4" onSubmit={(e) => void handleSubmit(e)}>
          <label className="block text-sm font-medium text-slate-700">
            Valor USD
            <input
              className="mt-1 block h-9 w-32 rounded-md border border-slate-300 px-3 text-sm"
              type="number" step="0.01" min="0.01" required
              value={valorUSD} onChange={(e) => setValorUSD(e.target.value)}
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Vigente desde
            <DateInput
              className="mt-1 block h-9 w-40 rounded-md border border-slate-300 px-3 text-sm"
              required
              value={vigencia} onChange={setVigencia}
            />
          </label>
          <button className="h-9 rounded-md bg-blue-600 px-5 text-sm font-semibold text-white disabled:opacity-50" disabled={saving} type="submit">
            {saving ? 'Guardando…' : 'Registrar'}
          </button>
        </form>
        {error   && <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {success && <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Valor hora registrado correctamente.</p>}
      </section>

      {/* Historial */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-950">Historial</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Valor USD</th>
                <th className="px-4 py-3">Vigente desde</th>
                <th className="px-4 py-3">Registrado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {historial.length === 0 ? (
                <tr><td className="px-4 py-8 text-center text-slate-400" colSpan={3}>Sin historial.</td></tr>
              ) : historial.map((v, i) => (
                <tr key={v.id} className={i === 0 ? 'bg-emerald-50' : ''}>
                  <td className="px-4 py-3 font-semibold text-slate-950">${v.valorUSD.toFixed(2)}</td>
                  <td className="px-4 py-3 text-slate-700">{v.vigenciaDesde}</td>
                  <td className="px-4 py-3 text-slate-500">{new Date(v.creadoEn).toLocaleDateString('es-UY')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
