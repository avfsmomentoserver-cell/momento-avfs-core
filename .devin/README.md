# Project Configuration

This directory contains the project configuration for the Momento Core Platform, adapted from the MDOS workspace package.

## Configuration Files

- **AGENTS.md** - Specialist agent definitions and responsibilities
- **CODING_STANDARDS.md** - Project coding standards and best practices
- **config.json** - Main project configuration and entry point system
- **skills/** - Individual skill definitions (FastAPI, React, Playwright, etc.)
- **workflows/** - Workflow definitions (standard-task, new-feature, architecture-review, deployment)

## Entry Point System

The project uses a unified entry point system with:

- **Default Agent**: Project Administrator (ag_admin) coordinates all interactions
- **Skills-First**: Automatically uses relevant skills before agent fallback
- **Agent Coordination**: Specialist agents work together through project admin
- **Fallback Hierarchy**: Skills → Project Admin → Specialist Agents → General Purpose

## Usage

When working in this project, the AI assistant will:

1. Auto-detect relevant skills from the `skills/` directory
2. Use the Project Administrator as the default coordinator
3. Follow workflows defined in `workflows/` for different task types
4. Apply coding standards from `CODING_STANDARDS.md`
5. Coordinate with specialist agents as defined in `AGENTS.md`

## Mode Selection

The system can automatically switch between execution styles:

- **Low-credit efficient**: Use words like "efficient", "low credit", "budget", or "light"
- **Full power**: Use words like "full power", "deep", "full control", or "thorough"

## Workflows

- **/standard-task** - Routine development work
- **/new-feature** - Adding new capabilities to the platform
- **/architecture-review** - Design decisions and ADRs
- **/deployment** - Local and cloud deployment

## Skills

Available skills include:
- FastAPI (backend API)
- React + TypeScript (frontend UI)
- Playwright (browser automation)
- Forecast Engineering (prediction logic)
- SQLite (database)
- Testing (validation)
- Documentation (knowledge management)
