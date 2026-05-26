import { Prisma } from '@prisma/client'

import { parseSemicolonCsv } from './csv'
import type {
  CompanySummaryItem,
  ImportPeriod,
  ImportPreviewParameters,
  ImportPreviewResult,
  SummaryItem,
  ValidationIssue,
} from './types'

const REQUIRED_COLUMNS = [
  'Fecha de importación',
  'Empresa',
  'Estado de activación',
  'Lote',
  'MID',
  'Chip',
  'Fecha de activación',
]

const TECHNICAL_ACTIVATION_DATES = new Set(['01/01/1900', '01/01/2000'])

type BuildImportPreviewInput = {
  csvText: string
  fileName: string
  fileSize: number
  fileHash: string
  parameters: ImportPreviewParameters
  parameterWarnings?: ValidationIssue[]
}

type ImportRow = {
  rowNumber: number
  fechaImportacion: string
  empresa: string
  estadoActivacion: string
  lote: string
  mid: string
  chip: string
  fechaActivacion: string
  period: ImportPeriod | null
  structurallyValid: boolean
}

export function buildImportPreview(input: BuildImportPreviewInput): ImportPreviewResult {
  const parsed = parseSemicolonCsv(input.csvText)
  const errors: ValidationIssue[] = []
  const warnings: ValidationIssue[] = [...(input.parameterWarnings ?? [])]
  const missingColumns = REQUIRED_COLUMNS.filter((column) => !parsed.headers.includes(column))

  for (const column of missingColumns) {
    errors.push({
      code: 'MISSING_COLUMN',
      field: column,
      message: `Falta la columna requerida "${column}".`,
    })
  }

  const rows: ImportRow[] = parsed.rows.map((row, index) => {
    const rowNumber = index + 2
    const fechaImportacion = row['Fecha de importación'] ?? ''
    const empresa = row.Empresa ?? ''
    const estadoActivacion = row['Estado de activación'] ?? ''
    const lote = row.Lote ?? ''
    const mid = row.MID ?? ''
    const chip = row.Chip ?? ''
    const fechaActivacion = row['Fecha de activación'] ?? ''
    const period = parseDatePeriod(fechaImportacion)

    let structurallyValid = missingColumns.length === 0
    const requiredFields = [
      ['Fecha de importación', fechaImportacion],
      ['Empresa', empresa],
      ['Estado de activación', estadoActivacion],
      ['Lote', lote],
      ['MID', mid],
      ['Chip', chip],
    ] as const

    for (const [field, value] of requiredFields) {
      if (missingColumns.includes(field)) {
        continue
      }

      if (!value) {
        structurallyValid = false
        errors.push({
          code: 'REQUIRED_FIELD_EMPTY',
          row: rowNumber,
          field,
          message: `La fila ${rowNumber} no tiene valor en "${field}".`,
        })
      }
    }

    if (fechaImportacion && !period) {
      structurallyValid = false
      errors.push({
        code: 'INVALID_IMPORT_DATE',
        row: rowNumber,
        field: 'Fecha de importación',
        message: `La fila ${rowNumber} tiene una fecha de importación inválida.`,
      })
    }

    return {
      rowNumber,
      fechaImportacion,
      empresa,
      estadoActivacion,
      lote,
      mid,
      chip,
      fechaActivacion,
      period,
      structurallyValid,
    }
  })

  if (parsed.rows.length === 0) {
    errors.push({
      code: 'EMPTY_FILE',
      message: 'El archivo no contiene filas de datos.',
    })
  }

  const periodKeys = uniqueValues(
    rows
      .filter((row) => row.period)
      .map((row) => periodKey(row.period as ImportPeriod)),
  )
  const detectedPeriod = periodKeys.length === 1 ? rows.find((row) => row.period)?.period ?? null : null

  if (periodKeys.length > 1) {
    errors.push({
      code: 'MULTIPLE_PERIODS',
      message: 'El archivo contiene más de un mes/año según "Fecha de importación".',
    })
  }

  const importableRows = rows.filter((row) => row.structurallyValid).length
  const companySummary = buildCompanySummary(rows)
  const stateSummary = buildSummary(rows.map((row) => normalizeSummaryName(row.estadoActivacion, 'Sin estado')))
  const lotSummary = buildSummary(rows.map((row) => normalizeSummaryName(row.lote, 'Sin lote')))
  const duplicateIssues = findDuplicateIssues(rows)
  errors.push(...duplicateIssues)

  for (const row of rows) {
    if (row.estadoActivacion && row.estadoActivacion.trim().toUpperCase() !== 'OK') {
      warnings.push({
        code: 'NON_OK_STATE',
        row: row.rowNumber,
        field: 'Estado de activación',
        message: `La fila ${row.rowNumber} tiene estado "${row.estadoActivacion}". No bloquea ni descuenta.`,
      })
    }

    if (isTechnicalActivationDate(row.fechaActivacion)) {
      warnings.push({
        code: 'TECHNICAL_ACTIVATION_DATE',
        row: row.rowNumber,
        field: 'Fecha de activación',
        message: `La fila ${row.rowNumber} tiene fecha técnica ${row.fechaActivacion}. No bloquea ni descuenta.`,
      })
    }
  }

  const facturableRows = importableRows
  const completedActivationsCount = rows.filter((row) => hasRealActivationDate(row.fechaActivacion)).length
  const activationsWithoutRealActivationDateCount = rows.length - completedActivationsCount

  return {
    file: {
      name: input.fileName,
      size: input.fileSize,
      hash: input.fileHash,
    },
    detectedPeriod,
    totalRows: rows.length,
    importableRows,
    facturableRows,
    detectedCompaniesCount: companySummary.filter((item) => item.name !== 'Sin empresa').length,
    detectedLotsCount: lotSummary.filter((item) => item.name !== 'Sin lote').length,
    detectedStatesCount: stateSummary.filter((item) => item.name !== 'Sin estado').length,
    completedActivationsCount,
    activationsWithoutRealActivationDateCount,
    validation: {
      hasBlockingErrors: errors.length > 0,
      errors,
      warnings,
    },
    companySummary,
    stateSummary,
    lotSummary,
    economicPreview: calculateEconomicPreview(facturableRows, input.parameters),
  }
}

function parseDatePeriod(value: string): ImportPeriod | null {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) {
    return null
  }

  const day = Number(match[1])
  const mes = Number(match[2])
  const anio = Number(match[3])
  const date = new Date(Date.UTC(anio, mes - 1, day))

  if (date.getUTCFullYear() !== anio || date.getUTCMonth() !== mes - 1 || date.getUTCDate() !== day) {
    return null
  }

  return { anio, mes }
}

function findDuplicateIssues(rows: ImportRow[]) {
  const issues: ValidationIssue[] = []
  const midKeys = new Map<string, number[]>()
  const chipKeys = new Map<string, number[]>()

  for (const row of rows) {
    if (!row.period || !row.empresa) {
      continue
    }

    if (row.mid) {
      const key = `${row.empresa}|${row.period.anio}|${row.period.mes}|${row.mid}`
      midKeys.set(key, [...(midKeys.get(key) ?? []), row.rowNumber])
    }

    if (row.chip) {
      const key = `${row.empresa}|${row.period.anio}|${row.period.mes}|${row.chip}`
      chipKeys.set(key, [...(chipKeys.get(key) ?? []), row.rowNumber])
    }
  }

  for (const rowNumbers of midKeys.values()) {
    if (rowNumbers.length > 1) {
      issues.push({
        code: 'DUPLICATE_MID',
        field: 'MID',
        message: `MID duplicado dentro de Empresa + año + mes en filas ${rowNumbers.join(', ')}.`,
      })
    }
  }

  for (const rowNumbers of chipKeys.values()) {
    if (rowNumbers.length > 1) {
      issues.push({
        code: 'DUPLICATE_CHIP',
        field: 'Chip',
        message: `Chip duplicado dentro de Empresa + año + mes en filas ${rowNumbers.join(', ')}.`,
      })
    }
  }

  return issues
}

function buildCompanySummary(rows: ImportRow[]): CompanySummaryItem[] {
  const companies = new Map<string, CompanySummaryItem>()

  for (const row of rows) {
    const name = normalizeSummaryName(row.empresa, 'Sin empresa')
    const current = companies.get(name) ?? {
      name,
      count: 0,
      importableRows: 0,
      facturableRows: 0,
    }

    current.count += 1
    current.importableRows += row.structurallyValid ? 1 : 0
    current.facturableRows += row.structurallyValid ? 1 : 0
    companies.set(name, current)
  }

  return sortSummary([...companies.values()])
}

function buildSummary(values: string[]): SummaryItem[] {
  const counts = new Map<string, number>()

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }

  return sortSummary([...counts.entries()].map(([name, count]) => ({ name, count })))
}

function calculateEconomicPreview(facturableRows: number, parameters: ImportPreviewParameters) {
  const precioUnitarioActivacion = new Prisma.Decimal(parameters.precioUnitarioActivacion || 0)
  const porcentajeIva = new Prisma.Decimal(parameters.porcentajeIva || 0)
  const totalSinIva = precioUnitarioActivacion.mul(facturableRows)
  const iva = totalSinIva.mul(porcentajeIva).div(100)
  const totalConIva = totalSinIva.add(iva)

  return {
    precioUnitarioActivacion: formatMoney(precioUnitarioActivacion),
    porcentajeIva: porcentajeIva.toFixed(2),
    totalSinIva: formatMoney(totalSinIva),
    iva: formatMoney(iva),
    totalConIva: formatMoney(totalConIva),
  }
}

function hasRealActivationDate(value: string) {
  const trimmed = value.trim()
  return trimmed.length > 0 && !isTechnicalActivationDate(trimmed)
}

function isTechnicalActivationDate(value: string) {
  return TECHNICAL_ACTIVATION_DATES.has(value.trim())
}

function normalizeSummaryName(value: string, fallback: string) {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : fallback
}

function periodKey(period: ImportPeriod) {
  return `${period.anio}-${period.mes}`
}

function uniqueValues(values: string[]) {
  return [...new Set(values)]
}

function sortSummary<T extends SummaryItem>(items: T[]) {
  return items.sort((left, right) => right.count - left.count || left.name.localeCompare(right.name))
}

function formatMoney(value: Prisma.Decimal) {
  return value.toDecimalPlaces(2).toFixed(2)
}
