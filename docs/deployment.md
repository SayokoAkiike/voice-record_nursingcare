# Deployment guide

This prototype is split into two repositories.

- `voice-record_nursingcare`: React/Vite frontend for voice/text input and the nursing record UI.
- `nurse-intake-assistant`: FastAPI backend for SOAP draft generation, structured extraction, follow-up questions, and urgency support.

## Option A: quick external demo

Use this when you want to show the UI safely before the backend is deployed.

### Vercel project

Deploy this repository (`voice-record_nursingcare`) to Vercel.

Build settings:

- Framework Preset: Vite
- Build Command: `npm run build`
- Output Directory: `dist`

Environment variables:

```env
VITE_DEMO_MODE=true
VITE_API_BASE_URL=http://localhost:8000
VITE_APP_API_KEY=change-me-for-demo
```

In this mode, clicking `AIで整理する` returns sample SOAP/structured output without calling the backend.

## Option B: connected mode

Use this when the FastAPI backend is deployed.

### Backend

Deploy `nurse-intake-assistant` to Render, Railway, Fly.io, or another Python web hosting service.

Recommended start command:

```bash
uvicorn app.api.main:app --host 0.0.0.0 --port $PORT
```

Backend environment variables:

```env
APP_API_KEY=<same value as VITE_APP_API_KEY>
OPENAI_API_KEY=<your OpenAI API key>
ALLOWED_ORIGINS=https://your-vercel-app.vercel.app,http://localhost:5173
ALLOWED_METHODS=GET,POST,OPTIONS
ALLOWED_HEADERS=Content-Type,X-App-API-Key
```

### Frontend

Set these Vercel environment variables:

```env
VITE_DEMO_MODE=false
VITE_API_BASE_URL=https://your-backend-url.example.com
VITE_APP_API_KEY=<same value as APP_API_KEY>
```

Then redeploy the Vercel project.

## Notes

- Do not enter real patient information in this prototype.
- `VITE_APP_API_KEY` is included in the browser bundle, so it is not a secure secret. Treat it as a lightweight demo gate only.
- For real clinical use, add authentication, authorization, audit logs, encryption, and institutional review.
