#!/usr/bin/env bash
# Syncs TODO/FIXME/HACK comments in packages/**/*.ts(x) with GitHub Issues.
#
# - Each comment gets a stable id: sha256(file|normalized text), first 12 chars.
# - An open issue labeled `todo-comment` carries that id in a hidden
#   `<!-- todo-sync:<id> -->` marker, which is the dedup key (line numbers
#   shift, so they are informational only).
# - New comments -> new issues (capped at MAX_NEW per run).
# - Comments that disappeared from the code -> their issues are auto-closed.
#
# Requires: gh (authenticated), jq. Run from the repo root.
set -euo pipefail

LABEL="todo-comment"
MAX_NEW="${MAX_NEW:-10}"

gh label create "$LABEL" \
  --description "Synced from a TODO/FIXME comment in the code" \
  --color "FBCA04" --force

gh label create "auto-generated" \
  --description "Filed automatically (workflow or agent), not by a human" \
  --color "BFDADC" --force

# --- Collect current TODO comments -> "hash<TAB>file<TAB>line<TAB>text" ------
raw=$(mktemp)
current=$(mktemp)
trap 'rm -f "$raw" "$current"' EXIT

grep -rnE '(TODO|FIXME|HACK)[:( ]' packages \
  --include='*.ts' --include='*.tsx' \
  --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=out \
  > "$raw" || true

while IFS= read -r match; do
  file=${match%%:*}
  rest=${match#*:}
  line=${rest%%:*}
  text=${rest#*:}
  # Normalize: strip leading whitespace/comment markers and trailing whitespace,
  # so the hash survives re-indentation and comment-style changes.
  norm=$(printf '%s' "$text" | sed -E 's@^[[:space:]]*(//|/\*|\*+|#|<!--)*[[:space:]]*@@; s@[[:space:]]+$@@')
  [ -n "$norm" ] || continue
  hash=$(printf '%s|%s' "$file" "$norm" | sha256sum | cut -c1-12)
  printf '%s\t%s\t%s\t%s\n' "$hash" "$file" "$line" "$norm"
done < "$raw" > "$current"

echo "Found $(wc -l < "$current") TODO/FIXME/HACK comment(s) in the codebase."

# --- Load existing synced issues --------------------------------------------
existing=$(gh issue list --label "$LABEL" --state open --json number,body --limit 200)

# --- Create issues for new comments -----------------------------------------
created=0
while IFS=$'\t' read -r hash file line text; do
  if printf '%s' "$existing" | jq -e --arg h "$hash" \
    'map(select(.body // "" | contains("todo-sync:" + $h))) | length > 0' >/dev/null; then
    continue
  fi
  if [ "$created" -ge "$MAX_NEW" ]; then
    echo "Cap of $MAX_NEW new issues reached — remaining comments will sync on the next run."
    break
  fi
  short=$(printf '%s' "$text" | cut -c1-70)
  title="[TODO] ${short} (${file##*/})"
  body=$(printf '%s\n\n%s\n\n%s\n%s' \
    "Synced automatically from a code comment by the todo-sync workflow." \
    "**Location**: \`${file}:${line}\` (line number as of the sync run)" \
    "> ${text}" \
    "<!-- todo-sync:${hash} -->")
  gh issue create --title "$title" --body "$body" --label "$LABEL" --label "auto-generated"
  created=$((created + 1))
done < "$current"
echo "Created $created new issue(s)."

# --- Close issues whose comment disappeared ---------------------------------
printf '%s' "$existing" | jq -r \
  '.[] | .number as $n | ((.body // "") | scan("todo-sync:[0-9a-f]{12}")) as $m | "\($n)\t\($m)"' \
| while IFS=$'\t' read -r num marker; do
    hash=${marker#todo-sync:}
    if ! cut -f1 "$current" | grep -qx "$hash"; then
      gh issue close "$num" --comment \
        "The referenced TODO comment no longer exists in the codebase — closing automatically (todo-sync)."
      echo "Closed issue #$num (comment removed)."
    fi
  done

echo "todo-sync complete."
