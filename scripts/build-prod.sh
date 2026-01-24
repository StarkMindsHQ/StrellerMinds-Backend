#!/bin/bash
set -e

echo "🚀 Building Production Image..."

# Load environment variables
if [ -f .env.production ]; then
    export $(cat .env.production | grep -v '^#' | xargs)
fi

# Run security scan first
echo "🔒 Running pre-build security scan..."
./scripts/security-scan.sh

# Get git commit hash for tagging
COMMIT_HASH=$(git rev-parse --short HEAD)
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
IMAGE_NAME="strellerminds-backend"
REGISTRY="${DOCKER_REGISTRY:-localhost:5000}"

# Build the image
echo "🏗️ Building Docker image..."
docker build \
    --no-cache \
    --target production \
    --tag ${IMAGE_NAME}:latest \
    --tag ${IMAGE_NAME}:${COMMIT_HASH} \
    --tag ${IMAGE_NAME}:${TIMESTAMP} \
    --tag ${REGISTRY}/${IMAGE_NAME}:latest \
    --tag ${REGISTRY}/${IMAGE_NAME}:${COMMIT_HASH} \
    .

# Scan the final production image
echo "🔍 Scanning production image..."
trivy image --severity HIGH,CRITICAL ${IMAGE_NAME}:latest

# Save image to tar for deployment
echo "💾 Saving image..."
docker save ${IMAGE_NAME}:latest -o ${IMAGE_NAME}-${COMMIT_HASH}.tar

echo "✅ Build completed: ${IMAGE_NAME}:${COMMIT_HASH}"