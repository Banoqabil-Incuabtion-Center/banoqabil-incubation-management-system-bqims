# BQIMS — Admin Frontend

React 19 + TypeScript + Vite. The admin console: students, teams, projects, project managers, posts, attendance + attendance settings, calendar.

The sibling student app is `banoqabil-incubatees` (React 18, PWA). They share a shadcn base but diverge — see "Don't cross-copy" below.

## Commands

```bash
npm run dev
```

Nothing pins the port, and the backend CORS allowlist expects this app on `5174` while the student app takes `5173`. Start it explicitly:

```bash
npm run dev -- --port 5174
```

```bash
npm run lint
```

Runs ESLint. `npm run build` is `tsc -b && vite build`, so a type error **does** fail the build here (unlike the student app).

Requires the backend at `http://localhost:5000`.

## Layout

```
src/auth/           Login, PrivateRoute
src/Pages/          route-level screens; StudentSchema.ts holds the student form schema
src/repositories/   API layer — one class per domain, exported as a singleton
src/hooks/store/    authStore.ts (zustand + persist, key "admin-auth-storage")
src/components/     ui/ is shadcn, board/ is the kanban, layout/userLayout.tsx is the shell
src/lib/            axios, constant, utils
src/app/dashboard/  data.json — static sample data for the dashboard table
```

Import alias `@/` → `src/`.

## Conventions

- **Data access goes through `src/repositories/*.ts`.** Each exports a class plus an instance (`export const teamRepo = new TeamRepo()`); components use the instance. Endpoints live under `/api/admin/*` — note the inconsistent backend naming (`GET /api/admin/team` but `POST /api/admin/createteam`, `GET /api/admin/project` but `POST /api/admin/createproject`). Mirror what the backend actually exposes, don't normalize it client-side.
- **No TanStack Query in this app.** Fetching is direct repo calls inside components/effects, with zustand for auth. Don't introduce react-query for a single screen — either adopt it deliberately across the app or follow the existing pattern.
- **Auth**: `src/lib/axios.ts` reads the token from `sessionStorage` then `localStorage`, and on a 401 with message `"jwt expired"` / `"Invalid token"` / `"No token"` retries once via **`/api/admin/refresh-token`**, falling back to a redirect to `/admin/login`. `authStore.logout()` calls `POST /api/admin/logout` and hard-redirects.
- **Routing quirk**: all admin routes are absolute `/admin/*` paths nested inside a `/` parent route, and `*` redirects to `/`. So the login page is `/admin/login` but the dashboard is `/`. Follow the existing shape when adding a page — add it under the `PrivateRoute`/`UserLayout` parent with an `/admin/...` path.
- **UI stack**: shadcn/ui + Radix + Tailwind v4, plus `antd` **v5** with the `@ant-design/v5-patch-for-react-19` shim imported in `main.tsx` (required — antd v5 isn't natively React 19 compatible; don't remove it). Tables use `@tanstack/react-table`, charts `recharts`, toasts `sonner`, PDF export `jspdf`.
- `ThemeProvider` defaults to `system` in `main.tsx` but `App.tsx` wraps a second `ThemeProvider` with `defaultTheme="dark"` and `storageKey="vite-ui-theme"` — the inner one wins.

## Task board

`src/Pages/Board.tsx` plus `src/components/board/` (`BoardColumn`, `TaskCard`), talking to `taskRepo.ts`. Four fixed columns from `TASK_STATUSES`; pick a project from the header dropdown.

The dnd-kit wiring has a few load-bearing details:

- **Column droppable ids are the status strings themselves** (`"Backlog"`, …) and card ids are Mongo ObjectIds, so they can never collide inside one `DndContext`. `isStatus()` is what distinguishes them.
- **`handleDragOver` moves the card across columns in local state mid-drag**; `handleDragEnd` only reorders within the (already updated) destination column. This is the standard dnd-kit multi-container pattern — don't collapse the two handlers into one.
- **`boardRef` mirrors `board` state** because `handleDragEnd` must read the post-`handleDragOver` board, not the stale render closure.
- On drop, the whole destination column's ordered id list goes to `PATCH /api/admin/task/:id/move`. If that request fails the board **refetches** rather than trying to invert the optimistic update.
- `PointerSensor` uses `activationConstraint: { distance: 6 }` and the card's edit/delete buttons `stopPropagation` on pointerdown — without both, dragging swallows the clicks.

**Real-time is backend-only right now.** The API emits `task:created/updated/moved/deleted` into a `project:<id>` socket room, but this app has no `socket.io-client` dependency so nothing subscribes. To turn on live multi-admin sync: `npm i socket.io-client`, connect with `auth: { token }` against `VITE_SOCKET_URL`, `emit("join:project", projectId)`, and apply the four events to board state. The student app's `src/lib/socket.ts` is a working reference for the connection singleton.

## Attendance settings

`src/Pages/AttendanceSettings.tsx` edits the backend's **singleton** settings document (shift hours, late/early thresholds, `minHoursForPresent`, working days, timezone, allowed IPs, early check-in window). There is exactly one such document server-side — the UI is editing global config, not per-user rows. Changing it retroactively affects how the nightly absence cron classifies attendance.

## Environment

`VITE_APPNAME`, `VITE_API_URL`, `VITE_SOCKET_URL`.

**`.env`, `.env.development`, and `.env.production` are committed to git** — the `.gitignore` is the stock Vite template and doesn't exclude them. Never put a secret in them: they're both in the repo and, when `VITE_`-prefixed, inlined into the browser bundle. CI overwrites `.env.production` at build time anyway.

## Don't cross-copy with the student app

React 19 vs 18, antd v5 (+ React 19 patch) vs v6, that app has TanStack Query + sockets + PWA and this one has none of them, and the refresh endpoint differs (`/api/admin/…` here, `/api/user/…` there). Porting a component means adapting it.

## Deployment

Push to `main` → `.github/workflows/deploy.yml` builds in CI and SCPs `dist/` to `/var/www/banoqabil-ims/admin-frontend` on the VPS. `vercel.json` and `.vercel/` are leftovers from an earlier Vercel deploy.
