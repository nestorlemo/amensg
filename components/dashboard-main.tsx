'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Upload, Calculator, BarChart2, Receipt, FileText, ArrowRight, CreditCard,
} from 'lucide-react'

import { StatCardExtended } from '@/components/ui/index'
import { PageHeader } from '@/components/page-header'
import { ProcesoMensual } from '@/components/dashboard-proceso-mensual'

type Stats = {
  periodoActivo: { anio: number; mes: number }
  ultimoCierre: { anio: number; mes: number } | null
}

type Kpis = {
  totalFacturadoUYU: number
  resultadoDistribuible: number
  desarrolloUSD: number
  totalActivaciones: number
  horasDesarrollo: number
}

type DesarrolloInfo = {
  periodo: { anio: number; mes: number; nombre: string } | null
  periodoAnterior: { anio: number; mes: number; nombre: string } | null
  usdActual: number | null
  usdAnterior: number | null
  horasActual: number | null
  horasAnterior: number | null
}

type Resumen = {
  periodo: { anio: number; mes: number; nombre: string } | null
  periodoAnterior: { anio: number; mes: number; nombre: string } | null
  actual: Kpis | null
  anterior: Kpis | null
  desarrollo: DesarrolloInfo | null
}

const MESES_LARGO = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function fmt(v: number) {
  return new Intl.NumberFormat('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)
}

function vsNum(current: number, prev: number | null): string | null {
  if (prev === null) return null
  if (prev === 0) return current === 0 ? '0 (0%)' : `${fmt(prev)} (—)`
  const diff = ((current - prev) / Math.abs(prev)) * 100
  const sign = diff >= 0 ? '+' : ''
  return `${fmt(prev)} (${sign}${diff.toFixed(1)}%)`
}

const MUTED  = '#8ba3c7'
const TEXT   = '#0B1F3A'
const BORDER = '#e6eefc'

const quickLinks = [
  { href: '/importaciones/nueva', label: 'Nueva importación',  color: '#1769E0', bg: 'rgba(23,105,224,0.08)',  Icon: Upload },
  { href: '/cobros',              label: 'Gestionar cobros',   color: '#f59e0b', bg: 'rgba(245,158,11,0.10)',  Icon: CreditCard },
  { href: '/liquidaciones',       label: 'Ver liquidación',    color: '#20E0B2', bg: 'rgba(32,224,178,0.12)',  Icon: Calculator },
  { href: '/reportes',            label: 'Centro de reportes', color: '#1769E0', bg: 'rgba(23,105,224,0.08)',  Icon: BarChart2 },
  { href: '/gastos',              label: 'Registrar gastos',   color: '#8b5cf6', bg: 'rgba(139,92,246,0.10)',  Icon: Receipt },
  { href: '/facturacion',         label: 'Ver facturación',    color: '#19C3FF', bg: 'rgba(25,195,255,0.10)',  Icon: FileText },
]

export function DashboardMain() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [resumen, setResumen] = useState<Resumen | null>(null)

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then((r) => r.json())
      .then((data: Stats) => setStats(data))
      .catch(() => { /* leave skeleton */ })
    fetch('/api/dashboard/resumen')
      .then((r) => r.json())
      .then((data: Resumen) => setResumen(data))
      .catch(() => { /* leave skeleton */ })
  }, [])

  return (
    <div className="space-y-8">
      <PageHeader
        section="SISTEMA ACTIVO"
        title="Bienvenido"
        description="Sistema de facturación mensual de activaciones"
        statusDot
      />

      {stats?.periodoActivo && (
        <div
          className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md px-4 py-2.5 text-xs font-medium"
          style={{ background: '#EEF4FF', borderLeft: '3px solid #1769E0', color: '#1769E0' }}
        >
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: '#1769E0' }} />
            Período activo: <strong>{MESES_LARGO[stats.periodoActivo.mes - 1]} {stats.periodoActivo.anio}</strong>
          </span>
          {stats.ultimoCierre && (
            <>
              <span style={{ color: '#93b4e8' }}>|</span>
              <span>Último cierre: {MESES_LARGO[stats.ultimoCierre.mes - 1]} {stats.ultimoCierre.anio}</span>
            </>
          )}
          <span style={{ color: '#93b4e8' }}>|</span>
          <Link
            href={`/liquidaciones?anio=${stats.periodoActivo.anio}&mes=${stats.periodoActivo.mes}`}
            className="font-semibold hover:underline"
            style={{ color: '#1769E0' }}
          >
            Ver liquidación →
          </Link>
        </div>
      )}

      <ProcesoMensual />

      {resumen?.periodo && resumen.actual ? (() => {
        const { periodo, periodoAnterior, actual, anterior, desarrollo } = resumen
        const ant = anterior ?? null
        const antNombre = periodoAnterior?.nombre ?? null
        const dev = desarrollo ?? null

        return (
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: MUTED }}>
                Resumen {periodo!.nombre}
              </h2>
              <Link href={`/liquidaciones?anio=${periodo!.anio}&mes=${periodo!.mes}`} className="text-xs font-semibold text-[#1769E0] hover:underline">
                Ver liquidación completa →
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <StatCardExtended
                label="Total Facturado"
                value={fmt(actual.totalFacturadoUYU)}
                badge="SIN IVA"
                badgeColor="green"
                accent="green"
                vs={vsNum(actual.totalFacturadoUYU, ant?.totalFacturadoUYU ?? null)}
                vsLabel={antNombre ?? undefined}
              />
              <StatCardExtended
                label="Resultado Distribuible"
                value={fmt(actual.resultadoDistribuible)}
                badge={actual.resultadoDistribuible < 0 ? 'NEGATIVO' : 'NETO'}
                badgeColor={actual.resultadoDistribuible < 0 ? 'red' : 'green'}
                accent="green"
                vs={vsNum(actual.resultadoDistribuible, ant?.resultadoDistribuible ?? null)}
                vsLabel={antNombre ?? undefined}
              />
              <StatCardExtended
                label="Desarrollo Facturado"
                value={dev?.usdActual != null ? fmt(dev.usdActual) : 'Sin datos'}
                valuePrefix={dev?.usdActual != null ? 'USD' : undefined}
                badge="SIN IVA"
                badgeColor="blue"
                accent="purple"
                vs={dev?.usdActual != null ? vsNum(dev.usdActual, dev.usdAnterior) : null}
                vsLabel={dev?.periodoAnterior?.nombre ?? undefined}
                sub={dev?.periodo && dev.periodo.nombre !== periodo!.nombre ? `Último: ${dev.periodo.nombre}` : undefined}
              />
              <StatCardExtended
                label="Activaciones"
                value={actual.totalActivaciones}
                badge="CANTIDAD"
                badgeColor="blue"
                accent="default"
                vs={vsNum(actual.totalActivaciones, ant?.totalActivaciones ?? null)}
                vsLabel={antNombre ?? undefined}
              />
              <StatCardExtended
                label="Horas Desarrollo"
                value={dev?.horasActual != null ? `${dev.horasActual}h` : 'Sin datos'}
                badge="FACTURADAS"
                badgeColor="blue"
                accent="purple"
                vs={dev?.horasActual != null ? vsNum(dev.horasActual, dev.horasAnterior) : null}
                vsLabel={dev?.periodoAnterior?.nombre ?? undefined}
              />
            </div>
          </section>
        )
      })() : null}

      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest" style={{ color: MUTED }}>
          Accesos rápidos
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          {quickLinks.map(({ href, label, color, bg, Icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center gap-4 rounded-xl px-5 py-4 transition-all hover:-translate-y-px"
              style={{ background: '#fff', border: `1px solid ${BORDER}`, boxShadow: '0 1px 4px rgba(23,105,224,0.06)', textDecoration: 'none' }}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ background: bg, color }}>
                <Icon size={18} />
              </div>
              <span className="flex-1 text-sm font-medium" style={{ color: TEXT }}>{label}</span>
              <ArrowRight size={14} style={{ color: '#c8d8f0' }} />
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
