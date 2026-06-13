#!/usr/bin/env bash
# Load nvm if available and execute the command with the correct Node version.
# Handles the npm_config_prefix conflict that prevents nvm from loading.
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"

# npm sets npm_config_prefix which conflicts with nvm.
# Save and unset it so nvm can load, then restore it after.
SAVED_PREFIX="${npm_config_prefix:-}"
unset npm_config_prefix

[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

# If nvm loaded successfully, use the project's Node version
if command -v nvm &>/dev/null; then
  nvm use > /dev/null 2>&1 2>/dev/null || true
fi

# Restore npm_config_prefix so subsequent npm commands still work
[ -n "$SAVED_PREFIX" ] && export npm_config_prefix="$SAVED_PREFIX"

exec "$@"
