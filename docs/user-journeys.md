# SPICE Co-Creation Platform — User Journeys

This document maps the real, current registration-to-outcome journey for each of the three
non-admin roles: **Citizen**, **Municipality / Pilot Coordinator**, and **Facilitator**. Every step below
references the actual file or endpoint that implements it. Where a step is not yet built, it is
marked **(planned — not in this pass)** rather than described as if it existed.

Platform Administrator retains its existing journey/documentation (`AdminPage.tsx` and the
existing admin-only API surface) and is out of scope here.

## Shared foundation

All three roles operate on **one shared pilot process** per organisation (`hub_initiatives`,
one row per `organisation_id`, enforced by `idx_hub_initiatives_one_per_org` —
`server/migrations/010_single_initiative_per_organisation.sql`). There is no per-role duplicate
of the process: every role reads the same `hub_initiatives` / `hub_phases` / `hub_activities` /
`forum_proposals` rows, filtered and permission-gated differently. See
[role-permission-matrix.md](role-permission-matrix.md) for exactly which permission gates which
view/action, and [co-creation-state-machine.md](co-creation-state-machine.md) for how phase state
is derived.

## Citizen journey

1. **Browse without an account.** Public pages (`SpicePublicShell.tsx` routes, `hub:view-public`
   permission) are visible to guests: pilot overview, published phase info, the public toolkit.
2. **Register.** `RegisterPage.tsx` → `POST /api/auth/register` (`server/api.mjs:375`). Citizen is
   the unrestricted default role — no approval gate.
3. **Verify email.** `POST /api/auth/verify-email` (`server/api.mjs:441`); sign-in is blocked
   until `email_verified_at` is set (`server/api.mjs:489`).
4. **Sign in**, land on the Hub (`OverviewPage.tsx` → `RoleHubDashboard.tsx` citizen branch).
   Sees the current phase (`hub_initiatives.current_phase_number`), the 5-phase roadmap with
   derived `Completed` / `Current` / `Upcoming` labels (`phaseState()` —
   `src/app/lib/phaseState.ts`), and that phase's enabled tools only.
5. **Participate.** Uses enabled tools (`tools:use-enabled`), submits forum proposals/comments/
   votes (`forum:create-proposal`, `forum:comment`, `forum:vote` — `server/api.mjs` forum
   routes), views own contributions, and reads the municipality's **Official Municipality
   Response** on any proposal once issued (§6 of the plan; `forum_proposals.official_response` +
   `forum_official_decisions`).
6. **Follow outcomes.** Views published phase results (`hub_phases.results_visible`),
   Repository documents, and forum decision status — never draft/unpublished content
   (`hub:view-public` / `hub:view-assigned` only, never `hub:configure-*` or `forum:moderate`).

## Municipality / Pilot Coordinator journey

1. **Register.** Same `RegisterPage.tsx` form, `role = 'Municipality Staff'`. Per your decision,
   the account is created with `account_status = 'pending_approval'` (§3 of the plan) — it exists
   immediately, but effective permissions are citizen-level until approved.
2. **Wait for approval.** Signs in and sees a "pending administrator approval" notice on the Hub;
   full citizen access in the meantime, no municipality actions available
   (`hasPermission()` degrades any non-`active` account to the citizen permission set —
   `server/permissions.mjs`).
3. **Approved.** A Platform Administrator sets `account_status = 'active'` via the existing admin
   user-management endpoint (`server/api.mjs:710-750`, `AdminPage.tsx`). Municipality Staff
   permissions activate on next request — no re-registration needed.
4. **First real session.** Lands on the organisation's assigned `hub_initiatives` row with
   `lifecycle_status = 'setup_required'`. The methodological phase exists independently, but
   active phase operations and citizen visibility remain unavailable until pilot activation.
5. **Set up the process.** Completes the four saved questionnaire screens (Stage, Objectives,
   Participation, Practical Setup), reviews the resulting tool recommendations, and confirms
   the selection. `PATCH /api/hub/initiatives/:id` persists every step and changes the pilot to
   `ready_to_activate` only when the required answers and tool selection are present.
6. **Review and activate.** Reviews the setup, then deliberately calls
   `POST /api/hub/initiatives/:id/activate`. This Municipality-only endpoint records an audit
   entry, changes the pilot lifecycle to `active`, and opens Phase 1. Editing Process Setup later
   recalculates recommendations without deleting activities, contributions, proposals, results,
   selections, or phase history.
7. **Assign a Facilitator (optional).** Once active, picks an existing Facilitator in their
   organisation; writes `hub_participants.assignment_role = 'facilitator'` (§4 of the plan). No
   assignment = self-facilitating; no separate flag needed to represent that state.
8. **Configure and publish.** Enables tools per phase (`hub_phases.enabled_tools_json`), sets
   phase instructions, and — when ready — advances `current_phase_number` via
   `PATCH /api/hub/initiatives/:id/current-phase`, confirmed through `PhaseChangeDialog.tsx`
   (already built earlier this session) and recorded in `audit_log`.
9. **Review and decide.** Reviews forum proposals scoped to their organisation
   (`organisation_id` matching, `server/api.mjs:958`), issues official decisions with a required
   rationale via `PATCH /api/forum/proposals/:id/status` (`forum:official-decision` permission) —
   this writes `forum_official_decisions` and an `audit_log` entry atomically.
10. **Publish outcomes.** Marks phase results visible (`hub_phases.results_visible`), which is
   what makes Repository documents and phase outcomes visible to citizens.

## Facilitator journey

1. **Register.** Same form, `role = 'Facilitator'`. Also created `pending_approval` (§3) —
   this is the direct resolution of the contradiction between adding Facilitator to the open
   dropdown and the spec's "no restricted role self-assigns permissions" rule: the dropdown stays
   open, but permissions don't activate until approved.
2. **Approved** by a Platform Administrator, same mechanism as Municipality Staff above.
3. **Assigned** by a Municipality Staff user to their organisation's initiative
   (`hub_participants.assignment_role = 'facilitator'`).
4. **Facilitator Hub.** New `role === 'facilitator'` branch in `RoleHubDashboard.tsx` (§4 of the
   plan): shows the initiative(s) they're assigned to, current pilot/phase context, that phase's
   enabled tools, and a Repository upload entry point (`repository:upload`).
5. **Support, don't decide.** Can prepare tool configuration, upload workshop outputs/analogue
   results to the Repository, create draft forum proposals, comment, and vote — but the
   Facilitator permission set explicitly excludes `hub:publish`, `hub:issue-official-response`,
   `hub:manage-phases`, `hub:configure-participation`, and `forum:official-decision`
   (`server/permissions.mjs`). A Facilitator cannot advance the phase or issue an official
   decision even by calling the API directly — the server checks the permission, not just the UI.
6. **Multiple assignments.** A Facilitator with more than one `hub_participants` row always sees
   which pilot/phase is currently active for whichever initiative they're viewing — derived from
   that initiative's own `current_phase_number`, never a global value.

## Repository publication workflow (spec §17 — implemented)

`repository_documents` carries `publication_status` (`draft` → `ready_for_review` → `published` →
`archived`) plus `access_level`, `initiative_id`, `organisation_id`, `uploaded_by_user_id`,
`tool_key`, `related_proposal_id`, and `version` (migration 015).

- **Facilitator** (`repository:upload`) creates items via `POST /api/repository`. Every upload
  starts as `draft` and can be moved to `ready_for_review` by its own uploader.
- **Municipality** (`repository:manage`) publishes or archives via
  `PATCH /api/repository/:id/status`, scoped to its own organisation.
- **Citizens and guests** only ever receive `published` rows from `GET /api/repository`.
- Every upload and status change writes an `audit_log` entry
  (`repository.item.upload`, `repository.item.status`).

## Explicitly deferred (not in this pass)

- Rich per-role notification types (spec §18) — the existing generic `notifications` table/API is
  reused as-is; new `type` values are not added yet.
- Binary file storage — the Repository stores documented metadata records (the "Download record"
  action exports the record as JSON). Actual file/blob upload and virus scanning are not built.
- The full "Municipality decision workflow" 9-step audit trail beyond what
  `forum_official_decisions` + `audit_log` already record.
- A complete 60+ subsection printable user guide (spec §22) — see
  [user-guide-content-plan.md](user-guide-content-plan.md) for the outline that ships instead.
