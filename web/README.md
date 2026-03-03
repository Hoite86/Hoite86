# CMMC/NIST 800-171 Self-Assessment MVP (Next.js)

## Features
- Firebase Auth (email/password + Google)
- Protected dashboard and assessment routes
- Assessment creation + response wizard over seeded controls
- Firestore persistence through server-side API routes only
- Live SPRS score calculation
- Cloud Run-ready Dockerfile

## Setup
1. Install deps:
   ```bash
   npm install
   ```
2. Copy env vars:
   ```bash
   cp .env.example .env.local
   ```
3. Fill in Firebase client + admin credentials.

## Run
```bash
npm run dev
```

## Build
```bash
npm run build
npm run start
```

## Cloud Run
```bash
gcloud run deploy cmmc-mvp --source . --region us-central1 --allow-unauthenticated
```

## API Endpoints
- `POST /api/assessments`
- `GET /api/assessments`
- `GET /api/assessments/[id]`
- `POST /api/assessments/[id]/responses`

Each endpoint validates request payloads with Zod and verifies Firebase ID tokens server-side.
