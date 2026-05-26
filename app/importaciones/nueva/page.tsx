import { ImportPreviewForm } from '@/components/import-preview-form'

export default function NuevaImportacionPage() {
  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Importaciones</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Nueva importacion</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
          Cargue un archivo CSV separado por punto y coma para validar estructura, periodo, empresas, estados,
          lotes, duplicados y totales preliminares. Esta pantalla no confirma ni persiste activaciones.
        </p>
      </section>
      <ImportPreviewForm />
    </div>
  )
}
