# imagic-config

> Load JSON/JS configuration files by environment, merging defaults and validating required keys.

## Install

```bash
npm install imagic-config
```

## Quick Start

```js
import { loadConfig } from 'imagic-config'

// Reads from ./config/development/ (or APP_ENV subdirectory)
const config = await loadConfig()

console.log(config.database.host)
console.log(config.server.port)
```

## API

### `loadConfig(options?)` → `Promise<object>`

Reads all `.json` and `.js` files from `{dir}/{env}/`, merges them with `defaults`, and returns a single config object. Each file's lowercased name (without extension) becomes a key.

```ts
loadConfig(options?: {
    dir?:      string,
    env?:      string,
    defaults?: object,
    required?: string[],
}): Promise<{ [key: string]: any }>
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `dir` | `string` | `'./config'` | Base directory containing environment subdirectories |
| `env` | `string` | `process.env.APP_ENV \|\| 'development'` | Environment name; determines which subdirectory is read |
| `defaults` | `object` | `{}` | Base config merged before loading files; deep-cloned, never mutated |
| `required` | `string[]` | `[]` | Keys that must be present in the result; throws if any are missing |

#### Returns

A plain object with one key per config file found in `{dir}/{env}/`. File content is deep-merged on top of `defaults`.

#### File → key mapping

| File | Key in result |
|------|--------------|
| `database.json` | `result.database` |
| `Redis.json` | `result.redis` (lowercased) |
| `app.js` (ES module) | `result.app` = `module.default` if present, else `module` |

Subdirectories inside the env directory are silently skipped. Only `.json` and `.js` files are processed.

---

## Directory Structure

```
config/
  development/
    server.json
    database.json
    redis.json
  production/
    server.json
    database.json
    redis.json
  test/
    server.json
```

Set the environment via the `APP_ENV` variable or the `env` option:

```bash
APP_ENV=production node server.js
```

---

## Error Handling

| Condition | Error |
|-----------|-------|
| Config directory does not exist and `required` is non-empty | `Error` |
| A key listed in `required` is not present in the result | `Error` |
| A `.json` file contains invalid JSON | `Error` with `.cause` set to the parse error |

When `required` is empty and the config directory is absent, `loadConfig` returns the `defaults` object without throwing.

---

## Examples

### Basic usage

```js
import { loadConfig } from 'imagic-config'

const config = await loadConfig()
```

### Custom directory and required keys

```js
import { loadConfig } from 'imagic-config'

const config = await loadConfig({
    dir: './app/config',
    env: process.env.APP_ENV || 'production',
    defaults: {
        server: { port: 3000 },
    },
    required: ['database', 'server'],
})

console.log(config.server.port)    // from defaults if not overridden by file
console.log(config.database.host)  // from ./app/config/production/database.json
```

### JS config file

```js
// config/development/app.js
export default {
    debug: true,
    featureFlags: ['beta-ui'],
}
```

```js
const config = await loadConfig()
console.log(config.app.debug)         // true
console.log(config.app.featureFlags)  // ['beta-ui']
```

See [`examples/basic.js`](./examples/basic.js) for a runnable demonstration:

```bash
node examples/basic.js
```

---

## License

MIT © iMagicKey
