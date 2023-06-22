# Roster: a user-management API and console

Roster is a small, complete CRUD service for one resource: users. An Express 5
+ Sequelize REST API over PostgreSQL does the work, and a React console built
with Vite lists, pages, creates, edits and deletes users through it.

The feature list is short on purpose. What the project is about is the shape
around it: a strict validation boundary, a single place where errors become
responses, passwords that never leave the server in any form, server-side
pagination with a ceiling, and 68 tests (43 API, 25 client) that need no
database, container or network.

![The user list](docs/screenshots/01-users-list.png)

## Run it with Docker Compose

Docker with Compose v2 is all you need.

```bash
cp .env.example .env              # optional; set SEED_ON_BOOT=true for 34 demo users
docker compose up --build
```

- Console: http://localhost:8701
- API: http://localhost:8700/api

```bash
curl http://localhost:8700/api/health
# {"status":"ok","database":"up"}
```

`/api/health` runs a real `sequelize.authenticate()` and answers `503` with
`{"status":"degraded","database":"down"}` when the database is unreachable.
`docker compose down -v` stops everything and drops the database volume.

The API image runs as the unprivileged `node` user, the console is served by
nginx as the `nginx` user on port 8080, and both have health checks. The API
origin is baked into the client bundle at build time from `PUBLIC_API_URL`.

## Run it without Docker

Node 22.22 or newer (see `.nvmrc`) and a PostgreSQL instance.

```bash
cd api
npm install
cp .env.example .env         # set DB_URL; SEED_ON_BOOT=true gives you 34 demo rows
npm start                    # http://localhost:8700

cd ../client                 # second terminal
npm install
cp .env.example .env         # VITE_API_URL=http://localhost:8700
npm run dev                  # http://localhost:8701
```

## The API

| Method | Path | Success | Errors |
| --- | --- | --- | --- |
| `GET` | `/api/health` | `200` | `503` when the database is down |
| `GET` | `/api/users?page=&limit=` | `200`, a page plus `{ page, limit, total, totalPages }` | `400` for a bad page or a limit above `PAGE_MAX_LIMIT` |
| `POST` | `/api/users` | `201` with a `Location` header | `400` per-field, `409` duplicate email |
| `GET` | `/api/users/:id` | `200` | `400` bad id, `404` |
| `PUT` | `/api/users/:id` | `200` with the updated user | `400`, `404`, `409` |
| `DELETE` | `/api/users/:id` | `204` | `404` |

Every failure has the same body: `{ "success": false, "error": { "code",
"message", "details"? } }`. A duplicate address, for example:

```text
$ curl -i -s -X POST 'http://localhost:8700/api/users' \
     -H 'Content-Type: application/json' \
     -d '{"firstName":"Nina","lastName":"Petrov","email":"nina.petrov@roster.example","password":"Passw0rd!123"}'
HTTP/1.1 409 Conflict
Content-Type: application/json; charset=utf-8
{
    "success": false,
    "error": {
        "code": "conflict",
        "message": "A user with that email already exists",
        "details": {
            "email": "nina.petrov@roster.example"
        }
    }
}
```

Literal request/response pairs for every endpoint, captured from the Compose
stack, are in [`docs/api-transcript.md`](docs/api-transcript.md); the script
that produced them is [`docs/capture-api.sh`](docs/capture-api.sh).

## The console

Captured with Playwright against the Compose stack seeded with fictional demo
users.

| Page 3 of 4, rows 21–30 | Editing: prefilled, no password field |
| --- | --- |
| ![Pagination](docs/screenshots/02-pagination.png) | ![Edit user](docs/screenshots/03-edit-user.png) |

| A real 409 shown in the form, which stays open | On a phone |
| --- | --- |
| ![Duplicate email](docs/screenshots/04-duplicate-email-error.png) | ![Mobile list](docs/screenshots/05-mobile-list.png) |

Loading, empty and error states are separate screens rather than a bare table,
and the error state has a retry button. Deleting the last user on the final
page moves back a page instead of showing "No users yet".

## One request, end to end

Creating a user is the path that touches every layer — validation, a uniqueness
rule, hashing, an insert, and both of the error routes.

```mermaid
sequenceDiagram
  autonumber
  actor Admin
  participant Hook as useUsers hook
  participant Route as POST /api/users
  participant Valid as validate middleware
  participant Ctrl as user.controller
  participant Svc as user.service
  participant Repo as user.repository
  participant DB as PostgreSQL
  participant Err as error-handler

  Admin->>Hook: submits the Add user form
  Hook->>Route: POST /api/users
  Route->>Valid: parse and coerce the body with Zod
  alt body fails the schema
    Valid->>Err: AppError.badRequest with per-field issues
    Err-->>Hook: 400, the form shows the message and stays open
  else body is valid
    Valid->>Ctrl: trimmed names, lower-cased email
    Ctrl->>Svc: createUser(payload)
    Svc->>Repo: findByEmail(email)
    Repo->>DB: SELECT via the users_email_unique index
    alt email already taken
      Svc->>Err: AppError.conflict
      Err-->>Hook: 409, the form shows the message and stays open
    else email is free
      Svc->>Svc: passwordHasher.hash(password)
      Svc->>Repo: create(user)
      Repo->>DB: INSERT INTO Users
      Ctrl-->>Hook: 201 plus a Location header, no password field
      Hook->>Route: GET /api/users to re-read the page from the server
    end
  end
```

## How the code is arranged

Server, with dependencies pointing one way only:

```
routes/          URL to handler, nothing else
middleware/      validate.js (Zod), error-handler.js, not-found.js
controllers/     HTTP adapters: read request, call service, pick a status
services/        business rules: hashing, uniqueness, existence
repositories/    the only module that calls Sequelize
models/          User definition + an awaited schema bootstrap
config/env.js    the only module in the codebase that reads process.env
lib/password/    pluggable hasher registry -- the one extension seam
```

Nothing above `repositories/` imports Sequelize, and `app.js` exports
`createApp()` without binding a port, which is what makes in-process supertest
possible; `server.js` is the entrypoint that awaits the schema, listens, and
handles `SIGINT`/`SIGTERM`.

Client: `api/httpClient.js` (one axios instance, one error-to-string mapper) →
`api/users.js` (resource functions) → `hooks/useUsers.js` (all list state and
mutations) → components, which are purely presentational. `App.jsx` is
composition only. After every mutation the hook re-reads the page from the
server rather than patching local state, so the UI cannot drift from what the
database normalised.

## Configuration

The root `.env` (template: [`.env.example`](.env.example)) feeds Compose: the
Postgres user, password and database name, `PUBLIC_API_URL` (baked into the
client bundle), `CLIENT_URL`, `SEED_ON_BOOT` and `LOG_LEVEL`.

For running the API outside Docker, `api/.env` (template:
[`api/.env.example`](api/.env.example)):

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `PORT` | no | `8700` | Port the HTTP server binds to. |
| `CLIENT_URL` | no | `http://localhost:3000` | The single origin allowed by CORS. |
| `DB_DIALECT` | no | `postgres` | `postgres`, or `memory` for the in-process pg-mem engine the tests use. |
| `DB_URL` | **yes** when `DB_DIALECT=postgres` | — | Connection string. Boot throws immediately if it is missing. |
| `DB_AUTO_SYNC` | no | `true` | Run `sequelize.sync()` at boot. Turn off once real migrations exist. |
| `DB_POOL_MAX` / `DB_POOL_MIN` | no | `10` / `0` | Connection pool bounds, rather than Sequelize's defaults. |
| `PASSWORD_HASHER` | no | `bcrypt` | Which registered hashing strategy to resolve. |
| `BCRYPT_ROUNDS` | no | `10` | bcrypt cost factor. The suite uses `4` for speed. |
| `PAGE_DEFAULT_LIMIT` | no | `25` | Page size when the client does not ask for one. |
| `PAGE_MAX_LIMIT` | no | `100` | Largest `?limit` accepted; anything above is a `400`. |
| `LOG_LEVEL` | no | `info` (`silent` under `NODE_ENV=test`) | `silent`, `error`, `warn`, `info` or `debug`. `debug` also logs SQL. |
| `SEED_ON_BOOT` | no | `false` | Insert 34 fictional demo users after the schema syncs (PostgreSQL only). |

`client/.env`: `VITE_API_URL` (default: a same-origin `/api`, useful behind
a reverse proxy). The Vite dev server listens on `8701`.

## Tests

```bash
cd api    && npm test     # node:test + supertest against in-process pg-mem
cd client && npm test     # Vitest + Testing Library, axios mocked at the adapter
```

Neither suite needs a database, a network or Docker. Last run:

```
api:    # tests 43   # pass 43   # fail 0
client: Test Files 3 passed (3)   Tests 25 passed (25)
```

The API suite wires `pg-mem` in as Sequelize's `dialectModule`, so tests
exercise the same SQL production does (`LIMIT`/`OFFSET`, unique-constraint
violations, affected-row counts) with no server and no native build. The client
suite mocks axios at the adapter level, so the real resource functions and error
mapping run and no test opens a socket.

`npm run lint` (ESLint 9) and `npm run format:check` (Prettier) are wired in
both packages, and `npm run build` in the client.

## Defects found in the original submission

Each row below is either reproduced verbatim in
[`docs/original-behaviour.md`](docs/original-behaviour.md) — a recorded session
of the pre-rework tree running against a throwaway database — or pinned by a
named test in this repository.

| Defect | Effect | Pinned by |
| --- | --- | --- |
| `PUT /users/:id` tested `User.update`'s result for truthiness; it resolves to `[affectedCount]`, and `[0]` is truthy | Updating a user that did not exist returned `200 {"success":true}` | `original-behaviour.md` §2; test *returns 404 when updating a user that does not exist* |
| `DELETE /users/:id` treated a `destroy` count of `0` as a server fault | Deleting a missing user returned `500` instead of `404` | `original-behaviour.md` §3; test *returns 404, not 500, when the user does not exist* |
| `POST /users` returned the raw Sequelize instance | **The bcrypt hash was in the create response body** | `original-behaviour.md` §4; test *never returns the password or its hash* |
| No Express error middleware existed, and one of five controllers had a `try/catch` | Any rejected promise fell through to an HTML stack trace containing absolute filesystem paths | `original-behaviour.md` §7; test *returns a JSON 400 for malformed JSON rather than an HTML stack trace* |
| `email` had no unique constraint | Duplicate accounts were accepted silently | `original-behaviour.md` §9; test *rejects a duplicate email with 409* |
| The modal's `isUserUpdating` flag was never reset on close | Edit a user, close, press "Add User", and the form sent `PUT /api/users/undefined` instead of creating anyone | test *returns to create mode after an edit is cancelled* (asserts a POST fires and zero PUTs) |
| `baseURL` was `` `${process.env.REACT_APP_API_URL}/api` `` | With no `.env`, every request went to the literal URL `undefined/api` | test *falls back to a relative /api instead of 'undefined/api'* |
| No `await` in the client was guarded | A failed request produced an unhandled rejection and a visually unchanged screen; a network failure and an empty table looked identical | tests *shows a recoverable error state when the API is unreachable*, *retries the request when Try again is pressed* |
| `GET /users` was an unbounded `findAll` | The whole table was serialised on every page load | test *paginates instead of returning the whole table* |
| Row actions were `<div onClick>` with no label or role, referencing a `cursor-pointer` class that was never defined | Unreachable by keyboard, invisible to screen readers | the controls are now `<button>`s with `aria-label`s, which is the only reason tests can query them by accessible name (`Edit Amelia Hartley`) |
| `sequelize.sync()` ran unawaited at model-import time | The server could accept requests before the table existed | `models/index.js` exports an awaited `initialiseDatabase()`, called before `listen()` in `server.js` |
| `dotenv.config()` ran *after* `process.env.PORT` was read | Latent: it worked only because an imported module happened to load dotenv first | `config/env.js` calls `dotenv.config()` at the top and is the sole reader of `process.env` |
| `routes/index.js` built a `createRequire` that was never used | Dead code | removed |

## Decisions worth explaining

**Errors are data, not control flow.** Services throw `AppError`, Express 5
forwards any rejected handler promise, and one middleware turns the result into `{ success: false, error: { code, message, details } }`.
Sequelize's `UniqueConstraintError`, body-parser's `entity.parse.failed` and
`entity.too.large` are normalised in that same function. That is why "not found"
is a 404 from every endpoint rather than a 404 here and a 500 there.

**Validation sits at the edge and coerces.** Zod schemas parse *and* transform,
so `req.params.id` reaches the service as a number and `email` reaches it
trimmed and lower-cased. Handlers below never re-check shapes. bcrypt's 72-byte
input limit is encoded as a schema rule, counted in UTF-8 bytes rather than
characters, instead of being discovered as silent truncation.

**The list was the only real bottleneck.** A single-table CRUD service does not
need a cache or a queue, and none was added. What it did need: `findAndCountAll`
with a `{ page, limit, total, totalPages }` envelope, a pager in the UI, and a
size ceiling a client cannot argue past — anything above `PAGE_MAX_LIMIT` is a
`400`, and the Zod schema and the service read that same setting. `email`
gained a unique index that the pre-insert uniqueness check also uses, so that
lookup is an index probe rather than a sequential scan. `express.json({ limit: "100kb" })` bounds the other direction.

**Password hashing is the one extension seam.** `lib/password/` is a registry of
`{ name, hash, verify }` factories selected by `PASSWORD_HASHER`. bcrypt is the
only entry, but argon2id — OWASP's current first choice — would be one new file
and one env var, touching no service, controller or test. It is a real seam, not
a decorative one: a test registers a fake hasher at runtime and asserts it is
used, and the registry throws on an unknown name rather than falling back.

**`node:test` for the API, Vitest for the client.** The API is native ESM, and
Node's built-in runner needs no transform step for it. The client is built by
Vite, so Vitest reuses that same config and JSX transform for its tests.

## Known gaps

- **No authentication or authorisation at all.** Every endpoint is open. The
  `password` column is correctly hashed but nothing ever signs in: no session,
  no token, no login route. Adding it would have meant inventing a brief. Seeded
  demo users get a random password for the same reason.
- **`sequelize.sync()` is not a migration strategy.** It creates missing tables
  and will not safely alter or drop existing ones. `DB_AUTO_SYNC=false` is the
  off switch; real `sequelize-cli` migrations were out of scope.
- **`pg-mem` is not PostgreSQL.** It models this application's SQL faithfully
  and enforces the unique constraint under test, but it cannot run the
  `findOrCreate` the seeder uses, so seeding needs real PostgreSQL. A suite that
  grew into CTEs, window functions or extensions would need a real database.
- **No rate limiting, no request id, no structured logs.** `lib/logger.js` is a
  level-aware `console` wrapper; fine at this size, wrong for production.
- **bcrypt is synchronous CPU work on the event loop.** Irrelevant at this
  scale; under real signup load it wants a worker thread or a queue.
- **Deletes are hard deletes.** No soft delete, no audit trail.
- **Fonts load from Google Fonts.** Offline, the console falls back to system
  fonts.
- **The client has one screen, no router and no global state library.** Adding
  either would be weight without a reason.

## License

MIT; see [LICENSE](LICENSE).
