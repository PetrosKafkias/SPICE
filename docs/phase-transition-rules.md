# Phase Transition Rules

Gate conditions for each of the 5 phases, per the spec's §11. For each gate, this notes whether
it is **server-enforced** today, **UI-guided only** (a human can still bypass it via direct API
access), or **not yet enforced** (documented gap).

## Phase 1 — Framing and Readiness

- **Gate to Phase 2:** questionnaire has at least a stage/objective/participation-level selected
  (`hub_initiatives.setup_*` columns non-empty), a decision on citizen-influence level is
  recorded, and a Facilitator is either assigned or explicitly self-facilitated.
- **Enforcement:** *UI-guided only.* `PATCH /api/hub/initiatives/:id/current-phase` currently
  checks `hub:edit` + optimistic-concurrency `version`, not the questionnaire's completeness. A
  Municipality user can advance past Phase 1 with an empty questionnaire via a direct API call.
  Documented as a gap for a follow-up pass rather than silently assumed fixed.

## Phase 2 — Collective Understanding

- **Gate to Phase 3:** at least one tool has been enabled for Phase 2
  (`hub_phases.enabled_tools_json` non-empty) and citizen participation was opened for it.
- **Enforcement:** UI-guided only, same reasoning as above.

## Phase 3 — Co-Design and Scenario Building

- **Gate to Phase 4:** workshop/tool outputs exist (at minimum, a proposal or activity output
  linked to this phase). Same enforcement status.

## Phase 4 — Prototyping and Testing → Municipality decision

This is the one gate with real server enforcement already in place:

- Facilitator/Municipality closes participation on the relevant proposal(s).
- Municipality issues an official decision — **server-enforced**:
  `PATCH /api/forum/proposals/:id/status` requires `forum:official-decision` (Municipality/Admin
  only), a `rationale` of at least 10 characters, and records the decision atomically in
  `forum_official_decisions` + `audit_log` (`server/api.mjs:935-1019`).
- **Advancing after approval is an explicit, non-silent action** — already built: the Municipality
  must separately call `PATCH /api/hub/initiatives/:id/current-phase`, confirmed via
  `PhaseChangeDialog.tsx`, which is a distinct action from issuing the decision. An "Approved"
  proposal decision does not, by itself, change `current_phase_number`.
- **"Needs Revision" branch:** now available as a proposal status (§6 of the plan) that maps to
  the existing `decision = 'declined'` value internally while displaying distinctly to citizens.
  Choosing it does not delete or hide the original proposal/activity content — the underlying
  rows are never deleted, only the `status` column changes.
- **Gap (UI-guided only):** the system does not yet block advancing to Phase 5 if no proposal for
  Phase 4 has actually reached a decision — an empty Phase 4 can still be advanced past today.

## Phase 5 — Consolidation, Governance and Learning

- **Gate:** publish final outcomes (`hub_phases.results_visible = 1` for phase 5) and, optionally,
  `hub_initiatives.pilot_finalized_at` to mark the whole pilot complete (all phases show
  `Completed`, none `Current` — already modeled in `phaseState()`).
- **Enforcement:** UI-guided only; no automated check that "final outcomes" content exists before
  marking results visible.

## Summary of deferred work

Automated gate-condition enforcement (blocking `current-phase` advancement when Phase N's
required outputs don't exist) is **not implemented this pass** for Phases 1–3 and 5. Phase 4's
decision-and-rationale requirement is the one gate with genuine server-side enforcement, because
it reuses infrastructure (`forum_official_decisions`, `audit_log`) that already existed before
this pass. Building the remaining gates is a natural next increment once this foundation lands.
