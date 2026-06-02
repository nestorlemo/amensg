/**
 * Migration script: imports historical issues from Excel into the DB.
 *
 * Usage:
 *   npm run migrate:issues
 *   npm run migrate:issues -- /path/to/file.xlsx
 *   npm run migrate:issues -- /path/to/file.xlsx --dry-run
 *
 * Default source: prisma/seed-data/issues.xlsx
 */

import path from 'path'
import * as XLSX from 'xlsx'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ─── Config ──────────────────────────────────────────────────────────────────

const DEFAULT_FILE = path.resolve(__dirname, '../prisma/seed-data/issues.xlsx')

const ESTADO_MAP: Record<string, string> = {
  'EN PRODUCCIÓN': 'EN_PRODUCCION',
  'EN PRODUCCION':  'EN_PRODUCCION',
  'EN DESARROLLO':  'EN_DESARROLLO',
  'PENDIENTE':      'PENDIENTE',
  'EN_PRODUCCION':  'EN_PRODUCCION',
  'EN_DESARROLLO':  'EN_DESARROLLO',
}

const ESTADOS_INCLUIR = new Set(['EN_PRODUCCION', 'EN_DESARROLLO', 'PENDIENTE'])

const REPORTADOR_EMPRESA: Record<string, string> = {
  'Aureliano Arredondo': 'Relpont',
}
const EMPRESA_DEFAULT = 'Elared'

const NOMBRE_MAP: Record<string, string> = {
  'Andres Ottado':      'Andrés Ottado',
  'Daniela Irastoza':   'Daniela Irastorza',
  'Daniela Iraztorza':  'Daniela Irastorza',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Converts Excel serial date to JS Date (UTC midnight). */
function excelSerialToDate(serial: number): Date {
  return new Date((serial - 25569) * 86400 * 1000)
}

function parseDate(value: unknown): Date | null {
  if (!value) return null
  if (typeof value === 'number') return excelSerialToDate(value)
  if (typeof value === 'string') {
    // dd/mm/yyyy or similar
    const d = new Date(value)
    if (!isNaN(d.getTime())) return d
    // try dd/mm/yyyy
    const parts = value.split('/')
    if (parts.length === 3) {
      const [dd, mm, yyyy] = parts
      const d2 = new Date(`${yyyy}-${mm!.padStart(2,'0')}-${dd!.padStart(2,'0')}`)
      if (!isNaN(d2.getTime())) return d2
    }
  }
  return null
}

function parseHoras(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0
  const n = Number(value)
  return isNaN(n) ? 0 : Math.round(n * 100) / 100
}

function normalizeName(name: string): string {
  const trimmed = name.trim()
  return NOMBRE_MAP[trimmed] ?? trimmed
}

function normalizeEstado(raw: string): string | null {
  const upper = raw.trim().toUpperCase()
  return ESTADO_MAP[upper] ?? ESTADO_MAP[raw.trim()] ?? null
}

function normalizePrioridad(value: unknown): string {
  if (!value) return 'MEDIA'
  const s = String(value).trim().toUpperCase()
  if (s === 'ALTA' || s === 'A') return 'ALTA'
  if (s === 'BAJA' || s === 'B') return 'BAJA'
  return 'MEDIA'
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args   = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const filePath = args.find((a) => !a.startsWith('--')) ?? DEFAULT_FILE

  console.log(`\n📂 Leyendo: ${filePath}`)
  if (dryRun) console.log('🔍 DRY RUN — no se escribirá en la DB\n')

  // Load workbook
  const wb = XLSX.readFile(filePath)
  const sheetName = wb.SheetNames[0]!
  console.log(`📋 Hoja: "${sheetName}"`)

  const ws = wb.Sheets[sheetName]!
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null })

  // Print headers for verification
  console.log(`\nColumnas detectadas (fila 1):`)
  const headers = rawRows[0] as unknown[]
  headers.forEach((h, i) => console.log(`  [${i + 1}] ${h ?? '(vacía)'}`))
  console.log()

  const dataRows = rawRows.slice(1) // skip header row

  // Load empresa IDs
  const empresas = await prisma.empresa.findMany({ select: { id: true, nombre: true } })
  const empresaByNombre = new Map(empresas.map((e) => [e.nombre.toLowerCase(), e.id]))

  function getEmpresaId(reportadoPor: string): string | null {
    const empresaNombre = REPORTADOR_EMPRESA[reportadoPor] ?? EMPRESA_DEFAULT
    const id = empresaByNombre.get(empresaNombre.toLowerCase())
    if (!id) console.warn(`  ⚠️  Empresa "${empresaNombre}" no encontrada en DB`)
    return id ?? null
  }

  // Process rows
  let total = 0, omitidos = 0, errores = 0
  const toInsert: import('@prisma/client').Prisma.IssueCreateManyInput[] = []
  const errorDetails: string[] = []

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i] as (unknown)[]
    const rowNum = i + 2 // 1-indexed + header

    // Skip empty rows
    if (!row || row.every((c) => c === null || c === undefined || c === '')) continue
    total++

    try {
      // Col 8 = estado (index 7)
      const estadoRaw = String(row[7] ?? '').trim()
      if (!estadoRaw) { omitidos++; continue }

      const estado = normalizeEstado(estadoRaw)
      if (!estado) {
        omitidos++
        console.log(`  ⏭  Fila ${rowNum}: estado "${estadoRaw}" ignorado`)
        continue
      }

      if (!ESTADOS_INCLUIR.has(estado)) {
        omitidos++
        continue
      }

      // Col 2 = fecha (index 1)
      const fecha = parseDate(row[1])
      if (!fecha) {
        errores++
        errorDetails.push(`Fila ${rowNum}: fecha inválida (${row[1]})`)
        continue
      }

      // Col 3 = descripcion (index 2)
      const descripcion = String(row[2] ?? '').trim()
      if (!descripcion) {
        errores++
        errorDetails.push(`Fila ${rowNum}: descripción vacía`)
        continue
      }

      // Horas
      const horasDesarrollo = parseHoras(row[3])  // col 4 (index 3)
      const horasTestRaw    = parseHoras(row[4])  // col 5 (index 4)
      const horasReworkRaw  = parseHoras(row[5])  // col 6 (index 5)
      const totalHorasRaw   = parseHoras(row[6])  // col 7 (index 6)

      const horasTest   = (row[4] !== null && row[4] !== '') ? horasTestRaw   : Math.round(horasDesarrollo * 0.30 * 100) / 100
      const horasRework = (row[5] !== null && row[5] !== '') ? horasReworkRaw : Math.round(horasDesarrollo * 0.15 * 100) / 100
      const totalHoras  = (row[6] !== null && row[6] !== '') ? totalHorasRaw  : Math.round((horasDesarrollo + horasTest + horasRework) * 100) / 100

      // Col 9 = fechaProduccion (index 8)
      const fechaProduccion = parseDate(row[8])

      // Col 10 = reportadoPor (index 9)
      const reportadoPorRaw = String(row[9] ?? '').trim()
      const reportadoPor    = normalizeName(reportadoPorRaw) || 'Importado'

      // Col 11 = prioridad (index 10)
      const prioridad = normalizePrioridad(row[10])

      // Empresa
      const empresaId = getEmpresaId(reportadoPorRaw)

      toInsert.push({
        fecha,
        descripcion,
        horasDesarrollo,
        horasTest,
        horasRework,
        totalHoras,
        estado,
        fechaProduccion: fechaProduccion ?? (estado === 'EN_PRODUCCION' ? fecha : null),
        reportadoPor,
        prioridad,
        empresaId,
      })

    } catch (err) {
      errores++
      errorDetails.push(`Fila ${rowNum}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  console.log(`\n─── Preview ─────────────────────────────────────────────`)
  console.log(`  Total filas procesadas : ${total}`)
  console.log(`  Para insertar          : ${toInsert.length}`)
  console.log(`  Omitidos (estado/vacío): ${omitidos}`)
  console.log(`  Errores de parseo      : ${errores}`)

  if (errorDetails.length > 0) {
    console.log(`\n  Errores:`)
    errorDetails.forEach((e) => console.log(`    • ${e}`))
  }

  // Estado breakdown
  const byEstado: Record<string, number> = {}
  for (const r of toInsert) byEstado[r.estado] = (byEstado[r.estado] ?? 0) + 1
  console.log(`\n  Por estado:`)
  Object.entries(byEstado).forEach(([e, n]) => console.log(`    ${e}: ${n}`))

  if (dryRun) {
    console.log('\n✅ Dry run completado. Ejecutá sin --dry-run para insertar.')
    return
  }

  if (toInsert.length === 0) {
    console.log('\n⚠️  No hay registros para insertar.')
    return
  }

  // Insert in batches of 100
  const BATCH = 100
  let inserted = 0
  for (let i = 0; i < toInsert.length; i += BATCH) {
    const batch = toInsert.slice(i, i + BATCH)
    const result = await prisma.issue.createMany({ data: batch, skipDuplicates: false })
    inserted += result.count
    process.stdout.write(`\r  Insertando… ${inserted}/${toInsert.length}`)
  }

  console.log(`\n\n✅ Migración completada: ${inserted} issues insertados.`)
}

main()
  .catch((err) => { console.error('\n❌ Error fatal:', err); process.exit(1) })
  .finally(() => prisma.$disconnect())
