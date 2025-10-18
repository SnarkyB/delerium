#!/bin/bash

# Test runner script for zkpaste client
# This script runs all types of tests in the correct order

set -e

echo "🧪 Running zkpaste client tests..."
echo "=================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the client directory."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

# Run unit tests
echo "🧪 Running unit tests..."
npm run test:unit

# Run integration tests
echo "🔗 Running integration tests..."
npm run test:integration

# Run end-to-end tests (if Playwright is available)
if command -v npx playwright &> /dev/null; then
    echo "🌐 Running end-to-end tests..."
    npm run test:e2e
else
    echo "⚠️  Playwright not found, skipping end-to-end tests"
    echo "   Install with: npm install @playwright/test"
fi

echo "✅ All tests completed successfully!"