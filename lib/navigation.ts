export type NavItem = {
  href: string
  label: string
  icon: string
  adminOnly?: boolean
  roles?: string[]        // if set, only these roles can see this item
  section?: string        // renders a section separator before this item
}

export const navigationItems: NavItem[] = [
  { href: '/',             label: 'Dashboard',    icon: 'LayoutDashboard' },
  { href: '/importaciones', label: 'Importaciones', icon: 'Upload' },
  { href: '/activaciones',  label: 'Activaciones',  icon: 'Zap' },

  // ── GESTIÓN DE FACTURACIÓN ────────────────────────────────────────────────
  { href: '/cobros',               label: 'Facturación Activaciones', icon: 'CreditCard',  section: 'GESTIÓN DE FACTURACIÓN' },
  { href: '/issues/facturar',      label: 'Facturación Desarrollo',   icon: 'FileCode2' },
  { href: '/ingresos-adicionales', label: 'Facturación Adicional',    icon: 'PlusCircle' },
  { href: '/cobros-unificado',     label: 'Gestión de Cobros',        icon: 'Wallet' },

  // ── GESTIÓN MENSUAL ───────────────────────────────────────────────────────
  { href: '/gastos',        label: 'Gastos',        icon: 'Receipt',    section: 'GESTIÓN MENSUAL' },
  { href: '/liquidaciones', label: 'Liquidaciones', icon: 'Calculator' },
  { href: '/cierres',       label: 'Cierres',       icon: 'Lock' },

  { href: '/reportes', label: 'Reportes', icon: 'BarChart2' },
  { href: '/issues',   label: 'Issues',   icon: 'Bug', roles: ['ADMIN', 'OPERADOR', 'ISSUES'] },

  // ── ADMINISTRACIÓN ────────────────────────────────────────────────────────
  { href: '/empresas',   label: 'Empresas',   icon: 'Building2', adminOnly: true },
  { href: '/parametros', label: 'Parámetros', icon: 'Settings',  adminOnly: true },
  { href: '/socios',     label: 'Socios',     icon: 'Users',     adminOnly: true },
  { href: '/usuarios',   label: 'Usuarios',   icon: 'UserCog',   adminOnly: true },
  { href: '/auditoria',  label: 'Auditoría',  icon: 'Shield',    adminOnly: true },
]
