#!/usr/bin/env bash
# =====================================================================
# Eldermoor — PreToolUse hook (matcher: Bash).
# Gates DESTRUCTIVE git operations on explicit human approval, per policy
# ("only request input for destructive git actions"). Everything else is
# allowed through untouched.
# Mechanism: emits the supported PreToolUse JSON with
#   permissionDecision: "ask"  -> Claude Code prompts the user to confirm.
# (Non-destructive commands produce no output, so normal permission flow runs.)
# =====================================================================
set -u
input=$(cat)

cmd=$(printf '%s' "$input" | python3 -c '
import sys, json
try:
    d = json.load(sys.stdin)
    print((d.get("tool_input") or {}).get("command", ""))
except Exception:
    print("")
' 2>/dev/null)

deny=""
case "$cmd" in
  *"push --force"*|*"push -f"*|*"--force"*|*"--force-with-lease"*) deny="force push" ;;
  *"reset --hard"*)                                                deny="hard reset" ;;
  *"git clean "*"-f"*|*"git clean -f"*)                            deny="git clean (file deletion)" ;;
  *"branch -D"*|*"branch -d "*)                                    deny="branch delete" ;;
  *"push origin main"*|*"push "*" main "*|*"push "*" main")        deny="push to main" ;;
  *"git restore "*|*"checkout -- "*)                               deny="discard working-tree changes" ;;
  *"filter-branch"*|*"reflog expire"*|*"gc --prune"*)             deny="history rewrite" ;;
esac

if [ -n "$deny" ]; then
  REASON="Destructive git operation detected (${deny}). Per repo policy this needs your explicit approval before running."
  REASON="$REASON" python3 -c '
import os, json
print(json.dumps({"hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "ask",
    "permissionDecisionReason": os.environ["REASON"]
}}))
'
fi
exit 0
