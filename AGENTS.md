# AGENTS.md — Dadi's Caretaker (caretaker web app → PWA)

Guidance for AI coding agents working in this repo. For React Router specifics, also read
`.agents/skills/react-router/SKILL.md` (this app is **Framework mode**, `ssr: true`).

## System overview (shared across all three repos)

One product, three sibling repos. The user is a Dogri/Hindi-speaking grandmother who cannot read,
has low vision and a hand tremor. Family caretakers configure and watch her phone remotely.

| Repo | Path (from any repo root) | Role |
|---|---|---|
| sys-launcher | `../sys-launcher` | Android launcher (Kotlin, XML Views) on grandma's phone |
| dadi's Backend | `../dadi's Backend` | Fastify + Postgres API: devices, caretaker links, commands, snapshots, help requests |
| Dadi's Caretaker | `../Dadi's Caretaker` | Caretaker web app (React Router SSR); must become an installable PWA with push |

Core flows (all under `/api`):
1. **Device registration** — launcher creates an RSA-2048 key pair, `POST devices/register`
   `{deviceId, publicKey, deviceMetadata}` → gets `challenge` (fallback `POST devices/challenge`) →
   signs it SHA256withRSA, base64 → `POST devices/verify-signature`.
2. **Caretaker linking** — on grandma's phone a helper enters only the caretaker's email →
   `POST invitations` → backend emails a magic link to `CARETAKER_WEB_URL/accept-invitation?token=…`
   → caretaker signs in with Firebase on *their own* device → `POST auth/accept-invitation` creates a
   `device_caretakers` row. Pending invitations are also auto-accepted on `auth/verify` / `GET devices`.
3. **Commands** — caretaker `POST commands` → `tasks` row (`pending`) → launcher polls
   `GET commands/device/:deviceId?status=pending` → executes → `PATCH commands/:id/status`
   (`running` → `completed`/`failed`, with `result`).
4. **Snapshots** — launcher `POST shared-state/snapshot` (battery, wifi, storage, apps, settings);
   caretaker reads `shared-state/device/:id/latest|history`.
5. **Help requests** — launcher `POST help-requests` `{deviceId, title, type: general|sos|medical|tech_support}`;
   caretaker lists and resolves them.

API contract rule: when an endpoint changes, update the backend, the launcher (`remote/*Repository`,
`network/ApiClient.kt`) and the caretaker app (`app/lib/api.ts`, `app/lib/types.ts`) in the same change.
Known mismatch: device requests use camelCase; backend rows are snake_case and some services return
both (`deviceId` + `device_id`, `isVerified` + `is_verified`). Don't add more dual-key responses — pick
camelCase for new fields and convert old ones deliberately across all three repos.

## Stack & commands

React Router v8 (Framework mode, SSR via `@react-router/serve`), React 19, Vite 8, Tailwind CSS 4
(`@tailwindcss/vite`, `@theme` in `app/app.css`), Firebase web SDK 12 (Auth), `lucide-react` icons,
TypeScript strict with `~/*` → `app/*`. No test runner and no ESLint/Prettier configured.

```bash
npm run dev         # react-router dev → http://localhost:5173 (matches backend CARETAKER_WEB_URL default)
npm run build       # react-router build → build/client + build/server
npm start           # react-router-serve ./build/server/index.js
npm run typecheck   # react-router typegen && tsc   ← the only automated check; run it
docker build -t dadis-caretaker . && docker run -p 3000:3000 dadis-caretaker
```

Env vars (`.env.example`; Vite exposes only `VITE_*` to the client — never put server secrets here):
`VITE_FIREBASE_API_KEY VITE_FIREBASE_AUTH_DOMAIN VITE_FIREBASE_PROJECT_ID VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID VITE_FIREBASE_APP_ID VITE_API_BASE_URL` (defaults to `http://localhost:3000`).
Run the backend from `../dadi's Backend` with `npm run dev`.

## Architecture map (`app/`)

| Path | Responsibility |
|---|---|
| `root.tsx` | Document shell, `links`, `ErrorBoundary`, wraps app in `AuthProvider` |
| `routes.ts` | Route config: `/`, `/accept-invitation`, `/dashboard` (+ index, `device/:deviceId`, `commands`, `help`, `audit`) |
| `routes/home.tsx` | Landing + Google sign-in |
| `routes/accept-invitation.tsx` | Reads `?token=`, previews invitation, signs in, calls `api.acceptInvitation` |
| `routes/dashboard.tsx` | Auth guard layout (redirects to `/` when signed out) + `Sidebar` + `<Outlet/>` |
| `routes/dashboard.*.tsx` | Feature pages: devices overview, device detail (state, caretakers), commands, help requests, audit |
| `contexts/auth.tsx` | `AuthProvider`/`useAuth`: Firebase user, backend `user`, `idToken`, sign-in/out |
| `lib/api.ts` | `request<T>()` fetch wrapper + `api` object (one method per backend endpoint); unwraps `{success, data}`; throws `ApiError(status)` |
| `lib/types.ts` | Hand-written response types mirroring backend rows |
| `lib/firebase.ts` | Firebase app/auth singleton from `VITE_FIREBASE_*` |
| `components/` | `sidebar`, `status-badge`, `loading-spinner` |

## Code conventions

- Route modules are default-exported page components under `app/routes/`, named with dot segments
  (`dashboard.device.tsx`) and registered explicitly in `app/routes.ts`.
- Data is fetched client-side: `const { idToken } = useAuth()` + `useEffect` → `api.xxx(idToken, …)`,
  with local `loading`/error state and `LoadingSpinner`. Follow this until the app moves to
  `clientLoader`/`clientAction` deliberately — don't mix patterns within one page.
- All HTTP goes through `lib/api.ts`; add a typed method there (and a type in `lib/types.ts`) instead
  of calling `fetch` in components. Pass `idToken` explicitly.
- Firebase is browser-only; never call it from server code paths during SSR.
- Styling: Tailwind utility classes inline, `dark:` variants, gray palette, `lucide-react` icons.
  Components are small function components in kebab-case files with named exports.
- Imports via `~/…`; use `import type` for types (`verbatimModuleSyntax`).

## Product / UX rules (summary)

The caretaker is literate; grandma is not. This app manages *her* phone, so it must respect the
launcher's binding rules (full list in `../sys-launcher/AGENTS.md`):
- Launcher colour meanings: red = SOS only, blue = call, green = WhatsApp/yes, amber = caretaker,
  bg `#F7F3EE`. In this app reserve red for SOS/urgent states so alerts stay unmistakable.
- **SOS** alerts reach *all* caretakers with grandma's live location; the primary caretaker also gets
  an immediate phone call from the launcher (an SOS cancel only stops alerts, never the call). SOS must
  be prominent, push-notified and one tap to act on (open map / call back).
- **Primary caretaker:** the first to link is primary; only the primary can transfer the role
  (UI for "make primary"). Exactly one primary per device — show who it is.
- **Caretaker PIN:** never offer a PIN reset/view here; it can only be reset on grandma's phone.
- **Remote access model:** edits go to the server's versioned per-device config document and command
  queue; the device applies them when it wakes (FCM) or comes online. Show pending/applied/failed
  state and the audit trail; handle version conflicts. Live screen viewing via WebRTC comes later
  (server only signals + TURN); full remote control is deferred.
- **Remote management** to build: edit contacts (photos, multiple numbers, which 4 show on Home),
  record/re-record custom voice clips per button (Hindi TTS primary, English fallback), emergency
  number, settings — via commands/shared state.
- **Linking:** the caretaker signs in here on their own device; grandma's phone only ever knows the
  caretaker email. Don't design flows that need sign-in on grandma's phone.
- **PWA (required):** web app manifest, service worker, installability, offline shell, and
  push notifications (FCM web push) for help/SOS requests. Mobile-first layouts; caretakers are on
  Android and iPhone.
- **Budget:** near-zero, open source — prefer free tiers and self-hostable pieces. Hosting isn't
  chosen: keep the API URL in `VITE_API_BASE_URL` and avoid provider-specific APIs in app code.
- **Gemini:** any AI features call the backend for short-lived ephemeral tokens.

## Security rules

- Never commit `.env`; only `VITE_*` public Firebase config belongs in the client.
- **Never put an API key in the bundle** (no `VITE_GEMINI_*` or similar) — every `VITE_*` value is public.
- Always send a fresh Firebase ID token (`getIdToken()` refreshes automatically) — don't cache a token
  string for the session.
- Don't trust client-side checks for access: the backend must authorize every device-scoped call;
  the UI must still handle 401/403 gracefully (sign out or show "no access").
- Don't log tokens, emails, phone numbers or locations to the console.

## Known issues / current state (to be fixed — do not copy these patterns)

- `contexts/auth.tsx` stores `idToken` once in state and never refreshes it; after ~1 hour all API
  calls 401. Fix by calling `firebaseUser.getIdToken()` per request or using `onIdTokenChanged`.
- Not a PWA yet: no manifest, service worker or push.
- `lib/types.ts` mixes snake_case row types with camelCase `DeviceWithState` (mirrors backend mismatch).
- Backend authorization is missing, so the UI currently "works" for devices the user isn't linked to.
- No primary-transfer UI yet (`api.updateCaretakerRole` exists but is unused); the backend currently
  makes every linked caretaker primary.
- README is the create-react-router template; no tests exist.

## Workflow rules

- Small, focused changes; one concern per change.
- Before finishing: `npm run typecheck` must pass; run `npm run build` for routing/SSR changes.
- Cross-repo API changes ship together (see System overview).
- Git commits must never include `Co-authored-by` trailers for Cursor / Cursor Agent; author as the user only.
