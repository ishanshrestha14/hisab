# HISAB — Product Design Audit & UI Refinement

You are working on **Hisab**, an open-source, multi-currency invoicing and client portal designed for Nepali freelancers.

# PRE-REQUISITE — INSTALL UNSLOP SKILL

Before starting the Hisab project audit, verify whether the Unslop skill is installed and available in Claude Code.

Repository: https://github.com/heydamir/unslop

### Installation

If `/unslop` is not available:

1. Clone the repository into a temporary directory:

   ```bash
   git clone --depth 1 https://github.com/heydamir/unslop.git /tmp/unslop-repo
   ```

2. Create the global Claude skills directory if it doesn't exist:

   ```bash
   mkdir -p ~/.claude/skills
   ```

3. Copy the skill:

   ```bash
   cp -R /tmp/unslop-repo/skills/unslop ~/.claude/skills/
   ```

4. Verify that `~/.claude/skills/unslop/SKILL.md` exists and contains valid skill instructions.

5. Remove the temporary cloned repository after successful installation:

   ```bash
   rm -rf /tmp/unslop-repo
   ```

### Verification

- Confirm the skill directory and SKILL.md exist.
- Check whether the current Claude Code session recognizes `/unslop`.
- If a session restart is required, stop and instruct me to restart Claude Code.
- Do not assume installation succeeded without verification.

### Important

- Install globally, not inside the Hisab project.
- Do not modify Hisab's application files during installation.
- Do not install optional image-generation services, MCP servers or paid integrations.
- Do not install additional dependencies unless explicitly necessary.
- Once installation is verified, proceed with the Hisab project reconnaissance and design audit described below.
- Follow the original instruction to obtain my approval before modifying application code.

You must think and work like a senior product designer collaborating with a senior frontend engineer.

This is NOT a request to generate another generic SaaS dashboard.

The goal is to transform Hisab into a distinctive, polished, production-quality SaaS product with a coherent design language.

---

## PHASE 0 — PROJECT RECONNAISSANCE

Before making any changes, understand the existing project.

1. Inspect the repository structure.
2. Read the root README, package.json files, workspace configuration and relevant documentation.
3. Identify the frontend application and its framework.
4. Identify the component library, styling system, CSS architecture and design tokens.
5. Identify routing, layouts, navigation and reusable components.
6. Identify existing dashboard, invoice, payment, client, authentication and settings screens.
7. Understand the existing API integration and data flow.
8. Identify existing functionality, interactions, loading states, error states and empty states.
9. Inspect responsive layouts and mobile navigation.
10. Identify existing design inconsistencies and technical debt affecting the UI.

Expected technology context:

- TypeScript
- Hono
- Prisma
- PostgreSQL
- Better Auth
- Docker
- Turborepo

Do not assume the frontend framework or styling library. Discover the actual implementation from the repository.

Inspect the actual code rather than relying exclusively on documentation.

### Important

Do not modify application code during this phase.

Do not install dependencies.

Do not change the database schema, API contracts or application architecture.

---

## PHASE 1 — UNSLOP DESIGN AUDIT

Use the installed Unslop skill.

Run `/unslop` against the relevant application screens.

Audit the application for:

### Visual problems
- Generic AI-generated SaaS aesthetics.
- Unnecessary gradients, glows and decorative effects.
- Excessive rounded cards and pill-shaped elements.
- Inconsistent spacing and alignment.
- Weak typography hierarchy.
- Inconsistent iconography.
- Poor color contrast.
- Excessive visual noise.
- Repetitive component patterns.
- Poor information density.

### UX problems
- Unclear visual hierarchy.
- Confusing navigation.
- Poorly organized dashboard information.
- Unclear primary and secondary actions.
- Inconsistent forms and validation feedback.
- Poor table readability.
- Weak empty, loading and error states.
- Unnecessary interactions or visual complexity.
- Poor mobile usability.

Do not assume that every existing design decision is wrong.

Preserve good design decisions and identify only meaningful opportunities for improvement.

Produce a prioritized audit:

- Critical: significantly harms usability or visual quality.
- High: noticeably weakens the product experience.
- Medium: inconsistent or unpolished.
- Low: optional refinement.

For every finding, specify:
- Screen/component.
- Current problem.
- Why it is a problem.
- Recommended improvement.
- Priority.

---

## PHASE 2 — DEFINE HISAB'S DESIGN DIRECTION

Before implementation, establish a distinctive design identity.

Hisab should communicate:

- Financial clarity.
- Trustworthiness.
- Professionalism.
- Simplicity.
- Precision.
- Reliability.
- Modern craftsmanship.

The product is designed for freelancers and independent professionals who need to manage invoices, clients and payments without unnecessary complexity.

### Design philosophy

Explore an editorial, minimal, typography-driven financial SaaS aesthetic.

The interface should feel:

- Calm rather than flashy.
- Professional rather than playful.
- Structured rather than decorative.
- Premium without unnecessary visual effects.
- Functional without feeling boring.
- Distinctive without sacrificing usability.

Do not blindly copy Stripe, Linear, Notion, Ramp or other SaaS products.

Use them only as references for individual design principles where appropriate.

### Design system

Propose:

1. Primary and secondary color palette.
2. Neutral surface and background colors.
3. Typography system and font hierarchy.
4. Spacing scale.
5. Border and divider treatment.
6. Shadow philosophy.
7. Button hierarchy.
8. Form styling.
9. Table and data visualization styling.
10. Iconography rules.
11. Responsive layout principles.
12. Light and dark mode strategy, if already supported.

Avoid introducing unnecessary fonts, libraries or dependencies.

Use the existing project architecture wherever possible.

### Signature design element

Identify one subtle, memorable visual detail that could become part of Hisab's identity.

It should emerge naturally from the product's financial and invoicing context rather than being an arbitrary decorative gimmick.

---

## PHASE 3 — SCREEN-BY-SCREEN REDESIGN PLAN

Evaluate each existing screen independently.

Prioritize the following areas where they exist:

### 1. Dashboard
- Financial overview.
- Outstanding invoices.
- Total revenue.
- Recent transactions.
- Upcoming payments.
- Monthly revenue visualization.
- Quick actions.
- Activity overview.

Focus on information hierarchy and useful data density.

Do not invent metrics or display fake financial information.

### 2. Invoices
- Invoice listing.
- Invoice creation.
- Invoice editing.
- Invoice detail view.
- Invoice status indicators.
- Invoice preview.
- Download/export actions.

Make invoice management feel precise and professional.

### 3. Clients
- Client listing.
- Client detail pages.
- Client financial history.
- Contact information.
- Related invoices.

### 4. Payments and transactions
- Transaction history.
- Payment status.
- Currency formatting.
- Amount presentation.
- Filters and search.
- Payment-related actions.

### 5. Client portal
- Client-facing invoice experience.
- Payment information.
- Invoice details.
- Clear navigation.
- Responsive presentation.

### 6. Authentication and settings
- Login and registration.
- Account settings.
- Profile management.
- Preferences.

Do not force all screens into the same layout if their purposes differ.

---

## PHASE 4 — IMPLEMENTATION

IMPORTANT: Stop after completing Phases 0–3.

Present the audit, proposed design direction, design tokens and implementation plan.

Wait for my explicit approval before modifying any files.

Once approved, implement the changes incrementally.

### Implementation rules

1. Preserve all existing application functionality.
2. Preserve API contracts and backend behavior.
3. Preserve database models and migrations.
4. Preserve authentication and authorization behavior.
5. Do not replace real data with mock data.
6. Do not remove existing features to simplify the interface.
7. Do not introduce unnecessary dependencies.
8. Reuse and improve existing components.
9. Centralize design tokens where appropriate.
10. Maintain responsive behavior.
11. Maintain accessibility and semantic HTML.
12. Keep the code maintainable and consistent with existing conventions.

Prioritize reusable components instead of one-off styling.

Avoid creating a completely new component architecture unless the existing one genuinely prevents good implementation.

### Visual implementation passes

Follow this order:

1. Layout and spacing.
2. Color and surfaces.
3. Typography.
4. Icons and visual assets.
5. Component consistency.
6. Interaction states.
7. Responsive behavior.
8. Motion and micro-interactions.
9. Final polish.

Use animation sparingly. Motion should communicate state or improve feedback, not exist merely for decoration.

---

## PHASE 5 — VISUAL VERIFICATION

Do not consider the task complete merely because the code compiles.

Use the available browser tooling, preferably Playwright, to inspect the actual application.

Verify:

- Desktop layouts.
- Tablet layouts.
- Mobile layouts.
- Navigation behavior.
- Forms and validation.
- Tables and data density.
- Modal and dropdown behavior.
- Loading and empty states.
- Interactive controls.
- Typography and spacing consistency.

Run the relevant existing checks:

- TypeScript checks.
- Linting.
- Build.
- Existing tests.

Fix regressions introduced by your changes.

If a feature cannot be verified because the required backend service or test data is unavailable, explicitly report that limitation.

Do not claim visual verification without actually inspecting the rendered interface.

---

## PHASE 6 — FINAL REPORT

After implementation, provide:

1. Summary of the original design problems.
2. Design direction established for Hisab.
3. Screens and components modified.
4. Significant visual improvements.
5. New or updated reusable components.
6. Files modified.
7. Dependencies added or removed, if any.
8. Tests and build results.
9. Remaining UX/design issues.
10. Suggested next improvements.

Separate completed work from recommendations.

---

## NON-NEGOTIABLE PRINCIPLES

- Product usability comes before visual trends.
- Real financial information must remain accurate.
- Never sacrifice functionality for aesthetics.
- Avoid generic AI-generated design patterns.
- Do not redesign something that already works well.
- Do not introduce arbitrary gradients, glows, illustrations or animations.
- Do not make every component a card.
- Do not overuse rounded corners.
- Do not make every heading oversized or bold.
- Do not use emoji as a substitute for professional iconography.
- Avoid unnecessary abstractions and overengineering.

Think critically about every design decision.

The final product should feel like a carefully designed financial SaaS application built by a team that understands both product design and software engineering.

**Begin with Phase 0. Do not edit application files until I approve the design proposal.**