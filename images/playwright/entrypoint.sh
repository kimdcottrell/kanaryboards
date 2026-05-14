#!/bin/sh
set -e
TRAEFIK_IP=$(getent hosts traefik | awk '{print $1}')
[ -n "$TRAEFIK_IP" ] && echo "$TRAEFIK_IP kanary.local.dev" >> /etc/hosts
exec gosu node "$@"
