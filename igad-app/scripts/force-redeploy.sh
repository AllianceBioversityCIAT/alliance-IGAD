#!/bin/bash

# Force full redeployment by clearing cache and rebuilding everything

set -e

echo "🧹 Cleaning SAM build cache..."
rm -rf /Users/jcadavid/Desktop/DEV/Desarrollos/alliance-IGAD/igad-app/backend/.aws-sam

echo "🔨 Building backend with --use-container flag..."
cd /Users/jcadavid/Desktop/DEV/Desarrollos/alliance-IGAD/igad-app/backend
sam build --use-container --profile IBD-DEV

echo "🚀 Deploying backend..."
sam deploy --config-file samconfig.toml --profile IBD-DEV

echo "✅ Force redeployment complete!"
