# AGENT — imagic-config

## Purpose

Loads JSON and JS configuration files from an environment-specific directory, merges them with caller-supplied defaults, and validates that required keys are present.

## Package

- npm: `imagic-config`
- import (local): `import { loadConfig } from '../src/index.js'`
- import (installed): `import { loadConfig } from 'imagic-config'`
- default export also available: `import loadConfig from 'imagic-config'`
- zero runtime deps

## Exports

### `loadConfig(options?)`: `Promise<object>`
- `options` {object} [{}] — all fields optional
  - `dir` {string} ['./config'] — base directory; resolved relative to `process.cwd()`
  - `env` {string} [process.env.APP_ENV || 'development'] — subdirectory name to read from
  - `defaults` {object} [{}] — base config; deep-cloned via `structuredClone`, never mutated
  - `required` {string[]} [[]] — keys that must exist in the merged result
- returns: `Promise<{ [key: string]: any }>` — merged config object
- throws: `Error` — if config dir is missing and `required` is non-empty
- throws: `Error` — if any key in `required` is absent after loading
- throws: `Error` (with `.cause`) — if a `.json` file contains invalid JSON

---

## Usage Patterns

### Minimal — reads from ./config/${APP_ENV}/

```js
import { loadConfig } from '../src/index.js'

const config = await loadConfig()
console.log(config.database.host)
```

### With defaults and required keys

```js
import { loadConfig } from '../src/index.js'

const config = await loadConfig({
    dir: './config',
    env: process.env.APP_ENV || 'production',
    defaults: {
        server: { port: 3000, host: '0.0.0.0' },
    },
    required: ['database', 'server'],
})
```

### JS config file (ES module)

```js
// config/development/feature-flags.js
export default { betaUI: true }
```

```js
const config = await loadConfig()
config['feature-flags'].betaUI  // true
// key is the filename lowercased: 'feature-flags'
```

### Env-specific config path

```bash
APP_ENV=staging node app.js
# reads from ./config/staging/
```

---

## File → Key Mapping Rules

1. Only `.json` and `.js` files are processed; subdirectories are skipped.
2. The key is the filename **lowercased** with the extension removed.
3. For `.js` files: uses `module.default` if it exists, otherwise uses the whole module object.
4. File content is deep-merged on top of `defaults` (file values win).

Examples:
| File | Key |
|------|-----|
| `database.json` | `database` |
| `Redis.json` | `redis` |
| `AppConfig.js` | `appconfig` |

---

## Constraints / Gotchas

- `loadConfig` is async — always `await` it.
- `defaults` is deep-cloned; the original object passed in is never modified.
- If `required` is empty (the default) and the config directory does not exist, the function resolves with a clone of `defaults` without throwing.
- If the config directory exists but is empty, the function resolves with `defaults` (no error unless `required` is non-empty).
- `.js` config files must be valid ES modules (the package is ESM-only). CommonJS `.js` files will fail to import.
- The key for a JS file uses `module.default` first; if there is no default export the entire namespace object becomes the value.
- File keys are lowercased but otherwise match the filename. Filenames with special characters (hyphens, underscores) are preserved as-is after lowercasing.
- There is no deep merge between a file's content and the corresponding key in `defaults` — the file replaces the entire default key.
- `required` validation happens after all files are loaded; a partial config that only satisfies some required keys still throws.
- Invalid JSON errors include `.cause` with the original `SyntaxError`; check `err.cause` for the parse detail.
