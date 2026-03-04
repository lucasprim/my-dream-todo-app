#!/bin/sh
set -e

# Fix ownership of mounted volumes
chown -R nextjs:nodejs /vault /home/nextjs/.config/obsidian-headless

# Run the rest as nextjs
echo "==> Logging into Obsidian..."
login_args="--email $OBSIDIAN_EMAIL --password $OBSIDIAN_PASSWORD"
if [ -n "$OBSIDIAN_MFA" ]; then
  login_args="$login_args --mfa $OBSIDIAN_MFA"
fi
su-exec nextjs:nodejs ob login $login_args

echo "==> Setting up vault sync..."
if ! su-exec nextjs:nodejs ob sync-status >/dev/null 2>&1; then
  su-exec nextjs:nodejs ob sync-setup --vault "$OBSIDIAN_VAULT"
fi

echo "==> Configuring bidirectional sync..."
su-exec nextjs:nodejs ob sync-config --mode bidirectional

echo "==> Starting continuous sync..."
exec su-exec nextjs:nodejs ob sync --continuous
