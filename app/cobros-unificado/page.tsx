'use client'

import { useEffect, useState } from 'react'

import { PageHeader } from '@/components/page-header'
import { KpisCobros } from '@/components/cobros-unificado/KpisCobros'
import { ResumenPorEmpresa } from '@/components/cobros-unificado/ResumenPorEmpresa'
import { TablaCobros } from '@/components/cobros-unificado/TablaCobros'
import type { ApiResponse, CobroRow, Filters, ResumenData, Totals } from '@/components/cobros-unificado/types'

export default function CobrosUnificadoPage() {
  const [rows, setRows] = useState<CobroRow[]>([])
  const [resumen, setResumen] = useState<ResumenData | null>(null)
  const [totals, setTotals] = useState<Totals | null>(null)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  const [filters, setFilters] = useState<Filters>({
    tipo: '',
    empresaId: '',
    anio: '',
    mes: '',
    estado: '',
  })
  const [pendingFilters, setPendingFilters] = useState<Filters>(filters)
  const [empresas, setEmpresas] = useState<{ id: string; nombre: string }[]>([])

  function fetchResumen() {
    fetch('/api/cobros-unificado/resumen')
      .then((r) => r.json())
      .then((d: ResumenData) => setResumen(d))
      .catch(() => {})
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchResumen() }, [])

  useEffect(() => {
    fetch('/api/empresas')
      .then((r) => r.json())
      .then((d) => setEmpresas(Array.isArray(d) ? d : (d.data ?? [])))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const params = new URLSearchParams()
    if (filters.tipo) params.set('tipo', filters.tipo)
    if (filters.empresaId) params.set('empresaId', filters.empresaId)
    if (filters.anio) params.set('anio', filters.anio)
    if (filters.mes) params.set('mes', filters.mes)
    if (filters.estado) params.set('estado', filters.estado)
    params.set('page', String(page))

    setLoading(true)
    fetch(`/api/cobros-unificado?${params}`)
      .then((r) => r.json())
      .then((d: ApiResponse) => {
        setRows(d.data)
        setTotals(d.totals ?? null)
        setTotal(d.total)
        setTotalPages(d.totalPages)
      })
      .finally(() => setLoading(false))
  }, [filters, page])

  async function handleMarcarCobrado(id: string, fechaCobro: string) {
    await fetch(`/api/cobros-unificado/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'COBRADO', fechaCobro: fechaCobro || null }),
    })
    setFilters((f) => ({ ...f }))
    fetchResumen()
  }

  async function handleUploadPdf(facturacionMensualId: string | null, cobroId: string, file: File) {
    const fd = new FormData()
    fd.append('file', file)
    const url = facturacionMensualId
      ? `/api/cobros-unificado/facturacion/${facturacionMensualId}/pdf`
      : `/api/cobros-unificado/${cobroId}/pdf`
    await fetch(url, { method: 'POST', body: fd })
    setFilters((f) => ({ ...f }))
  }

  return (
    <div className="space-y-6">
      <PageHeader
        section="COBROS"
        title="Gestión de Cobros"
        description="Vista unificada de cobros por activaciones, desarrollo e ingresos adicionales."
      />

      <KpisCobros resumen={resumen} />

      {resumen && <ResumenPorEmpresa resumen={resumen} />}

      <TablaCobros
        rows={rows}
        totals={totals}
        total={total}
        totalPages={totalPages}
        loading={loading}
        page={page}
        setPage={setPage}
        filters={filters}
        pendingFilters={pendingFilters}
        setFilters={setFilters}
        setPendingFilters={setPendingFilters}
        empresas={empresas}
        onMarcarCobrado={handleMarcarCobrado}
        onUploadPdf={handleUploadPdf}
      />
    </div>
  )
}
