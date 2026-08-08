#!/usr/bin/env bash
# Tear down the demo stack.
set -e
cd "$(dirname "$0")"
docker compose down --remove-orphans
echo "Demo stopped."
