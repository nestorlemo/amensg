import { NextResponse } from 'next/server'

import { requireApiAuth } from '@/lib/auth'
import { hashPassword, verifyPassword } from '@/lib/passwords'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function PUT(request: Request) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error

  const body = await request.json()
  const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : ''
  const passwordActual = typeof body.passwordActual === 'string' ? body.passwordActual : ''
  const passwordNuevo = typeof body.passwordNuevo === 'string' ? body.passwordNuevo : ''

  if (!nombre) {
    return NextResponse.json({ error: 'NOMBRE_REQUERIDO', message: 'El nombre es requerido.' }, { status: 422 })
  }

  const existing = await prisma.usuario.findUnique({ where: { id: auth.user.id } })
  if (!existing) {
    return NextResponse.json({ error: 'NOT_FOUND', message: 'Usuario no encontrado.' }, { status: 404 })
  }

  let passwordHash: string | undefined
  if (passwordNuevo) {
    if (!passwordActual) {
      return NextResponse.json({ error: 'PASSWORD_ACTUAL_REQUERIDO', message: 'Debe ingresar su contraseña actual.' }, { status: 422 })
    }
    if (!verifyPassword(passwordActual, existing.passwordHash)) {
      return NextResponse.json({ error: 'PASSWORD_INCORRECTO', message: 'La contraseña actual es incorrecta.' }, { status: 422 })
    }
    if (passwordNuevo.length < 8) {
      return NextResponse.json({ error: 'PASSWORD_CORTO', message: 'La nueva contraseña debe tener al menos 8 caracteres.' }, { status: 422 })
    }
    passwordHash = hashPassword(passwordNuevo)
  }

  await prisma.$transaction(async (tx) => {
    await tx.usuario.update({
      where: { id: auth.user.id },
      data: { nombre, ...(passwordHash ? { passwordHash } : {}) },
    })
    await tx.auditoria.create({
      data: {
        usuarioId: auth.user.id,
        entidad: 'Usuario',
        entidadId: auth.user.id,
        accion: passwordHash ? 'ACTUALIZAR_PERFIL_Y_PASSWORD' : 'ACTUALIZAR_PERFIL',
        detalle: { nombreAnterior: existing.nombre, nombreNuevo: nombre, passwordCambiado: Boolean(passwordHash) },
      },
    })
  })

  return NextResponse.json({ ok: true })
}
