#!/bin/sh
set -eu

garage() { docker compose -f docker/storage/docker-compose.yml exec -T garage /garage "$@"; }
attempt=0
until garage status >/dev/null 2>&1; do
    attempt=$((attempt + 1))
    [ "$attempt" -lt 60 ] || { echo "Garage did not become ready" >&2; exit 1; }
    sleep 2
done
if ! garage bucket info portabase-e2e >/dev/null 2>&1; then
    node_id=$(garage node id | cut -d@ -f1)
    if garage layout show | grep -q "Current cluster layout version: 0"; then
        garage layout assign -z dc1 -c 1G "$node_id"
        garage layout apply --version 1
    fi
    garage key import --yes -n portabase-e2e GK0123456789abcdef01234567 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
    garage bucket create portabase-e2e
fi
garage bucket allow --read --write --owner portabase-e2e --key portabase-e2e
