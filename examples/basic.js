// examples/basic.js
// Create test config files first, then load them
import { loadConfig } from '../src/index.js'
import fs from 'node:fs'
import path from 'node:path'

// Setup: create example config files
const configDir = './examples/config'
fs.mkdirSync(path.join(configDir, 'development'), { recursive: true })
fs.writeFileSync(path.join(configDir, 'development/server.json'), JSON.stringify({ port: 3000, host: 'localhost' }, null, 2))
fs.writeFileSync(
    path.join(configDir, 'development/database.json'),
    JSON.stringify({ host: 'localhost', port: 5432, name: 'mydb' }, null, 2)
)

// Load config
process.env.APP_ENV = 'development'
const config = await loadConfig({ dir: configDir })

console.log('Server config:', config.server)
console.log('Database config:', config.database)

// Cleanup
fs.rmSync(configDir, { recursive: true })
