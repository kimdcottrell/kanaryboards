#!/usr/bin/env bash

set -euo pipefail

CLAUDE_JSON="$HOME/.claude.json"
TMP_FILE="/tmp/.claude.json.tmp"

if [[ "${DEVCONTAINER:-}" != "true" ]]; then
  echo "Skipping: DEVCONTAINER is not set to true."
  exit 0
fi

if [[ ! -f "$CLAUDE_JSON" ]]; then
  echo "Error: $CLAUDE_JSON not found." >&2
  exit 1
fi

jq 'if has("hasCompletedOnboarding") then . else . + {"hasCompletedOnboarding": true} end' \
  "$CLAUDE_JSON" > "$TMP_FILE"

mv "$TMP_FILE" "$CLAUDE_JSON"

echo "Done. 'hasCompletedOnboarding' ensured in $CLAUDE_JSON."