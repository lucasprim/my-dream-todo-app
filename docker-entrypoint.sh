#!/bin/sh
set -e

# Fix ownership of mounted volumes (may be root-owned from other containers)
chown -R nextjs:nodejs /vault /data

exec su-exec nextjs:nodejs node server.js
