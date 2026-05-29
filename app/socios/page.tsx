import { AccessDenied } from '@/components/access-denied'
import { SociosManager } from '@/components/socios-manager'
import { requireAdminPage } from '@/lib/auth'
import { getSocios } from '@/lib/parametros-socios'

export const dynamic = 'force-dynamic'

export default async function SociosPage() {
  const user = await requireAdminPage()
  if (!user) return <AccessDenied />

  const { rows, validation } = await getSocios()

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-5">
        <p className="text-sm font-medium uppercase text-slate-500">Socios</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Gestión de socios</h1>
        <p className="mt-2 text-sm text-slate-600">
          Solo los socios activos participan en liquidaciones. Los porcentajes activos deben sumar 100%.
        </p>
      </header>

      <SociosManager socios={rows} validation={validation} />
    </div>
  )
}
