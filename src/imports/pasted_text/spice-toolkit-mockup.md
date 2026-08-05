You are Figma Make with Claude 4.6. Create a high-fidelity, deliverable-ready desktop web mockup for the SPICE Digital Toolkit / Co-Creation Platform. The mockup will be used as a figure in a Horizon Europe technical deliverable, so it must look realistic, structured, technically coherent, and aligned with the SPICE system architecture.

Do not create a generic civic dashboard. The design must represent a modular co-creation toolkit where users can navigate tools, set up a participatory process, explore tools freely, select scenario-based toolsets, interact with AI guidance, and view outputs from connected SPICE services.

PROJECT CONTEXT
SPICE means Sustainable Public Spaces through Inclusive Community Engagement. The platform supports inclusive, accessible, participatory co-design of public spaces. It is used by municipalities, facilitators, citizens/participants, planners, and administrators to structure co-creation activities, collect feedback, visualise results, and integrate digital tools such as CitiVoice, a 3D Scene Editor, an AI Chatbot, forums/voting, repository services, analog-tool results, and analytics outputs.

PRIMARY DESIGN OBJECTIVE
Generate a polished desktop web prototype showing how the SPICE Digital Toolkit frontend could provide a unified, role-aware entry point to the SPICE co-creation services. The mockup should demonstrate:
- tool-first navigation,
- guided setup of a customised co-creation process,
- free exploration of the toolkit,
- scenario/pilot-based navigation,
- a filtered tool catalogue,
- tool detail pages,
- AI-supported guidance,
- backend-connected outputs such as heatmaps, summaries, repository items, votes, feedback, and 3D scene previews.

DESIGN STYLE
Use a clean, professional, Horizon Europe deliverable-ready UI. The design should feel trustworthy, accessible, and civic, not playful or commercial. Use a calm palette inspired by public space, nature-based solutions, and NEB principles: deep blue for structure/headings, muted greens for positive/active states, soft neutrals for page backgrounds, pale yellow for tool cards/content blocks, and light purple for guidance or notes. Use generous spacing, rounded cards, subtle shadows, and clear information hierarchy. Use a modern sans-serif typeface similar to Inter, Lato, Nunito, or Source Sans. Avoid clutter, heavy gradients, and overly decorative visuals.

FRAME SET
Create the following desktop frames at 1440 px width. Name frames clearly so they can be exported as figures:
1. SPICE Digital Toolkit – Entry / Start
2. Set Up My Process – Questionnaire
3. Filtered Tool List – Process Builder Results
4. Explore Toolkit Freely – Full Tool Catalogue
5. Scenario-Based Navigation – Pilot / Scenario Selection
6. My Process Page – Saved Co-Creation Roadmap
7. Tool Detail Page – Method / Tool Information
8. Co-Design AI Agent – Guided Assistance
9. Maps, Heatmaps and Summaries – CitiVoice Outputs
10. 3D Scene Editor Integration – Embedded Preview
11. Repository and Analog Results
12. Manage / Admin Configuration

Do not focus on mobile screens. CitiVoice is a connected mobile app/service, but in this frontend mockup it should appear as an external/connected component, a downloadable/openable tool, and a source of outputs such as maps, heatmaps, charts, sentiment summaries, and voting results.

GLOBAL UI STRUCTURE
Use a persistent desktop shell:
- Left sidebar with SPICE logo/title at the top.
- Pilot/project selector below the logo, e.g. “Thessaloniki Pilot – Public Space Co-Creation” with a status chip such as “Feedback open”.
- Tool-first navigation with icons and labels.
- Main content area with page title, short explanatory subtitle, and primary action button.
- Top bar with breadcrumb, language selector, notification icon, help icon, accessibility button, and profile/avatar menu.
- Use visible role chip near the profile, e.g. “Municipality Staff”, “Facilitator”, “Citizen”, or “Admin”.

LEFT SIDEBAR NAVIGATION
Use this fixed navigation structure:
- Start
- Set up my process
- Explore toolkit freely
- See possible scenarios
- Co-Design AI Agent
- My process
- Roadmap process tool
- Forum / Voting
- Repository
- CitiVoice outputs
- 3D Scene Editor
- Analog tools results
- Reports & Export

Role-based section visible only for municipality/admin:
- Pilot configuration
- User roles & permissions
- Translation manager
- Monitoring / Logs
- Consent & privacy settings

The sidebar must make the tools visible as separate entries. Avoid hiding the main modules inside a dashboard.

LANGUAGES AND ACCESSIBILITY
Add a visible language selector with: EN, EL/GR, IT, PT, ES, FI, PL. The main UI can be in English, but demonstrate multilingual readiness with a translation status chip or translation manager screen. Include an accessibility panel or button with:
- font size,
- contrast mode,
- reduced motion,
- keyboard navigation help,
- screen-reader-friendly labels.
Use accessible contrast, clear focus states, large buttons, and plain-language microcopy.

ROLES
Represent role-aware UI for:
- Citizen / Participant: simple interaction, feedback, voting, tool viewing.
- Facilitator: supports workshops, selects tools, manages process steps.
- Municipality Staff / Process Owner: sets up process, chooses objectives, manages outputs, sees analytics and reports.
- Admin: manages users, roles, modules, translations, consent, configuration.

START SCREEN: “WHY ARE YOU HERE?”
Create a clean start page based on the toolkit navigation maps. It should ask: “Why are you here?” and show four large selectable cards or radio-card options:
1. Set up my own process
2. Explore the toolkit freely
3. See possible scenarios
4. Ask the AI agent

Each option should include a short explanation:
- Set up my own process: “Answer a short questionnaire to receive a filtered list of tools.”
- Explore freely: “Browse all tools by co-creation phase and filter them manually.”
- See scenarios: “Start from an existing pilot/scenario and reuse relevant tools.”
- Ask AI agent: “Get guided support for selecting tools and structuring the process.”

Show a small note that saving a process requires login.

PROCESS ROADMAP BACKBONE
The platform must organise co-creation tools around five roadmap phases:
1. Framing & readiness
2. Collective understanding
3. Co-design & scenario building
4. Prototyping & testing
5. Consolidation, governance & learning

Use these phase names consistently across the mockup. Represent them as tabs, a horizontal stepper, or grouped catalogue sections. Each phase should include a short process question:
- Framing & readiness: “Are we ready to co-design, and on what terms?”
- Collective understanding: “How do different actors understand the place and the challenges?”
- Co-design & scenario building: “What futures are possible and desirable?”
- Prototyping & testing: “What happens if we try this, even temporarily?”
- Consolidation, governance & learning: “What stays, who takes care of it, and what did we learn?”

SET UP MY PROCESS – QUESTIONNAIRE SCREEN
Design a process-builder questionnaire for municipality staff/facilitators. The questionnaire should include three main decision groups:
1. Stage of the participatory process:
   - We are writing the project proposal
   - Project is funded/approved and methods/tools need to be set up
   - Project is underway and targeted guidance is needed

2. Objectives requiring guidance:
   - Framing and readiness
   - Collective understanding
   - Co-design and scenario building
   - Prototype and test ideas
   - Consolidation, learning and governance

3. Level of participation:
   - Stakeholders give input but decisions remain with the project team
   - Stakeholders collaborate in shaping solutions and priorities
   - Stakeholders take responsibility for parts of the process or future management

4. Goal of the participatory process:
   - Physical site intervention
   - Intangible results such as events/community organisation
   - Not defined yet

The UI should show selected answers on the left and a dynamic “Filtered tools list” on the right. Also include editable filters:
- group size,
- time duration,
- facilitator/participant ratio,
- online/offline mode,
- budget,
- supplies required,
- implementation time.

FILTERED TOOL LIST SCREEN
Show a filtered tool list produced from the questionnaire. Organise tools under the five roadmap phases. Each phase section should have 2–3 tool cards. Each tool card should include:
- tool name,
- what it is useful for,
- phase tag,
- mode tag (online/offline/hybrid),
- duration,
- group size,
- “More” link,
- “Add to my process” button.

Include a right-side filter drawer with categories:
- Objectives
- Participation level
- Goal
- Group size
- Time duration
- Online/offline
- Budget
- Facilitator/participant ratio

Show a small explanatory note: “This list has already selected elements based on the questionnaire, but filters can be changed.”

EXPLORE TOOLKIT FREELY SCREEN
Create a full tool catalogue. Show all tools grouped by the five roadmap phases. Add a filter panel to the right. Unlike the process-builder results, this page should start with all tools visible. Show a clear “Full tools list” label and a filter summary. Include search, filters, and sort by phase/duration/format. Keep the design clean and readable.

SCENARIO-BASED NAVIGATION SCREEN
Create a page where the user can choose an existing pilot/scenario. Use cards such as:
- Thessaloniki Public Space Pilot
- Rovaniemi City Centre Pilot
- Cuba Municipality Pilot
- ARRSA / Bielsko-Biała Pilot

Each scenario card should show:
- location,
- main challenge,
- current stage,
- relevant roadmap phases,
- suggested tools,
- “Use this scenario” button.

After selecting a scenario, show a generated tools list relevant to that scenario.

MY PROCESS PAGE
Design a saved process page that requires login. It should present the user’s customised process as a roadmap with the five phases as columns or horizontal steps. Each phase contains selected tools. Include:
- process title,
- pilot/project name,
- owner/facilitator,
- timeline,
- current phase,
- selected tools,
- notes,
- participants,
- outputs,
- export button.

Add actions:
- Add/remove tools
- Reorder tools
- Assign facilitator
- Add workshop date
- Export process plan
- Share with project team
- Save as draft / publish

TOOL DETAIL PAGE
Create a detailed page for one selected tool. Use a realistic placeholder tool, e.g. “Outcome Mapping”, “Participatory Photojournal”, “Digital Forum”, or “Spatial Feedback Walk”. The page must include:
- tool title,
- short purpose statement,
- phase tag,
- objective tag,
- usage tip,
- pro tip,
- development and implementation time,
- recommended mode/adaptation (online/offline/hybrid),
- budget indication,
- supplies required,
- facilitator/participant ratio,
- suitable group size,
- expected outputs,
- accessibility notes,
- examples / screenshots placeholder,
- “Add to my process” button,
- “Ask AI about this tool” button.

CO-DESIGN AI AGENT
Design the AI agent as a side panel and as a dedicated page. It should support:
- guided mode,
- exploratory mode,
- factual/document mode.
Show suggested prompts:
- “Which tools fit my workshop objective?”
- “Explain the difference between co-design and consultation.”
- “Summarise the selected process.”
- “Which tools support collective understanding?”
- “What documents support this recommendation?”

Show a sources panel with small cards:
- Project brief
- Pilot diagnostic
- Toolkit repository item
- Regulation / background document
- Previous workshop results

AI responses must be concise, structured, and source-aware. Show that the chatbot can generate summaries and send them to “My process”.

CITIVOICE OUTPUTS / MAPS / HEATMAPS
Create a page for outputs from CitiVoice. Do not design a full mobile app. Show it as a connected external service producing data for the toolkit. Include:
- map preview,
- heatmap layer,
- feedback categories,
- voting results,
- sentiment/emotion summary,
- uploaded photos/media summary,
- project timeline,
- “Open CitiVoice app” or “Download CitiVoice link” button,
- “Import summary into report” button.

Show data cards:
- Contributions received
- Top locations
- Main concerns
- Most supported ideas
- Feedback requiring municipal action

Show that outputs can inform the process, reports, and planning decisions.

3D SCENE EDITOR INTEGRATION
Create a page showing the Scene Editor as an embedded/external tool. It should look like an iframe or embedded preview inside the toolkit, not a fully built 3D application. Include:
- 3D scene preview placeholder,
- project/location name,
- before/after toggle,
- operation chips: Edit, Add, Delete,
- prompt field: “Describe the modification”
- reference image upload placeholder,
- version history thumbnails,
- compare snapshots button,
- export results to process / CitiVoice / repository,
- status badges such as “Authenticated”, “Scene loaded”, “REST API output available”.

Use terminology:
- 3D Gaussian Splatting scene,
- rendered previews,
- edit metadata,
- version history,
- collective review and voting.

REPOSITORY AND ANALOG RESULTS
Create a repository page for documents, media, links, and analog workshop outputs. Include:
- document cards,
- file type tags,
- pilot tags,
- phase tags,
- search,
- filters,
- upload button for authorised users,
- linked outputs from analog tools,
- report summary card.

Show examples:
- Pilot diagnostic report
- Workshop notes
- Photo documentation
- Toolkit method PDF
- Scene Editor export
- CitiVoice summary

FORUM / VOTING
Create a forum/voting page that supports structured discussion and prioritisation. Include:
- topic list,
- proposal cards,
- voting widget,
- comments,
- official municipality reply badge,
- status chips: Open, Under review, Included, Archived.
Keep this page simple and aligned with co-creation, not social media.

MANAGE / ADMIN CONFIGURATION
Create a municipality/admin screen showing:
- pilot configuration,
- module availability toggles,
- role and permission matrix,
- translation completeness by language,
- consent/privacy text blocks,
- monitoring/logs summary,
- export centre.

Include a configuration panel showing that navigation, tool availability, language resources, and pilot-specific layouts are controlled via backend configuration, not hardcoded frontend changes.

FRONTEND–BACKEND INTERACTIONS TO REPRESENT VISUALLY
The mockup should subtly communicate the system architecture without becoming a technical diagram. Use small status chips, tooltips, or side panels showing:
- Frontend receives configuration from backend
- Authentication via OAuth2/JWT / Keycloak
- Role-based access control
- Backend Integration Layer routes requests to services
- REST API / JSON exchange
- Repository reads/writes
- Logs and audit trail
- External/embedded tools connected
- Persistent storage happens server-side
- Frontend keeps only temporary UI state

Do not show raw code. Use clear product-level labels.

DATA INPUTS AND OUTPUTS TO REFLECT
Inputs:
- questionnaire answers,
- selected process stage/objective/goal,
- user role and permissions,
- pilot/project configuration,
- language selection,
- tool filters,
- user comments/votes,
- repository uploads,
- chatbot queries,
- scene-edit prompts/reference images,
- CitiVoice feedback summaries.

Outputs:
- filtered tool list,
- saved process roadmap,
- tool recommendations,
- AI explanation with sources,
- heatmaps and summaries,
- voting results,
- 3D scene previews and edit logs,
- repository items,
- reports/export files,
- badges/points/progress indicators.

GAMIFICATION
Add light, non-competitive participation incentives. Use subtle progress/reward elements:
- process setup progress,
- badges/points,
- contribution milestone,
- completion status.
Do not make gamification visually dominant.

PRIVACY, CONSENT, AND TRUST
Include:
- cookie consent banner or compact CookieYes-style modal,
- first-submission privacy note,
- consent management in admin,
- clear explanation of how contributions are used,
- status labels explaining whether content is private, shared with project team, or public.

ACCESSIBILITY AND INCLUSION
The UI must support low digital literacy and facilitated workshops:
- simple wording,
- visible help text,
- tooltips,
- step-by-step structure,
- accessible color contrast,
- no dense technical language for citizen-facing sections.
Advanced technical details may appear only in admin or integration-status panels.

DELIVERABLE-READY PRESENTATION DETAILS
Add small annotation labels or callout notes in selected frames to make the mockup understandable as a technical deliverable figure. For example:
- “Unified frontend entry point”
- “Role-aware access”
- “Backend-driven pilot configuration”
- “Connected CitiVoice output”
- “Embedded Scene Editor”
- “RAG-based AI guidance with sources”
- “Repository and persistent storage mediated by backend”

Use realistic content; avoid lorem ipsum. Use SPICE terminology consistently:
- SPICE Digital Toolkit
- Co-Creation Platform
- Roadmap process
- CitiVoice
- 3D Scene Editor
- Co-Design AI Agent
- Backend Integration Layer
- Repository
- Forum / Voting
- Analog Tools Results
- Pilot Configuration
- Role-Based Access Control

OUTPUT QUALITY REQUIREMENTS
Use Figma Auto Layout, reusable components, variants, consistent spacing, and clearly named layers. Use realistic interactive states:
- selected radio cards,
- filter chips,
- loading skeleton for maps/outputs,
- success toast after saving process,
- permission warning for restricted admin tools,
- empty state for no tools selected,
- confirmation modal for removing a tool,
- export modal for process/report.

Create a cohesive prototype that looks like a mature first-version system specification, not a marketing landing page. The final result should help reviewers understand how the frontend, backend, tools, data outputs, user roles, and co-creation process fit together in the SPICE Digital Toolkit.