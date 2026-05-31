import { createHash } from 'node:crypto'

import { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'

import { apiError, internalError } from '@/lib/api-errors'
import { requireApiAuth } from '@/lib/auth'
import { parseSemicolonCsv } from '@/lib/import-preview/csv'
import {
  hasRealActivationDate,
  isTechnicalActivationDate,
  normalizeChip,
  parseDatePeriod,
} from '@/lib/import-preview/preview'
import type { ImportPreviewParameters } from '@/lib/import-preview/types'
import { closedPeriodError, isPeriodClosed } from '@/lib/periods'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const maxDuration = 60
export const config = {
  api: { bodyParser: { sizeLimit: '50mb' } },
}

const CHUNK_SIZE = 1000
const REQUIRED_PARAMETER_KEYS = ['precio_unitario_activacion', 'porcentaje_iva'] as const

type ConfirmableRow = {
  rowNumber: number
  rawRowJson: Record<string, string>
  empresaNombreArchivo: string
  estadoActivacion: string
  lote: string
  mid: string
  chip: string
  fechaImportacion: Date
  fechaActivacion: Date | null
  tieneFechaRealActivacion: boolean
  anio: number
  mes: number
}

export async function POST(request: Request) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error

  const formData = await request.formData()
  const uploadedFile = formData.get('file')
  const periodoParam = formData.get('periodo')
  // Comma-separated list of company names that the user approved to overwrite
  const sobreescribirParam = formData.get('sobreescribir')
  const empresasAOmitirParam = formData.get('omitir')

  if (!(uploadedFile instanceof File)) {
    return apiError('INVALID_CSV', 'Debe enviar un archivo CSV en el campo "file".', 400)
  }

  if (typeof periodoParam !== 'string' || !periodoParam.match(/^\d{4}-\d{2}$/)) {
    return apiError('INVALID_PERIODO', 'Debe especificar el período en formato YYYY-MM.', 400)
  }

  const [anioStr, mesStr] = periodoParam.split('-')
  const anio = Number(anioStr)
  const mes = Number(mesStr)

  // Companies explicitly approved for overwrite (user confirmed)
  const empresasAOmitir = new Set(
    typeof empresasAOmitirParam === 'string' && empresasAOmitirParam
      ? empresasAOmitirParam.split('|').map((s) => s.trim()).filter(Boolean)
      : [],
  )
  const empresasASobreescribir = new Set(
    typeof sobreescribirParam === 'string' && sobreescribirParam
      ? sobreescribirParam.split('|').map((s) => s.trim()).filter(Boolean)
      : [],
  )

  const bytes = Buffer.from(await uploadedFile.arrayBuffer())
  const csvText = bytes.toString('utf8')
  const fileHash = createHash('sha256').update(bytes).digest('hex')
  const periodHash = createHash('sha256').update(`${fileHash}:${periodoParam}`).digest('hex')

  const parametersResult = await getRequiredParameters()
  if ('error' in parametersResult) {
    return NextResponse.json(parametersResult.error, { status: parametersResult.status })
  }
  const parameters = parametersResult.parameters

  if (await isPeriodClosed(anio, mes)) {
    return NextResponse.json(
      closedPeriodError('El período ya está cerrado. No se puede confirmar una nueva importación.'),
      { status: 409 },
    )
  }

  // Parse and filter rows to the requested period (excluding companies user chose to skip)
  const allRows = parseConfirmableRows(csvText)
  const rows = allRows.filter(
    (row) => row.anio === anio && row.mes === mes && !empresasAOmitir.has(row.empresaNombreArchivo),
  )

  if (rows.length === 0) {
    return NextResponse.json({
      ok: true,
      periodo: periodoParam,
      procesadas: 0,
      total: 0,
      omitidas: [...empresasAOmitir],
      importacionId: null,
      facturaciones: [],
    })
  }

  // Validate companies exist
  const companyNames = [...new Set(rows.map((row) => row.empresaNombreArchivo))]
  const empresas = await prisma.empresa.findMany({
    where: { nombre: { in: companyNames }, activa: true },
    select: { id: true, nombre: true },
  })
  const empresasByName = new Map(empresas.map((empresa) => [empresa.nombre, empresa]))
  const missingCompanies = companyNames.filter((name) => !empresasByName.has(name))

  if (missingCompanies.length > 0) {
    return NextResponse.json(
      {
        error: 'VALIDATION_ERROR',
        message: 'Existen empresas del CSV que no están registradas en el maestro Empresa.',
        missingCompanies,
      },
      { status: 409 },
    )
  }

  // For companies flagged as sobreescribir, check they actually exist in the DB and collect their existing data
  const conflictingCompanies: string[] = []
  for (const nombre of companyNames) {
    if (empresasASobreescribir.has(nombre)) continue // user approved overwrite
    const empresa = empresasByName.get(nombre)!
    const existingActivacion = await prisma.activacionImportada.findFirst({
      where: {
        empresaId: empresa.id,
        anio,
        mes,
        importacion: { estado: { not: 'ANULADA' } },
      },
      select: { importacionId: true },
    })
    if (existingActivacion) {
      conflictingCompanies.push(nombre)
    }
  }

  // If there are conflicts the client didn't acknowledge, return them for user decision
  if (conflictingCompanies.length > 0) {
    return NextResponse.json(
      {
        error: 'EMPRESA_DUPLICADA',
        message: 'Algunas empresas ya tienen importación para este período.',
        conflictingCompanies,
      },
      { status: 409 },
    )
  }

  const estadoPendiente = await prisma.estadoCobro.findUnique({
    where: { codigo: 'PENDIENTE' },
    select: { id: true },
  })

  if (!estadoPendiente) {
    return internalError('No existe el estado de cobro PENDIENTE.')
  }

  try {
    const precioUnitario = new Prisma.Decimal(parameters.precioUnitarioActivacion)
    const porcentajeIva = new Prisma.Decimal(parameters.porcentajeIva)

    // Delete existing data for companies being overwritten
    for (const nombre of empresasASobreescribir) {
      const empresa = empresasByName.get(nombre)
      if (!empresa) continue
      // Find all non-ANULADA importaciones for this empresa+period
      const existingImportaciones = await prisma.importacionActivacion.findMany({
        where: {
          estado: { not: 'ANULADA' },
          activaciones: { some: { empresaId: empresa.id, anio, mes } },
        },
        select: { id: true },
      })
      for (const imp of existingImportaciones) {
        await prisma.activacionImportada.deleteMany({
          where: { importacionId: imp.id, empresaId: empresa.id },
        })
        await prisma.facturacionMensual.deleteMany({
          where: { importacionId: imp.id, empresaId: empresa.id },
        })
      }
    }

    // One ImportacionActivacion per period — reuse existing or create new
    let importacion = await prisma.importacionActivacion.findFirst({
      where: { anio, mes, estado: { not: 'ANULADA' } },
      select: { id: true },
    })
    if (!importacion) {
      importacion = await prisma.importacionActivacion.create({
        data: {
          anio,
          mes,
          nombreArchivo: uploadedFile.name,
          hashArchivo: periodHash,
          estado: 'CONFIRMADA',
        },
        select: { id: true },
      })
    }

    // Insert rows in chunks
    for (let offset = 0; offset < rows.length; offset += CHUNK_SIZE) {
      const chunk = rows.slice(offset, offset + CHUNK_SIZE)
      await prisma.activacionImportada.createMany({
        data: chunk.map((row) => {
          const empresa = empresasByName.get(row.empresaNombreArchivo)!
          return {
            importacionId: importacion!.id,
            empresaId: empresa.id,
            anio: row.anio,
            mes: row.mes,
            mid: row.mid,
            chip: row.chip,
            empresaNombreArchivo: row.empresaNombreArchivo,
            estadoActivacion: row.estadoActivacion,
            lote: row.lote,
            fechaImportacion: row.fechaImportacion,
            fechaActivacion: row.fechaActivacion,
            tieneFechaRealActivacion: row.tieneFechaRealActivacion,
            monto: precioUnitario,
            rawRowJson: row.rawRowJson,
          }
        }),
      })
    }

    // Generate facturacion per company
    const rowsByCompany = groupRowsByCompany(rows)
    const facturaciones = []

    for (const [empresaNombreArchivo, companyRows] of rowsByCompany) {
      const empresa = empresasByName.get(empresaNombreArchivo)!
      const cantidadActivaciones = companyRows.length
      const totalSinIva = precioUnitario.mul(cantidadActivaciones)
      const iva = totalSinIva.mul(porcentajeIva)
      const totalConIva = totalSinIva.add(iva)

      const facturacion = await prisma.facturacionMensual.create({
        data: {
          importacionId: importacion.id,
          empresaId: empresa.id,
          estadoCobroId: estadoPendiente.id,
          anio,
          mes,
          cantidadActivaciones,
          precioUnitario,
          porcentajeIva,
          totalSinIva,
          iva,
          totalConIva,
          snapshot: {
            empresaNombreArchivo,
            cantidadActivaciones,
            precioUnitario: precioUnitario.toString(),
            porcentajeIva: porcentajeIva.toString(),
            totalSinIva: totalSinIva.toFixed(2),
            iva: iva.toFixed(2),
            totalConIva: totalConIva.toFixed(2),
            importacionId: importacion.id,
            hashArchivo: periodHash,
            sobreescritura: empresasASobreescribir.has(empresaNombreArchivo),
          },
        },
        select: { id: true, empresaId: true, cantidadActivaciones: true, totalSinIva: true, iva: true, totalConIva: true },
      })

      facturaciones.push({
        id: facturacion.id,
        empresaId: facturacion.empresaId,
        empresaNombreArchivo,
        cantidadActivaciones: facturacion.cantidadActivaciones,
        subtotal: facturacion.totalSinIva.toFixed(2),
        iva: facturacion.iva.toFixed(2),
        total: facturacion.totalConIva.toFixed(2),
      })
    }

    // Audit records
    await prisma.auditoria.createMany({
      data: [
        {
          entidad: 'ImportacionActivacion',
          usuarioId: auth.user.id,
          entidadId: importacion.id,
          accion: empresasASobreescribir.size > 0 ? 'SOBREESCRIBIR_IMPORTACION' : 'CONFIRMAR_IMPORTACION',
          detalle: {
            anio,
            mes,
            periodo: periodoParam,
            nombreArchivo: uploadedFile.name,
            hashArchivo: periodHash,
            totalRows: rows.length,
            sobreescritas: [...empresasASobreescribir],
            omitidas: [...empresasAOmitir],
          },
        },
        ...facturaciones.map((facturacion) => ({
          entidad: 'FacturacionMensual',
          entidadId: facturacion.id,
          accion: 'GENERAR_FACTURACION',
          detalle: {
            importacionId: importacion!.id,
            empresaId: facturacion.empresaId,
            empresaNombreArchivo: facturacion.empresaNombreArchivo,
            cantidadActivaciones: facturacion.cantidadActivaciones,
            totalSinIva: facturacion.subtotal,
            iva: facturacion.iva,
            totalConIva: facturacion.total,
          },
        })),
      ],
    })

    return NextResponse.json({
      ok: true,
      periodo: periodoParam,
      procesadas: rows.length,
      total: rows.length,
      omitidas: [...empresasAOmitir],
      importacionId: importacion.id,
      facturaciones,
    })
  } catch (error) {
    console.error('Import confirmation failed', error)
    return internalError('No se pudo confirmar la importación. Revise los datos e intente nuevamente.')
  }
}

async function getRequiredParameters(): Promise<
  { parameters: ImportPreviewParameters } | { error: { error: string; message: string; parameters: string[] }; status: number }
> {
  const parametros = await prisma.parametro.findMany({
    where: { clave: { in: [...REQUIRED_PARAMETER_KEYS] } },
    select: { clave: true, valor: true },
  })
  const byKey = new Map(parametros.map((p) => [p.clave, p.valor.toString()]))
  const missing = REQUIRED_PARAMETER_KEYS.filter((key) => !byKey.has(key))

  if (missing.length > 0) {
    return {
      error: { error: 'PARAMETRO_REQUERIDO_FALTANTE', message: `Faltan parametros requeridos: ${missing.join(', ')}.`, parameters: missing },
      status: 422,
    }
  }

  const precioUnitarioActivacion = byKey.get('precio_unitario_activacion') as string
  const porcentajeIva = byKey.get('porcentaje_iva') as string
  const invalid = []

  try {
    if (!new Prisma.Decimal(precioUnitarioActivacion).greaterThan(0)) invalid.push('precio_unitario_activacion')
  } catch { invalid.push('precio_unitario_activacion') }

  try {
    const d = new Prisma.Decimal(porcentajeIva)
    if (!d.greaterThanOrEqualTo(0) || !d.lessThanOrEqualTo(1)) invalid.push('porcentaje_iva')
  } catch { invalid.push('porcentaje_iva') }

  if (invalid.length > 0) {
    return {
      error: { error: 'PARAMETRO_INVALIDO', message: `Parametros invalidos: ${invalid.join(', ')}.`, parameters: invalid },
      status: 422,
    }
  }

  return { parameters: { precioUnitarioActivacion, porcentajeIva } }
}

function parseConfirmableRows(csvText: string): ConfirmableRow[] {
  const parsed = parseSemicolonCsv(csvText)

  return parsed.rows.flatMap((row, index) => {
    const fechaImportacionTexto = row['Fecha de importación'] ?? ''
    const fechaActivacionTexto = row['Fecha de activación'] ?? ''
    const period = parseDatePeriod(fechaImportacionTexto)

    if (!period) return []

    const tieneFechaRealActivacion = hasRealActivationDate(fechaActivacionTexto)

    return [{
      rowNumber: index + 2,
      rawRowJson: row,
      empresaNombreArchivo: row.Empresa ?? '',
      estadoActivacion: row['Estado de activación'] ?? '',
      lote: row.Lote ?? '',
      mid: row.MID ?? '',
      chip: normalizeChip(row.Chip ?? ''),
      fechaImportacion: parseDate(fechaImportacionTexto) as Date,
      fechaActivacion:
        tieneFechaRealActivacion && !isTechnicalActivationDate(fechaActivacionTexto)
          ? parseDate(fechaActivacionTexto)
          : null,
      tieneFechaRealActivacion,
      anio: period.anio,
      mes: period.mes,
    }]
  })
}

function parseDate(value: string) {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return null
  return new Date(Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1])))
}

function groupRowsByCompany(rows: ConfirmableRow[]) {
  const grouped = new Map<string, ConfirmableRow[]>()
  for (const row of rows) {
    grouped.set(row.empresaNombreArchivo, [...(grouped.get(row.empresaNombreArchivo) ?? []), row])
  }
  return grouped
}
