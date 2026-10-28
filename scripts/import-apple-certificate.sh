#!/usr/bin/env bash
set -euo pipefail
umask 077
: "${RUNNER_TEMP:?This script is for an ephemeral CI runner}"
: "${APPLE_CERTIFICATE:?Missing APPLE_CERTIFICATE}"
: "${APPLE_CERTIFICATE_PASSWORD:?Missing APPLE_CERTIFICATE_PASSWORD}"

certificate_path="$RUNNER_TEMP/opentu-signing.p12"
keychain_path="$RUNNER_TEMP/opentu-signing.keychain-db"
trap 'rm -f "$certificate_path"' EXIT
printf '%s' "$APPLE_CERTIFICATE" | base64 -D > "$certificate_path"
security create-keychain -p "$RUNNER_TEMP" "$keychain_path"
security set-keychain-settings -lut 21600 "$keychain_path"
security unlock-keychain -p "$RUNNER_TEMP" "$keychain_path"
security import "$certificate_path" -P "$APPLE_CERTIFICATE_PASSWORD" -T /usr/bin/codesign -t cert -f pkcs12 -k "$keychain_path"
security set-key-partition-list -S apple-tool:,apple: -k "$RUNNER_TEMP" "$keychain_path"
security list-keychains -d user -s "$keychain_path"
