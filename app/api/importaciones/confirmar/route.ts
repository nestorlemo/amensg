import { createHash } from 'node:crypto'

import { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'

import { requireApiAuth } from '@/lib/auth'
import { parseSemicolonCsv } from '@/lib/import-preview/csv'
import {
  buildImportPreview,
  hasRealActivationDate,
  isTechnicalActivationDate,
  normalizeChip,
  parseDatePeriod,
} from '@/lib/import-preview/preview'
import type { ImportPreviewParameters } from '@/lib/import-preview/types'
import { closedPeriodError, isPeriodClosed } from '@/lib/periods'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

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

type ParameterErrorResponse = {
  error: {
    error: 'PARAMETRO_REQUERIDO_FALTANTE' | 'PARAMETRO_INVALIDO'
    message: string
    parameters: string[]
  }
  status: number
}

export async function POST(request: Request) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error
  const formData = await request.formData()
  const uploadedFile = formData.get('file')

  if (!(uploadedFile instanceof File)) {
    return NextResponse.json(
      {
        error: 'Debe enviar un archivo CSV en el campo "file".',
      },
      { status: 400 },
    )
  }

  const bytes = Buffer.from(await uploadedFile.arrayBuffer())
  const csvText = bytes.toString('utf8')
  const fileHash = createHash('sha256').update(bytes).digest('hex')
  const parametersResult = await getRequiredParameters()

  if ('error' in parametersResult) {
    return NextResponse.json(parametersResult.error, { status: parametersResult.status })
  }

  const parameters = parametersResult.parameters
  const preview = buildImportPreview({
    csvText,
    fileName: uploadedFile.name,
    fileSize: uploadedFile.size,
    fileHash,
    parameters,
  })

  if (preview.validation.hasBlockingErrors || !preview.detectedPeriod) {
    return NextResponse.json(
      {
        error: 'La importacion tiene errores bloqueantes. Genere una vista previa valida antes de confirmar.',
        validation: preview.validation,
      },
      { status: 422 },
    )
  }

  const detectedPeriod = preview.detectedPeriod
  if (await isPeriodClosed(detectedPeriod.anio, detectedPeriod.mes)) {
    return NextResponse.json(
      closedPeriodError('El período ya está cerrado. No se puede confirmar una nueva importación.'),
      { status: 409 },
    )
  }

  const rows = parseConfirmableRows(csvText)
  const companyNames = [...new Set(rows.map((row) => row.empresaNombreArchivo))]
  const empresas = await prisma.empresa.findMany({
    where: {
      nombre: {
        in: companyNames,
      },
      activa: true,
    },
    select: {
      id: true,
      nombre: true,
    },
  })
  const empresasByName = new Map(empresas.map((empresa) => [empresa.nombre, empresa]))
  const missingCompanies = companyNames.filter((name) => !empresasByName.has(name))

  if (missingCompanies.length > 0) {
    return NextResponse.json(
      {
        error: 'Existen empresas del CSV que no estan registradas en el maestro Empresa.',
        missingCompanies,
      },
      { status: 409 },
    )
  }

  const existingHash = await prisma.importacionActivacion.findUnique({
    where: { hashArchivo: fileHash },
    select: { id: true },
  })

  if (existingHash) {
    return NextResponse.json(
      {
        error: 'Este archivo ya fue confirmado anteriormente.',
        importacionId: existingHash.id,
      },
      { status: 409 },
    )
  }

  const existingPeriod = await prisma.importacionActivacion.findFirst({
    where: {
      anio: detectedPeriod.anio,
      mes: detectedPeriod.mes,
      estado: {
        not: 'ANULADA',
      },
    },
    select: { id: true },
  })

  if (existingPeriod) {
    return NextResponse.json(
      {
        error: 'Ya existe una importacion confirmada para este periodo.',
        importacionId: existingPeriod.id,
      },
      { status: 409 },
    )
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const estadoPendiente = await tx.estadoCobro.findUnique({
          where: { codigo: 'PENDIENTE' },
          select: { id: true },
        })

        if (!estadoPendiente) {
          throw new Error('No existe el estado de cobro PENDIENTE.')
        }

        const importacion = await tx.importacionActivacion.create({
          data: {
            anio: detectedPeriod.anio,
            mes: detectedPeriod.mes,
            nombreArchivo: uploadedFile.name,
            hashArchivo: fileHash,
            estado: 'CONFIRMADA',
          },
          select: {
            id: true,
          },
        })

        await tx.activacionImportada.createMany({
          data: rows.map((row) => {
            const empresa = empresasByName.get(row.empresaNombreArchivo)

            if (!empresa) {
              throw new Error(`Empresa no encontrada: ${row.empresaNombreArchivo}`)
            }

            return {
              importacionId: importacion.id,
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
              monto: new Prisma.Decimal(parameters.precioUnitarioActivacion),
              rawRowJson: row.rawRowJson,
            }
          }),
        })

        const rowsByCompany = groupRowsByCompany(rows)
        const facturaciones = []
        const precioUnitario = new Prisma.Decimal(parameters.precioUnitarioActivacion)
        const porcentajeIva = new Prisma.Decimal(parameters.porcentajeIva)

        for (const [empresaNombreArchivo, companyRows] of rowsByCompany) {
          const empresa = empresasByName.get(empresaNombreArchivo)

          if (!empresa) {
            throw new Error(`Empresa no encontrada: ${empresaNombreArchivo}`)
          }

          const cantidadActivaciones = companyRows.length
          const totalSinIva = precioUnitario.mul(cantidadActivaciones)
          const iva = totalSinIva.mul(porcentajeIva)
          const totalConIva = totalSinIva.add(iva)
          const facturacion = await tx.facturacionMensual.create({
            data: {
              importacionId: importacion.id,
              empresaId: empresa.id,
              estadoCobroId: estadoPendiente.id,
              anio: detectedPeriod.anio,
              mes: detectedPeriod.mes,
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
                hashArchivo: fileHash,
              },
            },
            select: {
              id: true,
              empresaId: true,
              anio: true,
              mes: true,
              cantidadActivaciones: true,
              totalSinIva: true,
              iva: true,
              totalConIva: true,
            },
          })

          facturaciones.push({
            id: facturacion.id,
            empresaId: facturacion.empresaId,
            empresaNombreArchivo,
            anio: facturacion.anio,
            mes: facturacion.mes,
            cantidadActivaciones: facturacion.cantidadActivaciones,
            subtotal: facturacion.totalSinIva.toFixed(2),
            iva: facturacion.iva.toFixed(2),
            total: facturacion.totalConIva.toFixed(2),
          })
        }

        await tx.auditoria.createMany({
          data: [
            {
              entidad: 'ImportacionActivacion',
              usuarioId: auth.user.id,
              entidadId: importacion.id,
              accion: 'CONFIRMAR_IMPORTACION',
              detalle: {
                anio: detectedPeriod.anio,
                mes: detectedPeriod.mes,
                nombreArchivo: uploadedFile.name,
                hashArchivo: fileHash,
                totalRows: rows.length,
              },
            },
            ...facturaciones.map((facturacion) => ({
              entidad: 'FacturacionMensual',
              entidadId: facturacion.id,
              accion: 'GENERAR_FACTURACION',
              detalle: {
                importacionId: importacion.id,
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

        return {
          importacionId: importacion.id,
          facturaciones,
        }
      },
      {
        timeout: 60000,
      },
    )

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'No se pudo confirmar la importacion.',
      },
      { status: 500 },
    )
  }
}

async function getRequiredParameters(): Promise<{ parameters: ImportPreviewParameters } | ParameterErrorResponse> {
  const parametros = await prisma.parametro.findMany({
    where: {
      clave: {
        in: [...REQUIRED_PARAMETER_KEYS],
      },
    },
    select: {
      clave: true,
      valor: true,
    },
  })
  const byKey = new Map(parametros.map((parametro) => [parametro.clave, parametro.valor.toString()]))
  const missing = REQUIRED_PARAMETER_KEYS.filter((key) => !byKey.has(key))

  if (missing.length > 0) {
    return {
      error: {
        error: 'PARAMETRO_REQUERIDO_FALTANTE',
        message: `Faltan parametros requeridos: ${missing.join(', ')}.`,
        parameters: missing,
      },
      status: 422,
    }
  }

  const precioUnitarioActivacion = byKey.get('precio_unitario_activacion') as string
  const porcentajeIva = byKey.get('porcentaje_iva') as string
  const invalid = []

  if (!isValidPositiveDecimal(precioUnitarioActivacion)) {
    invalid.push('precio_unitario_activacion')
  }

  if (!isValidIvaRate(porcentajeIva)) {
    invalid.push('porcentaje_iva')
  }

  if (invalid.length > 0) {
    return {
      error: {
        error: 'PARAMETRO_INVALIDO',
        message: `Parametros invalidos: ${invalid.join(', ')}.`,
        parameters: invalid,
      },
      status: 422,
    }
  }

  return {
    parameters: {
      precioUnitarioActivacion,
      porcentajeIva,
    },
  }
}

function isValidPositiveDecimal(value: string) {
  try {
    return new Prisma.Decimal(value).greaterThan(0)
  } catch {
    return false
  }
}

function isValidIvaRate(value: string) {
  try {
    const decimal = new Prisma.Decimal(value)
    return decimal.greaterThanOrEqualTo(0) && decimal.lessThanOrEqualTo(1)
  } catch {
    return false
  }
}

function parseConfirmableRows(csvText: string): ConfirmableRow[] {
  const parsed = parseSemicolonCsv(csvText)

  return parsed.rows.map((row, index) => {
    const fechaImportacionTexto = row['Fecha de importación'] ?? ''
    const fechaActivacionTexto = row['Fecha de activación'] ?? ''
    const period = parseDatePeriod(fechaImportacionTexto)

    if (!period) {
      throw new Error(`La fila ${index + 2} no tiene una Fecha de importacion valida.`)
    }

    const tieneFechaRealActivacion = hasRealActivationDate(fechaActivacionTexto)

    return {
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
    }
  })
}

function parseDate(value: string) {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/)

  if (!match) {
    return null
  }

  return new Date(Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1])))
}

function groupRowsByCompany(rows: ConfirmableRow[]) {
  const grouped = new Map<string, ConfirmableRow[]>()

  for (const row of rows) {
    grouped.set(row.empresaNombreArchivo, [...(grouped.get(row.empresaNombreArchivo) ?? []), row])
  }

  return grouped
}
