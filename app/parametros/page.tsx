import { AccessDenied } from '@/components/access-denied'
import { ParametrosManager } from '@/components/parametros-manager'
import { requireAdminPage } from '@/lib/auth'
import { getParametros } from '@/lib/parametros-socios'

export const dynamic = 'force-dynamic'

export default async function ParametrosPage() {
  const user = await requireAdminPage()
  if (!user) return <AccessDenied />

  const { rows } = await getParametros()

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-5">
        <p className="text-sm font-medium uppercase text-slate-500">Parámetros</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Parámetros del sistema</h1>
        <p className="mt-2 text-sm text-slate-600">
          Los cambios aplican a cálculos futuros y no modifican facturaciones históricas ni cierres ya guardados.
        </p>
      </header>

      <ParametrosManager parametros={rows} />
    </div>
  )
}
