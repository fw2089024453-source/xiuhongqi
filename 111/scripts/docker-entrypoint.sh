#!/bin/sh
set -eu

mkdir -p /app/public/uploads

if [ -d /app/public/uploads-seed ]; then
  cp -an /app/public/uploads-seed/. /app/public/uploads/
fi

exec "$@"
