#!/bin/bash

# Test script for env-checker

echo "Running Env Checker Test Suite"
echo "=================================="

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Run linting
echo "Running linter..."
npm run lint

if [ $? -ne 0 ]; then
    echo "Linting failed"
    exit 1
fi

# Run unit tests
echo "Running unit tests..."
npm run test

if [ $? -ne 0 ]; then
    echo "❌ Tests failed"
    exit 1
fi

# Run coverage report
echo "Generating coverage report..."
npm run test:coverage

echo "All tests passed!"
echo "Coverage report generated in ./coverage/"
