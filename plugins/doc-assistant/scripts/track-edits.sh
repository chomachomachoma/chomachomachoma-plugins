#!/usr/bin/env bash
# PostToolUse hook: record files edited this session so the Stop hook can
# detect documentation drift. Must never fail or block the session.
set -u
input=$(cat 2>/dev/null) || exit 0

if command -v jq >/dev/null 2>&1; then
  session_id=$(printf '%s' "$input" | jq -r '.session_id // empty' 2>/dev/null)
  file_path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty' 2>/dev/null)
else
  session_id=$(printf '%s' "$input" | sed -n 's/.*"session_id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1)
  file_path=$(printf '%s' "$input" | sed -n 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1)
fi

session_id=$(printf '%s' "${session_id:-}" | tr -cd 'A-Za-z0-9._-')

[ -n "${session_id:-}" ] && [ -n "${file_path:-}" ] || exit 0
state_dir="${TMPDIR:-/tmp}/claude-doc-assistant"
mkdir -p "$state_dir" 2>/dev/null || exit 0
printf '%s\n' "$file_path" >> "$state_dir/$session_id.edits" 2>/dev/null
exit 0
