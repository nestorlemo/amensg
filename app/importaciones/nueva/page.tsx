import { ImportPreviewForm } from '@/components/import-preview-form'
import { PageHeader } from '@/components/page-header'

export default function NuevaImportacionPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        section="Importaciones"
        title="Nueva importación"
        description="Cargue un archivo CSV separado por punto y coma para validar estructura, periodo, empresas, estados, lotes, duplicados y totales preliminares."
      />
      <ImportPreviewForm />
    </div>
  )
}
