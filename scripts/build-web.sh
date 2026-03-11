#\!/bin/bash
set -o pipefail
echo "Node: $(node --version)"
echo "NPM: $(npm --version)"
echo "Working dir: $(pwd)"
echo "Running: expo export --platform web"
EXPO_DEBUG=true npx expo export --platform web 2>&1
EXIT_CODE=$?
echo "Metro exit code: $EXIT_CODE"
echo "Checking for dist:"
ls -la dist/ 2>&1 || echo "dist dir not found"
echo "Checking for .expo:"
ls -la .expo/ 2>&1 || echo ".expo dir not found"
exit $EXIT_CODE
