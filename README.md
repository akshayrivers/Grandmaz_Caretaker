# Grandma's Caretaker

Web app for adult family caretakers. It watches and configures the Android phone that runs [Grandma's Launcher](../sys-launcher). Grandma does not use this site. She cannot read, and the launcher on her phone is built around photos, colour, and the clock. A helper types a caretaker's email on that phone. The caretaker signs in here, on their own phone or computer, with Google.

This repository is the caretaker app. It is open source now. An installable app with push notifications, and any Play Store listing, come later.

The only images in this repo are the install icons, solid amber squares used by the web app manifest:

![Caretaker install icon, a solid amber square](public/icon-192.png)

## How the three repos fit

| Repo | Path from here | Role |
|---|---|---|
| Grandma's Launcher | `../sys-launcher` | Android launcher on grandma's phone |
| dadi's Backend | `../dadi's Backend` | API for devices, invitations, commands, snapshots, and help requests |
| Grandma's Caretaker | this repo | This web app |

The launcher registers the phone with the API. A helper on that phone enters a caretaker email. The API emails a link to `/accept-invitation?token=…`. The caretaker opens it here, signs in with the invited Google account, and types the pairing code. After that, this app reads snapshots and queues commands. The phone applies commands when it polls the API. This app does not talk to the phone directly.

## Prerequisites

- Node.js 24 and npm. The Docker image uses `node:24-alpine`.
- A Firebase project with Google sign-in enabled. The web app uses the Firebase Auth JavaScript SDK.
- The API from `../dadi's Backend`, usually `npm run dev` on port 3000.
- Grandma's Launcher on a phone, or another client that registers a device, if you want a real device in the list.

## Configure

```bash
cp .env.example .env
```

`.env` is gitignored. Do not commit it. These names are read by Vite and are public in the browser bundle. They are still not secrets to paste into git.

| Name | Purpose |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase web config |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase web config |
| `VITE_FIREBASE_PROJECT_ID` | Firebase web config |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase web config |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase web config |
| `VITE_FIREBASE_APP_ID` | Firebase web config |
| `VITE_API_BASE_URL` | API origin. `.env.example` uses `http://localhost:3000`. The code uses that same default when the variable is unset. |
| `VITE_LOCAL_FLOW` | Optional. Leave empty. Set to `1` only for the local sign-in described below. |

`VITE_*` values are baked in when the app is built or when the dev server starts. Changing `.env` means restarting `npm run dev`, or running `npm run build` again.

## Run

```bash
npm install
npm run dev         # http://localhost:5173
npm run typecheck   # react-router typegen && tsc
npm run build       # build/client and build/server
npm start           # serves the production build on port 3000
```

Use `npm run dev` next to the API. `npm start` also listens on port 3000, which is the API's default port.

Docker:

```bash
docker build -t dadis-caretaker .
docker run -p 3000:3000 dadis-caretaker
```

The Dockerfile does not pass `VITE_*` build arguments, and `.dockerignore` keeps `.env` out of the image. A container built that way will not have your Firebase config. Export the `VITE_*` variables in the environment you use for `npm run build` when you need a working production bundle.

### Local sign-in without Google

For day-to-day use, sign in with Google. If you start the dev server with `VITE_LOCAL_FLOW=1`, the home page shows **Continue on this laptop** instead. That path exists only in development (`import.meta.env.DEV`). It does not replace Google on `/accept-invitation`. The API must be running in its own non-production local mode or the sign-in will fail. Do not set `VITE_LOCAL_FLOW` for a shared or production build.

## What you can do

Sign-in is Firebase Authentication with a Google popup. The dashboard stays behind that sign-in. Viewers can look. Sending commands, saving home setup, resolving help, and acknowledging SOS require the primary caretaker or a caretaker role. The phone's caretaker PIN is not shown or reset here.

- **Devices** (`/dashboard`). Phones linked to you, with battery, Wi-Fi, and last active time.
- **Device** (`/dashboard/device/:deviceId`). Latest snapshot: battery, Wi-Fi, and free storage. A primary caretaker can invite another caretaker or a viewer, see pending invitations, hand over the primary role, or remove someone. The Assistant tab saves the Gemini model id (`voice.model`, default `gemini-3.8-flash`). The phone's Ask screen uses that id with a short-lived token from the API. This site never sees the Gemini key, her recording, or the token. Help on this page can be marked in progress, resolved, or cancelled.
- **Commands** (`/dashboard/commands`). Queue ring phone, sync now, report location, show a message, set volume, or set an emergency number. The list shows pending, running, completed, failed, expired, and cancelled.
- **Help requests** (`/dashboard/help`). General, SOS, medical, and tech-support requests from the phone, with the same resolve actions when your role allows them.
- **SOS** (`/dashboard/sos`). Loads alerts for the selected phone and refreshes every 15 seconds. An alert with coordinates has a map link. **I have this** acknowledges the alert. The screen says that acknowledgement does not hang up grandma's call.
- **Home setup** (`/dashboard/home-setup`). Who SOS calls, an option to text a map link if the alert cannot be sent, weather city, up to four people pinned on the home screen, phone numbers and a WhatsApp flag, medicine reminders and the taken log, a recorded or uploaded name clip, and a four-second home-button clip. Saves are versioned. A conflict asks you to reload.
- **Audit logs** (`/dashboard/audit`). Actions recorded for your devices. The page does not show IP addresses.
- **Profile** (`/dashboard/profile`). Your name and phone number in international format. The profile copy says grandma's phone uses this number during SOS.
- **Invitation** (`/accept-invitation?token=…`). Preview, Google sign-in as the invited email, and a 6-digit pairing code.

## Not in this repo yet

- **Web push.** `public/sw.js` is registered from `app/lib/pwa.ts`. Nothing in the app subscribes to push, and there is no VAPID key handling. Closing the browser means you will not be told about a new SOS. The SOS page only updates while it is open.
- **Offline app.** The service worker caches `/` and, if a GET fails, answers with that cache. Dashboard data is not stored for offline use.
- **Live screen viewing.** No WebRTC or remote-control screen in this app.
- **Contact photos.** Home setup can store a photo id, and new people are saved without one. The screen uploads audio clips, not photos.
- **A few API methods have no screen:** cancel a pending invitation, rename the phone, change a role without transferring primary, and read snapshot history. The device page shows the latest snapshot only, not installed apps.
- **Tests.** `npm run typecheck` is the automated check. There is no test runner.
- **Store listing.** This is a website with a manifest (`public/manifest.webmanifest`, standalone, amber theme `#B7651D`). It is not a Play Store app, and push is not part of the install path.

## License

[MIT](LICENSE). Copyright (c) 2026 vinod akshat.
