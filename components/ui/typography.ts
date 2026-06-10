export const typography = {
  pageTitle:    'text-2xl font-bold text-gray-900',
  pageSubtitle: 'text-sm font-normal text-gray-500',
  sectionLabel: 'text-xs font-semibold uppercase tracking-wide text-gray-500',
  tableHeader:  'text-xs font-semibold uppercase tracking-wide text-gray-500',
  tableCell:    'text-sm font-normal text-gray-700',
  badge:        'text-xs font-medium',
  button:       'text-sm font-semibold',
  input:        'text-sm font-normal text-gray-900',
  paragraph:    'text-sm font-normal text-gray-700',
  hint:         'text-xs font-normal text-gray-400',
} as const

export type TypographyToken = keyof typeof typography
