#!/bin/bash
set -e

# Get absolute paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Resolve commands to absolute paths
SAM="$(command -v sam)"

# Force full redeployment by clearing cache and rebuilding everything

echo "🧹 Cleaning SAM build cache..."
rm -rf "$PROJECT_ROOT/backend/.aws-sam"

echo "🔨 Building backend with --use-container flag..."
"$SAM" build --use-container --profile IBD-DEV

echo "🚀 Deploying backend..."
"$SAM" deploy --config-file "$PROJECT_ROOT/backend/samconfig.toml" --profile IBD-DEV

echo "✅ Force redeployment complete!"
