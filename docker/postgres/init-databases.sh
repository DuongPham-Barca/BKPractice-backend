#!/bin/sh
set -eu

for database in bkpractice_identity bkpractice_learning bkpractice_submission bkpractice_community; do
  psql --username "$POSTGRES_USER" --dbname postgres --set ON_ERROR_STOP=1 \
    --command "CREATE DATABASE $database" || true
done
