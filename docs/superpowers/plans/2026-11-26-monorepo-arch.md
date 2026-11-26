# GridAware Monorepo Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-initialize `client` (Next.js) and `server` (NestJS) cleanly with `pnpm` inside a root `pnpm` workspace so both run and connect with a single `pnpm dev` command from `d:\My Projects\gridware`.

**Architecture:** A lightweight root `pnpm` workspace (`pnpm-workspace.yaml` covering `client`, `server`, and `packages/*`) with a single `pnpm-lock.yaml`, single root `.git`, and `concurrently` for single-command dev orchestration. `server` listens on `:3001` with global prefix `/api/v1` and CORS for `:3000`; `client` listens on `:3000` and proxies `/api/:path*` to `server`.

**Tech Stack:** pnpm 12, Node 26, Next.js (App Router, TypeScript, Tailwind CSS, ESLint), NestJS (TypeScript, Vitest/Jest), concurrently.

**Spec:** `docs/superpowers/specs/2026-11-26-monorepo-arch-design.md`

## Global Constraints

- Windows environment (PowerShell), Node `v26.13.0`, pnpm `v12.18.0`.
- Preserve all existing root directories and files (`docs/`, `brand/`, `.agents/`, `README.md`, `MANIFEST.json`).
- Keep `client/` and `server/` at the repo root (do not move into `apps/` or add Turborepo).
- No nested `.git` directories and no `package-lock.json` files inside `client/` or `server/`.
- API global prefix must be `/api/v1` (aligned with Phase 3.3 contracts).
- On Windows, run `pnpm` install/dlx/add commands outside the sandbox (`BypassSandbox: true`); run build/lint/test commands inside the sandbox.

## Review Focus

1. **Nested `.git` or `package-lock.json` created by CLI scaffolders** — `create-next-app` or `@nestjs/cli` may create `.git/` or `package-lock.json`; Task 1 asserts neither exists in `client/` or `server/`.
2. **Port `3000` collision on `pnpm dev`** — `server` defaults to `3001` (respecting `PORT`), `client` uses `3000`; Tasks 2 & 3 verify both ports listen concurrently.
3. **CORS rejection from `http://localhost:3000` to `http://localhost:3001`** — `server` enables CORS for `CORS_ORIGIN ?? 'http://localhost:3000'`; Task 2 e2e test asserts the `access-control-allow-origin` header.
4. **Next.js `/api/:path*` rewrite path mismatch or missing env default** — rewrite forwards `/api/:path*` to `${API_INTERNAL_URL ?? 'http://localhost:3001'}/api/:path*`; Task 3 live probe verifies `GET http://localhost:3000/api/v1/health` returns `200` from NestJS.
5. **Root `pnpm dev` failing on Windows PowerShell** — root scripts use `concurrently` with pnpm filters (`pnpm --filter client dev`, `pnpm --filter server start:dev`); Task 3 verifies `pnpm dev`, `pnpm build`, `pnpm lint`, and `pnpm test` from root.

---

### Task 1: Clean Re-initialization & Root pnpm Workspace

**Files:**
- Delete: `client/`, `server/`
- Create: `pnpm-workspace.yaml`, `package.json`, `.gitignore`
- Create (via CLI): `client/**`, `server/**`

**Interfaces:**
- Consumes: None
- Produces:
  - Root `package.json` scripts: `dev`, `dev:client`, `dev:server`, `build`, `lint`, `test`
  - Workspace packages named `client` and `server` registered in `pnpm-workspace.yaml` with a single root `pnpm-lock.yaml`
  - Single root git repository at `d:\My Projects\gridware`

- [ ] **Step 1: Delete existing `client/` and `server/` directories**

Remove `client/` and `server/` cleanly (preserving `docs/`, `brand/`, `.agents/`, `README.md`, `MANIFEST.json`).
Verify neither directory exists afterward.

- [ ] **Step 2: Initialize root git repository and root workspace files**

Run `git init` at `d:\My Projects\gridware`.
Create `.gitignore` covering `node_modules/`, `.next/`, `dist/`, `.env`, `.env.local`, `coverage/`, `.turbo/`, `*.log`, `.DS_Store`.
Create `pnpm-workspace.yaml`:

```yaml
packages:
  - "client"
  - "server"
  - "packages/*"
```

Create root `package.json` (`"name": "gridware"`, `"private": true`, `"packageManager": "pnpm@12.18.0"`) with scripts:
- `dev`: `concurrently -n CLIENT,SERVER -c cyan,magenta --kill-others-on-fail "pnpm --filter client dev" "pnpm --filter server start:dev"`
- `dev:client`: `pnpm --filter client dev`
- `dev:server`: `pnpm --filter server start:dev`
- `build`: `pnpm -r build`
- `lint`: `pnpm -r lint`
- `test`: `pnpm -r --if-present test`

- [ ] **Step 3: Re-scaffold `client` and `server` with `pnpm`**

Run with `BypassSandbox: true`:
- `pnpm dlx create-next-app@latest client --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-pnpm --yes --disable-git --skip-install` (if `--disable-git` or `--skip-install` is unsupported by the latest CLI, remove any generated `client/.git` or `client/pnpm-lock.yaml` immediately after).
- `pnpm dlx @nestjs/cli@latest new server --package-manager pnpm --skip-git --skip-install`
- Remove any nested `.git`, `package-lock.json`, or per-app `pnpm-lock.yaml` inside `client/` and `server/`.
- Ensure `client/package.json` has `"name": "client"` and `server/package.json` has `"name": "server"`.

- [ ] **Step 4: Install root dev tooling and workspace dependencies**

Run with `BypassSandbox: true`:
- `pnpm add -Dw concurrently`
- `pnpm install`

- [ ] **Step 5: Verify workspace integrity**

Run:
- Check `Test-Path pnpm-lock.yaml` is `True`
- Check `Test-Path client/.git`, `Test-Path server/.git`, `Test-Path client/package-lock.json`, `Test-Path server/package-lock.json` are all `False`
- `pnpm -r list --depth 0` lists both `client` and `server`

Expected: All assertions pass with exit code 0.

- [ ] **Step 6: Commit**

```powershell
git add .gitignore package.json pnpm-workspace.yaml pnpm-lock.yaml client server docs/superpowers
git commit -m "chore: initialize pnpm monorepo workspace for client and server"
```

---

### Task 2: Server Connectivity, Prefix, CORS & Health Endpoint

**Files:**
- Modify: `server/src/main.ts`
- Modify: `server/src/app.controller.ts`
- Modify: `server/src/app.controller.spec.ts`
- Modify: `server/test/app.e2e-spec.ts`
- Create: `server/.env.example`

**Interfaces:**
- Consumes: NestJS app scaffolded in Task 1
- Produces:
  - `GET /api/v1/health` returning `{ status: 'ok', service: 'gridaware-server', timestamp: string }`
  - Server default port `3001` (`process.env.PORT ?? 3001`)
  - Global prefix `api/v1`
  - CORS enabled for `process.env.CORS_ORIGIN ?? 'http://localhost:3000'` with `credentials: true`

- [ ] **Step 1: Write failing unit and e2e tests for `/api/v1/health` and CORS**

In `server/src/app.controller.spec.ts`, add test `getHealth returns ok status for gridaware-server` asserting:
- `result.status === 'ok'`
- `result.service === 'gridaware-server'`
- `typeof result.timestamp === 'string'`

In `server/test/app.e2e-spec.ts`, configure the test `INestApplication` with `app.setGlobalPrefix('api/v1')` and `app.enableCors({ origin: 'http://localhost:3000', credentials: true })`, and assert:
- `GET /api/v1/health` with `Origin: http://localhost:3000` returns `200`, `access-control-allow-origin: http://localhost:3000`, and body matching `{ status: 'ok', service: 'gridaware-server' }`.

- [ ] **Step 2: Run server tests to verify failure**

Run: `pnpm --filter server test; pnpm --filter server test:e2e`
Expected: FAIL (method `getHealth` / route `/api/v1/health` not defined yet).

- [ ] **Step 3: Implement health endpoint, prefix, CORS, port, and `.env.example`**

- In `server/src/app.controller.ts`, add `@Get('health') getHealth(): { status: 'ok'; service: string; timestamp: string }` returning `{ status: 'ok', service: 'gridaware-server', timestamp: new Date().toISOString() }`.
- In `server/src/main.ts`, configure:
  - `app.setGlobalPrefix('api/v1')`
  - `app.enableCors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000', credentials: true })`
  - `await app.listen(process.env.PORT ?? 3001)`
- Create `server/.env.example` with `PORT=3001` and `CORS_ORIGIN=http://localhost:3000`.

- [ ] **Step 4: Run server unit & e2e tests to verify pass**

Run: `pnpm --filter server test && pnpm --filter server test:e2e`
Expected: PASS (exit code 0).

- [ ] **Step 5: Commit**

```powershell
git add server/
git commit -m "feat(server): configure port 3001, api/v1 prefix, CORS, and health endpoint"
```

---

### Task 3: Client API Proxy, Helper & Full Monorepo Verification

**Files:**
- Modify: `client/next.config.ts`
- Create: `client/.env.example`
- Create: `client/lib/api.ts`

**Interfaces:**
- Consumes: Server `GET /api/v1/health` on port `3001` from Task 2
- Produces:
  - Next.js rewrite `/api/:path*` → `${process.env.API_INTERNAL_URL ?? 'http://localhost:3001'}/api/:path*`
  - `getApiBaseUrl(): string` and `fetchHealth(): Promise<{ status: 'ok'; service: string; timestamp: string }>` in `client/lib/api.ts`

- [ ] **Step 1: Configure Next.js rewrite, `.env.example`, and `client/lib/api.ts`**

- In `client/next.config.ts`, add `async rewrites()` mapping `/api/:path*` to `${process.env.API_INTERNAL_URL ?? 'http://localhost:3001'}/api/:path*`.
- Create `client/.env.example` with `NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1` and `API_INTERNAL_URL=http://localhost:3001`.
- Create `client/lib/api.ts` exporting:
  - `HealthResponse` interface (`{ status: 'ok'; service: string; timestamp: string }`)
  - `getApiBaseUrl(): string` returning `process.env.NEXT_PUBLIC_API_URL ?? '/api/v1'`
  - `fetchHealth(): Promise<HealthResponse>` calling `fetch(`${getApiBaseUrl()}/health`)`, throwing on non-OK status, returning parsed JSON.

- [ ] **Step 2: Run full root build, lint, and test checks**

Run: `pnpm build && pnpm lint && pnpm test`
Expected: All workspace builds, linters, and tests pass with exit code 0.

- [ ] **Step 3: Live end-to-end smoke test of single-command `pnpm dev`**

In a single PowerShell command (so both servers are reachable on Windows):
- Start `pnpm dev` as a child process.
- Poll `http://localhost:3001/api/v1/health` and `http://localhost:3000/api/v1/health` until both return HTTP `200` (timeout 45s).
- Assert both responses contain `"status":"ok"` and `"service":"gridaware-server"`.
- Terminate the process tree cleanly.

Expected: Both direct server health check and Next.js proxy health check return `200` with expected JSON.

- [ ] **Step 4: Commit**

```powershell
git add client/
git commit -m "feat(client): add API proxy rewrite and typed health client helper"
```
