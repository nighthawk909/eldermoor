#!/usr/bin/env bash
# =====================================================================
# Eldermoor — SessionStart hook.
# Restores project context at the start of every session. Everything this
# script prints to stdout is injected into Claude's context by Claude Code,
# so this is where we surface git/branch/commit/version/doc/production state
# BEFORE any coding begins (policy: restore full context first).
# Supported event: SessionStart (matcher: startup|resume|clear).
# =====================================================================
set -u
cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0

echo "=== ELDERMOOR SESSION CONTEXT (auto-restored by SessionStart hook) ==="
echo "Branch:   $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')"
echo "Commit:   $(git log -1 --oneline 2>/dev/null || echo '?')"

up=$(git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null || true)
if [ -n "${up:-}" ]; then
  ahead=$(git rev-list "@{u}..HEAD" --count 2>/dev/null || echo '?')
  behind=$(git rev-list "HEAD..@{u}" --count 2>/dev/null || echo '?')
  echo "Upstream: ${up} (ahead ${ahead}, behind ${behind})"
else
  echo "Upstream: (none set — branch not pushed)"
fi

if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
  echo "Worktree: DIRTY — uncommitted changes present"
else
  echo "Worktree: clean"
fi

ver=$(grep -oE 'v[0-9]+' index.html 2>/dev/null | head -1 || true)
echo "Local client version: ${ver:-unknown}"

echo "--- Required context docs (read these before coding) ---"
for d in PROJECT_STATE.md BACKLOG.md ARCHITECTURE.md NEXT_TASKS.md METRICS.md PROJECT_HANDOFF.md; do
  if [ -f "$d" ]; then echo "  present : $d"; else echo "  MISSING : $d"; fi
done

# Best-effort production check. The sandbox network policy may block this; that
# is non-fatal — verify production manually when it reports unreachable.
prod=$(curl -fsS --max-time 6 https://eldermoor.vercel.app/ 2>/dev/null | grep -oE 'v[0-9]+' | head -1 || true)
if [ -n "${prod:-}" ]; then
  echo "Production (eldermoor.vercel.app): ${prod}"
  [ -n "${ver:-}" ] && [ "${prod}" != "${ver}" ] && echo "  WARNING: production (${prod}) != local (${ver})."
else
  echo "Production: unreachable from this environment — verify manually."
fi

[ -f .claude/state/docs-dirty ] && echo "NOTE: .claude/state/docs-dirty present — docs are STALE and must be synced."

echo "POLICY: read the six docs above, restore full context, THEN begin the next"
echo "highest-priority task from NEXT_TASKS.md / BACKLOG.md. Do not narrate routine work."
echo "=== END SESSION CONTEXT ==="
exit 0
