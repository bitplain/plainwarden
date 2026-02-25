#!/usr/bin/env sh
set -eu

AUTOSAVE_PATH="${CADDY_AUTOSAVE_PATH:-/config/caddy/autosave.json}"

if [ -s "$AUTOSAVE_PATH" ]; then
  echo "[caddy-run] autosave config detected, starting with --resume"
  exec caddy run --resume
fi

echo "[caddy-run] no autosave config found, starting from bootstrap.json"
exec caddy run --config /etc/caddy/bootstrap.json
