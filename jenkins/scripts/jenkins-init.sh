#!/bin/bash
# =============================================================================
# jenkins-init.sh — Jenkins custom entrypoint
# Waits for the SonarQube token to be available (written by sonar-init),
# exports it as SONAR_TOKEN so JCasC can reference ${SONAR_TOKEN},
# then hands off to the official Jenkins entrypoint.
# =============================================================================
set -e

TOKEN_FILE="/sonar-token/token.txt"
TIMEOUT=300   # seconds
ELAPSED=0

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║          DevSecOps Jenkins — Starting Up                    ║"
echo "╚══════════════════════════════════════════════════════════════╝"

# ── Wait for SonarQube token ──────────────────────────────────────────────
echo "⏳  Waiting for SonarQube token at ${TOKEN_FILE}..."

while [ ! -f "$TOKEN_FILE" ] || [ ! -s "$TOKEN_FILE" ]; do
  if [ "$ELAPSED" -ge "$TIMEOUT" ]; then
    echo "❌  Timed out waiting for SonarQube token after ${TIMEOUT}s"
    echo "    Check sonar-init container logs: docker logs sonar-init"
    exit 1
  fi
  sleep 10
  ELAPSED=$((ELAPSED + 10))
  echo "   ...${ELAPSED}s elapsed"
done

export SONAR_TOKEN
SONAR_TOKEN=$(cat "$TOKEN_FILE")
echo "✅  SonarQube token loaded (${#SONAR_TOKEN} chars)"

# ── Hand off to official Jenkins entrypoint ───────────────────────────────
echo "🚀  Starting Jenkins..."
exec /usr/bin/tini -- /usr/local/bin/jenkins.sh "$@"
