#!/usr/bin/env bash
# Stop hook: if code files changed this session but nothing under docs/ did,
# and the project uses doc-assistant's layout (docs/INDEX.md exists), remind
# Claude once to consider /docs-update. Fail-safe: exit 0 on any anomaly.
set -u
input=$(cat 2>/dev/null) || exit 0

if command -v jq >/dev/null 2>&1; then
  session_id=$(printf '%s' "$input" | jq -r '.session_id // empty' 2>/dev/null)
  stop_active=$(printf '%s' "$input" | jq -r '.stop_hook_active // false' 2>/dev/null)
else
  session_id=$(printf '%s' "$input" | sed -n 's/.*"session_id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1)
  case "$input" in
    *'"stop_hook_active"'*'true'*) stop_active=true ;;
    *) stop_active=false ;;
  esac
fi

session_id=$(printf '%s' "${session_id:-}" | tr -cd 'A-Za-z0-9._-')

[ "${stop_active:-false}" = "true" ] && exit 0
[ -n "${session_id:-}" ] || exit 0
state_file="${TMPDIR:-/tmp}/claude-doc-assistant/$session_id.edits"
[ -f "$state_file" ] || exit 0

# Only projects that opted into the docs layout get reminders.
if [ ! -f "docs/INDEX.md" ]; then
  rm -f "$state_file"
  exit 0
fi

code_touched=false
docs_touched=false
while IFS= read -r f; do
  [ -n "$f" ] || continue
  case "$f" in
    docs/*|*/docs/*) docs_touched=true ;;
    *.md|*.markdown) : ;;            # plain markdown (READMEs etc.) is neither
    *) code_touched=true ;;
  esac
done < "$state_file"
rm -f "$state_file"

if [ "$code_touched" = "true" ] && [ "$docs_touched" = "false" ]; then
  printf '%s\n' '{"decision": "block", "reason": "doc-assistant: code files were modified this session but nothing under docs/ was updated. If the changes affect documented behavior, update the relevant docs/ pages and their docs/INDEX.md lines (or run /docs-update). If documentation is unaffected, simply finish — do not invent doc changes."}'
fi
exit 0
