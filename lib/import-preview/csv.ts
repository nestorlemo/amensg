export type ParsedCsv = {
  headers: string[]
  rows: Record<string, string>[]
}

export function parseSemicolonCsv(input: string): ParsedCsv {
  const normalized = input.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const records = parseRecords(normalized)

  if (records.length === 0) {
    return { headers: [], rows: [] }
  }

  const headers = records[0].map((header) => header.trim())
  const rows = records
    .slice(1)
    .filter((record) => record.some((value) => value.trim().length > 0))
    .map((record) => {
      const row: Record<string, string> = {}
      headers.forEach((header, index) => {
        row[header] = (record[index] ?? '').trim()
      })
      return row
    })

  return { headers, rows }
}

function parseRecords(input: string) {
  const records: string[][] = []
  let record: string[] = []
  let value = ''
  let inQuotes = false

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index]
    const nextChar = input[index + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        value += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ';' && !inQuotes) {
      record.push(value)
      value = ''
      continue
    }

    if (char === '\n' && !inQuotes) {
      record.push(value)
      records.push(record)
      record = []
      value = ''
      continue
    }

    value += char
  }

  if (value.length > 0 || record.length > 0) {
    record.push(value)
    records.push(record)
  }

  return records
}
