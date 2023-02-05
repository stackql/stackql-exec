#!/bin/sh

set -e

FILE_NAME=${AUTH_FILE}

if [ -z "$FILE_NAME" ]; then
  AUTH=${AUTH_STR}

  if [ -z "$AUTH_STR" ]; then
    echo "ERROR: Either AUTH_FILE_NAME or AUTH_STR must be set."
    exit 1
  fi
else
  # Read the JSON file into a string
  AUTH=$(cat "$FILE_NAME")
fi

# Set the AUTH environment variable
echo "Setting AUTH environment variable..."
echo  "AUTH=$AUTH" >> "$GITHUB_ENV"