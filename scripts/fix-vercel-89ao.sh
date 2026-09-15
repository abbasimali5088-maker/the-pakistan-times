#!/usr/bin/env bash
# Wire Prisma DB env onto the-pakistan-times-89ao and redeploy.
# Requires: VERCEL_TOKEN (https://vercel.com/account/tokens)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -z "${VERCEL_TOKEN:-}" ]]; then
  echo "ERROR: VERCEL_TOKEN missing. Create one at https://vercel.com/account/tokens"
  exit 1
fi

if [[ -f .env.vercel.local ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.vercel.local
  set +a
fi

: "${DATABASE_URL:?DATABASE_URL required}"
: "${DIRECT_DATABASE_URL:?DIRECT_DATABASE_URL required}"
: "${JWT_SECRET:?JWT_SECRET required}"

PROJECT_NAME="${VERCEL_PROJECT_NAME:-the-pakistan-times-89ao}"
SITE_URL="${NEXT_PUBLIC_SITE_URL_OVERRIDE:-https://the-pakistan-times-89ao.vercel.app}"

echo "Looking up project: $PROJECT_NAME"
PROJECT_JSON="$(curl -sS -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v9/projects/${PROJECT_NAME}")"
PROJECT_ID="$(python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("id") or "")' <<<"$PROJECT_JSON")"
if [[ -z "$PROJECT_ID" ]]; then
  echo "Could not find project. API said:"
  echo "$PROJECT_JSON" | head -c 500
  exit 1
fi
echo "Project ID: $PROJECT_ID"

upsert_env() {
  local key="$1" value="$2"
  echo "Setting $key ..."
  # Remove existing
  local envs
  envs="$(curl -sS -H "Authorization: Bearer $VERCEL_TOKEN" \
    "https://api.vercel.com/v9/projects/${PROJECT_ID}/env")"
  python3 - "$key" "$envs" <<'PY' | while read -r eid; do
import json,sys
key=sys.argv[1]
data=json.loads(sys.argv[2])
for e in data.get("envs",[]):
  if e.get("key")==key:
    print(e["id"])
PY
    [[ -n "$eid" ]] || continue
    curl -sS -X DELETE -H "Authorization: Bearer $VERCEL_TOKEN" \
      "https://api.vercel.com/v9/projects/${PROJECT_ID}/env/${eid}" >/dev/null || true
  done

  curl -sS -X POST -H "Authorization: Bearer $VERCEL_TOKEN" \
    -H "Content-Type: application/json" \
    "https://api.vercel.com/v10/projects/${PROJECT_ID}/env" \
    -d "$(python3 -c "import json; print(json.dumps({'key':'''$key''','value':'''$value''','type':'encrypted','target':['production','preview','development']}))")" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print('  ->', d.get('key') or d.get('error') or d)"
}

upsert_env DATABASE_URL "$DATABASE_URL"
upsert_env DIRECT_DATABASE_URL "$DIRECT_DATABASE_URL"
upsert_env JWT_SECRET "$JWT_SECRET"
upsert_env NEXT_PUBLIC_SITE_URL "$SITE_URL"
upsert_env NEXT_PUBLIC_API_BASE "/api"

echo "Triggering redeploy..."
npx vercel --token "$VERCEL_TOKEN" pull --yes --environment=production --project "$PROJECT_NAME" 2>/dev/null || true
DEPLOY_OUT="$(npx vercel --token "$VERCEL_TOKEN" deploy --prod --yes --force \
  -e "DATABASE_URL=$DATABASE_URL" \
  -e "DIRECT_DATABASE_URL=$DIRECT_DATABASE_URL" \
  -e "JWT_SECRET=$JWT_SECRET" \
  -e "NEXT_PUBLIC_SITE_URL=$SITE_URL" \
  -e "NEXT_PUBLIC_API_BASE=/api" \
  --project "$PROJECT_NAME" 2>&1)" || true
echo "$DEPLOY_OUT" | tail -40

echo "Waiting for health..."
for i in 1 2 3 4 5 6 7 8 9 10; do
  body="$(curl -sS -m 20 "https://the-pakistan-times-89ao.vercel.app/api/health" || true)"
  echo "  try $i: $body" | head -c 200; echo
  echo "$body" | grep -q '"database":"up"' && { echo "SUCCESS: database up"; exit 0; }
  sleep 8
done
echo "Deploy finished but health not up yet — check Vercel dashboard."
exit 1
