# MDOS — Meta Development Operating System

Meta Development Operating System — a project-agnostic engineering OS, seeded with the Momento platform.

This is a **fully importable** MDOS package. It contains the complete workspace as
structured JSON plus generated Markdown documentation.

## Entry Point System

This package includes a **unified entry point system** that provides:

- **Default Agent**: Project Administrator (`ag_admin`) coordinates all interactions
- **Requirements-First Flow**: For prompts such as “project admin”, the system gathers goals, scope, constraints, acceptance criteria, and timeline before full execution
- **Auto Delegation**: Once requirements are clear, work is planned and delegated to the most relevant specialist agents
- **Skills-First**: Automatically uses relevant skills before agent fallback
- **Agent Coordination**: Specialist agents work together through project admin
- **Unified Configuration**: All config files are cross-wired and entry-point aware

### Configuration Files

- `config/agent_config.json` - Agent definitions with entry point integration
- `config/entry_points.json` - Master entry point configuration  
- `config/env_config.json` - Environment settings with entry point references
- `config/prompt_defaults.json` - Default prompt behavior with entry point awareness
- `config/master_wiring.json` - Complete wiring verification

## Workflow Summary

When a prompt is routed through the project-admin entry point, the system follows this flow:

1. **Collect requirements**: gather the goal, scope, constraints, acceptance criteria, and timeline.
2. **Clarify gaps**: ask follow-up questions if anything is missing.
3. **Create a plan**: break the work into clear tasks and milestones.
4. **Delegate automatically**: assign work to the relevant specialist agents or skills.
5. **Execute and verify**: carry out the work, validate results, and keep context intact.

## Mode Selection

The system can automatically switch between execution styles:

- **Low-credit efficient**: use words like "efficient", "low credit", "budget", or "light" to favor concise planning, minimal retries, and lighter delegation.
- **Full power**: use words like "full power", "deep", "full control", or "thorough" to enable deeper analysis, stronger delegation, and a more complete handoff.

## Package Health and Robustness

The package includes a basic validation script to verify the workspace structure and core configuration files:

```bash
python3 scripts/validate_package.py
```

A test is also included for automated validation:

```bash
python3 -m unittest discover -s tests -v
```

This gives the package a stronger baseline for reuse, onboarding, and client delivery.

## Deploy

See `DEPLOY.md`.

```bash
bun install
bun run build   # -> ./dist (deploy to any static host)
```

## Re-import

Open MDOS and use IMPORT to load `mdos.workspace.json`.

The entry point system ensures that all future imports will have:
- Consistent agent behavior across all chat prompts
- Requirements-driven orchestration before execution begins
- Automatic skill detection and usage
- Coordinated agent interactions
- Unified configuration management
