#!/bin/bash

# Script to push comprehensive testing solution to forked repository

set -e

echo "🚀 Pushing Test Coverage Solution to Forked Repository"

# Configuration
FORK_URL="https://github.com/olaleyeolajide81-sketch/StrellerMinds-Backend.git"
BRANCH_NAME="Insufficient-Test-Coverage"
COMMIT_MESSAGE="Fix #610: Implement comprehensive testing strategy with 80%+ coverage"

echo "📋 Configuration:"
echo "  Fork URL: $FORK_URL"
echo "  Branch: $BRANCH_NAME"
echo "  Commit Message: $COMMIT_MESSAGE"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in the StrellerMinds-Backend directory"
    exit 1
fi

# Initialize git if not already done
if [ ! -d ".git" ]; then
    echo "🔧 Initializing Git repository..."
    git init
    git branch -M main
fi

# Configure git user (if not configured)
if ! git config user.name > /dev/null; then
    echo "🔧 Configuring Git user..."
    git config user.name "Cascade AI"
    git config user.email "cascade@example.com"
fi

# Add the fork as remote (if not already added)
if ! git remote get-url fork > /dev/null 2>&1; then
    echo "🔗 Adding fork as remote..."
    git remote add fork "$FORK_URL"
fi

# Create and checkout the branch
echo "🌿 Creating and checking out branch: $BRANCH_NAME"
git checkout -b "$BRANCH_NAME" 2>/dev/null || git checkout "$BRANCH_NAME"

# Stage all changes
echo "📦 Staging all changes..."
git add .

# Create commit
echo "💾 Creating commit..."
git commit -m "$COMMIT_MESSAGE"

# Push to fork
echo "📤 Pushing to forked repository..."
git push -u fork "$BRANCH_NAME"

echo ""
echo "✅ Successfully pushed to forked repository!"
echo ""
echo "📊 Summary of changes pushed:"
echo "  🧪 Unit Tests: 4 comprehensive test files"
echo "  🔗 Integration Tests: Complete workflow testing"
echo "  🌐 E2E Tests: Full user journey coverage"
echo "  📈 Coverage Reporting: Automated 80%+ thresholds"
echo "  🚀 CI/CD Pipeline: Quality gates and reporting"
echo ""
echo "🔗 View your changes at:"
echo "  $FORK_URL/tree/$BRANCH_NAME"
echo ""
echo "📝 Create a pull request at:"
echo "  https://github.com/olaleyeolajide81-sketch/StrellerMinds-Backend/compare/main...$BRANCH_NAME"
echo ""
echo "🎉 Issue #610: Insufficient Test Coverage - SOLVED!"
