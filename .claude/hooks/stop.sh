#!/usr/bin/env bash
# =====================================================================
# Eldermoor — Stop hook.
# Refuses to let the session end while objectively-detectable work remains,
# then tells Claude to keep going with the next highest-priority task.
#
# What a Stop hook CAN enforce (deterministic, self-resolving): uncommitted
# changes, unpushed commits, and stale docs (the docs-dirty flag). These are
# the conditions blocked below — each one clears once Claude commits / pushes /
# syncs docs, so the loop terminates naturally.
#
# What a Stop hook CANNOT reliably verify on its own: "feature implemented",
# "browser boot passed", "playtest done", "deployment promoted". Those are
# semantic. They live in CLAUDE.md's Quality Rules (Claude self-checks them)
# and are echoed in the block reason below. A flag-file convention is provided
# so Claude can record them objectively when known:
#   .claude/state/boot-pending     -> set when a build needs boot verification
#   .claude/state/deploy-pending   -> set when a commit needs production deploy
# (Claude creates/removes these; this hook blocks on them if present.)
#
# Loop guard: if we already forced one continue (stop_hook_active), we allow
# the stop, the officially-recommended guard against infinite stop loops.
# =====================================================================
set -u
cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0

active=$(printf '%s' "$(cat)" | python3 -c '
import sys, json
try:
    d = json.load(sys.stdin)
    print("1" if d.get("stop_hook_active") else "0")
except Exception:
    print("0")
' 2>/dev/null)
[ "$active" = "1" ] && exit 0   # already continuing once — let it stop (no infinite loop)

reasons=""
if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
  reasons="${reasons}- Uncommitted changes in the working tree (commit them).\n"
fi
if git rev-parse --abbrev-ref --symbolic-full-name '@{u}' >/dev/null 2>&1; then
  if [ "$(git rev-list '@{u}..HEAD' --count 2>/dev/null || echo 0)" != "0" ]; then
    reasons="${reasons}- Unpushed commits on the current branch (push them).\n"
  fi
else
  reasons="${reasons}- Branch has no upstream / is unpushed (push -u).\n"
fi
[ -f .claude/state/docs-dirty ]    && reasons="${reasons}- Docs are stale: sync the six docs, then 'rm .claude/state/docs-dirty'.\n"
[ -f .claude/state/boot-pending ]  && reasons="${reasons}- Boot verification pending (verify, then 'rm .claude/state/boot-pending').\n"
[ -f .claude/state/deploy-pending ]&& reasons="${reasons}- Deployment pending (deploy/promote, then 'rm .claude/state/deploy-pending').\n"

if [ -n "$reasons" ]; then
  REASONS="$(printf '%b' "$reasons")" python3 -c '
import os, json
print(json.dumps({
    "decision": "block",
    "reason": (
        "Do not stop yet — the following are unresolved:\n"
        + os.environ["REASONS"]
        + "\nResolve each, then CONTINUE with the next highest-priority task from "
          "NEXT_TASKS.md / BACKLOG.md (do not idle while higher-priority work remains). "
          "Also self-check the CLAUDE.md Quality Rules before any future stop: a feature "
          "is complete only when implemented, integrated, boot-verified, playtested (when "
          "required), committed, pushed, deployed, and reflected in all six docs."
    )
}))
'
fi
exit 0
