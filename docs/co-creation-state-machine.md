# Co-Creation State Machine

Three independent state models exist in this platform. They are related but must not be
conflated — a common source of past bugs (e.g. the old per-phase status dropdown allowing two
"open" phases at once).

## 1. Phase progress (single source of truth)

`hub_initiatives.current_phase_number` (nullable int, `server/migrations/012_current_phase_number.sql`)
is the **only** place phase progress is stored. Every phase's *displayed* state is derived, never
independently set:

```ts
// src/app/lib/phaseState.ts
type PhaseState = 'completed' | 'current' | 'incomplete';
function phaseState(phaseNumber, currentPhaseNumber, pilotFinalized): PhaseState {
  if (pilotFinalized) return 'completed';
  if (currentPhaseNumber == null) return 'incomplete';
  if (phaseNumber < currentPhaseNumber) return 'completed';
  if (phaseNumber === currentPhaseNumber) return 'current';
  return 'incomplete';
}
```

Citizens see `incomplete` relabeled `Upcoming`. The only write path is
`PATCH /api/hub/initiatives/:id/current-phase`, gated on `hub:edit`, which:
1. Updates `current_phase_number`.
2. Syncs all 5 `hub_phases.status` rows (`completed`/`open`/`not_started`) to match, so legacy
   code reading `phase.status` stays consistent.
3. Requires the confirmation dialog (`PhaseChangeDialog.tsx`) client-side and writes an
   `audit_log` entry (`hub.phase.advance`) server-side — this is the "explicit, non-silent
   Advance to Phase N action" the spec's §11 requires; it already exists.

There is a second, independent `selectedPhaseNumber` (client-only React state in
`RoleHubDashboard.tsx`) used purely to *browse* a phase's tools/instructions without touching
`current_phase_number`. Selecting a phase never mutates server state.

## 2. Activity status (per-activity, independent of phase status)

`hub_activities.status` (`scheduled | open | closed | completed` — no `draft`/`cancelled` values
yet; adding those is **deferred**, see below). An activity's status is set directly by
Municipality/Facilitator action on that activity row; it does not derive from the phase's state,
though in practice an activity is only opened once its parent phase is current.

## 3. Proposal status (per-proposal, independent of both)

`forum_proposals.status` (free-text, no CHECK constraint) currently uses
`Open | Under Review | Implemented | Rejected`, extended this pass to also accept
`Needs Revision` (§6 of the plan — see [phase-transition-rules.md](phase-transition-rules.md)).
Status changes go through `PATCH /api/forum/proposals/:id/status`
(`forum:official-decision` permission only), which requires a `rationale` (min 10 chars),
writes an immutable `forum_official_decisions` row (`decision`, `previous_status`, `rationale`,
`actor_user_id`, `created_at`), and an `audit_log` entry, inside one transaction with optimistic
concurrency (`version` column) — this is the spec's §11 "must not silently change a proposal
status without rationale" already enforced.

## New this pass: facilitator assignment

`hub_participants.assignment_role` (`participant` default, `facilitator` — new column, migration
013) distinguishes a citizen who joined an initiative from a Facilitator formally assigned to
support it. This is not a phase/activity/proposal state — it's a standing relationship, set once
by a Municipality Staff user and read by the Facilitator Hub branch to determine which
initiative(s) to show.

## Deferred (not in this pass)

- `hub_activities.status` gaining `draft`/`cancelled` values (spec §6).
- A distinct `Proposal` lifecycle matching the spec's full 11-value list
  (Draft/Ready for review/Published/Open for discussion/Open for voting/Under review/Approved/
  Declined/Needs revision/Withdrawn/Archived) — today's 5-value set (after this pass) covers the
  decision-relevant states; the earlier "drafting/publishing" states are not modeled as distinct
  DB values yet.
