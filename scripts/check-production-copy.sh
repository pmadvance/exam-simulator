#!/usr/bin/env bash
set -euo pipefail

search_roots=(apps packages)
prohibited='111111|Dev code|UAT testing|PMAdvance|PM Advance'

if rg -n "$prohibited" "${search_roots[@]}" --glob '!**/dist/**' --glob '!**/.next/**'; then
  echo "Production copy check failed: prohibited development or legacy-brand text was found." >&2
  exit 1
fi

echo "Production copy check passed."
