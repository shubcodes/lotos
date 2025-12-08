#!/bin/bash
# Installation script for Task Manager CLI

set -e

echo "🚀 Task Manager CLI - Installation Script"
echo "=========================================="
echo

# Check Python version
echo "Checking Python version..."
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
echo "✅ Found Python $PYTHON_VERSION"

# Create data directory if it doesn't exist
echo "Creating data directory..."
mkdir -p data
echo "✅ Data directory ready"

# Make script executable
echo "Setting permissions..."
chmod +x src/task_manager.py
echo "✅ Script is executable"

# Run tests
echo "Running tests..."
if python3 test_task_manager.py > /dev/null 2>&1; then
    echo "✅ All tests passed"
else
    echo "⚠️  Some tests failed, but continuing installation..."
fi

echo
echo "=========================================="
echo "✅ Installation complete!"
echo
echo "Usage:"
echo "  python3 src/task_manager.py --help"
echo "  python3 src/task_manager.py add 'My task' --priority high"
echo "  python3 src/task_manager.py list"
echo
