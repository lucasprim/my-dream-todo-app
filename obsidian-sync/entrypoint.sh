#!/bin/sh
set -e

echo "==> Logging into Obsidian..."
login_args="--email $OBSIDIAN_EMAIL --password $OBSIDIAN_PASSWORD"
if [ -n "$OBSIDIAN_MFA" ]; then
  login_args="$login_args --mfa $OBSIDIAN_MFA"
fi
ob login $login_args

echo "==> Setting up vault sync..."
if ! ob sync-status >/dev/null 2>&1; then
  ob sync-setup --vault "$OBSIDIAN_VAULT"
fi

echo "==> Configuring bidirectional sync..."
ob sync-config --mode bidirectional

echo "==> Starting continuous sync..."
exec ob sync --continuous
