#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCAL_NODE_BIN="$ROOT_DIR/.runtime/node-v22.14.0-darwin-arm64/bin"
CODEX_NODE="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"

if [ -d "$LOCAL_NODE_BIN" ]; then
  export PATH="$LOCAL_NODE_BIN:$PATH"
fi

if [ -x "$CODEX_NODE" ]; then
  exec "$CODEX_NODE" "$ROOT_DIR/node_modules/next/dist/bin/next" "$@"
fi

exec node "$ROOT_DIR/node_modules/next/dist/bin/next" "$@"
