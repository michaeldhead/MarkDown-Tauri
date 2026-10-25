#!/usr/bin/env bash
set -euo pipefail

# Shared Rust build cache across job worktrees: only the app crate recompiles per job.
export CARGO_TARGET_DIR="${CARGO_TARGET_DIR:-$HOME/.cache/markdown-tauri-factory-target}"

npm ci
npm test
npx tsc --noEmit
npm run build            # produces dist/ — Tauri embeds it at compile time
cargo check --manifest-path src-tauri/Cargo.toml
