#!/bin/bash
set -e

echo "🚀 Deploying to Production..."

# Load environment
if [ -f .env.production ]; then
    export $(cat .env.production | grep -v '^#' | xargs)
fi

IMAGE_NAME="strellerminds-backend"
COMMIT_HASH=$(git rev-parse --short HEAD)

# Load image
echo "📦 Loading Docker image..."
docker load -i ${IMAGE_NAME}-${COMMIT_HASH}.tar

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down || true

# Deploy new version
echo "🚀 Starting new deployment..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for health checks
echo "⏳ Waiting for services to be healthy..."
sleep 30

# Verify deployment
echo "🔍 Verifying deployment..."
curl -f http://localhost:3000/health || exit 1
curl -f http://localhost:3000/health | grep -q '"status":"ok"' || exit 1

# Cleanup old images
echo "🧹 Cleaning up old images..."
docker image prune -f --filter "until=24h"

echo "✅ Deployment successful!"