import * as fs from 'node:fs'
import * as path from 'node:path'
import JSZip from 'jszip'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')

const EXCLUDED_NAMES = new Set([
  '.env',
  '.git',
  '.next',
  'node_modules',
  'storage',
  'uploads',
  'backups',
  'check.ts',
])

const EXCLUDED_GLOBS = [
  /^\.env\..+/,   // .env.*
  /\.log$/,        // *.log
  /^amensg-context-\d{8}\.zip$/, // previous exports
]

function isExcluded(name: string): boolean {
  if (EXCLUDED_NAMES.has(name)) return true
  return EXCLUDED_GLOBS.some((re) => re.test(name))
}

function collectFiles(dir: string, base = ''): string[] {
  const results: string[] = []
  for (const entry of fs.readdirSync(dir)) {
    if (isExcluded(entry)) continue
    const abs = path.join(dir, entry)
    const rel = base ? `${base}/${entry}` : entry
    const stat = fs.statSync(abs)
    if (stat.isDirectory()) {
      results.push(...collectFiles(abs, rel))
    } else {
      results.push(rel)
    }
  }
  return results
}

async function main() {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const outName = `amensg-context-${today}.zip`
  const outPath = path.join(ROOT, outName)

  const zip = new JSZip()
  const files = collectFiles(ROOT)

  for (const rel of files) {
    const abs = path.join(ROOT, rel)
    const content = fs.readFileSync(abs)
    zip.file(rel, content)
    console.log(`  + ${rel}`)
  }

  console.log(`\nArchivos incluidos: ${files.length}`)

  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })

  fs.writeFileSync(outPath, buffer)

  const kb = (buffer.byteLength / 1024).toFixed(1)
  console.log(`ZIP generado: ${outName} (${kb} KB)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
