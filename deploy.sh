#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_DIR"

MSG_FILE="$REPO_DIR/.deploy-message.txt"
MSG=""

if [[ $# -gt 0 ]]; then
  MSG="$*"
elif [[ -f "$MSG_FILE" ]]; then
  MSG="$(cat "$MSG_FILE")"
fi

if [[ -z "${MSG// }" ]]; then
  echo "No commit message provided." >&2
  echo "Set one in .deploy-message.txt or pass it as an argument." >&2
  exit 1
fi

git add .

if git diff --cached --quiet; then
  echo "No changes to commit."
  exit 0
fi

git commit -m "$MSG"
git push
