# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

This is a personal website repository structured as a monorepo with two main components:

1. **Main Website**: Built with org-mode files that compile to HTML using a custom Makefile and GitHub Actions
2. **PhilsAxioms**: A TypeScript application for interactive philosophical axiom visualization, built as a static site

### Main Website Structure

- Org-mode files (`.org`) are the source content
- Makefile orchestrates compilation via `.github/workflows/utils.sh`
- Each directory gets a unix-like header for navigation
- HTML files are generated automatically with cross-directory linking
- PhilsAxioms is integrated as a static build target in the main website workflow

### PhilsAxioms Architecture

Located in `philsaxioms/` - a monorepo with workspace structure:

- `packages/shared/`: Common TypeScript types and utilities
- `packages/backend/`: Express.js API server with file watching
- `packages/frontend/`: React + Vite application with ReactFlow for graph visualization
- `data/`: YAML configuration for philosophical categories and nodes
- `scripts/`: Build and validation utilities

## Common Development Commands

### Main Website (Monorepo Build)
```bash
make                    # Build entire website (header + HTML export + PhilsAxioms static)
make preview           # Build and serve locally at http://localhost:8000
make serve             # Serve current build without rebuilding
make clean             # Remove generated HTML files and PhilsAxioms dist
```

### PhilsAxioms Development
```bash
cd philsaxioms
npm run dev            # Start both backend and frontend in watch mode
npm run build          # Build all packages
npm run build:static   # Build with static data generation (used by main make)
npm run type-check     # TypeScript type checking across all packages
npm run test           # Run tests in all packages
npm run test:coverage  # Run tests with coverage
```

### Individual Package Commands
```bash
# Backend only
npm run dev:backend
# Frontend only  
npm run dev:frontend
```

## Key Files and Data Flow

- `philsaxioms/data/*.yaml`: Source of truth for philosophical content
- `scripts/build-static-data.js`: Processes YAML into graph-data.json
- Backend watches YAML files and rebuilds data on changes
- Frontend consumes the graph data for interactive visualization

## TypeScript Configuration

All PhilsAxioms packages use strict TypeScript with workspace dependencies. The shared package must be built before other packages can build successfully.