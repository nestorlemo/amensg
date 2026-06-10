'use client'

export type BadgeVariant =
  | 'activo'
  | 'inactivo'
  | 'confirmada'
  | 'cobrado'
  | 'facturado'
  | 'pendiente'
  | 'ACTIVACIONES'
  | 'DESARROLLO'
  | 'ADICIONAL'
  | 'CRITICO'
  | 'ADMIN'
  | 'GESTION_ISSUES'
  | 'UYU'
  | 'USD'

const CLASSES: Record<BadgeVariant, string> = {
  activo:         'bg-green-100 text-green-700',
  confirmada:     'bg-green-100 text-green-700',
  cobrado:        'bg-green-100 text-green-700',
  inactivo:       'bg-gray-100 text-gray-600',
  pendiente:      'bg-gray-100 text-gray-600',
  facturado:      'bg-blue-100 text-blue-700',
  ACTIVACIONES:   'bg-cyan-100 text-cyan-700',
  DESARROLLO:     'bg-purple-100 text-purple-700',
  ADICIONAL:      'bg-orange-100 text-orange-700',
  CRITICO:        'bg-orange-100 text-orange-700',
  ADMIN:          'bg-blue-100 text-blue-700',
  GESTION_ISSUES: 'bg-yellow-100 text-yellow-700',
  UYU:            'bg-green-100 text-green-700',
  USD:            'bg-blue-100 text-blue-700',
}

const DEFAULT_LABEL: Record<BadgeVariant, string> = {
  activo:         'Activo',
  inactivo:       'Inactivo',
  confirmada:     'Confirmada',
  cobrado:        'Cobrado',
  facturado:      'Facturado',
  pendiente:      'Pendiente',
  ACTIVACIONES:   'Activaciones',
  DESARROLLO:     'Desarrollo',
  ADICIONAL:      'Adicional',
  CRITICO:        'Crítico',
  ADMIN:          'Admin',
  GESTION_ISSUES: 'Gestión Issues',
  UYU:            'UYU',
  USD:            'USD',
}

export function Badge({
  variant,
  label,
  className = '',
}: {
  variant: BadgeVariant
  label?: string
  className?: string
}) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${CLASSES[variant]} ${className}`}
    >
      {label ?? DEFAULT_LABEL[variant]}
    </span>
  )
}
