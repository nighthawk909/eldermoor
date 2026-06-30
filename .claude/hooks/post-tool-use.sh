#!/usr/bin/env bash
# =====================================================================
# Eldermoor — PostToolUse hook (matcher: Edit|Write|MultiEdit).
# A hook is a deterministic shell command; it CANNOT author prose, so it
# cannot itself rewrite PROJECT_STATE.md etc. What it CAN do (and does):
# detect that code/client files changed and raise a "docs are now stale"
# flag + a one-time reminder. The actual doc sync is performed by Claude
# (per CLAUDE.md), which clears the flag with: rm .claude/state/docs-dirty
# The Stop hook refuses to stop while this flag exists, which is what makes
# "keep documentation synchronized" actually enforceable.
# =====================================================================
set -u
cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0

fp=$(printf '%s' "$(cat)" | python3 -c '
import sys, json
try:
    d = json.load(sys.stdin)
    print((d.get("tool_input") or {}).get("file_path", ""))
except Exception:
    print("")
' 2>/dev/null)

mkdir -p .claude/state

case "$fp" in
  */src/*|*/index.html|*/index.modular.html|*.js)
    if [ ! -f .claude/state/docs-dirty ]; then
      touch .claude/state/docs-dirty
      python3 -c '
import json
print(json.dumps({"hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": (
        "Code changed -> PROJECT_STATE.md, BACKLOG.md, NEXT_TASKS.md, METRICS.md and "
        "PROJECT_HANDOFF.md are now STALE. Before this work unit ends, update all six docs "
        "to the new state, then run:  rm .claude/state/docs-dirty  "
        "(the Stop hook blocks stopping while that flag exists)."
    )
}}))
'
    fi
    ;;
esac
exit 0
