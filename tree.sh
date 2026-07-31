#!/bin/bash

mkdir -p momento/{backend/{api/routes,momento},docs,downloads,scripts,web/{public,src/components/{charts,console,layout,pages/{app,auth,dashboard},panels,state,test}}}

# Backend
touch momento/backend/requirements.txt
touch momento/backend/run_api.py

# backend/momento
touch momento/backend/momento/__init__.py
touch momento/backend/momento/{analysis.py,auth.py,autopilot.py,config.py,db.py,feed.py,forecast.py,hub.py,linguistics.py,orchestrator.py,plugins.py,store.py,watcher.py}

# backend/api
touch momento/backend/api/__init__.py
touch momento/backend/api/{app.py,deps.py,schemas.py}

# backend/api/routes
touch momento/backend/api/routes/__init__.py
touch momento/backend/api/routes/{analysis.py,core.py,engines.py,forecasts.py,ingest.py,market.py,platform.py,rounds.py,users.py,ws.py}

# scripts
touch momento/scripts/{build_bundles.py,momento-api.service,momento-receiver.service}

# web/public
touch momento/web/public/{favicon.png,icon.png,placeholder.svg,robots.txt}

# web/src/components/charts
touch momento/web/src/components/charts/{BandDistribution.tsx,CandleChart.tsx,EquityChart.tsx,PhaseChart.tsx,PointsChart.tsx}

# web/src/components/console
touch momento/web/src/components/console/{ConnectionPill.tsx,EmptyState.tsx,Meter.tsx,Panel.tsx,Ring.tsx,Sparkline.tsx,StateBadge.tsx,StatTile.tsx}

# web/src/components/layout
touch momento/web/src/components/layout/{AppShell.tsx,Sidebar.tsx,SourceSwitcher.tsx,TopBar.tsx}

# web/src/components/pages/app
touch momento/web/src/components/pages/app/{AppCharts.tsx,Premium.tsx,ProPredictions.tsx,Today.tsx}

# web/src/components/pages/auth
touch momento/web/src/components/pages/auth/{Login.tsx,Register.tsx}

# web/src/components/pages/dashboard
touch momento/web/src/components/pages/dashboard/{Autopilot.tsx,BirdEye.tsx,BuildSteps.tsx,CommandCenter.tsx,DnaHunter.tsx,ForecastStudio.tsx,Ingest.tsx,LadderDash.tsx,Linguistics.tsx,Market.tsx,MoonshotFinder.tsx,Resistance.tsx,RoundTesting.tsx,Settings.tsx,Sources.tsx,Users.tsx}

# web/src/components/pages root
touch momento/web/src/components/pages/{Index.tsx,Inventory.tsx,Landing.tsx,NotFound.tsx,Orchestrator.tsx}

# web/src/components/state
touch momento/web/src/components/state/{AuthProvider.tsx,PlatformProvider.tsx}

# web/src/components/test
touch momento/web/src/components/test/{calendar.browser.test.tsx,example.test.ts}

# web/src root files
touch momento/web/src/{App.css,App.tsx,index.css,main.tsx,vite-env.d.ts}

# web config files
touch momento/web/{.gitignore,bun.lock,components.json,eslint.config.js,index.html,package.json,postcss.config.js,tailwind.config.ts,tsconfig.app.json,tsconfig.json,tsconfig.node.json,vite.config.ts,vitest.browser.config.ts,vitest.config.ts}

# panels folder (empty in source)
mkdir -p momento/web/src/components/panels

# Root level files
touch momento/{.gitignore,README.md,rork.json}

echo "Momento scaffold created successfully."