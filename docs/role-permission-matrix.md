# Role & Permission Matrix

## Correction: this stack does not use Keycloak

The originating spec for this work assumes "Keycloak roles and backend-enforced permissions" as
the production source of truth. **There is no Keycloak, and no OAuth/OIDC provider of any kind,
anywhere in this codebase.** Confirmed by direct inspection of `server/api.mjs`,
`server/permissions.mjs`, and `server/db.mjs`: authentication is a custom implementation —
- Passwords hashed with `server/security.mjs` (`hashPassword`/`verifyPassword`).
- Sessions are opaque tokens stored in a `sessions` table (`server/migrations/001_initial.sql`),
  set as an HTTP-only cookie, looked up per-request via `getSessionUser()`.
- Roles live on `users.role` (a legacy `CHECK`-constrained text column). The supported
  product roles are Citizen, Facilitator, Municipality / Pilot Coordinator, and Admin.
  `Municipality Staff` remains the compatible database value and is normalized to the
  Municipality role; `Researcher` is no longer offered as a product role. A pilot is context,
  never a role. The column is accompanied by a
  free-form `users.roles_json` array that mirrors it for display purposes.
- Account activation state lives in `users.account_status` (no CHECK constraint —
  `'active'` / `'suspended'` / `'pending_approval'`).

The intent behind the spec's requirement — **"do not trust a client-side role value by itself;
restricted roles must not be freely self-assigned"** — is honored without Keycloak: the server is
still the sole source of truth, via `hasPermission()` (server) and mirrored `can()` (client),
never trusting anything the browser sends except the session cookie.

## The real production source of truth

```
users.role (DB)  ──┐
users.account_status ──┼──► normalizeRole() + account_status gate ──► ROLE_PERMISSIONS[role] ──► hasPermission()
                    ──┘         (server/permissions.mjs)
```

Every sensitive route calls `requirePermission(db, request, response, '<permission>')`
(`server/api.mjs`), which re-derives the permission set from the **database row for the current
session**, not from anything the client claims. The client-side mirror
(`src/app/auth/permissions.ts`, consumed by `usePermissions.ts` and `SpicePublicShell.tsx`) is
UI-only — it exists purely to hide/show controls; every write path is re-checked server-side.

## Roles

| Role (DB value) | Normalized | Self-registrable | Activation |
|---|---|---|---|
| `Citizen` | `citizen` | Yes | Immediate (after email verification) |
| `Municipality Staff` (displayed as Municipality / Pilot Coordinator) | `municipality` | Yes (dropdown) | **Gated**: `account_status = 'pending_approval'` until an Admin approves |
| `Facilitator` | `facilitator` | Yes (dropdown) | **Gated**: same as above |
| `Admin` | `admin` | No | Admin-provisioned only |

**Approval gate mechanics:** `hasPermission()` checks `user.account_status` before consulting
`ROLE_PERMISSIONS[normalizeRole(user.role)]`. If `account_status !== 'active'`, the citizen
permission set is used regardless of the stored `role`. This means a `pending_approval`
Municipality Staff or Facilitator account can log in and use the platform as a citizen
immediately, but gains its real permissions only once a Platform Administrator flips
`account_status` to `'active'` via the existing admin endpoint (`server/api.mjs:710-750`,
`AdminPage.tsx`). This satisfies "must not immediately receive permissions" without removing the
open registration dropdown you asked to keep.

## Permission sets

`citizen` (baseline, also the fallback for any pending/unapproved restricted-role account):

```
public:view, hub:view-public, hub:view-assigned, hub:participate,
forum:view, forum:create-proposal, forum:comment, forum:vote,
forum:edit-own-content, forum:withdraw-own-proposal,
repository:view-public, repository:view-hub-resources,
tools:view, tools:use-enabled, users:view-self
```

`facilitator` = `citizen` **plus**:

```
hub:configure-tools, repository:upload
```

Explicitly **excluded** from `facilitator` (operational, not governance — matches spec §2):
`hub:create`, `hub:edit`, `hub:delete`, `hub:publish`, `hub:archive`, `hub:manage-phases`,
`hub:configure-participation`, `hub:issue-official-response`, `hub:preview-citizen-view`,
`forum:moderate`, `forum:official-decision`, `repository:manage`, `tools:configure`.

`municipality` = `citizen` **plus**:

```
hub:create, hub:edit, hub:delete, hub:publish, hub:archive, hub:manage-phases,
hub:configure-tools, hub:configure-participation, hub:view-participant-input,
hub:view-analytics, hub:issue-official-response, hub:preview-citizen-view,
forum:moderate, forum:official-decision, repository:upload, repository:manage,
tools:configure
```

`admin` = every permission (`admin:all` short-circuits `hasPermission()`).

## Enforcement points (not just UI hiding — spec §19)

- Every mutating Hub/Forum/Repository route in `server/api.mjs` calls `requirePermission()`.
- Cross-organisation isolation: `initiativeIsInScope()` / direct `organisation_id` comparisons
  (e.g. `server/api.mjs:958`) reject a Municipality user acting on another organisation's data
  with `403`, independent of the permission check.
- The client-side `can()` (`src/app/auth/permissions.ts`) is consulted only to decide what to
  render — a Facilitator calling `PATCH /api/forum/proposals/:id/status` directly (bypassing the
  UI) still gets `403` because `forum:official-decision` is not in their server-side set.
