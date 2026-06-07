export function parseIntParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value
  const parsed = Number(raw)
  return Number.isInteger(parsed) ? parsed : null
}

export function formatPercent(value: string) {
  return `${new Intl.NumberFormat('es-UY', { maximumFractionDigits: 2 }).format(Number(value) * 100)}%`
}

export function formatMoney(value: string) {
  if (value === 'No configurado') return value
  if (value === 'Sin configurar')  return value
  return new Intl.NumberFormat('es-UY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value))
}

export function isFiniteMoney(value: string) {
  return Number.isFinite(Number(value))
}

export function formatInteger(value: number) {
  return new Intl.NumberFormat('es-UY', { maximumFractionDigits: 0 }).format(value)
}

export function sumMoney(values: string[]) {
  return values.reduce((total, value) => total + Number(value), 0).toFixed(2)
}
