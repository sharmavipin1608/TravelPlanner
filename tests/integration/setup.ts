import { readFileSync } from 'fs'
import { resolve } from 'path'

try {
  const raw = readFileSync(resolve(process.cwd(), '.env.test.local'), 'utf-8')
  for (const line of raw.split('\n')) {
    const match = line.match(/^([^#=][^=]*)=(.*)$/)
    if (match) process.env[match[1].trim()] = match[2].trim()
  }
} catch {
  // .env.test.local absent — env vars must be set externally (e.g. CI)
}
