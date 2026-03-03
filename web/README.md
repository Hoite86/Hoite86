# CMMC/NIST 800-171 Self-Assessment MVP (Next.js)

## Features
- Firebase Auth (email/password + Google)
- Assessment creation + response wizard over seeded controls
- Firestore persistence through server-side API routes only
- Live SPRS score calculation
- Zod validation + Firebase ID token verification on API routes
- Basic in-memory per-user throttling for response upserts
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

## Security and hardening notes
- API auth uses Firebase ID tokens in the `Authorization: Bearer <token>` header.
- API client requests use `credentials: "omit"`, preventing cookie-based CSRF paths.
- Firestore rules enforce ownership and validate key fields/types for `/users`, `/assessments`, and `/responses`.
- App-level throttling is enabled for response upserts (`30` writes/minute/user in-memory).
- For production scale, move rate limits to shared storage (Redis/Memorystore) so limits apply across Cloud Run instances.
