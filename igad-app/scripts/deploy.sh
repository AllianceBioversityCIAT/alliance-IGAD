#!/bin/bash
set -e

echo "🚀 IGAD Innovation Hub - Deployment Helper"
echo "=========================================="

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 [testing|production]"
    echo ""
    echo "Available environments:"
    echo "  testing    - Deploy to testing environment"
    echo "  production - Deploy to production environment"
    exit 1
fi

ENVIRONMENT=$1

case $ENVIRONMENT in
    testing)
        echo "🧪 Deploying to TESTING environment..."
        ./scripts/deploy-fullstack-testing.sh
        ;;
    production)
        echo "🏭 Deploying to PRODUCTION environment..."
        ./scripts/deploy-fullstack-production.sh
        ;;
    *)
        echo "❌ Invalid environment: $ENVIRONMENT"
        echo "Use: testing or production"
        exit 1
        ;;
esac
