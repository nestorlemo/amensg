export type ImportPeriod = {
  anio: number
  mes: number
}

export type ValidationIssue = {
  code: string
  message: string
  row?: number
  field?: string
}

export type SummaryItem = {
  name: string
  count: number
}

export type CompanySummaryItem = SummaryItem & {
  importableRows: number
  facturableRows: number
}

export type EconomicPreview = {
  precioUnitarioActivacion: string
  porcentajeIva: string
  totalSinIva: string
  iva: string
  totalConIva: string
}

export type ImportPreviewParameters = {
  precioUnitarioActivacion: string
  porcentajeIva: string
}

export type ImportPreviewResult = {
  file: {
    name: string
    size: number
    hash: string
  }
  detectedPeriod: ImportPeriod | null
  totalRows: number
  importableRows: number
  facturableRows: number
  detectedCompaniesCount: number
  detectedLotsCount: number
  detectedStatesCount: number
  completedActivationsCount: number
  activationsWithoutRealActivationDateCount: number
  validation: {
    hasBlockingErrors: boolean
    errors: ValidationIssue[]
    warnings: ValidationIssue[]
  }
  companySummary: CompanySummaryItem[]
  stateSummary: SummaryItem[]
  lotSummary: SummaryItem[]
  economicPreview: EconomicPreview
}
