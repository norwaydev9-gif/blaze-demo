#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
PORT="${PORT:-5173}"
echo "BLAZE: http://localhost:$PORT"
npm run dev -- --port "$PORT"
