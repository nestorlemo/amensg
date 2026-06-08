import { readFile } from 'fs/promises'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

import { NextRequest, NextResponse } from 'next/server'

import { requireApiAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error
  const { id } = await params
  const cobro = await prisma.cobro.findUnique({ where: { id }, select: { urlPdfFactura: true } })
  if (!cobro?.urlPdfFactura) return NextResponse.json({ error: 'No PDF' }, { status: 404 })
  const filename = cobro.urlPdfFactura.replace('/storage/facturas/', '')
  const filePath = path.join(process.cwd(), 'storage', 'facturas', filename)
  try {
    const buffer = await readFile(filePath)
    return new Response(buffer, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${filename}"` } })
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error
  const { id } = await params
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const dir = path.join(process.cwd(), 'storage', 'facturas')
  await mkdir(dir, { recursive: true })
  const filename = `${id}-${Date.now()}.pdf`
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(path.join(dir, filename), buffer)
  const url = `/storage/facturas/${filename}`

  await prisma.cobro.update({ where: { id }, data: { urlPdfFactura: url } })

  await prisma.auditoria.create({
    data: {
      usuarioId: auth.user.id,
      entidad: 'Cobro',
      entidadId: id,
      accion: 'SUBIR_PDF_COBRO',
      detalle: { filename, url },
    },
  })

  return NextResponse.json({ ok: true, url })
}
