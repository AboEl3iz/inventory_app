#!/bin/sh
# =============================================================================
# generate-sonar-token.sh
# Runs inside the sonar-init container AFTER SonarQube is healthy.
# Actions:
#   1. Change default admin password
#   2. Create the inventory-app project
#   3. Generate a CI user token  → writes to /sonar-token/token.txt
#   4. Write status flag         → /sonar-token/ready
# =============================================================================
set -e

TOKEN_FILE="/sonar-token/token.txt"
READY_FLAG="/sonar-token/ready"

# Idempotent: skip if already generated
if [ -f "$READY_FLAG" ]; then
  echo "✅  SonarQube token already exists — skipping generation."
  exit 0
fi

echo "🔧  SonarQube Init — starting..."
echo "    URL: ${SONAR_URL}"

# ── 1. Change admin password ───────────────────────────────────────────────
echo "🔑  Changing default admin password..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "${SONAR_URL}/api/users/change_password" \
  -u "admin:admin" \
  -d "login=admin&previousPassword=admin&password=${SONAR_ADMIN_PASSWORD}")

if [ "$HTTP_STATUS" = "204" ] || [ "$HTTP_STATUS" = "200" ]; then
  echo "    ✓ Password changed successfully."
else
  echo "    ⚠ Password change returned HTTP ${HTTP_STATUS} — may already be changed, continuing..."
fi

# ── 2. Create project ─────────────────────────────────────────────────────
echo "📁  Creating SonarQube project: ${SONAR_PROJECT_KEY}..."
curl -s -o /dev/null \
  -X POST "${SONAR_URL}/api/projects/create" \
  -u "admin:${SONAR_ADMIN_PASSWORD}" \
  -d "project=${SONAR_PROJECT_KEY}&name=${SONAR_PROJECT_NAME}" || true

# ── 3. Revoke any existing token with same name (idempotent) ──────────────
echo "🗑   Revoking old token 'jenkins-ci' (if exists)..."
curl -s -o /dev/null \
  -X POST "${SONAR_URL}/api/user_tokens/revoke" \
  -u "admin:${SONAR_ADMIN_PASSWORD}" \
  -d "login=admin&name=jenkins-ci" || true

# ── 4. Generate new token ──────────────────────────────────────────────────
echo "🎟   Generating new CI token..."
RESPONSE=$(curl -s \
  -X POST "${SONAR_URL}/api/user_tokens/generate" \
  -u "admin:${SONAR_ADMIN_PASSWORD}" \
  -d "login=admin&name=jenkins-ci&type=USER_TOKEN")

TOKEN=$(echo "$RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌  Failed to extract token from response:"
  echo "    $RESPONSE"
  exit 1
fi

# ── 5. Write token to shared volume ───────────────────────────────────────
echo "$TOKEN" > "$TOKEN_FILE"
chmod 640 "$TOKEN_FILE"
touch "$READY_FLAG"

echo ""
echo "✅  SonarQube token generated and saved to ${TOKEN_FILE}"
echo "    Token (first 8 chars): ${TOKEN%${TOKEN#????????}}..."
echo ""
