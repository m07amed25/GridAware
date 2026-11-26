# GridAware Monorepo Architecture Design

**Date:** 2026-11-26  
**Scope:** Small change — Root pnpm workspace, clean `client` & `server` re-initialization, and local connectivity.

## Intent & Why

Run and connect the Next.js frontend (`client`) and NestJS backend (`server`) with a single command from the repository root (`d:\My Projects\gridware`), backed by a single `pnpm` workspace, lockfile, and git repository.

## Goals, Non-Goals & Anti-Goals

- **Goals:**
  - Delete the existing npm-initialized `client/` and `server/` directories and re-scaffold both cleanly with `pnpm`.
  - Configure a root `pnpm` workspace (`pnpm-workspace.yaml` + root `package.json`) with a single `pnpm-lock.yaml`.
  - Provide a single root `pnpm dev` command (plus `build`, `lint`, `test`, `dev:client`, `dev:server`) using `concurrently` with labeled output.
  - Wire local connectivity out of the box: `client` on `:3000`, `server` on `:3001`, `/api/v1` global prefix (matching Phase 3.3 docs), CORS enabled for `http://localhost:3000`, Next.js `/api/:path*` rewrite, and `.env.example` files.
  - Initialize a single git repository at the repo root with a unified `.gitignore`.
- **Non-Goals:**
  - Moving apps into `apps/` or introducing Turborepo.
  - Setting up Prisma, Neon PostgreSQL, MQTT, Redis, or domain modules.
- **Anti-Goals:**
  - Leaving nested `.git` folders or `package-lock.json` files inside `client/` or `server/`.
  - Port `3000` collisions when starting both apps together.

## Constraints

- Windows environment (Node `v26.13.0`, pnpm `v12.18.0`).
- Preserve all existing root directories and files (`docs/`, `brand/`, `.agents/`, `README.md`, `MANIFEST.json`).
- Align API prefix with Phase 3.3 contracts (`/api/v1`).

## Approaches Considered

1. **Lightweight pnpm Workspaces (`client/`, `server/`, `packages/*`) — Selected**
   - Keeps `client/` and `server/` at the root, uses `pnpm` workspaces + `concurrently` for single-command dev, and leaves `packages/*` ready for future shared packages. Lowest friction while scaling cleanly.
2. **pnpm Workspaces + Turborepo (`apps/client`, `apps/server`, `packages/`)**
   - Adds task caching and `apps/` nesting upfront; unnecessary boilerplate before shared packages or CI caching are needed.
3. **Plain npm Workspaces**
   - Keeps `npm` with zero new tooling, but slower installs and weaker dependency isolation; rejected in favor of `pnpm`.

## Decisions

### Decided by User
- Delete existing `client/` and `server/` folders and re-initialize both with `pnpm`.
- Use Option 1: lightweight `pnpm` workspace keeping `client/` and `server/` in place.
- Connect both sides and start them with a single command from the main folder.

### Builder Calls (reviewable)
- **Ports:** `client` on `3000`, `server` on `3001` (configurable via `PORT`).
- **API wiring:** NestJS global prefix `api/v1`, CORS allowing `CORS_ORIGIN ?? http://localhost:3000`, and a Next.js rewrite `/api/:path*` → `http://localhost:3001/api/:path*` alongside `NEXT_PUBLIC_API_URL`.
- **Root runner:** `concurrently` for `pnpm dev` with prefixed, color-coded logs (`CLIENT`, `SERVER`).
- **Git:** Scaffold both apps without nested git repos (`--skip-git` / remove nested `.git`) and run `git init` once at the repo root with a unified `.gitignore`.
- **Scaffolding defaults:** Next.js with TypeScript, Tailwind CSS, ESLint, App Router; NestJS with TypeScript and `pnpm`.

## Left to the Builder

- Exact root `package.json` script flags and `.env.example` contents.
- Adding a minimal `/api/v1/health` check endpoint (or verifying the default NestJS route under `/api/v1`) and verifying that `pnpm dev` starts both servers and that the client proxy reaches the server cleanly.
