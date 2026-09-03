# User Guide Content Plan

The spec's §22 asks for a public `/user-guide` route with full, non-placeholder content across
three role sections (Municipality, Facilitator, Citizen), each with 20+ subsections including
screenshots, GIFs, glossary links, FAQs, and troubleshooting. **Writing that much finished
content is explicitly deferred past this pass** (per the "Foundation first" scope decision) —
producing 60+ rushed, generic subsections would fail the spec's own "do not leave placeholder
content" requirement more thoroughly than not building the page yet.

What follows is the outline this pass commits to, so the eventual content has a real structure
to slot into (Markdown source, one file per role, matching the spec's requested
"structured source... rather than duplicating text across components").

## Structure decision

`docs/user-guide/{municipality,facilitator,citizen}.md` — plain Markdown, one `##` heading per
subsection. The eventual `/user-guide` route parses these at build or request time (implementation
of the route itself is also deferred; this plan only fixes the content shape).

## Municipality Guide — outline

1. Quick-start checklist
2. Your role and responsibilities
3. Getting your account approved
4. Understanding your pilot workspace
5. The 5-phase roadmap
6. Completing the setup questionnaire
7. Choosing and overriding recommended tools
8. Defining the citizen influence level
9. Assigning a Facilitator
10. Configuring and publishing a phase
11. Reviewing citizen contributions
12. Issuing an official response (with rationale)
13. The Phase 4 decision workflow
14. Advancing to the next phase
15. Publishing final outcomes
16. Using the Repository
17. Notifications you'll receive
18. What Facilitators can and cannot do on your behalf
19. What citizens can and cannot see
20. Accessibility settings for your pilot
21. FAQs
22. Troubleshooting

## Facilitator Guide — outline

1. Quick-start checklist
2. Your role and responsibilities
3. Getting your account approved
4. Being assigned to a pilot
5. Understanding your workspace (pilot, phase, activity scope)
6. Supporting the setup questionnaire
7. Preparing and running activities
8. Uploading workshop outputs and analogue results
9. Turning outputs into draft proposals
10. What you can prepare vs. what needs Municipality approval
11. Commenting and voting in the forum
12. Accessibility notes for your activities
13. Working across multiple assignments
14. Notifications you'll receive
15. FAQs
16. Troubleshooting

## Citizen Guide — outline

1. Quick-start checklist
2. Browsing without an account
3. Registering and verifying your email
4. Understanding the roadmap and current phase
5. Using enabled tools
6. Submitting a contribution
7. Commenting and voting
8. Understanding voting rules (advisory vs. binding)
9. Following your contribution's status
10. Understanding an Official Municipality Response
11. Viewing published outcomes
12. What you cannot do (and why)
13. Accessibility features available to you
14. Notifications you'll receive
15. FAQs
16. Troubleshooting

## Deferred entirely this pass

Route implementation, screenshots/GIFs, glossary, and all subsection body content. This file is
the acceptance artifact for "the outline exists and is honest about what's missing" — not a
substitute for the finished guide.
