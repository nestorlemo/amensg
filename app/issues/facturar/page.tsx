'use client'

import { useEffect, useRef, useState } from 'react'

import { PageHeader } from '@/components/page-header'
import { HistorialFacturas, HistorialHandle } from '@/components/facturar-desarrollo/HistorialFacturas'
import { IssuesDisponibles } from '@/components/facturar-desarrollo/IssuesDisponibles'
import { EmpresaOption, SocioState } from '@/components/facturar-desarrollo/types'

export default function FacturarDesarrolloPage() {
  const [empresasOpts, setEmpresasOpts] = useState<EmpresaOption[]>([])
  const [valorHora, setValorHora] = useState(45) // default 45 if config unavailable
  const [socios, setSocios] = useState<SocioState[]>([])
  const historialRef = useRef<HistorialHandle>(null)

  useEffect(() => {
    // Socios
    fetch('/api/socios')
      .then((r) => r.json())
      .then((d: unknown) => {
        const rows: { id: string; nombre: string; porcentajeParticipacion: string | number }[] =
          Array.isArray(d) ? d : Array.isArray((d as { rows?: unknown[] }).rows) ? (d as { rows: { id: string; nombre: string; porcentajeParticipacion: string | number }[] }).rows : []
        setSocios(
          rows.map((s) => ({
            id: s.id,
            nombre: s.nombre,
            porcentaje: String(Math.round(Number(s.porcentajeParticipacion) * 100)),
          }))
        )
      })
      .catch(() => null)

    // Valor hora from config
    fetch('/api/issues/config')
      .then((r) => r.json())
      .then((d: { valorHoraUSD?: number }) => {
        if (d.valorHoraUSD && d.valorHoraUSD > 0) setValorHora(d.valorHoraUSD)
      })
      .catch(() => null)

    // Empresas
    fetch('/api/empresas?activo=true')
      .then((r) => r.json())
      .then((d: { empresas?: EmpresaOption[]; data?: EmpresaOption[] }) =>
        setEmpresasOpts(d.empresas ?? d.data ?? [])
      )
      .catch(() => null)
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        section="Facturación Desarrollo"
        title="Facturación Desarrollo"
        description="Generá facturas de desarrollo por empresa a partir de issues en producción."
      />

      <IssuesDisponibles
        empresasOpts={empresasOpts}
        valorHora={valorHora}
        socios={socios}
        onFacturaGenerada={() => historialRef.current?.refresh()}
      />

      <HistorialFacturas
        ref={historialRef}
        empresasOpts={empresasOpts}
      />
    </div>
  )
}
