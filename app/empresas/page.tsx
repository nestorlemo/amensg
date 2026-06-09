'use client'

import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { EmpresaCreatePanel, EmpresaModal } from '@/components/empresas/EmpresaModal'
import { TablaEmpresas } from '@/components/empresas/TablaEmpresas'
import { apiFetch, EMPTY_FORM, type Empresa, type EmpresaFormData } from '@/components/empresas/types'

export default function EmpresasPage() {
  const [empresas, setEmpresas]       = useState<Empresa[]>([])
  const [loading, setLoading]         = useState(true)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [search, setSearch]           = useState('')
  const [showNew, setShowNew]         = useState(false)
  const [newLoading, setNewLoading]   = useState(false)
  const [newError, setNewError]       = useState<string | null>(null)
  const [editTarget, setEditTarget]   = useState<Empresa | null>(null)
  const [rowError, setRowError]       = useState<Record<string, string>>({})
  const [confirmDeactivate, setConfirmDeactivate] = useState<Empresa | null>(null)

  useEffect(() => { void load() }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await apiFetch<{ empresas: Empresa[] }>('/api/empresas')
    if (error) { setGlobalError(error); setLoading(false); return }
    setEmpresas(data!.empresas)
    setLoading(false)
  }

  async function handleCreate(form: EmpresaFormData) {
    setNewLoading(true)
    setNewError(null)
    const { data, error } = await apiFetch<{ empresa: Empresa }>('/api/empresas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (error) { setNewError(error); setNewLoading(false); return }
    setEmpresas((prev) => [data!.empresa, ...prev])
    setShowNew(false)
    setNewLoading(false)
  }

  function handleEditSaved(updated: Empresa) {
    setEmpresas((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
    setEditTarget(null)
  }

  async function doToggle(empresa: Empresa, activa: boolean) {
    setConfirmDeactivate(null)
    const { data, error } = await apiFetch<{ empresa: Empresa }>(`/api/empresas/${empresa.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activa }),
    })
    if (error) { setRowError((p) => ({ ...p, [empresa.id]: error })); return }
    setEmpresas((prev) => prev.map((e) => (e.id === empresa.id ? data!.empresa : e)))
    setRowError((p) => { const n = { ...p }; delete n[empresa.id]; return n })
  }

  function handleToggle(empresa: Empresa) {
    if (empresa.activa) { setConfirmDeactivate(empresa); return }
    void doToggle(empresa, true)
  }

  const totalActivas = empresas.filter((e) => e.activa).length

  return (
    <div className="space-y-6">
      <PageHeader
        section="Configuración"
        title="Empresas"
        description={`${totalActivas} empresa${totalActivas !== 1 ? 's' : ''} activa${totalActivas !== 1 ? 's' : ''}`}
        action={
          <button
            className="inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}
            onClick={() => { setShowNew(true); setNewError(null) }}
          >
            <Plus size={16} />
            Nueva empresa
          </button>
        }
      />

      {showNew ? (
        <EmpresaCreatePanel
          initial={EMPTY_FORM}
          loading={newLoading}
          error={newError}
          onSubmit={(d) => void handleCreate(d)}
          onCancel={() => { setShowNew(false); setNewError(null) }}
        />
      ) : null}

      <TablaEmpresas
        empresas={empresas}
        loading={loading}
        globalError={globalError}
        search={search}
        rowError={rowError}
        confirmDeactivate={confirmDeactivate}
        onSearch={setSearch}
        onEdit={setEditTarget}
        onToggle={handleToggle}
        onShowNew={() => setShowNew(true)}
        onConfirmDeactivate={setConfirmDeactivate}
        doToggle={(e, a) => void doToggle(e, a)}
      />

      {editTarget ? (
        <EmpresaModal
          empresa={editTarget}
          onSave={handleEditSaved}
          onClose={() => setEditTarget(null)}
        />
      ) : null}
    </div>
  )
}
