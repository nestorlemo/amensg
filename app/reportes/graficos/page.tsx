'use client'

import { useEffect, useState } from 'react'

import { PageHeader } from '@/components/page-header'
import { FiltrosGraficos } from '@/components/reportes/FiltrosGraficos'
import { GraficoActivaciones } from '@/components/reportes/GraficoActivaciones'
import { GraficoDesarrollo } from '@/components/reportes/GraficoDesarrollo'
import { GraficoFacturacion } from '@/components/reportes/GraficoFacturacion'
import { KpisAnuales } from '@/components/reportes/KpisAnuales'
import { Skeleton } from '@/components/reportes/primitives'
import {
  MESES,
  mergeComparativo,
  pivotByEmpresa,
  type EmpresaOpt,
  type GraficosData,
} from '@/components/reportes/types'

export default function GraficosPage() {
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [anioComparativo, setAnioComparativo] = useState<number | null>(null)
  const [empresaId, setEmpresaId] = useState('')
  const [empresas, setEmpresas] = useState<EmpresaOpt[]>([])
  const [data, setData] = useState<GraficosData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/empresas')
      .then(r => r.json())
      .then((d: { empresas?: EmpresaOpt[] }) => setEmpresas(d.empresas ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    setData(null)
    let url = `/api/reportes/graficos?anio=${anio}${empresaId ? `&empresaId=${empresaId}` : ''}`
    if (anioComparativo) url += `&anioComparativo=${anioComparativo}`
    fetch(url)
      .then(r => r.json())
      .then((d: GraficosData) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [anio, anioComparativo, empresaId])

  const comp = data?.comparativo ?? null
  const compSuffix = comp ? `_${comp.anio}` : ''

  const kpis = data ? {
    activaciones: data.activacionesPorMesEmpresa.reduce((s, r) => s + r.cantidad, 0),
    facturadoActivaciones: data.facturacionPorMesEmpresa.reduce((s, r) => s + r.totalSinIva, 0),
    facturadoDesarrollo: data.facturacionDesarrolloPorMes.reduce((s, r) => s + r.totalUSD, 0),
    resultado: data.resultadoMensual.reduce((s, r) => s + r.resultado, 0),
  } : null

  const { data: activData, empresas: activEmpresas } = data
    ? pivotByEmpresa(data.activacionesPorMesEmpresa as { mes: number; empresa: string; [k: string]: number | string }[], 'cantidad')
    : { data: [], empresas: [] }

  const { data: facturData, empresas: facturEmpresas } = data
    ? pivotByEmpresa(data.facturacionPorMesEmpresa as { mes: number; empresa: string; [k: string]: number | string }[], 'totalSinIva')
    : { data: [], empresas: [] }

  const pieActivData = data ? (() => {
    const map = new Map<string, number>()
    for (const r of data.activacionesPorMesEmpresa) map.set(r.empresa, (map.get(r.empresa) ?? 0) + r.cantidad)
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
  })() : []

  const resultadoBase = data?.resultadoMensual.map(r => ({ ...r, mes: MESES[r.mes - 1] })) ?? []
  const resultadoData = (comp && data)
    ? mergeComparativo(
        data.resultadoMensual,
        comp.resultadoMensual as { mes: number; [k: string]: number }[],
        ['resultado'],
        compSuffix,
      ).map(r => ({ ...r, mes: MESES[r.mes - 1] }))
    : resultadoBase

  const finTotalBase = data?.resultadoFinancieroTotal.map(r => ({ ...r, mes: MESES[r.mes - 1] })) ?? []
  const finTotalData = (comp && data)
    ? mergeComparativo(
        data.resultadoFinancieroTotal,
        comp.resultadoFinancieroTotal as { mes: number; [k: string]: number }[],
        ['resultado'],
        compSuffix,
      ).map(r => ({ ...r, mes: MESES[r.mes - 1] }))
    : finTotalBase

  const acumuladoBase = data?.facturacionDesarrolloPorMes.map(r => ({ ...r, mes: MESES[r.mes - 1] })) ?? []
  const acumuladoData = (comp && data)
    ? mergeComparativo(
        data.facturacionDesarrolloPorMes,
        comp.facturacionDesarrolloPorMes as { mes: number; [k: string]: number }[],
        ['totalUSD', 'acumulado'],
        compSuffix,
      ).map(r => ({ ...r, mes: MESES[r.mes - 1] }))
    : acumuladoBase

  const activDataWithComp = (comp && data)
    ? (() => {
        const compTotalMap = new Map<number, number>()
        for (const r of comp.activacionesTotalesPorMes) compTotalMap.set(r.mes, r.total)
        return activData.map(d => ({
          ...d,
          mes: MESES[Number(d.mes) - 1],
          Total: activEmpresas.reduce((s, emp) => s + Number(d[emp] ?? 0), 0),
          [`Total${compSuffix}`]: compTotalMap.get(Number(d.mes)) ?? 0,
        }))
      })()
    : activData.map(d => ({
        ...d,
        mes: MESES[Number(d.mes) - 1],
        Total: activEmpresas.reduce((s, emp) => s + Number(d[emp] ?? 0), 0),
      }))

  const horasData = data?.horasDesarrolloPorMes.map(r => ({ ...r, mes: MESES[r.mes - 1] })) ?? []
  const empresaNombre = empresaId ? (empresas.find(e => e.id === empresaId)?.nombre ?? '') : undefined

  return (
    <div className="min-w-0 max-w-full space-y-8">
      <PageHeader
        section="REPORTES"
        title="Reportes y Gráficos"
        description={empresaId
          ? `Mostrando datos de ${empresaNombre ?? 'empresa seleccionada'} — ${anio}`
          : `Evolución mensual, KPIs y distribución por socio — ${anio}`}
      />

      <FiltrosGraficos
        anio={anio}
        anioComparativo={anioComparativo}
        empresaId={empresaId}
        empresas={empresas}
        comp={comp}
        onAnio={setAnio}
        onAnioComparativo={setAnioComparativo}
        onEmpresaId={setEmpresaId}
      />

      {loading ? <Skeleton /> : !data ? (
        <p className="text-center text-sm text-slate-500">Error al cargar datos.</p>
      ) : (
        <div className="space-y-8">
          <KpisAnuales kpis={kpis!} empresaNombre={empresaNombre} />

          <GraficoActivaciones
            activDataWithComp={activDataWithComp}
            activEmpresas={activEmpresas}
            facturData={facturData}
            facturEmpresas={facturEmpresas}
            pieActivData={pieActivData}
            anio={anio}
            comp={comp}
            compSuffix={compSuffix}
          />

          <GraficoFacturacion
            resultadoData={resultadoData}
            finTotalData={finTotalData}
            distribucionSocios={data.distribucionSocios}
            anio={anio}
            comp={comp}
            compSuffix={compSuffix}
            empresaNombre={empresaNombre}
          />

          <GraficoDesarrollo
            horasData={horasData}
            acumuladoData={acumuladoData}
            issuesPorEstado={data.issuesPorEstado}
            anio={anio}
            comp={comp}
            compSuffix={compSuffix}
          />
        </div>
      )}
    </div>
  )
}
