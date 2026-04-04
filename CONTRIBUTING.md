# Contributing to Hisab

Thanks for your interest in contributing to Hisab. This document covers the conventions and process for contributing code.

## Before You Start

- **Open an issue first** for any non-trivial change (new features, architectural changes, large refactors). This lets us discuss the approach before you invest time writing code.
- **Bug fixes and small improvements** can go straight to a PR.

## Development Setup

```bash
git clone https://github.com/ishanshrestha14/hisab.git
cd hisab
pnpm install
cp .env.example .env
# Edit .env with your DATABASE_URL and BETTER_AUTH_SECRET
pnpm --filter @hisab/db db:migrate
pnpm dev
```

## Code Conventions

### TypeScript
- All code must be TypeScript. No `.js` files.
- Strict mode is enabled. Don't use `any` unless absolutely necessary.
- Prefer `type` imports (`import type { ... }`) for type-only imports.

### API (Hono)
- Each route group is its own `Hono` instance in `apps/api/src/routes/`.
- Validate all API inputs with Zod via `zValidator("json", schema)`.
- Check resource ownership before mutations: `findFirst({ where: { id, userId } })`.
- Return consistent error shapes: `{ error: "message" }` with appropriate HTTP status codes.

### Frontend (React)
- Data fetching via TanStack Query (`useQuery` / `useMutation`).
- Forms via `react-hook-form` + `zodResolver` using schemas from `@hisab/shared`.
- API calls via `src/lib/api.ts` wrapper.
- Use `cn()` from `src/lib/utils.ts` for merging Tailwind classes.

### Validation
- Define Zod schemas in `packages/shared/src/schemas.ts`.
- Import and use them in both API and frontend — never duplicate validation logic.

### Database
- Schema changes go in `packages/db/prisma/schema.prisma`.
- Run `pnpm --filter @hisab/db db:migrate` to create a migration.
- Don't use raw SQL unless Prisma can't express the query.

## Git Workflow

### Branches
- `main` is the production branch.
- Feature branches: `feat/description`
- Bug fixes: `fix/description`
- Refactors: `refactor/description`

### Commits
Write clear, concise commit messages. Use the imperative mood:

```
feat: add recurring invoice scheduling
fix: prevent duplicate invoice numbers under concurrent requests
refactor: extract email templates to shared constants
```

Prefix with `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, or `test:`.

### Pull Requests
- Keep PRs focused on a single change.
- Include a clear description of what changed and why.
- Reference related issues with `Closes #123` or `Fixes #123`.
- Make sure the build passes before requesting review.

## Project Structure

```
apps/api/       → Hono backend
apps/web/       → React + Vite frontend
packages/db/    → Prisma schema + client
packages/shared/ → Zod schemas shared across apps
```

Changes to `packages/shared` affect both apps. Changes to `packages/db` require a migration.

## Questions?

Open an issue or start a discussion. We're happy to help.
