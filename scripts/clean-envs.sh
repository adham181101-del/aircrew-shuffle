#!/usr/bin/env bash
# save as: scripts/clean-envs.sh  (or run directly)
# usage:
#   bash scripts/clean-envs.sh
#   bash scripts/clean-envs.sh --purge-history   # also scrubs from past commits (destructive)

set -euo pipefail

PURGE_HISTORY=false
if [[ "${1:-}" == "--purge-history" ]]; then
  PURGE_HISTORY=true
fi

# 1) patterns we never want in git
#    (we EXCLUDE .example/.sample so collaborators know what vars exist)
IGNORE_PATTERNS=(
  ".env"
  ".env.*"
  "!*.example"
  "!*.sample"
  # common framework variants:
  ".env.local"
  ".env.development"
  ".env.development.local"
  ".env.production"
  ".env.production.local"
  ".env.test"
  ".env.test.local"
)

# 2) ensure .gitignore exists and contains our rules (idempotent)
touch .gitignore
echo "# === env files (managed by clean-envs.sh) ===" >> .gitignore
for pat in "${IGNORE_PATTERNS[@]}"; do
  # add if not already present
  if ! grep -qxF "$pat" .gitignore 2>/dev/null; then
    echo "$pat" >> .gitignore
  fi
done

# 3) compute the set of tracked env files we should untrack (but keep locally)
#    - start from tracked files matching .env or .env.* …
#    - drop any that end with .example/.sample
TRACKED_ENVS=()
while IFS= read -r line; do
  TRACKED_ENVS+=("$line")
done < <(git ls-files -z | tr '\0' '\n' \
  | grep -E '(^|/)\.env(\..*)?$' \
  | grep -Ev '\.example$|\.sample$' \
  || true)

if ((${#TRACKED_ENVS[@]} == 0)); then
  echo "✅ No tracked env files found. .gitignore updated."
else
  echo "🔎 Tracked env files to remove from git index (kept locally):"
  printf '  - %s\n' "${TRACKED_ENVS[@]}"

  # 4) untrack them (keep working copies)
  git rm --cached --quiet -- "${TRACKED_ENVS[@]}"

  # 5) commit the cleanup + .gitignore
  git add .gitignore
  git commit -m "chore(security): stop tracking env files and update .gitignore"
  echo "📝 Committed removal from git index."
fi

# 6) optional: purge from history (dangerous – rewrites commit history)
if $PURGE_HISTORY; then
  echo "⚠️  Purging env files from git history (this rewrites history)."
  echo "   Make sure all collaborators stop pushing until this is done."
  # prefer git-filter-repo if available
  if command -v git-filter-repo >/dev/null 2>&1; then
    # build args list of paths to purge
    # we only purge the file patterns that are likely secrets (.env, .env.*)
    # (examples/samples were never tracked by step 3, so they won't be listed)
    PATHS_TO_PURGE=()
    while IFS= read -r f; do
      PATHS_TO_PURGE+=("--path" "$f")
    done < <(printf "%s\n" "${TRACKED_ENVS[@]}" | sort -u)

    # If nothing specific found (e.g., already untracked), still purge generic names
    if ((${#PATHS_TO_PURGE[@]} == 0)); then
      PATHS_TO_PURGE=(--path .env --path-glob ".env.*")
    fi

    git filter-repo --invert-paths "${PATHS_TO_PURGE[@]}"
  else
    echo "ℹ️  git-filter-repo not found."
    echo "    Install it (recommended) or use BFG:"
    echo "      pip install git-filter-repo"
    echo "    —OR—"
    echo "      java -jar bfg.jar --delete-files .env --delete-files .env.*"
    echo "    After running, execute:"
    echo "      git reflog expire --expire=now --all && git gc --prune=now --aggressive"
    echo "    Skipping automatic purge."
    exit 0
  fi

  echo "✅ History purge complete locally."
  echo "👉 Next steps:"
  echo "   1) git push --force-with-lease"
  echo "   2) Ask collaborators to rebase or re-clone."
fi

echo "🎉 Done."
