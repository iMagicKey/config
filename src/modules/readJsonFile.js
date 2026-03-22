import fs from 'node:fs'

export function readJsonFile(filePath) {
    const raw = fs.readFileSync(filePath, 'utf8')
    try {
        return JSON.parse(raw)
    } catch (err) {
        throw new Error(`Failed to parse JSON config: ${filePath}: ${err.message}`, { cause: err })
    }
}
