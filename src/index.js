import fs from 'node:fs'
import path from 'node:path'
import { readJsonFile } from './modules/readJsonFile.js'

const DEFAULT_OPTIONS = {
    dir: './config',
    env: process.env.APP_ENV || 'development',
    defaults: {},
    required: [],
}

export async function loadConfig(options = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options }
    const configDir = path.resolve(opts.dir, opts.env)

    // Start with defaults
    const result = structuredClone(opts.defaults)

    // Check if directory exists
    if (!fs.existsSync(configDir)) {
        if (opts.required.length > 0) {
            throw new Error(`Config directory not found: ${configDir}`)
        }
        return result
    }

    // Read all files
    const entries = fs.readdirSync(configDir)

    for (const entry of entries) {
        const fullPath = path.join(configDir, entry)
        const stat = fs.statSync(fullPath)
        if (!stat.isFile()) continue

        const ext = path.extname(entry)
        const name = path.basename(entry, ext).toLowerCase()

        if (ext === '.json') {
            const data = readJsonFile(fullPath)
            result[name] = data
        } else if (ext === '.js') {
            const mod = await import(fullPath)
            result[name] = mod.default ?? mod
        }
    }

    // Check required configs
    for (const req of opts.required) {
        if (!(req in result)) {
            throw new Error(`Required config "${req}" not found in ${configDir}`)
        }
    }

    return result
}

export default loadConfig
