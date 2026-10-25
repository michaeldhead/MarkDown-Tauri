#!/usr/bin/env bash
set -euo pipefail

# Shared Rust build cache across job worktrees: only the app crate recompiles per job.
export CARGO_TARGET_DIR="${CARGO_TARGET_DIR:-$HOME/.cache/markdown-tauri-factory-target}"

for attempt in 1 2 3; do
  if npm ci; then break; fi
  echo "checks.sh: npm ci failed (attempt $attempt of 3)" >&2
  if [ "$attempt" -eq 3 ]; then exit 1; fi
  sleep 5
done
npm test
npx tsc --noEmit
npm run build            # produces dist/ — Tauri embeds it at compile time
cargo check --manifest-path src-tauri/Cargo.toml
