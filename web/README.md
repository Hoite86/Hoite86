# CMMC/NIST 800-171 Self-Assessment MVP (Next.js)

## Features
- Firebase Auth (email/password + Google)
- Assessment creation + response wizard over seeded controls with domain sidebar navigation
- Firestore persistence through server-side API routes only
- Live SPRS score calculation
- Zod validation + Firebase ID token verification on API routes
- Basic in-memory per-user throttling for response upserts
- Lightweight server-side module caching for controls and assessment detail reads
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

## Deploy: Firebase Hosting front door + Cloud Run backend

1. Build and deploy the Next.js container to Cloud Run:
```bash
gcloud builds submit --tag gcr.io/$GOOGLE_CLOUD_PROJECT/cmmc-mvp
gcloud run deploy cmmc-mvp \
  --image gcr.io/$GOOGLE_CLOUD_PROJECT/cmmc-mvp \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080
```

2. Capture the Cloud Run URL (for validation):
```bash
gcloud run services describe cmmc-mvp --region us-central1 --format='value(status.url)'
```

3. Configure Firebase Hosting rewrite in `firebase.json` to this Cloud Run service (`serviceId: cmmc-mvp`, `region: us-central1`).

4. Deploy Hosting front door:
```bash
firebase deploy --only hosting
```

> Note: Firebase Hosting rewrites to Cloud Run using `serviceId` + `region` rather than a raw URL.

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
