#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="${SERVICE_NAME:-cmmc-mvp}"
REGION="${REGION:-us-central1}"

if ! command -v gcloud >/dev/null 2>&1; then
  echo "gcloud CLI is required." >&2
  exit 1
fi

if [[ -z "${GOOGLE_CLOUD_PROJECT:-}" ]]; then
  echo "Set GOOGLE_CLOUD_PROJECT before running (or run: gcloud config set project <id>)." >&2
  exit 1
fi

echo "Deploying ${SERVICE_NAME} to project ${GOOGLE_CLOUD_PROJECT} (${REGION}) from source..."
gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --region "$REGION" \
  --allow-unauthenticated
