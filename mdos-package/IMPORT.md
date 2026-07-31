# Importing this MDOS workspace (automation)

This repo includes `mdos.workspace.json` which can be imported into an MDOS instance.

## Entry Point System

This workspace includes a unified entry point system that configures:
- **Default Agent**: Project Administrator (`ag_admin`) for all chat prompts
- **Skills-First Behavior**: Automatically uses relevant skills before falling back to general agent capabilities
- **Agent Coordination**: Project admin coordinates all specialist agents
- **Unified Configuration**: All configuration files are cross-wired and entry-point aware

Configuration files included:
- `config/agent_config.json` - Agent definitions with entry point integration
- `config/entry_points.json` - Master entry point configuration
- `config/env_config.json` - Environment settings with entry point references
- `config/prompt_defaults.json` - Default prompt behavior with entry point awareness
- `config/master_wiring.json` - Complete wiring verification

## Quick Import Methods

### Curl (JSON POST):

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  --data-binary @mdos.workspace.json \
  http://localhost:3000/import
```

### With Authentication:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MDOS_TOKEN" \
  --data-binary @mdos.workspace.json \
  https://mdos.example.com/import
```

### Python Script (recommended for automation):

```bash
python3 scripts/import_mdos_workspace.py --file mdos.workspace.json --url http://localhost:3000/import
```

## Entry Point System Features

After import, the system will:
1. **Auto-detect skills** for relevant tasks (web-dev, skill-creator, pdf, xlsx, etc.)
2. **Use project admin agent** as default coordinator for all prompts
3. **Coordinate specialist agents** when skills are insufficient
4. **Maintain project context** across all interactions
5. **Follow fallback hierarchy**: Skills → Project Admin → Specialist Agents → General Purpose

## Testing

If you want to test without sending data, add `--dry-run` to the command to preview headers and payload.

## Notes

- Some MDOS instances may prefer multipart file upload endpoints; consult your MDOS server docs.
- The entry point system ensures consistent behavior across all imported workspaces.
- All agents are entry-point aware and will coordinate through the project administrator.
- If you give me a target URL (e.g. `http://localhost:3000/import`) I can run a dry-run here or produce a CI step to automate the import.
