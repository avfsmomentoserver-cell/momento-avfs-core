---
description: Deployment workflow for local and cloud environments
---

# Deployment Workflow

## Stages
1. **Build** - Build the application for target environment
2. **Validate** - Run tests and checks
3. **Stage** - Deploy to staging environment
4. **Promote** - Promote to production
5. **Monitor** - Monitor deployment and system health

## Expected Outputs
Reproducible deploy across local and cloud.

## Coordinated By
DevOps Engineer (ag_devops) with Project Administrator (ag_admin) coordination

## Environment Independence
- Local (SQLite, local API, local dashboard) must always work
- Production (Vercel, Render, Supabase) is additive, not replacement
- Never remove local functionality when adding production support

## Deployment Targets
- Local development
- Vercel (frontend)
- Render (backend)
- Supabase (database)
