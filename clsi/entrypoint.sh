#!/bin/sh

# Get the GID of the docker socket
DOCKER_GROUP=$(stat -c '%g' /var/run/docker.sock)

# Only create the group if it doesn't exist
if ! getent group dockeronhost > /dev/null; then
    groupadd --non-unique --gid "${DOCKER_GROUP}" dockeronhost
fi

# Ensure node is in the group
usermod -aG dockeronhost node

# compatibility: initial volume setup
mkdir -p /overleaf/services/clsi/cache && chown node:node /overleaf/services/clsi/cache
mkdir -p /overleaf/services/clsi/compiles && chown node:node /overleaf/services/clsi/compiles
mkdir -p /overleaf/services/clsi/output && chown node:node /overleaf/services/clsi/output

exec runuser -u node -- "$@"