'use client'

const ACCENT_BORDER: Record<string, string> = {
  default: '#e6eefc',
  green:   '#20E0B2',
  amber:   '#f59e0b',
  red:     '#ef4444',
  purple:  '#8b5cf6',
}

const BADGE_CLASSES: Record<string, string> = {
  green: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-700',
  blue:  'bg-blue-100 text-blue-700',
  red:   'bg-red-100 text-red-700',
}

export function StatCardExtended({
  label,
  value,
  accent = 'default',
  badge,
  badgeColor = 'blue',
  valuePrefix,
  sub,
  vs,
  vsLabel,
}: {
  label: string
  value: string | number | null
  accent?: 'default' | 'green' | 'amber' | 'red' | 'purple'
  badge?: string
  badgeColor?: 'green' | 'amber' | 'blue' | 'red'
  valuePrefix?: string
  sub?: string
  vs?: string | null
  vsLabel?: string
}) {
  return (
    <div
      className="flex flex-col gap-2 rounded-xl bg-white p-5"
      style={{
        border: `1px solid ${ACCENT_BORDER[accent] ?? ACCENT_BORDER.default}`,
        boxShadow: '0 1px 4px rgba(23,105,224,0.06)',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-amensg-subtle">{label}</p>
        {badge ? (
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${BADGE_CLASSES[badgeColor] ?? BADGE_CLASSES.blue}`}>
            {badge}
          </span>
        ) : null}
      </div>
      {value === null ? (
        <div className="h-8 w-16 animate-pulse rounded-lg bg-amensg-surface" />
      ) : (
        <p className="text-2xl font-bold tabular-nums text-amensg-navy">
          {valuePrefix ? <span className="mr-1 text-base font-semibold text-slate-400">{valuePrefix}</span> : null}
          {value}
        </p>
      )}
      {sub ? <p className="text-xs font-medium text-slate-400">{sub}</p> : null}
      {vsLabel !== undefined ? (
        vs != null ? (
          <p className="text-xs text-slate-400">
            vs {vsLabel}:{' '}
            <span className={vs.includes('(-)') || vs.startsWith('$-') ? 'text-red-500' : 'text-emerald-600'}>
              {vs}
            </span>
          </p>
        ) : (
          <p className="text-xs text-slate-400">vs {vsLabel}: sin datos</p>
        )
      ) : null}
    </div>
  )
}
