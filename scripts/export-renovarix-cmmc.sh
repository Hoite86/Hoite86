#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_DIR="$PROJECT_ROOT/web"
OUTPUT_DIR="${1:-$PROJECT_ROOT/dist}"
ARCHIVE_NAME="Renovarix-CMMC.tar.gz"

if [[ ! -d "$SOURCE_DIR" ]]; then
  echo "Expected source directory '$SOURCE_DIR' not found." >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR"
rm -f "$OUTPUT_DIR/$ARCHIVE_NAME"

tar \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='.env.local' \
  -czf "$OUTPUT_DIR/$ARCHIVE_NAME" \
  -C "$PROJECT_ROOT" web

echo "Created archive: $OUTPUT_DIR/$ARCHIVE_NAME"
echo "Upload/download this archive, then run:"
echo "  tar -xzf $ARCHIVE_NAME"
echo "  cd web"
echo "  gcloud run deploy cmmc-mvp --source . --region us-central1 --allow-unauthenticated"
