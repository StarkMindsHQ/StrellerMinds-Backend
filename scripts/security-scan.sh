#!/bin/bash
set -e

echo "🔒 Starting Security Scan..."

# Install dependencies if needed
if ! command -v trivy &> /dev/null; then
    echo "Installing Trivy..."
    wget https://github.com/aquasecurity/trivy/releases/download/v0.45.1/trivy_0.45.1_Linux-64bit.tar.gz
    tar -xzf trivy_0.45.1_Linux-64bit.tar.gz
    sudo mv trivy /usr/local/bin/
fi

if ! command -v hadolint &> /dev/null; then
    echo "Installing Hadolint..."
    wget https://github.com/hadolint/hadolint/releases/download/v2.12.0/hadolint-Linux-x86_64
    sudo mv hadolint-Linux-x86_64 /usr/local/bin/hadolint
    sudo chmod +x /usr/local/bin/hadolint
fi

# 1. Scan Dockerfile
echo "📋 Scanning Dockerfile..."
hadolint Dockerfile || true

# 2. Scan for vulnerabilities in base image
echo "🔍 Scanning for image vulnerabilities..."
trivy image --severity HIGH,CRITICAL node:18-alpine

# 3. Scan npm dependencies
echo "📦 Scanning npm dependencies..."
npm audit --audit-level=high || true

# 4. Build and scan application image
echo "🏗️ Building and scanning application image..."
docker build --target build -t strellerminds-build:scan .
trivy image --severity HIGH,CRITICAL strellerminds-build:scan

# 5. Check for secrets in code
echo "🔑 Checking for secrets..."
if command -v trufflehog &> /dev/null; then
    trufflehog filesystem . --no-verification
fi

echo "✅ Security scan completed!"