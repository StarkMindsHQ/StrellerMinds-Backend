#!/bin/bash

# TODO Detection and Tracking Script
# This script scans the codebase for TODOs and creates issues/notifications

set -e

echo "🔍 Scanning codebase for TODOs..."

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Count TODOs by priority
CRITICAL_COUNT=0
HIGH_COUNT=0
MEDIUM_COUNT=0
LOW_COUNT=0
TOTAL_COUNT=0

# Scan for TODOs
echo "📝 Analyzing TODO comments..."
TODO_RESULTS=$(find src -name "*.ts" -not -path "*/node_modules/*" -not -path "*/dist/*" -exec grep -Hn "TODO" {} \; | head -50)

if [ -z "$TODO_RESULTS" ]; then
    echo -e "${GREEN}✅ No TODOs found!${NC}"
    exit 0
fi

# Process each TODO
echo "$TODO_RESULTS" | while IFS= read -r line; do
    FILE=$(echo "$line" | cut -d: -f1)
    LINE_NUM=$(echo "$line" | cut -d: -f2)
    TODO_TEXT=$(echo "$line" | cut -d: -f3- | sed 's/^[[:space:]]*TODO[[:space:]]*//' | sed 's/^[[:space:]]*//')
    
    # Determine priority
    PRIORITY="medium"
    if echo "$TODO_TEXT" | grep -qi "critical\|security"; then
        PRIORITY="critical"
        ((CRITICAL_COUNT++))
    elif echo "$TODO_TEXT" | grep -qi "high\|urgent"; then
        PRIORITY="high"
        ((HIGH_COUNT++))
    elif echo "$TODO_TEXT" | grep -qi "low\|minor"; then
        PRIORITY="low"
        ((LOW_COUNT++))
    else
        ((MEDIUM_COUNT++))
    fi
    
    ((TOTAL_COUNT++))
    
    # Color code output
    case $PRIORITY in
        critical)
            COLOR=$RED
            PRIORITY_ICON="🔴"
            ;;
        high)
            COLOR=$YELLOW
            PRIORITY_ICON="🟠"
            ;;
        medium)
            COLOR=$BLUE
            PRIORITY_ICON="🟡"
            ;;
        low)
            COLOR=$GREEN
            PRIORITY_ICON="🟢"
            ;;
    esac
    
    echo -e "${COLOR}${PRIORITY_ICON} ${FILE}:${LINE_NUM} - ${TODO_TEXT}${NC}"
done

echo ""
echo "📊 TODO Summary:"
echo -e "  ${RED}Critical: $CRITICAL_COUNT${NC}"
echo -e "  ${YELLOW}High: $HIGH_COUNT${NC}"
echo -e "  ${BLUE}Medium: $MEDIUM_COUNT${NC}"
echo -e "  ${GREEN}Low: $LOW_COUNT${NC}"
echo -e "  Total: $TOTAL_COUNT"

# Fail if critical TODOs exist
if [ $CRITICAL_COUNT -gt 0 ]; then
    echo ""
    echo -e "${RED}❌ CRITICAL TODOs found! Please address before merging.${NC}"
    echo ""
    echo "🚨 Actions required:"
    echo "1. Create GitHub issues for all critical TODOs"
    echo "2. Assign to team members with deadlines"
    echo "3. Implement missing functionality"
    echo "4. Add tests and documentation"
    exit 1
elif [ $HIGH_COUNT -gt 5 ]; then
    echo ""
    echo -e "${YELLOW}⚠️  High number of TODOs found. Consider addressing some before merging.${NC}"
    exit 1
else
    echo ""
    echo -e "${GREEN}✅ TODO count is acceptable.${NC}"
    exit 0
fi
