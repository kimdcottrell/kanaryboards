#!/usr/bin/env bash

required=$(jq -r '.enabledPlugins | to_entries[] | select(.value) | .key' .claude/settings.json 2>/dev/null)

if [ -z "$required" ]; then
  echo "No plugins required by this project."
  exit 0
fi

check_plugins() {
  local installed
  installed=$(claude plugins list --json 2>/dev/null)

  local missing=()
  local disabled=()

  while IFS= read -r plugin; do
    status=$(echo "$installed" | jq -r --arg p "$plugin" '.[] | select(.name == $p) | .status' 2>/dev/null)

    if [ -z "$status" ]; then
      missing+=("$plugin")
    elif [ "$status" != "enabled" ]; then
      disabled+=("$plugin")
    fi
  done <<< "$required"

  echo "missing=${missing[*]}"
  echo "disabled=${disabled[*]}"
}

# First pass
eval "$(check_plugins)"

# Fix missing — install and enable
for plugin in $missing; do
  echo "📦 Installing $plugin..."
  claude plugins install "$plugin"
  echo "✅ Enabling $plugin..."
  claude plugins enable "$plugin"
done

# Fix disabled — enable only
for plugin in $disabled; do
  echo "⚡ Enabling $plugin..."
  claude plugins enable "$plugin"
done

# Second pass — verify fixes worked
if [ -n "$missing" ] || [ -n "$disabled" ]; then
  echo "🔄 Re-checking plugins..."
  eval "$(check_plugins)"

  errors=false

  for plugin in $missing; do
    echo "❌ ERROR: '$plugin' could not be installed or enabled." >&2
    errors=true
  done

  for plugin in $disabled; do
    echo "❌ ERROR: '$plugin' could not be enabled." >&2
    errors=true
  done

  if $errors; then
    exit 1
  fi
fi

echo "✅ All required plugins are installed and enabled."