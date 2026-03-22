import { describe, it, before, after } from 'node:test'
import { expect } from 'chai'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { loadConfig } from '../src/index.js'

let tmpDir

// Create temp config directory structure
before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'imagic-config-test-'))
    const devDir = path.join(tmpDir, 'development')
    fs.mkdirSync(devDir)
    fs.writeFileSync(path.join(devDir, 'server.json'), JSON.stringify({ port: 3000, host: 'localhost' }))
    fs.writeFileSync(path.join(devDir, 'database.json'), JSON.stringify({ host: 'db.local', port: 5432 }))

    const prodDir = path.join(tmpDir, 'production')
    fs.mkdirSync(prodDir)
    fs.writeFileSync(path.join(prodDir, 'server.json'), JSON.stringify({ port: 8080, host: '0.0.0.0' }))
})

after(() => fs.rmSync(tmpDir, { recursive: true }))

describe('loadConfig', () => {
    it('loads all JSON files from environment directory', async () => {
        const config = await loadConfig({ dir: tmpDir, env: 'development' })
        expect(config.server).to.deep.equal({ port: 3000, host: 'localhost' })
        expect(config.database).to.deep.equal({ host: 'db.local', port: 5432 })
    })

    it('uses defaults when directory is missing', async () => {
        const config = await loadConfig({ dir: tmpDir, env: 'staging', defaults: { app: { name: 'test' } } })
        expect(config.app.name).to.equal('test')
    })

    it('merges defaults with loaded config', async () => {
        const config = await loadConfig({
            dir: tmpDir,
            env: 'development',
            defaults: { extra: { key: 'value' }, server: { timeout: 30 } },
        })
        expect(config.extra.key).to.equal('value')
        expect(config.server.port).to.equal(3000) // file overrides default
    })

    it('throws if required config is missing', async () => {
        try {
            await loadConfig({ dir: tmpDir, env: 'development', required: ['missing'] })
            expect.fail('Should have thrown')
        } catch (err) {
            expect(err).to.be.instanceOf(Error)
            expect(err.message).to.include('missing')
        }
    })

    it('throws if required config and directory is missing', async () => {
        try {
            await loadConfig({ dir: tmpDir, env: 'nonexistent', required: ['server'] })
            expect.fail('Should have thrown')
        } catch (err) {
            expect(err).to.be.instanceOf(Error)
            expect(err.message).to.include('Config directory not found')
        }
    })

    it('throws on invalid JSON', async () => {
        const badDir = path.join(tmpDir, 'bad')
        fs.mkdirSync(badDir)
        fs.writeFileSync(path.join(badDir, 'broken.json'), '{ invalid json }')
        try {
            await loadConfig({ dir: tmpDir, env: 'bad' })
            expect.fail('Should have thrown')
        } catch (err) {
            expect(err).to.be.instanceOf(Error)
            expect(err.message).to.include('Failed to parse JSON config')
        } finally {
            fs.rmSync(badDir, { recursive: true })
        }
    })

    it('config key names are lowercased', async () => {
        const mixDir = path.join(tmpDir, 'mixed')
        fs.mkdirSync(mixDir)
        fs.writeFileSync(path.join(mixDir, 'MyConfig.json'), '{"key": "value"}')
        try {
            const config = await loadConfig({ dir: tmpDir, env: 'mixed' })
            expect(config.myconfig).to.exist
        } finally {
            fs.rmSync(mixDir, { recursive: true })
        }
    })

    it('returns empty object for empty directory', async () => {
        const emptyDir = path.join(tmpDir, 'empty')
        fs.mkdirSync(emptyDir)
        try {
            const config = await loadConfig({ dir: tmpDir, env: 'empty' })
            expect(config).to.deep.equal({})
        } finally {
            fs.rmSync(emptyDir, { recursive: true })
        }
    })

    it('uses process.env.APP_ENV as default env', async () => {
        const orig = process.env.APP_ENV
        process.env.APP_ENV = 'development'
        try {
            const config = await loadConfig({ dir: tmpDir })
            expect(config.server).to.exist
        } finally {
            if (orig === undefined) delete process.env.APP_ENV
            else process.env.APP_ENV = orig
        }
    })

    it('returns defaults when directory is missing and no required', async () => {
        const config = await loadConfig({ dir: tmpDir, env: 'missing-env', defaults: { fallback: true } })
        expect(config).to.deep.equal({ fallback: true })
    })

    it('loads production environment files', async () => {
        const config = await loadConfig({ dir: tmpDir, env: 'production' })
        expect(config.server).to.deep.equal({ port: 8080, host: '0.0.0.0' })
    })

    it('does not mutate the defaults object', async () => {
        const defaults = { server: { port: 9999 } }
        await loadConfig({ dir: tmpDir, env: 'development', defaults })
        expect(defaults.server.port).to.equal(9999)
    })

    it('accepts options as empty object (uses all defaults)', async () => {
        const orig = process.env.APP_ENV
        process.env.APP_ENV = 'development'
        try {
            const config = await loadConfig({ dir: tmpDir })
            expect(config).to.be.an('object')
        } finally {
            if (orig === undefined) delete process.env.APP_ENV
            else process.env.APP_ENV = orig
        }
    })

    it('reads process.env.APP_ENV at call time, not at import time', async () => {
        // First call with one env value
        const orig = process.env.APP_ENV
        process.env.APP_ENV = 'production'
        const config1 = await loadConfig({ dir: tmpDir })
        expect(config1.server).to.deep.equal({ port: 8080, host: '0.0.0.0' })

        // Change APP_ENV after module is already imported — loadConfig must pick up new value
        process.env.APP_ENV = 'development'
        const config2 = await loadConfig({ dir: tmpDir })
        expect(config2.server).to.deep.equal({ port: 3000, host: 'localhost' })

        // Restore
        if (orig === undefined) delete process.env.APP_ENV
        else process.env.APP_ENV = orig
    })

    it('skips non-file entries (subdirectories) in config dir', async () => {
        const nestedDir = path.join(tmpDir, 'nested')
        const subDir = path.join(nestedDir, 'subdir')
        fs.mkdirSync(subDir, { recursive: true })
        fs.writeFileSync(path.join(nestedDir, 'app.json'), JSON.stringify({ name: 'test' }))
        try {
            const config = await loadConfig({ dir: tmpDir, env: 'nested' })
            expect(config.app).to.deep.equal({ name: 'test' })
            expect(config.subdir).to.be.undefined
        } finally {
            fs.rmSync(nestedDir, { recursive: true })
        }
    })
})
