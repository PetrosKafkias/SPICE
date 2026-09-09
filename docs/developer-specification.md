# SPICE Co-Creation Platform — Developer Specification

**Audience:** developers joining or maintaining this codebase.
**Status:** describes the system as it exists in the repository, not an aspirational design.
**Verified against:** `main` @ `6b805b0a`, migrations `001`–`025`.

This document is the technical entry point. Sibling documents cover domain rules in more depth:

| Document | Covers |
|---|---|
| `docs/role-permission-matrix.md` | Role model, permission sets, enforcement points |
| `docs/co-creation-state-machine.md` | Phase / activity / proposal state models |
| `docs/phase-transition-rules.md` | Phase gate preconditions |
| `docs/user-journeys.md` | End-to-end journeys per role |
| `docs/user-guide-content-plan.md` | Planned in-product user guide (not yet built) |

> **Known documentation drift:** `role-permission-matrix.md` lists the facilitator set as
> `citizen + hub:configure-tools, repository:upload`. The code additionally grants
> `hub:facilitate` and `hub:view-participant-input`. **The code is authoritative**
> (`server/permissions.mjs`); see §7.4 for the current sets.

---

## 1. What the platform is

SPICE is a participatory urban co-creation platform for EU pilot cities. A **municipality**
runs one **pilot site** through a fixed five-phase methodology. A **facilitator** prepares and
delivers participation activities. **Citizens** contribute, discuss, and vote. Every artefact
(activity, contribution, proposal, document, decision) is traceable to a phase.

Three properties drive most of the design:

1. **One shared dataset, role-sensitive views.** There is no per-role copy of the process.
   Municipality, facilitator, and citizen read the same rows filtered by permission and
   publication state.
2. **Governance is asymmetric.** Facilitators *prepare*; municipalities *decide*. This is
   enforced server-side, not by hiding buttons (§7.4, §9).
3. **Draft work is invisible to citizens** until explicitly published (§9.4–9.6).

---

## 2. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React 19 + TypeScript, Vite 6 | SPA, `react-router` 7 |
| Styling | Tailwind CSS 4 + scoped CSS layer | No CSS-in-JS for app code (§11.4) |
| Backend | **Plain `node:http`** — no framework | Hand-rolled routing in `server/api.mjs` |
| Database | **`node:sqlite`** (`DatabaseSync`) | Built-in module; **requires Node ≥ 22.5** |
| Auth | Custom sessions + `scrypt` | No Keycloak, no OAuth/OIDC anywhere |
| Tests | `node --test` | No Jest/Vitest |

**There is no Express, no ORM, no auth provider.** Specifications inherited from the project
proposal mention Keycloak; it does not exist in this codebase and never has.

### 2.1 Why this matters for onboarding

- `node:sqlite` is why `package.json` declares `"engines": { "node": ">=24" }`. On Node 18/20
  the server **cannot start** — `node:sqlite` is missing.
- No framework means no middleware chain. Route matching is a linear sequence of
  `if (method === ... && pathname === ...)` / `pathname.match(regex)` checks in one ~2,850-line
  file. Order matters; see §7.2.

---

## 3. Prerequisites and local setup

```bash
node --version        # must be >= 24
npm install
npm run dev           # Vite on :5173, API on :5174
```

| Script | Effect |
|---|---|
| `npm run dev` | `server/dev.mjs` — API + Vite child process, HMR |
| `npm start` | `server/index.mjs` — production static server, needs `npm run build` first |
| `npm run build` | Vite production bundle to `dist/` |
| `npm test` | `node --test tests/*.test.mjs` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run lint:i18n` | Translation-key parity audit (§11.5) |
| `npm run check` | i18n + lint + typecheck + test + build |
| `npm run db:migrate` | Apply migrations and seed without starting a server |

`npm run check` invokes `pnpm` inside its script body; if `pnpm` is not installed, run the five
steps individually.

### 3.1 Ports

`server/dev.mjs` resolves ports in this order:

- App: `SPICE_DEV_PORT` → `PORT` → `5173`
- API: `SPICE_API_PORT` → `5174`

The **API port is hardcoded in `vite.config.ts`** as the `/api` proxy target
(`http://127.0.0.1:5174`). The client only ever calls relative `/api/...` paths, so the app port
may float, but changing the API port requires editing the proxy too.

### 3.2 Environment variables

Copy `.env.example`. All are optional in development.

| Variable | Default | Purpose |
|---|---|---|
| `SPICE_DB_PATH` | `data/spice.db` | SQLite file; `/tmp` when `VERCEL` is set |
| `SPICE_SEED_PASSWORD` | `SpiceDemo2026!` | Password for all seeded demo users |
| `SPICE_DEMO_FIXTURE` | `baseline` | Seed scenario: `initial`, `participation`, `completed-phase-showcase` |
| `SPICE_HOST` / `SPICE_PORT` | `127.0.0.1` / `4173` | Production server bind |
| `SPICE_DEV_HOST` / `SPICE_DEV_PORT` / `SPICE_API_PORT` | `127.0.0.1` / `5173` / `5174` | Dev server bind |
| `SPICE_ALLOWED_ORIGINS` | *(empty)* | Extra trusted origins for same-origin checks |
| `SPICE_PUBLIC_URL` | `http://127.0.0.1:5173` | Base for email verification links |
| `SPICE_EMAIL_MODE` | `preview` | `preview` returns the link in the API response instead of sending |
| `RESEND_API_KEY` / `SPICE_EMAIL_FROM` | — | Live email delivery |
| `VITE_ENABLE_DEMO_LOGIN` | *(unset)* | Set to `false` to disable demo logins |

`server/dev.mjs` and `api/[...path].mjs` both default `SPICE_DEMO_FIXTURE` to `participation`.

---

## 4. Repository layout

```
server/                 Backend (no framework)
  api.mjs               All routes + helpers (~2.8k lines)
  api-standalone.mjs    Thin wrapper for embedding
  db.mjs                SQLite open, PRAGMAs, migration runner
  migrations/           001..025 numbered .sql, applied in filename order
  seed.mjs              Idempotent seed + demo fixtures
  permissions.mjs       Role normalisation + permission sets (server truth)
  security.mjs          scrypt hashing, session tokens, validators
  workflow.mjs          Workflow transitions, phase readiness, next-action engine
  email.mjs             Verification email (Resend or preview mode)
  dev.mjs               Dev entry: API + Vite child
  index.mjs             Production entry: API + static dist/
api/[...path].mjs       Vercel serverless catch-all wrapping createApiHandler
src/app/
  routes.tsx            Route table incl. guards and legacy redirects
  pages/                32 route components
  components/           26 shared components (+ ui/ = 44 shadcn primitives, largely unused)
  context/              AuthContext, I18nContext, AppContext
  auth/                 permissions.ts (client mirror), usePermissions.ts
  lib/                  api client, phase state, process setup, helpers
  i18n/                 translations.ts (~9.4k lines, 5 locales), config.ts
  data/                 Tool catalogue, glossary, pilot details, localized/ JSON
  onboarding/           tourSteps.ts — ORPHANED, see §15
src/styles/             tailwind.css (component layer), spice-polish.css (tokens)
docs/                   This document and the domain documents
tests/                  api / permissions / i18n
scripts/                i18n audit, content translation, source-data extraction
```

---

## 5. Runtime topology

Three deployment shapes share **one** request handler, `createApiHandler()` in `server/api.mjs`:

| Shape | Entry | Serves frontend | DB path |
|---|---|---|---|
| Development | `server/dev.mjs` | Vite child process (HMR) | `data/spice.db` |
| Self-hosted | `server/index.mjs` | Static `dist/` + SPA fallback | `data/spice.db` |
| Vercel | `api/[...path].mjs` | Vercel static hosting | `/tmp/spice.db` |

> **Vercel caveat:** `/tmp` is ephemeral per-instance. The database is recreated and reseeded on
> cold start, so **writes do not persist** and instances do not share state. The Vercel target
> is suitable for demos only, not production data.

---

## 6. Database

### 6.1 Connection and PRAGMAs

`server/db.mjs` → `createDatabase()`:

```
PRAGMA foreign_keys = ON
PRAGMA journal_mode = DELETE   -- not WAL: OneDrive-backed folders reject WAL sidecar files
PRAGMA busy_timeout = 5000
```

`journal_mode = DELETE` is deliberate. Do not "optimise" it to WAL without checking whether the
working directory is cloud-synced.

### 6.2 Migrations

- Plain `.sql` files in `server/migrations/`, applied in **filename sort order**.
- Tracked in `schema_migrations`; each runs once, inside `BEGIN IMMEDIATE` … `COMMIT`.
- Run automatically at every `createDatabase()` call — i.e. on every server boot.
- **No down migrations.** Rolling back means editing the DB or deleting `data/spice.db`.

**Rules when adding one:**

1. Next sequential number, descriptive snake_case name.
2. SQLite `ALTER TABLE ADD COLUMN` only supports constant defaults; a `CHECK` referencing only
   the new column is allowed. Altering an existing `CHECK` requires a table rebuild — several
   migrations here avoid that by widening application-level validation instead.
3. Backfill existing rows in the same migration (see `019`, `021`, `024`, `025` for the pattern).
4. **Restart the server.** There is no schema hot-reload.

### 6.3 Seeding

`server/seed.mjs` runs after migrations on every boot and is **idempotent** — most inserts are
guarded by `COUNT(*) === 0` or `INSERT OR IGNORE` / `ON CONFLICT DO NOTHING`.

Consequence to know: **a guarded block never re-runs on an existing database.** If you add seed
data inside an existing `if (count === 0)` block, developers with an existing `data/spice.db`
will not receive it. Either add an unguarded idempotent upsert, or delete `data/spice.db`.

Demo users (all share `SPICE_SEED_PASSWORD`):

| Email | Role |
|---|---|
| `citizen.demo@spice.local` | Citizen |
| `facilitator.demo@spice.local` | Facilitator |
| `municipality.demo@spice.local` | Municipality Staff |
| `admin.demo@spice.local` | Admin |

`SPICE_DEMO_FIXTURE` reshapes the demo pilot after seeding:

- `initial` — Phase 1, empty questionnaire, no activities/contributions/documents.
- `participation` — Phase 3 active, tools selected, activities and contributions present.
- `completed-phase-showcase` — as above plus completed-phase artefacts.
- `baseline` — seed defaults, no reshaping.

---

## 7. Backend architecture

### 7.1 Entry contract

`createApiHandler(options)` returns an async `(request, response) => boolean` plus a `.db`
handle. The boolean says whether the request was handled, letting hosts add their own 404.
Options are injectable for tests — notably `databasePath` and `sendVerificationEmail`.

### 7.2 Request pipeline

Order of operations for every request:

1. Parse URL and cookies.
2. **Same-origin guard** — for `POST`/`PUT`/`PATCH`/`DELETE`, `validateSameOrigin()` requires
   `Origin` to match `Host`, or be listed in `SPICE_ALLOWED_ORIGINS`, or be a loopback address
   (which permits the Vite dev-port mismatch). Failure → `403`.
3. Linear route matching. Public routes come first; the bare statement
   `const session = requireUser(db, request, response); if (!session) return true;`
   (currently **`server/api.mjs:2576`**, immediately before `const userId = …`) acts as a
   **hard authentication boundary** — every route below it requires a session. Placing a route
   on the wrong side of that line silently changes its auth requirement.
4. Handler runs; `sendJson` / `sendError` writes the response. Unmatched paths fall through to
   `404 API endpoint not found.`

Because matching is first-match-wins, a duplicate registration is silently dead code.
**There is one today:** `GET /api/citivoice` is registered twice (`:2510` and `:2817`); the
second is unreachable. Grep before adding a route.

Body parsing (`readJson`) caps payloads at **1,000,000 bytes**.

### 7.3 Response and error contract

Success: bare JSON object, shape per route.

Error:

```json
{ "code": "PERMISSION_DENIED", "error": "Human-readable message", "fieldErrors": { "title": "..." } }
```

`code` is derived from status unless overridden: `400 VALIDATION_ERROR`, `401 AUTH_REQUIRED`,
`403 PERMISSION_DENIED`, `404 NOT_FOUND`, `409 CONFLICT`, `429 RATE_LIMITED`, else
`SERVER_ERROR`. `fieldErrors` maps form field → message and is consumed directly by client
forms. The client mirrors this contract in `ApiError` (`src/app/lib/api.ts`).

### 7.4 Authentication and authorisation

**Sessions.** Opaque 32-byte `base64url` token; the **SHA-256 hash** is stored in `sessions`,
the raw token in an HTTP-only cookie `spice_session`. Expiry 8h, or 30 days with "remember me".

**Passwords.** `scrypt`, N=16384 r=8 p=1, 64-byte key, random 16-byte salt, encoded as
`scrypt$N$r$p$salt$hash`. Verified with `timingSafeEqual`.

**Sign-in gates.** Rate limit 10 attempts / 15 min per IP+email (in-memory `Map` — resets on
restart and is per-instance). `account_status === 'suspended'` → `403`. Unverified email → `403`.

**Roles.** `users.role` holds a legacy display string; `normalizeRole()` maps it to one of
`citizen | facilitator | municipality | admin`. Several historical municipality spellings are
accepted (`Municipality Staff`, `Municipality / Pilot Coordinator`, `Pilot Coordinator`, …).
Anything unrecognised falls back to `citizen` — **fail-closed**.

**The activation gate.** `hasPermission()` checks `account_status` *before* the role:

```js
const role = user.account_status && user.account_status !== 'active'
  ? 'citizen'                       // pending_approval / suspended => citizen only
  : normalizeRole(user.role);
```

So a self-registered municipality or facilitator can sign in immediately but holds only citizen
permissions until an admin sets `account_status = 'active'`.

**Current permission sets** (`server/permissions.mjs`, mirrored in `src/app/auth/permissions.ts`):

```
citizen       public:view, hub:view-public, hub:view-assigned, hub:participate,
              forum:view, forum:create-proposal, forum:comment, forum:vote,
              forum:edit-own-content, forum:withdraw-own-proposal,
              repository:view-public, repository:view-hub-resources,
              tools:view, tools:use-enabled, users:view-self

facilitator   citizen + hub:facilitate, hub:configure-tools,
              hub:view-participant-input, repository:upload

municipality  citizen + hub:create, hub:edit, hub:delete, hub:publish, hub:archive,
              hub:manage-phases, hub:facilitate, hub:configure-tools,
              hub:configure-participation, hub:view-participant-input,
              hub:view-analytics, hub:issue-official-response,
              hub:preview-citizen-view, forum:moderate, forum:official-decision,
              repository:upload, repository:manage, tools:configure

admin         admin:all   (short-circuits every check)
```

Facilitators are deliberately **denied** `hub:publish`, `hub:manage-phases`,
`hub:issue-official-response`, `forum:official-decision`, `repository:manage`.

**Two-layer enforcement.** `src/app/auth/permissions.ts` + `usePermissions()` exist **only to
decide what to render** (and also downgrade non-active accounts to citizen). Every write path is
re-checked server-side via `requirePermission()`, which re-derives permissions from the database
row for the current session. Never treat the client mirror as security.

**Tenant isolation** is a separate check from permissions: `initiativeIsInScope()`,
`canOperateInitiative()`, `isAssignedFacilitator()`, and direct `organisation_id` comparisons
reject cross-municipality access with `403` even when the role permission passes.

### 7.5 Audit log

`addAudit()` writes to `audit_log`: `event_id` (UUID), timestamp, actor id + role, organisation,
action, target type/id, previous and new value (JSON), reason, source.

Sensitive workflow actions are audited — phase advancement (`hub.phase.advance`), official
decisions (`forum.proposal.official_decision`), facilitator assignment, repository
upload/status, admin user updates. **Add an audit entry for any new governance action.**

### 7.6 Notifications and handoffs

- `createNotification()` — per-user row with `type`, `event_type`, `payload_json`, `action_url`.
  Never notifies the actor about their own action.
- `notifyInitiativeRole()` — fans out to every holder of a role on an initiative.
- `createWorkflowHandoff()` — writes `workflow_handoffs`, the durable "X is waiting for Y" queue
  (`from_role` → `to_role`, `pending | acknowledged | completed | cancelled`), surfaced by
  `workflowSummary()`.

Localised notification text is assembled client-side from `event_type` + `payload_json`, so
**new notification types need a matching i18n key**, not a hardcoded string.

### 7.7 Workflow engine (`server/workflow.mjs`)

The one place with real domain logic outside route handlers:

- `activityTransitionsFor(role, status)` / `proposalTransitionsFor(role, status)` — the
  **role × status → allowed next statuses** tables. Admin may jump to any status.
- `phaseReadiness(db, initiative, phaseNumber)` — evaluates that phase's gate requirements and
  returns `{ ready, requirements[{code, met, detail}], metrics }`. Requirement codes differ per
  phase (§9.2).
- `workflowSummary(db, initiative, user)` — readiness + per-status counts + `nextAction` (a
  role-specific `{ code, actorRole, path }`) + pending handoffs filtered to the caller's role.

`nextAction` drives the "what should I do next" UI. Extending it means adding a branch in
`nextActionFor()` **and** an i18n key for the code.

---

## 8. Data model reference

Grouped by domain. `→` marks a foreign key.

**Identity**
- `users` — `role` (CHECK-constrained legacy strings), `account_status`, `roles_json`,
  `organisation_id`, `pilot_site`, `locale`, `email_verified_at`, `avatar_data`, preferences.
- `sessions` — `token_hash` PK → `users`, `expires_at`.
- `email_verification_tokens` — `token_hash`, `used_at`, `expires_at`.
- `organisations` — `name`, `municipality`, `pilot_slug`, `status`.
- `user_guide_progress` — `tour_version`, `last_step_index`, `completed_at`, `skipped_at`.

**Pilot structure**
- `pilots` — static catalogue of the four pilot cities.
- `hub_initiatives` — **one per organisation** (unique index, migration `010`). Carries
  `current_phase_number`, `pilot_finalized_at`, `lifecycle_status`, `activated_at`, the
  `setup_*` questionnaire fields, `enabled_tools_json`, `version` (optimistic concurrency).
- `hub_phases` — exactly 5 per initiative. `enabled_tools_json`, `instructions`,
  `results_visible`, `event_types_json`, `expected_outputs_json`,
  `completion_requirements_json`, `completion_summary`, `completed_at`.
- `hub_participants` — `(initiative_id, user_id)` PK + `assignment_role`
  (`participant | facilitator`). This *is* the facilitator-assignment table.
- `hub_activities` — rich activity record: `workflow_status`, `activity_type`,
  `selected_tool_ids_json`, scheduling, `participation_mode`, `visibility`,
  `accessibility_notes`, `language_support`, `allow_anonymous_participation`, `allow_editing`,
  review/publish/close/complete timestamps.
- `hub_contributions` — citizen submissions → initiative + phase + activity, with `status`
  (`submitted | reviewed | incorporated | declined | withdrawn | hidden`) and
  `municipality_response`.

**Deliberation**
- `forum_proposals` — the most extended table. `workflow_status`, legacy display `status`,
  `item_type` (`issue | proposal | design_alternative | finding | workshop_outcome | prototype`),
  `phase_number`, `category`, `voting_mode` (`support | binary`), voting window,
  `participation_summary`, `decision_at`, moderation fields, linked-output fields,
  `source_proposal_id`, `version`.
- `forum_comments` — threaded via `parent_comment_id`.
- `forum_votes` — `(proposal_id, user_id)` PK, `direction` (`up | down`).
- `forum_official_decisions` — immutable decision record: `decision`
  (`under_review | approved | declined`), `previous_status`, **`rationale` (required)**, actor.
- `forum_proposal_events` — append-only status history.
- `forum_reports` — citizen abuse reports, unique per `(proposal, reporter)`.

**Outputs**
- `repository_documents` — metadata records (**not** binary files). `publication_status`
  (`draft | ready_for_review | published | archived`), `access_level`
  (`public | participants | internal`), phase/activity links, `result_type`, `author_role`,
  publish audit fields, `version`.
- `scenarios` — pilot documentation. `publication_status`
  (`in_preparation | implementation_ongoing | under_evaluation | published`) plus documentation
  fields (`pilot_context`, `tools_used_json`, `stakeholders`, `activities`, `outputs_results`,
  `lessons_learned`, `recommendations`).
- `scenario_votes`, `scenario_adoptions`, `scene_states`.

**Cross-cutting**
- `workflow_handoffs` — role-to-role pending work queue.
- `audit_log` — governance trail.
- `notifications` — per-user, with `payload_json` for localisation.
- `platform_settings` — key/value with `updated_by_user_id`.
- `user_feedback`, `insight_metrics`, `citivoice_metrics`, `dashboard_data`, `process_drafts`.

---

## 9. Domain state machines

Four **independent** state models. Conflating them has caused real bugs; keep them separate.

### 9.1 Pilot lifecycle (`hub_initiatives.lifecycle_status`)

`setup_required → ready_to_activate → active → completed`

Distinct from the legacy `status` column (`draft | scheduled | published | active | paused |
completed | archived`), retained for compatibility.

### 9.2 Phase progress — single source of truth

`hub_initiatives.current_phase_number` is the **only** stored phase position. Every phase's
displayed state is *derived*:

```ts
// src/app/lib/phaseState.ts
phaseState(phaseNumber, currentPhaseNumber, pilotFinalized)
  => 'completed' | 'current' | 'incomplete'
```

Citizens see `incomplete` labelled "Upcoming". There is exactly one current phase unless
`pilot_finalized_at` is set. **Never reintroduce independent per-phase status dropdowns** — that
design allowed two "open" phases at once.

`selectedPhaseNumber` is separate **client-only** state for browsing a phase without changing
the official position.

Advancement is a deliberate, audited action: `PATCH /api/hub/initiatives/:id/current-phase`
(requires `hub:edit`, optimistic `version` check), fronted by a confirmation dialog, writing a
`hub.phase.advance` audit event and syncing the legacy `hub_phases.status` values.

Gate requirements per phase come from `phaseReadiness()`. Requirement codes: `setup_complete`,
`tools_selected`, `facilitator_assigned`, `activity_completed`, `contributions_documented`,
`proposal_prepared`, `participation_completed`, `official_decision_published`,
`published_results`, `completion_summary`. See `docs/phase-transition-rules.md` for which are
blocking versus advisory.

### 9.3 Activity workflow (`hub_activities.workflow_status`)

`draft → ready_for_review → published → scheduled → open → closed → completed`
plus `needs_revision` and `cancelled`.

Role-gated transitions live in `ACTIVITY_TRANSITIONS`. The asymmetry that matters: a facilitator
may move `draft → ready_for_review` but **cannot** publish; only a municipality may take
`ready_for_review → published`.

`publicActivityStatus()` collapses the internal status to the four values citizens see.

### 9.4 Proposal workflow (`forum_proposals.workflow_status`)

`draft → municipality_review → published → discussion_open → voting_open →
participation_closed → decision_pending → approved | declined`
plus `needs_revision` and `archived`.

Constraints enforced server-side:

- Facilitators may prepare (`draft → municipality_review`) and close participation, but
  **cannot** publish or decide.
- Official decisions require a **rationale of ≥ 20 characters**; the write is transactional
  across `forum_proposals`, `forum_official_decisions`, and `audit_log`, with optimistic
  `version` checking.
- An approved decision does **not** advance the phase. Advancement stays a separate action.
- Every transition appends to `forum_proposal_events`.

The legacy display `status` column (`Open | Under Review | Needs Revision | Implemented |
Rejected`) is maintained alongside `workflow_status`.

### 9.5 Repository publication

`draft → ready_for_review → published → archived`

- `repository:upload` (facilitator, municipality) creates items — always as `draft`.
- Uploaders may move their own items `draft ↔ ready_for_review`.
- `repository:manage` (municipality only) may `publish` / `archive`, scoped to its organisation.
- Guests and citizens receive **only `published`** rows from `GET /api/repository`.

### 9.6 Scenario publication

`in_preparation → implementation_ongoing → under_evaluation → published`

Guests and citizens see only `published`; staff roles see drafts. The Scenarios page is
currently an honest work-in-progress state — no fabricated pilot results exist in seed data.

### 9.7 Contribution status

`submitted → reviewed → incorporated | declined`, plus `withdrawn` (citizen) and `hidden`
(moderation). `hidden` rows are excluded from all counts.

---

## 10. API reference

All under `/api`. Auth column: **Public** = no session; **Session** = any signed-in user;
otherwise the required permission.

### Health & auth
| Method | Path | Auth |
|---|---|---|
| GET | `/health` | Public |
| GET | `/auth/session` | Public |
| POST | `/auth/register` | Public |
| POST | `/auth/verify-email` | Public |
| POST | `/auth/signin` | Public |
| POST | `/auth/demo-login` | Public, **non-production only** |
| POST | `/auth/signout` | Session |

### Pilot / Hub
| Method | Path | Auth |
|---|---|---|
| GET | `/pilots` | Public |
| GET | `/hub/initiatives` | Public (role-filtered) |
| POST | `/hub/initiatives` | `hub:create` |
| GET | `/hub/initiatives/:id` | Public if published; else scoped |
| PATCH | `/hub/initiatives/:id` | `hub:edit` |
| PATCH | `/hub/initiatives/:id/activate` | `hub:publish` |
| PATCH | `/hub/initiatives/:id/current-phase` | `hub:edit` |
| PATCH / DELETE | `/hub/initiatives/:id/facilitator` | `hub:configure-participation` |
| PATCH | `/hub/initiatives/:id/phases/:phaseNumber` | `hub:manage-phases` |
| GET / POST | `/hub/initiatives/:id/activities` | scoped |
| GET / PATCH | `/hub/activities/:id` | scoped |
| GET / POST | `/hub/activities/:id/contributions` | `hub:participate` / scoped |
| GET | `/hub/facilitator-assignments` | Session (self-scoped) |

### Forum
| Method | Path | Auth |
|---|---|---|
| GET | `/forum/proposals` | Public (visibility-filtered) |
| POST | `/forum/proposals` | `forum:create-proposal` |
| POST | `/forum/proposals/:id/comments` | `forum:comment` |
| POST | `/forum/proposals/:id/vote` | `forum:vote` |
| PATCH | `/forum/proposals/:id/status` | `forum:official-decision` |
| PATCH | `/forum/proposals/:id/workflow` | role × transition table |
| PATCH | `/forum/proposals/:id/moderation` | `forum:moderate` |
| POST | `/forum/proposals/:id/report` | Session |

### Repository / Scenarios / Results
| Method | Path | Auth |
|---|---|---|
| GET | `/repository` | Public (published only unless staff) |
| POST | `/repository` | `repository:upload` |
| PATCH | `/repository/:id/status` | `repository:upload`; publish/archive needs `repository:manage` |
| GET | `/scenarios` | Public (published only unless staff) |
| POST | `/scenarios` | Non-citizen roles |
| POST | `/scenarios/:id/vote`, `/scenarios/:id/adopt` | Session |
| GET | `/results` | Session (platform-wide counts, not pilot-scoped) |
| GET | `/insights` | `hub:view-analytics` |
| GET | `/citivoice` | Public |
| GET / PUT | `/scene-state` | Public read (empty for guests) / Session write |

### Account
| Method | Path | Auth |
|---|---|---|
| GET / PATCH | `/profile` | Session |
| GET | `/profile/export` | Session |
| GET | `/notifications` | Session |
| PATCH | `/notifications/:id` | Session |
| POST | `/notifications/read-all` | Session |
| GET / PATCH | `/guide-progress` | Session |
| POST | `/feedback` | Public (anonymous allowed) |

### Admin
| Method | Path | Auth |
|---|---|---|
| GET | `/admin/overview`, `/admin/users`, `/admin/organisations`, `/admin/audit`, `/admin/workspace` | `users:manage` / `admin:all` |
| PATCH | `/admin/users/:id` | `users:manage` |
| POST | `/admin/organisations`, PATCH `/admin/organisations/:id` | admin |
| PATCH | `/admin/settings` | admin |

> `PATCH /admin/users/:id` recomputes the stored role label from `normalizeRole()`. When adding a
> role, update that mapping too or an unrelated field update will silently rewrite the role.

---

## 11. Frontend architecture

### 11.1 Routing

`src/app/routes.tsx`, `createBrowserRouter`. All routes nest under `<RouteExperience />`
(transitions, scroll restoration, progress bar). Three guard layers:

- `<ProtectedRoute />` — requires a session.
- `<RequirePermission permission="…">` — requires a specific permission.
- `<PublicFeatureGate …>` — renders an explanatory teaser to guests instead of the tool (used
  for CitiVoice, 3D Scene Editor, Co-Creation Guide).

A large number of legacy paths (`/app/*`, `/overview`, `/get-started`, …) exist purely as
`<Navigate replace>` redirects. Keep them when renaming routes.

### 11.2 Contexts

- `AuthContext` — session user, sign-in/out, register, demo login, notification counts.
  `AuthUser.accountStatus` is `'active' | 'suspended' | 'pending_approval'`.
- `I18nContext` — `t(key, params)` with `{{name}}` interpolation, locale switching, `formatDate`.
- `AppContext` — accessibility preferences (font size, contrast, reduced motion).

### 11.3 API client

`src/app/lib/api.ts`: `apiRequest<T>(path, options)` sends `credentials: 'same-origin'` and an
`Accept-Language` header, and throws `ApiError { status, code, fieldErrors }` mirroring §7.3.
`jsonBody(obj)` is the body helper. Always use relative `/api/...` paths.

### 11.4 Design system

Two layers, both must be respected:

1. **`src/styles/spice-polish.css`** — semantic tokens on `.spice-public`:
   `--border-subtle | --border-default | --border-active | --border-error | --border-success`,
   `--radius-control | --radius-card | --radius-modal | --radius-pill`,
   `--surface-card | --surface-muted | --surface-active`, `--spacing-card | --spacing-group`,
   plus the original `--spice-*` brand variables.
   This file also **overrides Tailwind utilities inside `.spice-public`**: `.rounded-xl` and
   `.rounded-lg` become `4px`, `.shadow-sm` becomes `none`. Corners are intentionally near-flat.
2. **`src/styles/tailwind.css`** — `@layer components` with the shared surfaces: `.spice-card`,
   `.spice-card-dashed`, `.spice-interactive-card`, `.spice-interactive-icon`, plus form helpers
   (`.spice-form-grid`, `.spice-field-group`, `.spice-field-message`).

**Convention:** use `.spice-card` / `.spice-card-dashed` for bordered containers. Do not
hand-roll `border-2 border-[#hex] bg-white` — the platform previously accumulated 13 different
greys for the same role, and that has been consolidated.

`src/app/components/ui/` holds 44 shadcn primitives that are **largely unused** by app pages
(including `Card`, which no page imports). `src/styles/theme.css` similarly defines a shadcn
token set the app does not consume. Treat both as dormant, not as the design system.

Global header, footer, and the floating control launcher (`SpicePublicShell`,
`AiChatbotWidget`) are **out of scope for redesign** by standing instruction.

### 11.5 Internationalisation

- Five locales: `en`, `el`, `fi`, `pl`, `pt`. `en` is the source of truth; the others spread `en`
  and override, so a new key needs only an `en` entry to be safe.
- `src/app/i18n/translations.ts` is ~9,400 lines — a single typed key union. `TranslationKey`
  gives compile-time safety on `t()`.
- `npm run lint:i18n` (`scripts/i18n-audit.mjs`) parses the file with the TypeScript AST and
  audits key parity across locales. **Run it after adding keys.**
- Bulk content (tool catalogue, glossary, pilot sites) is localised as JSON under
  `src/app/data/localized/`, not inside `translations.ts`.
- **No user-facing string should be hardcoded in a component.** Notification bodies in
  particular are composed from `event_type` + `payload_json` on the client.

---

## 12. Conventions

1. **Server is the security boundary.** Add `requirePermission()` to every mutating route. The
   client mirror is presentation only.
2. **Audit governance actions.** Anything a municipality decides gets an `audit_log` row.
3. **Rationale is mandatory** for official decisions — never allow a silent status change.
4. **Respect draft visibility.** New read endpoints must filter unpublished content for citizens
   and guests, not rely on the UI to hide it.
5. **Keep the four state machines separate** (§9).
6. **Optimistic concurrency** — when a table has `version`, accept and check it on write and
   return `409 CONFLICT` on mismatch.
7. **i18n for all copy**; run the audit.
8. **Use the shared card/token classes**; do not introduce new ad-hoc borders or radii.
9. **Match surrounding code style** — this codebase favours dense single-line JSX for small
   elements and multi-line for structural blocks. Comments are sparse and explain *why*.

---

## 13. Testing

```bash
npm test          # node --test tests/*.test.mjs
```

| File | Scope |
|---|---|
| `tests/api.test.mjs` | Boots a real handler on an ephemeral port against a temp SQLite file; covers auth boundaries, registration validation, same-origin rejection, forum writes, scenarios, hub/admin scoping, sign-out |
| `tests/permissions.test.mjs` | Pure permission-matrix assertions incl. the activation-gate downgrade and facilitator denials |
| `tests/i18n.test.mjs` | Locale key parity |

The API test injects `databasePath` and a fake `sendVerificationEmail`, and exposes `api.db` so
tests can insert fixtures directly — the established pattern for new API tests.

**Not present:** frontend component tests, browser E2E automation, accessibility test
automation. The role journeys have been verified manually, not by an automated suite.

---

## 14. Deployment

**Self-hosted**

```bash
npm ci && npm run build
SPICE_HOST=0.0.0.0 SPICE_PORT=4173 npm start
```

`server/index.mjs` serves `dist/` with an SPA fallback, sets `X-Content-Type-Options: nosniff`,
and path-guards against directory traversal. Put TLS termination in front of it.

**Vercel** — `api/[...path].mjs` handles `/api/*`; static assets come from the build. See the §5
caveat: `/tmp` SQLite means non-persistent, non-shared state.

Production checklist: set `SPICE_SEED_PASSWORD`, configure `RESEND_API_KEY` + `SPICE_EMAIL_MODE`
(not `preview`), set `SPICE_PUBLIC_URL`, set `VITE_ENABLE_DEMO_LOGIN=false` (demo login is
additionally blocked when `NODE_ENV=production`), and use a persistent `SPICE_DB_PATH`.

---

## 15. Known limitations

Documented so nobody mistakes these for finished work.

| Area | State |
|---|---|
| **Onboarding tour** | `src/app/onboarding/tourSteps.ts` defines role-specific multi-page steps but **no engine imports it**. There is no tour. The `.spice-tutorial-*` CSS classes belong to the static `DemoGuidePage`, not a tour engine. |
| **In-product user guide** | Not built. `docs/user-guide-content-plan.md` holds the outline only; there is no `/user-guide` route. |
| **Repository files** | Metadata records only. "Download record" exports the row as JSON. No binary upload, storage, or virus scanning. |
| **Notification taxonomy** | ~9 event types exist against the ~29 the specification describes. |
| **Automated E2E** | None. No Playwright/Cypress. |
| **Accessibility** | Individual patterns are careful (focus traps, `aria-live`, reduced motion, text alternatives) but no full WCAG 2.2 AA audit has been performed. |
| **Phase gates** | Only the Phase 4 decision-with-rationale requirement is hard-enforced server-side; other gate requirements are computed and displayed but not blocking. |
| **Keycloak** | Referenced in the original specification; does not exist. Auth is custom (§7.4). |
| **Sign-in rate limiting** | In-memory per instance — ineffective across replicas and reset by restarts. |
| **`ui/` primitives & `theme.css`** | Dormant shadcn layer, not the live design system. |
| **Dead pages** | Several page files are unrouted. Check `routes.tsx` before editing any page. |

---

## 16. Operational gotchas

Things that have cost real debugging time:

1. **Node version.** On Node < 22.5 the server fails on `node:sqlite` import. Check
   `node --version` first when "nothing works".
2. **Migrations need a restart.** No schema hot-reload; Vite HMR only covers the frontend.
3. **Guarded seed blocks never re-run.** Delete `data/spice.db` to pick up new seed data.
4. **`backdrop-filter` breaks `position: fixed`.** The sticky header uses
   `backdrop-filter: blur()`, which makes it a containing block for fixed descendants. The
   mobile nav is therefore rendered through `ModalPortal` into `document.body`; rendering it
   inside the header collapses it to a few pixels tall.
5. **`.spice-public` scope.** Elements outside it (e.g. `AuthLayout`) do not inherit the
   radius/shadow overrides, which is how sign-in once rendered mismatched corner radii.
6. **Legacy status columns.** `hub_activities.status`, `forum_proposals.status`, and
   `hub_initiatives.status` are shadowed by newer `workflow_status` / `lifecycle_status`
   columns. Write both, or read the new one — do not assume the legacy column is current.
7. **Vercel `/tmp` database.** Data loss between cold starts is expected behaviour there.
