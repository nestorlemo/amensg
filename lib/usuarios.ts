import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/passwords'
import type { CurrentUser, UserRole } from '@/lib/auth'

const ROLES = new Set(['ADMIN', 'OPERADOR', 'ISSUES'])

export async function getUsuarios() {
  const rows = await prisma.usuario.findMany({
    orderBy: [{ activo: 'desc' }, { nombre: 'asc' }],
    select: {
      id: true,
      nombre: true,
      email: true,
      rol: true,
      activo: true,
      creadoEn: true,
      actualizadoEn: true,
    },
  })

  return {
    rows: rows.map((row) => ({
      ...row,
      creadoEn: row.creadoEn.toISOString(),
      actualizadoEn: row.actualizadoEn.toISOString(),
    })),
  }
}

export async function createUsuario(input: Record<string, unknown>, actor: CurrentUser) {
  const parsed = parseUsuarioInput(input, true)
  if ('error' in parsed) return parsed

  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.usuario.create({
      data: {
        nombre: parsed.data.nombre,
        email: parsed.data.email,
        rol: parsed.data.rol,
        activo: parsed.data.activo,
        passwordHash: hashPassword(parsed.data.password as string),
      },
    })
    await tx.auditoria.create({
      data: {
        usuarioId: actor.id,
        entidad: 'Usuario',
        entidadId: user.id,
        accion: 'CREAR_USUARIO',
        detalle: { nombre: user.nombre, email: user.email, rol: user.rol, activo: user.activo },
      },
    })
    return user
  })

  return { data: { id: created.id }, status: 201 }
}

export async function updateUsuario(id: string, input: Record<string, unknown>, actor: CurrentUser) {
  const existing = await prisma.usuario.findUnique({ where: { id } })
  if (!existing) return { error: { error: 'NOT_FOUND', message: 'Usuario no encontrado.' }, status: 404 }

  const parsed = parseUsuarioInput(input, false)
  if ('error' in parsed) return parsed

  if (existing.rol === 'ADMIN' && parsed.data.rol !== 'ADMIN' && (await activeAdminCount()) <= 1) {
    return { error: { error: 'ULTIMO_ADMIN', message: 'No se puede cambiar el ultimo ADMIN activo a OPERADOR.' }, status: 422 }
  }

  if (existing.rol === 'ADMIN' && existing.activo && !parsed.data.activo && (await activeAdminCount()) <= 1) {
    return { error: { error: 'ULTIMO_ADMIN', message: 'No se puede desactivar el ultimo ADMIN activo.' }, status: 422 }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const user = await tx.usuario.update({
      where: { id },
      data: {
        nombre: parsed.data.nombre,
        rol: parsed.data.rol,
        activo: parsed.data.activo,
        ...(parsed.data.password ? { passwordHash: hashPassword(parsed.data.password) } : {}),
      },
    })
    await tx.auditoria.create({
      data: {
        usuarioId: actor.id,
        entidad: 'Usuario',
        entidadId: id,
        accion: parsed.data.password ? 'ACTUALIZAR_USUARIO_Y_PASSWORD' : 'ACTUALIZAR_USUARIO',
        detalle: {
          anterior: { nombre: existing.nombre, email: existing.email, rol: existing.rol, activo: existing.activo },
          nuevo: { nombre: user.nombre, email: user.email, rol: user.rol, activo: user.activo },
          passwordCambiado: Boolean(parsed.data.password),
        },
      },
    })
    return user
  })

  return { data: { id: updated.id }, status: 200 }
}

export async function deactivateUsuario(id: string, actor: CurrentUser) {
  const existing = await prisma.usuario.findUnique({ where: { id } })
  if (!existing) return { error: { error: 'NOT_FOUND', message: 'Usuario no encontrado.' }, status: 404 }

  if (existing.rol === 'ADMIN' && existing.activo && (await activeAdminCount()) <= 1) {
    return { error: { error: 'ULTIMO_ADMIN', message: 'No se puede desactivar el ultimo ADMIN activo.' }, status: 422 }
  }

  await prisma.$transaction(async (tx) => {
    await tx.usuario.update({ where: { id }, data: { activo: false } })
    await tx.auditoria.create({
      data: {
        usuarioId: actor.id,
        entidad: 'Usuario',
        entidadId: id,
        accion: 'DESACTIVAR_USUARIO',
        detalle: { email: existing.email, rol: existing.rol },
      },
    })
  })

  return { data: { id }, status: 200 }
}

function parseUsuarioInput(input: Record<string, unknown>, requirePassword: boolean) {
  const nombre = text(input.nombre)
  const email = text(input.email).toLowerCase()
  const rol = text(input.rol) as UserRole
  const activo = input.activo === true || input.activo === 'true' || input.activo === 'on'
  const password = typeof input.password === 'string' && input.password.length >= 8 ? input.password : ''

  if (!nombre || !email || !email.includes('@') || !ROLES.has(rol)) {
    return { error: { error: 'USUARIO_INVALIDO', message: 'Nombre, email y rol valido son requeridos.' }, status: 422 }
  }

  if (requirePassword && !password) {
    return { error: { error: 'PASSWORD_REQUERIDO', message: 'Debe indicar un password de al menos 8 caracteres.' }, status: 422 }
  }

  return { data: { nombre, email, rol, activo, password } }
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function activeAdminCount() {
  return prisma.usuario.count({ where: { rol: 'ADMIN', activo: true } })
}
