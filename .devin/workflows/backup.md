---
description: Backup workflow for source code, devin config, and knowledge base
---

# Backup Workflow

## Stages
1. **Identify** - Determine what to backup (source code, .devin config, knowledge base)
2. **Create Archive** - Generate timestamped tar.gz backup
3. **Verify** - Validate backup integrity and contents
4. **Report** - Summarize backup location and contents

## Expected Outputs
Timestamped backup archive containing all project source code, devin AI configuration, and knowledge base.

## Coordinated By
DevOps Engineer (ag_devops)

## Backup Scope

### Include
- **Devin AI Config**: `.devin/` directory (config.json, AGENTS.md, CODING_STANDARDS.md, workflows, skills)
- **Knowledge Base**: PROJECT_KNOWLEDGE.md
- **Source Code**: backend, web, scripts, invent, mdos-package, docs
- **Root Files**: README.md, .gitignore

### Exclude
- downloads/
- old_dont_implement/
- node_modules/
- .git/
- __pycache__/
- *.pyc
- *.db
- *.db.bak*
- .env

## Backup Command
```bash
tar -czf backup_$(date +%Y%m%d_%H%M%S).tar.gz \
  --exclude='downloads' \
  --exclude='old_dont_implement' \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='__pycache__' \
  --exclude='*.pyc' \
  --exclude='*.db' \
  --exclude='*.db.bak*' \
  --exclude='.env' \
  .devin backend web scripts invent mdos-package docs PROJECT_KNOWLEDGE.md README.md .gitignore
```

## Verification Steps
1. Check archive size and timestamp
2. Verify archive contains expected files (tar -tzf)
3. Confirm key files present (PROJECT_KNOWLEDGE.md, .devin/config.json, etc.)
4. Report file count and archive location

## Storage Location
Backups are stored in the project root: `/home/pirates/Avfs_Core/avfs/v4/backup_YYYYMMDD_HHMMSS.tar.gz`
