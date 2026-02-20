#!/bin/bash

# Newman API Test Runner Script
# This script runs Postman collections using Newman for API testing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
COLLECTION_FILE="postman/collection.json"
ENVIRONMENT_FILE="postman/environment.json"
REPORTS_DIR="test-reports/newman"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_FILE="${REPORTS_DIR}/api-test-report-${TIMESTAMP}.html"
JSON_REPORT_FILE="${REPORTS_DIR}/api-test-report-${TIMESTAMP}.json"

# Create reports directory if it doesn't exist
mkdir -p "${REPORTS_DIR}"

echo -e "${YELLOW}🚀 Starting Newman API Tests...${NC}"
echo -e "${YELLOW}📁 Collection: ${COLLECTION_FILE}${NC}"
echo -e "${YELLOW}📊 Reports will be saved to: ${REPORTS_DIR}${NC}"

# Check if collection file exists
if [ ! -f "${COLLECTION_FILE}" ]; then
    echo -e "${RED}❌ Error: Collection file not found at ${COLLECTION_FILE}${NC}"
    exit 1
fi

# Check if Newman is installed
if ! command -v newman &> /dev/null; then
    echo -e "${RED}❌ Error: Newman is not installed. Installing...${NC}"
    npm install -g newman
fi

# Run Newman tests
echo -e "${YELLOW}🧪 Running API tests...${NC}"

if [ -f "${ENVIRONMENT_FILE}" ]; then
    echo -e "${YELLOW}🔧 Using environment file: ${ENVIRONMENT_FILE}${NC}"
    newman run "${COLLECTION_FILE}" \
        -e "${ENVIRONMENT_FILE}" \
        --reporters cli,html,json \
        --reporter-html-export "${REPORT_FILE}" \
        --reporter-json-export "${JSON_REPORT_FILE}" \
        --bail \
        --verbose
else
    echo -e "${YELLOW}🔧 No environment file found, using default variables${NC}"
    newman run "${COLLECTION_FILE}" \
        --reporters cli,html,json \
        --reporter-html-export "${REPORT_FILE}" \
        --reporter-json-export "${JSON_REPORT_FILE}" \
        --bail \
        --verbose \
        --global-var "baseUrl=http://localhost:3000/api"
fi

# Check if tests passed
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ All API tests passed successfully!${NC}"
    echo -e "${GREEN}📄 HTML Report: ${REPORT_FILE}${NC}"
    echo -e "${GREEN}📄 JSON Report: ${JSON_REPORT_FILE}${NC}"
    
    # Exit with success code
    exit 0
else
    echo -e "${RED}❌ Some API tests failed!${NC}"
    echo -e "${RED}📄 HTML Report: ${REPORT_FILE}${NC}"
    echo -e "${RED}📄 JSON Report: ${JSON_REPORT_FILE}${NC}"
    
    # Exit with failure code
    exit 1
fi
