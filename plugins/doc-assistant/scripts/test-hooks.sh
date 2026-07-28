#!/usr/bin/env bash
# Test harness for doc-assistant hook scripts. Run from any directory.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
export TMPDIR="$(mktemp -d)"
work="$(mktemp -d)"
pass=0; fail=0
check() { # name expected actual
  if [ "$2" = "$3" ]; then pass=$((pass+1)); else fail=$((fail+1)); echo "FAIL: $1 (expected [$2] got [$3])"; fi
}

# 1. track-edits records the edited file per session
echo '{"session_id":"s1","tool_input":{"file_path":"/p/src/thing.php"}}' | bash "$here/track-edits.sh"
check "track records path" "/p/src/thing.php" "$(cat "$TMPDIR/claude-doc-assistant/s1.edits" 2>/dev/null)"

# 2. track-edits ignores malformed input silently
echo 'not json' | bash "$here/track-edits.sh"
check "track malformed exit" "0" "$?"

# 3. drift fires when code edited, docs untouched, docs/INDEX.md exists
mkdir -p "$work/docs" && echo idx > "$work/docs/INDEX.md"
out=$(cd "$work" && echo '{"session_id":"s1","stop_hook_active":false}' | bash "$here/check-docs-drift.sh")
case "$out" in *'"decision"'*'/docs-update'*) r=yes;; *) r=no;; esac
check "drift fires" "yes" "$r"
check "state cleared after fire" "no" "$([ -f "$TMPDIR/claude-doc-assistant/s1.edits" ] && echo yes || echo no)"

# 4. no repeat: second stop with no state is silent
out=$(cd "$work" && echo '{"session_id":"s1","stop_hook_active":false}' | bash "$here/check-docs-drift.sh")
check "no state -> silent" "" "$out"

# 5. docs edits alongside code -> silent
printf '%s\n' "/p/src/a.php" "/p/docs/a.md" > "$TMPDIR/claude-doc-assistant/s2.edits"
out=$(cd "$work" && echo '{"session_id":"s2","stop_hook_active":false}' | bash "$here/check-docs-drift.sh")
check "docs touched -> silent" "" "$out"

# 6. stop_hook_active guard
printf '%s\n' "/p/src/a.php" > "$TMPDIR/claude-doc-assistant/s3.edits"
out=$(cd "$work" && echo '{"session_id":"s3","stop_hook_active":true}' | bash "$here/check-docs-drift.sh")
check "loop guard silent" "" "$out"

# 7. no docs/INDEX.md -> silent, state cleared
nodocs="$(mktemp -d)"
printf '%s\n' "/p/src/a.php" > "$TMPDIR/claude-doc-assistant/s4.edits"
out=$(cd "$nodocs" && echo '{"session_id":"s4","stop_hook_active":false}' | bash "$here/check-docs-drift.sh")
check "no index -> silent" "" "$out"
check "no index -> state cleared" "no" "$([ -f "$TMPDIR/claude-doc-assistant/s4.edits" ] && echo yes || echo no)"

# 8. markdown-only edits (e.g. README) -> silent
printf '%s\n' "/p/README.md" > "$TMPDIR/claude-doc-assistant/s5.edits"
out=$(cd "$work" && echo '{"session_id":"s5","stop_hook_active":false}' | bash "$here/check-docs-drift.sh")
check "md-only -> silent" "" "$out"

echo "passed=$pass failed=$fail"
[ "$fail" = "0" ]
