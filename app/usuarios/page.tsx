import { AccessDenied } from '@/components/access-denied'
import { UsuariosManager } from '@/components/usuarios-manager'
import { requireAdminPage } from '@/lib/auth'
import { getUsuarios } from '@/lib/usuarios'

export const dynamic = 'force-dynamic'

export default async function UsuariosPage() {
  const user = await requireAdminPage()
  if (!user) return <AccessDenied />

  const { rows } = await getUsuarios()

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-5">
        <p className="text-sm font-medium uppercase text-slate-500">Usuarios</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Gestion de usuarios</h1>
        <p className="mt-2 text-sm text-slate-600">Alta, edicion, roles y desactivacion de usuarios del sistema.</p>
      </header>
      <UsuariosManager usuarios={rows} />
    </div>
  )
}
