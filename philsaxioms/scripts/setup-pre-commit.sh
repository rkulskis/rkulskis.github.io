#!/bin/bash

# Setup script for pre-commit hooks
# This ensures philosophical consistency validation runs on every commit

set -e

echo "🔧 Setting up pre-commit hooks for PhilsAxioms..."

# Check if pre-commit is installed
if ! command -v pre-commit &> /dev/null; then
    echo "📦 Pre-commit not found. Installation options:"
    echo "   Option 1: pipx install pre-commit (recommended)"
    echo "   Option 2: apt install python3-pre-commit"
    echo "   Option 3: pip install pre-commit --break-system-packages (not recommended)"
    echo ""
    echo "⚠️  Continuing without installing pre-commit. Install it manually and re-run this script."
    echo "   After installation, run: pre-commit install"
    exit 0
fi

# Install the git hook scripts
echo "🪝 Installing pre-commit hooks..."
pre-commit install

# Install yamllint if not available
if ! command -v yamllint &> /dev/null; then
    echo "📦 Installing yamllint..."
    pip install yamllint
fi

# Make scripts executable
chmod +x scripts/validate-yaml-structure.js
chmod +x facio

echo "✅ Pre-commit hooks installed successfully!"
echo ""
echo "🧠 Philosophical consistency validation will now run automatically on:"
echo "   - Every commit that modifies YAML files in the data/ directory"
echo "   - Validates that all arguments can be activated through axiom paths"
echo "   - Checks for circular dependencies and logical inconsistencies"
echo ""
echo "🚀 To test the validation manually, run:"
echo "   ./facio validate"
echo ""
echo "🔍 To run pre-commit on all files now:"
echo "   pre-commit run --all-files"