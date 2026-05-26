import Link from 'next/link'

import { ModulePlaceholder } from '@/components/module-placeholder'

export default function ImportacionesPage() {
  return (
    <div className="space-y-5">
      <ModulePlaceholder
        title="Importaciones"
        description="Modulo de importaciones. Por ahora solo esta disponible la vista previa de CSV; la confirmacion queda fuera de esta fase."
      />
      <Link
        className="inline-flex rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        href="/importaciones/nueva"
      >
        Nueva importacion
      </Link>
    </div>
  )
}
