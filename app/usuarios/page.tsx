import { AccessDenied } from '@/components/access-denied'
import { PageHeader } from '@/components/page-header'
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
      <PageHeader
        section="Administración"
        title="Gestión de usuarios"
        description="Alta, edición, roles y desactivación de usuarios del sistema."
      />
      <UsuariosManager usuarios={rows} />
    </div>
  )
}
