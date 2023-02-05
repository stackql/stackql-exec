#!/bin/sh

set -e

if [ -z "$AUTH" ]; then
  echo "ERROR: AUTH must be set."
  exit 1
fi

if [ -z "$QUERY_FILE_PATH" ]; then
  stackql exec "$QUERY" --auth="${AUTH}" --output="${OUTPUT}" 
else
  stackql exec -i "$QUERY_FILE_PATH" --auth="${AUTH}" --output="'${OUTPUT}'" 
fi