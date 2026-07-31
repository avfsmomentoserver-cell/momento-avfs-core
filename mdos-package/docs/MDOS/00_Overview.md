# MDOS — Meta Development Operating System

MDOS is a complete Engineering Operating System that enables humans and AI agents
to collaboratively design, build, validate, document, and evolve complex software
systems. It is project-agnostic: Momento is the first project running on it.

## Core Philosophy

- Knowledge is the source of truth.
- Projects are generated from knowledge; tasks from projects; agents execute tasks.
- Validation verifies results; documentation updates after approved work.
- No duplicate knowledge. Everything references everything. Everything is searchable and versioned.

## Modules

Dashboard, Projects, Knowledge Base, Architecture, Agents, Skills, Tasks,
Roadmaps, Workflows, Templates, Decision Records, Testing, Validation, Search,
Settings, Activity, Notifications, Repositories, Integrations, Documentation,
Analytics.

Each module is independently extensible.

## Portability

The entire workspace serializes to `mdos.workspace.json`. Import it into any MDOS
instance to restore all projects, knowledge, agents, skills, workflows, decisions,
tasks, and documents. This package is that export.
