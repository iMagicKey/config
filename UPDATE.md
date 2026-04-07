# UPDATE — imagic-config

> Audit performed: 2026-04-07. Version at time of audit: 1.0.1

---

## Fixed (2026-04-07)

- [x] **Test coverage** — added tests for `.js` config loading (default export and named exports fallback)

---

## API improvements (backlog)

- [ ] Watch mode (reload on file change)
- [ ] Schema validation (using imagic-validator)
- [ ] Environment variable substitution in JSON values (${MY_VAR})
- [ ] Deep merge for nested default objects

---

## Backlog

- [ ] Support `.env` file loading alongside JSON/JS configs
- [ ] Cache loaded config to avoid re-reading on repeated calls
