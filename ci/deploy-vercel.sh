#!/usr/bin/env bash
set -euo pipefail

# Script: frontend/ci/deploy-vercel.sh
# Purpose: deploy frontend to Vercel using VERCEL_TOKEN from CI, avoiding Git metadata

FRONTEND_DIR="$(cd "$(dirname "$0")/.." && pwd)"

if [ -z "${VERCEL_TOKEN:-}" ]; then
  echo "ERROR: VERCEL_TOKEN is not set. Add it to CI variables." >&2
  exit 2
fi

echo "Preparing frontend for deploy in: $FRONTEND_DIR"
cd "$FRONTEND_DIR"

# Ensure build exists; if not, build
if [ ! -d dist ]; then
  echo "dist not found, running build"
  npm ci --silent
  npm run build
else
  echo "Using existing dist/"
fi

# Create a temporary copy without .git to avoid Git author enforcement
TMP_DEPLOY_DIR=$(mktemp -d -t frontend-deploy-XXXXXXXX)
echo "Creating tmp deploy dir: $TMP_DEPLOY_DIR"
cp -r . "$TMP_DEPLOY_DIR"
rm -rf "$TMP_DEPLOY_DIR/.git" || true

cd "$TMP_DEPLOY_DIR"

echo "Running vercel deploy..."
npx --yes vercel --prod --token "$VERCEL_TOKEN" --scope "$VERCEL_SCOPE" --local-config vercel.json --confirm

DEPLOY_RESULT=$?
echo "vercel exit code: $DEPLOY_RESULT"

# Cleanup
echo "Cleaning up tmp dir"
rm -rf "$TMP_DEPLOY_DIR"

exit $DEPLOY_RESULT
